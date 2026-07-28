import pool from '../config/db';
import { PaginationParams, Product } from '../types/index';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { parsePagination } from '../utils/helpers';

export async function listProducts(params: PaginationParams & { lowStockOnly?: boolean }) {
  const { page, limit, offset } = parsePagination(params);

  let whereClauses: string[] = [];
  let queryParams: any[] = [];

  if (params.search && params.search.trim() !== '') {
    const searchPattern = `%${params.search.trim()}%`;
    whereClauses.push(`(name LIKE ? OR sku LIKE ? OR category LIKE ? OR location LIKE ?)`);
    queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (params.lowStockOnly) {
    whereClauses.push(`current_stock <= min_stock_alert`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) as total FROM products ${whereSql}`,
    queryParams
  );
  const total = countRows[0].total;

  const [rows]: any = await pool.query(
    `SELECT *, (current_stock <= min_stock_alert) as is_low_stock
     FROM products ${whereSql}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  return {
    data: rows as (Product & { is_low_stock: number })[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getProductById(id: number) {
  const [rows]: any = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
  if (rows.length === 0) {
    throw new NotFoundError(`Product with ID ${id} not found`);
  }
  return rows[0] as Product;
}

export async function createProduct(
  data: Partial<Product>,
  userId: number,
  userName: string
) {
  // Check unique SKU
  const [existing]: any = await pool.query(`SELECT id FROM products WHERE sku = ?`, [data.sku]);
  if (existing.length > 0) {
    throw new BadRequestError(`Product SKU '${data.sku}' already exists`, 'sku');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.sku,
        data.category,
        data.unit_price,
        data.current_stock || 0,
        data.min_stock_alert || 5,
        data.location
      ]
    );

    const productId = result.insertId;

    // Record initial stock movement audit log if initial stock > 0
    if (data.current_stock && data.current_stock > 0) {
      await connection.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
         VALUES (?, ?, 'IN', 'Initial stock entry upon product creation', ?, ?)`,
        [productId, data.current_stock, userId, userName]
      );
    }

    await connection.commit();
    return getProductById(productId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function updateProduct(id: number, data: Partial<Product>) {
  const existingProduct = await getProductById(id);

  // Check unique SKU if changing SKU
  if (data.sku && data.sku !== existingProduct.sku) {
    const [existing]: any = await pool.query(`SELECT id FROM products WHERE sku = ? AND id != ?`, [data.sku, id]);
    if (existing.length > 0) {
      throw new BadRequestError(`Product SKU '${data.sku}' already exists`, 'sku');
    }
  }

  await pool.query(
    `UPDATE products
     SET name = ?, sku = ?, category = ?, unit_price = ?, min_stock_alert = ?, location = ?
     WHERE id = ?`,
    [
      data.name,
      data.sku,
      data.category,
      data.unit_price,
      data.min_stock_alert,
      data.location,
      id
    ]
  );

  return getProductById(id);
}

export async function addManualStockAdjustment(
  productId: number,
  quantityChanged: number,
  reason: string,
  userId: number,
  userName: string
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `SELECT current_stock, name FROM products WHERE id = ? FOR UPDATE`,
      [productId]
    );

    if (rows.length === 0) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }

    const currentStock = rows[0].current_stock;
    const newStock = currentStock + quantityChanged;

    if (newStock < 0) {
      throw new BadRequestError(
        `Stock cannot be negative. Current: ${currentStock}, Change: ${quantityChanged}`,
        'quantity_changed'
      );
    }

    const movementType = quantityChanged > 0 ? 'IN' : 'OUT';
    const absQty = Math.abs(quantityChanged);

    // 1. Update product stock
    await connection.query(`UPDATE products SET current_stock = ? WHERE id = ?`, [newStock, productId]);

    // 2. Audit Trail
    await connection.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, absQty, movementType, reason, userId, userName]
    );

    await connection.commit();

    return getProductById(productId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getProductStockMovements(productId: number, params: PaginationParams) {
  await getProductById(productId); // check existence
  const { page, limit, offset } = parsePagination(params);

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) as total FROM stock_movements WHERE product_id = ?`,
    [productId]
  );
  const total = countRows[0].total;

  const [rows]: any = await pool.query(
    `SELECT * FROM stock_movements WHERE product_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [productId, limit, offset]
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
