import bcrypt from 'bcryptjs';

export async function seedDatabase(connection: any) {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users
  const passwordAdmin = await bcrypt.hash('Admin@123', 10);
  const passwordSales = await bcrypt.hash('Sales@123', 10);
  const passwordWarehouse = await bcrypt.hash('Warehouse@123', 10);
  const passwordAccounts = await bcrypt.hash('Accounts@123', 10);

  const users = [
    ['System Admin', 'admin@fundsroom.com', passwordAdmin, 'Admin'],
    ['Sales Lead', 'sales@fundsroom.com', passwordSales, 'Sales'],
    ['Warehouse Manager', 'warehouse@fundsroom.com', passwordWarehouse, 'Warehouse'],
    ['Accounts Officer', 'accounts@fundsroom.com', passwordAccounts, 'Accounts']
  ];

  for (const user of users) {
    await connection.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role)`,
      user
    );
  }
  console.log('✅ Seeded 4 default users (Admin, Sales, Warehouse, Accounts).');

  // Fetch admin user ID for referencing in seeds
  const [adminUserRows]: any = await connection.query(`SELECT id, name FROM users WHERE email = ?`, ['admin@fundsroom.com']);
  const adminUser = adminUserRows[0];

  // 2. Seed Customers
  const customers = [
    [
      'Rajesh Kumar',
      '+91 9876543210',
      'rajesh@apextech.com',
      'Apex Tech Solutions',
      '27AAAAA0000A1Z5',
      'Wholesale',
      '102 Industrial Estate, Zone 4, Mumbai, MH',
      'Active',
      '2026-08-05',
      'Key distributor for western region. Prefers bulk deliveries.'
    ],
    [
      'Priya Sharma',
      '+91 9812345678',
      'priya@nexuscorp.in',
      'Nexus Enterprises',
      '29BBBBA1111B2Z2',
      'Distributor',
      '45 Commercial Complex, MG Road, Bengaluru, KA',
      'Active',
      '2026-08-10',
      'Requested updated product catalog and pricing tier details.'
    ],
    [
      'Aniket Verma',
      '+91 9765432109',
      'aniket@vermastores.org',
      'Verma Retail Outlets',
      '07CCCCA2222C3Z1',
      'Retail',
      '12 Market Yard, Connaught Place, New Delhi, DL',
      'Lead',
      '2026-07-30',
      'Interested in electronics & office equipment line.'
    ],
    [
      'Sunita Deshmukh',
      '+91 9988776655',
      'sunita@deshmukhtraders.com',
      'Deshmukh & Sons Traders',
      '27DDDDA3333D4Z9',
      'Wholesale',
      '88 Station Road, Pune, MH',
      'Inactive',
      null,
      'Account dormant. Re-engage next quarter.'
    ]
  ];

  for (const cust of customers) {
    await connection.query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      cust
    );
  }
  console.log('✅ Seeded 4 sample customers.');

  // Seed Customer Followup Note
  const [custRows]: any = await connection.query(`SELECT id FROM customers LIMIT 1`);
  if (custRows.length > 0) {
    const custId = custRows[0].id;
    await connection.query(
      `INSERT INTO customer_followups (customer_id, note, author_id, author_name)
       VALUES (?, ?, ?, ?)`,
      [custId, 'Initial contract review call completed. Quotes sent for 100 units.', adminUser.id, adminUser.name]
    );
  }

  // 3. Seed Products
  const products = [
    ['Ergonomic Office Chair Premium', 'PROD-CHAIR-01', 'Furniture', 12500.00, 25, 5, 'Warehouse A - Bay 1'],
    ['Standing Desk Dual Motor', 'PROD-DESK-02', 'Furniture', 28999.00, 12, 4, 'Warehouse A - Bay 2'],
    ['UltraWide 34-inch Monitor', 'PROD-MON-03', 'Electronics', 42000.00, 8, 3, 'Warehouse B - Shelf 4'],
    ['Mechanical Wireless Keyboard', 'PROD-KB-04', 'Peripherals', 4999.00, 45, 10, 'Warehouse B - Shelf 1'],
    ['USB-C Multiport Hub Pro', 'PROD-HUB-05', 'Peripherals', 2499.00, 3, 10, 'Warehouse B - Shelf 2'],
    ['Noise Cancelling Headset', 'PROD-HEADSET-06', 'Electronics', 15999.00, 2, 5, 'Warehouse B - Shelf 3']
  ];

  for (const prod of products) {
    await connection.query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), unit_price=VALUES(unit_price), current_stock=VALUES(current_stock)`,
      prod
    );
  }
  console.log('✅ Seeded 6 sample products (including low-stock alert items).');

  // 4. Seed Stock Movements Audit Trail
  const [prodList]: any = await connection.query(`SELECT id, name, current_stock FROM products`);
  for (const p of prodList) {
    await connection.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
       VALUES (?, ?, 'IN', 'Initial inventory seed import', ?, ?)`,
      [p.id, p.current_stock, adminUser.id, adminUser.name]
    );
  }
  console.log('✅ Seeded initial stock movement audit logs.');

  // 5. Seed Draft Sales Challan
  const [apexCustomer]: any = await connection.query(`SELECT id, business_name FROM customers WHERE email = ?`, ['rajesh@apextech.com']);
  if (apexCustomer.length > 0 && prodList.length >= 2) {
    const cust = apexCustomer[0];
    const item1 = prodList[0]; // Chair
    const item2 = prodList[3]; // Keyboard

    const qty1 = 2;
    const qty2 = 5;
    const price1 = 12500.00;
    const price2 = 4999.00;
    const totalAmount = (qty1 * price1) + (qty2 * price2);

    const [challanResult]: any = await connection.query(
      `INSERT INTO challans (challan_number, customer_id, customer_name_snapshot, status, total_amount, notes, created_by_user_id)
       VALUES ('CH-2026-0001', ?, ?, 'Draft', ?, 'Initial draft sample sales order for Q3 rollout.', ?)
       ON DUPLICATE KEY UPDATE challan_number=challan_number`,
      [cust.id, cust.business_name, totalAmount, adminUser.id]
    );

    const challanId = challanResult.insertId || 1;

    // Snapshot Items
    await connection.query(
      `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total)
       VALUES (?, ?, ?, 'PROD-CHAIR-01', ?, ?, ?),
              (?, ?, ?, 'PROD-KB-04', ?, ?, ?)`,
      [
        challanId, item1.id, 'Ergonomic Office Chair Premium', price1, qty1, qty1 * price1,
        challanId, item2.id, 'Mechanical Wireless Keyboard', price2, qty2, qty2 * price2
      ]
    );
    console.log('✅ Seeded sample Draft Sales Challan CH-2026-0001 with product snapshots.');
  }

  console.log('🎉 Seeding complete successfully!');
}
