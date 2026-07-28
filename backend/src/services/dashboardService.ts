import pool from '../config/db';

export async function getDashboardSummary() {
  // 1. Low stock count
  const [lowStockRows]: any = await pool.query(
    `SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock_alert`
  );
  const lowStockCount = lowStockRows[0].count;

  // 2. Pending challans count (Draft status)
  const [pendingChallanRows]: any = await pool.query(
    `SELECT COUNT(*) as count FROM challans WHERE status = 'Draft'`
  );
  const pendingChallansCount = pendingChallanRows[0].count;

  // 3. Active leads count
  const [leadRows]: any = await pool.query(
    `SELECT COUNT(*) as count FROM customers WHERE status = 'Lead'`
  );
  const activeLeadsCount = leadRows[0].count;

  // 4. Confirmed challans total revenue
  const [revenueRows]: any = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM challans WHERE status = 'Confirmed'`
  );
  const totalRevenue = Number(revenueRows[0].total);

  // 5. Total Products Count & Total Customers Count
  const [prodCountRows]: any = await pool.query(`SELECT COUNT(*) as count FROM products`);
  const [custCountRows]: any = await pool.query(`SELECT COUNT(*) as count FROM customers`);

  // 6. Recent Stock Movements (last 5)
  const [recentMovements]: any = await pool.query(
    `SELECT sm.*, p.name as product_name, p.sku
     FROM stock_movements sm
     JOIN products p ON sm.product_id = p.id
     ORDER BY sm.timestamp DESC LIMIT 5`
  );

  // 7. Recent Sales Challans (last 5)
  const [recentChallans]: any = await pool.query(
    `SELECT * FROM challans ORDER BY created_at DESC LIMIT 5`
  );

  return {
    metrics: {
      lowStockCount,
      pendingChallansCount,
      activeLeadsCount,
      totalRevenue,
      totalProducts: prodCountRows[0].count,
      totalCustomers: custCountRows[0].count
    },
    recentMovements,
    recentChallans
  };
}
