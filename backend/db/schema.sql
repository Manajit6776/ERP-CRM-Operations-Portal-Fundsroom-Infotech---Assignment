-- Mini ERP + CRM Operations Portal Schema
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB / Aiven MySQL

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Sales', 'Warehouse', 'Accounts') NOT NULL DEFAULT 'Sales',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  business_name VARCHAR(150) NOT NULL,
  gst_number VARCHAR(20) DEFAULT NULL,
  customer_type ENUM('Retail', 'Wholesale', 'Distributor') NOT NULL DEFAULT 'Retail',
  address TEXT NOT NULL,
  status ENUM('Lead', 'Active', 'Inactive') NOT NULL DEFAULT 'Lead',
  follow_up_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_status (status),
  INDEX idx_customers_type (customer_type),
  INDEX idx_customers_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  note TEXT NOT NULL,
  author_id INT NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_followups_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  current_stock INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 5,
  location VARCHAR(100) NOT NULL DEFAULT 'Main Warehouse',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_sku (sku),
  INDEX idx_products_stock (current_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity_changed INT NOT NULL,
  movement_type ENUM('IN', 'OUT') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by_user_id INT NOT NULL,
  created_by_user_name VARCHAR(100) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_movements_product (product_id),
  INDEX idx_movements_type (movement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challan_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  customer_name_snapshot VARCHAR(150) NOT NULL,
  status ENUM('Draft', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  created_by_user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  INDEX idx_challans_number (challan_number),
  INDEX idx_challans_status (status),
  INDEX idx_challans_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challan_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name_snapshot VARCHAR(150) NOT NULL,
  sku_snapshot VARCHAR(50) NOT NULL,
  unit_price_snapshot DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (challan_id) REFERENCES challans(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_challan_items_challan (challan_id),
  INDEX idx_challan_items_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
