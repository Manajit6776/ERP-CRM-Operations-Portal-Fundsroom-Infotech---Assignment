import pool from '../config/db';
import { Customer, PaginationParams } from '../types/index';
import { NotFoundError } from '../utils/errors';
import { parsePagination } from '../utils/helpers';

export async function listCustomers(params: PaginationParams) {
  const { page, limit, offset } = parsePagination(params);

  let whereClauses: string[] = [];
  let queryParams: any[] = [];  

  if (params.search && params.search.trim() !== '') {
    const searchPattern = `%${params.search.trim()}%`;
    whereClauses.push(`(name LIKE ? OR business_name LIKE ? OR mobile LIKE ? OR email LIKE ? OR gst_number LIKE ?)`);
    queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (params.status && params.status !== 'ALL') {
    whereClauses.push(`status = ?`);
    queryParams.push(params.status);
  }

  if (params.type && params.type !== 'ALL') {
    whereClauses.push(`customer_type = ?`);
    queryParams.push(params.type);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total items
  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) as total FROM customers ${whereSql}`,
    queryParams
  );
  const total = countRows[0].total;

  // Fetch paginated data
  const [rows]: any = await pool.query(
    `SELECT * FROM customers ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  return {
    data: rows as Customer[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getCustomerById(id: number) {
  const [rows]: any = await pool.query(`SELECT * FROM customers WHERE id = ?`, [id]);
  if (rows.length === 0) {
    throw new NotFoundError(`Customer with ID ${id} not found`);
  }

  const customer = rows[0];

  // Fetch follow-up notes
  const [followups]: any = await pool.query(
    `SELECT * FROM customer_followups WHERE customer_id = ? ORDER BY created_at DESC`,
    [id]
  );

  return {
    ...customer,
    followups
  };
}

export async function createCustomer(data: Partial<Customer>) {
  const [result]: any = await pool.query(
    `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.mobile,
      data.email,
      data.business_name,
      data.gst_number || null,
      data.customer_type,
      data.address,
      data.status,
      data.follow_up_date || null,
      data.notes || null
    ]
  );

  return getCustomerById(result.insertId);
}

export async function updateCustomer(id: number, data: Partial<Customer>) {
  await getCustomerById(id); // Check existence

  await pool.query(
    `UPDATE customers
     SET name = ?, mobile = ?, email = ?, business_name = ?, gst_number = ?, customer_type = ?, address = ?, status = ?, follow_up_date = ?, notes = ?
     WHERE id = ?`,
    [
      data.name,
      data.mobile,
      data.email,
      data.business_name,
      data.gst_number || null,
      data.customer_type,
      data.address,
      data.status,
      data.follow_up_date || null,
      data.notes || null,
      id
    ]
  );

  return getCustomerById(id);
}

export async function addCustomerFollowup(
  customerId: number,
  note: string,
  authorId: number,
  authorName: string
) {
  await getCustomerById(customerId); // Check existence

  const [result]: any = await pool.query(
    `INSERT INTO customer_followups (customer_id, note, author_id, author_name)
     VALUES (?, ?, ?, ?)`,
    [customerId, note, authorId, authorName]
  );

  return {
    id: result.insertId,
    customer_id: customerId,
    note,
    author_id: authorId,
    author_name: authorName,
    created_at: new Date().toISOString()
  };
}
