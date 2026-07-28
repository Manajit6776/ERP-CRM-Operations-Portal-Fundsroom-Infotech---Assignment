import pool from '../config/db';
import { Challan, ChallanItemInput, PaginationParams } from '../types/index';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { generateNextChallanNumber, parsePagination } from '../utils/helpers';

export async function listChallans(params: PaginationParams) {
  const { page, limit, offset } = parsePagination(params);

  let whereClauses: string[] = [];
  let queryParams: any[] = [];

  if (params.search && params.search.trim() !== '') {
    const searchPattern = `%${params.search.trim()}%`;
    whereClauses.push(`(challan_number LIKE ? OR customer_name_snapshot LIKE ?)`);
    queryParams.push(searchPattern, searchPattern);
  }

  if (params.status && params.status !== 'ALL') {
    whereClauses.push(`status = ?`);
    queryParams.push(params.status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) as total FROM challans ${whereSql}`,
    queryParams
  );
  const total = countRows[0].total;

  const [rows]: any = await pool.query(
    `SELECT c.*, u.name as created_by_user_name
     FROM challans c
     LEFT JOIN users u ON c.created_by_user_id = u.id
     ${whereSql}
     ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getChallanById(id: number) {
  const [challanRows]: any = await pool.query(
    `SELECT c.*, u.name as created_by_user_name, cust.email as customer_email, cust.mobile as customer_mobile
     FROM challans c
     LEFT JOIN users u ON c.created_by_user_id = u.id
     LEFT JOIN customers cust ON c.customer_id = cust.id
     WHERE c.id = ?`,
    [id]
  );

  if (challanRows.length === 0) {
    throw new NotFoundError(`Challan with ID ${id} not found`);
  }

  const challan = challanRows[0];

  const [itemRows]: any = await pool.query(
    `SELECT * FROM challan_items WHERE challan_id = ? ORDER BY id ASC`,
    [id]
  );

  return {
    ...challan,
    items: itemRows
  } as Challan;
}

export async function createChallan(
  customerId: number,
  itemsInput: ChallanItemInput[],
  notes: string | undefined | null,
  userId: number
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch Customer
    const [custRows]: any = await connection.query(
      `SELECT id, name, business_name FROM customers WHERE id = ?`,
      [customerId]
    );

    if (custRows.length === 0) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    const customer = custRows[0];
    const customerSnapshotName = `${customer.business_name} (${customer.name})`;

    // 2. Generate Sequential Challan Number (CH-2026-XXXX)
    const challanNumber = await generateNextChallanNumber(connection);

    // 3. Process items and create snapshots
    let totalAmount = 0;
    const itemSnapshots = [];

    for (const item of itemsInput) {
      const [prodRows]: any = await connection.query(
        `SELECT id, name, sku, unit_price, current_stock FROM products WHERE id = ?`,
        [item.product_id]
      );

      if (prodRows.length === 0) {
        throw new NotFoundError(`Product with ID ${item.product_id} not found`);
      }

      const prod = prodRows[0];
      const lineTotal = Number(prod.unit_price) * item.quantity;
      totalAmount += lineTotal;

      itemSnapshots.push({
        product_id: prod.id,
        product_name_snapshot: prod.name,
        sku_snapshot: prod.sku,
        unit_price_snapshot: Number(prod.unit_price),
        quantity: item.quantity,
        line_total: lineTotal
      });
    }

    // 4. Insert Challan Header (Default status Draft)
    const [challanResult]: any = await connection.query(
      `INSERT INTO challans (challan_number, customer_id, customer_name_snapshot, status, total_amount, notes, created_by_user_id)
       VALUES (?, ?, ?, 'Draft', ?, ?, ?)`,
      [challanNumber, customerId, customerSnapshotName, totalAmount, notes || null, userId]
    );

    const challanId = challanResult.insertId;

    // 5. Insert Challan Items with Snapshots
    for (const snapshot of itemSnapshots) {
      await connection.query(
        `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          challanId,
          snapshot.product_id,
          snapshot.product_name_snapshot,
          snapshot.sku_snapshot,
          snapshot.unit_price_snapshot,
          snapshot.quantity,
          snapshot.line_total
        ]
      );
    }

    await connection.commit();

    return getChallanById(challanId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Confirm Challan with transactional safety and pessimistic row locking (FOR UPDATE)
 * Stock must NEVER go negative!
 */
export async function confirmChallan(
  challanId: number,
  userId: number,
  userName: string
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch Challan for update
    const [challanRows]: any = await connection.query(
      `SELECT * FROM challans WHERE id = ? FOR UPDATE`,
      [challanId]
    );

    if (challanRows.length === 0) {
      throw new NotFoundError(`Challan with ID ${challanId} not found`);
    }

    const challan = challanRows[0];

    if (challan.status === 'Confirmed') {
      throw new BadRequestError('Challan is already confirmed');
    }

    if (challan.status === 'Cancelled') {
      throw new BadRequestError('Cannot confirm a cancelled challan');
    }

    // 2. Fetch line items
    const [items]: any = await connection.query(
      `SELECT * FROM challan_items WHERE challan_id = ?`,
      [challanId]
    );

    if (items.length === 0) {
      throw new BadRequestError('Challan has no line items');
    }

    // 3. Re-check stock for every product with FOR UPDATE locking
    const insufficientStockErrors: string[] = [];
    const productStockMap = new Map<number, { name: string; current_stock: number }>();

    for (const item of items) {
      const [prodRows]: any = await connection.query(
        `SELECT id, name, current_stock FROM products WHERE id = ? FOR UPDATE`,
        [item.product_id]
      );

      if (prodRows.length === 0) {
        insufficientStockErrors.push(`Product '${item.product_name_snapshot}' no longer exists`);
        continue;
      }

      const prod = prodRows[0];
      productStockMap.set(item.product_id, prod);

      if (prod.current_stock < item.quantity) {
        const shortfall = item.quantity - prod.current_stock;
        insufficientStockErrors.push(
          `Product "${prod.name}" has insufficient stock (Required: ${item.quantity}, Available: ${prod.current_stock}, Shortfall: ${shortfall})`
        );
      }
    }

    // 4. If any product is short, ROLL BACK and return 409 CONFLICT
    if (insufficientStockErrors.length > 0) {
      await connection.rollback();
      throw new ConflictError(
        `Challan confirmation failed due to insufficient stock:\n- ${insufficientStockErrors.join('\n- ')}`
      );
    }

    // 5. Deduct stock and log stock movement OUT for each item
    for (const item of items) {
      const prodInfo = productStockMap.get(item.product_id)!;
      const newStock = prodInfo.current_stock - item.quantity;

      // Update product current stock
      await connection.query(
        `UPDATE products SET current_stock = ? WHERE id = ?`,
        [newStock, item.product_id]
      );

      // Audit log stock movement OUT
      await connection.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
         VALUES (?, ?, 'OUT', ?, ?, ?)`,
        [
          item.product_id,
          item.quantity,
          `Sales Challan #${challan.challan_number}`,
          userId,
          userName
        ]
      );
    }

    // 6. Mark challan Confirmed
    await connection.query(
      `UPDATE challans SET status = 'Confirmed' WHERE id = ?`,
      [challanId]
    );

    await connection.commit();

    return getChallanById(challanId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Cancel Challan with inventory restocking if previously Confirmed
 */
export async function cancelChallan(
  challanId: number,
  userId: number,
  userName: string
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [challanRows]: any = await connection.query(
      `SELECT * FROM challans WHERE id = ? FOR UPDATE`,
      [challanId]
    );

    if (challanRows.length === 0) {
      throw new NotFoundError(`Challan with ID ${challanId} not found`);
    }

    const challan = challanRows[0];

    if (challan.status === 'Cancelled') {
      throw new BadRequestError('Challan is already cancelled');
    }

    // If confirmed, reverse stock changes (restock)
    if (challan.status === 'Confirmed') {
      const [items]: any = await connection.query(
        `SELECT * FROM challan_items WHERE challan_id = ?`,
        [challanId]
      );

      for (const item of items) {
        const [prodRows]: any = await connection.query(
          `SELECT id, current_stock FROM products WHERE id = ? FOR UPDATE`,
          [item.product_id]
        );

        if (prodRows.length > 0) {
          const prod = prodRows[0];
          const restoredStock = prod.current_stock + item.quantity;

          await connection.query(
            `UPDATE products SET current_stock = ? WHERE id = ?`,
            [restoredStock, item.product_id]
          );

          // Audit log stock movement IN
          await connection.query(
            `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
             VALUES (?, ?, 'IN', ?, ?, ?)`,
            [
              item.product_id,
              item.quantity,
              `Cancellation of Sales Challan #${challan.challan_number}`,
              userId,
              userName
            ]
          );
        }
      }
    }

    // Update status to Cancelled
    await connection.query(
      `UPDATE challans SET status = 'Cancelled' WHERE id = ?`,
      [challanId]
    );

    await connection.commit();

    return getChallanById(challanId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
