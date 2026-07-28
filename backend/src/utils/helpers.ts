import { PoolConnection } from 'mysql2/promise';

/**
 * Generates next sequential Challan Number (e.g. CH-2026-0001)
 * inside an existing transaction or connection safely.
 */
export async function generateNextChallanNumber(connection: PoolConnection): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CH-${currentYear}-`;

  // Find highest existing challan number for the current year
  const [rows]: any = await connection.query(
    `SELECT challan_number FROM challans
     WHERE challan_number LIKE ?
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumStr = rows[0].challan_number.replace(prefix, '');
  const lastSeq = parseInt(lastNumStr, 10);
  const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
  const padded = nextSeq.toString().padStart(4, '0');

  return `${prefix}${padded}`;
}

export function parsePagination(query: any) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
