# Implementation Plan - Mini ERP + CRM Operations Portal

Building a complete, production-grade **Mini ERP + CRM Operations Portal** with Node.js, TypeScript, Express, MySQL backend, and a modern React frontend. Enforces transactional integrity on Sales Challan confirmation, negative-stock prevention, immutable product snapshotting, append-only stock movement logging, and multi-role RBAC (`Admin`, `Sales`, `Warehouse`, `Accounts`).

## User Review Required

> [!IMPORTANT]
> - **Database Requirement**: Uses MySQL (`mysql2/promise` with transactions & row locking `FOR UPDATE`). Works locally on XAMPP MySQL and in production on Aiven/Railway MySQL.
> - **Default Credentials**: 4 pre-seeded role accounts will be generated in `db/seed.ts` (Admin, Sales, Warehouse, Accounts) with password `Password123!` (or `Admin@123`, `Sales@123`, etc.).

## Proposed Architecture & Changes

```
Fundsroom Infotech/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment variables & MySQL connection pool
│   │   ├── middleware/      # JWT auth, RBAC permissions, request validation, error handler
│   │   ├── controllers/     # Auth, Customers, Products, Challans, Dashboard controllers
│   │   ├── services/        # Business logic & DB transactions (Challan confirm/cancel, stock logs)
│   │   ├── models/          # Database queries & interfaces
│   │   ├── utils/           # Helper functions (Zod schemas, response formatters, sequential numbers)
│   │   ├── routes/          # Express route definitions
│   │   └── server.ts        # App entry point
│   ├── db/
│   │   ├── schema.sql       # Database table definitions & constraints
│   │   ├── seed.ts          # Database seeder script
│   │   └── migrate.ts       # Database migration runner script
│   ├── .env.example
│   ├── render.yaml          # Render backend deployment configuration
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with interceptors & API functions
│   │   ├── context/         # AuthContext for state & role management
│   │   ├── components/      # Responsive Sidebar, Topbar, Modals, Badges, StatCards, Layout
│   │   ├── pages/           # Login, Dashboard, Customers, Products, Challans detail & list pages
│   │   ├── styles/          # Responsive enterprise CSS design system
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── vercel.json          # Vercel SPA routing configuration
│   ├── vite.config.js
│   └── package.json
├── README.md                # Operational setup & deployment guide
├── UNDERSTAND.md            # In-depth architectural & conceptual breakdown with real code snippets
└── postman_collection.json  # Complete API test suite
```

---

### Component 1: Database Schema & Migration Setup (`backend/db/`)

#### [NEW] [schema.sql](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/db/schema.sql)
- `users`: `id`, `name`, `email`, `password_hash`, `role` (`Admin`, `Sales`, `Warehouse`, `Accounts`), timestamps.
- `customers`: `id`, `name`, `mobile`, `email`, `business_name`, `gst_number`, `customer_type` (`Retail`, `Wholesale`, `Distributor`), `address`, `status` (`Lead`, `Active`, `Inactive`), `follow_up_date`, `notes`, timestamps.
- `customer_followups`: `id`, `customer_id`, `note`, `author_id`, `author_name`, timestamp.
- `products`: `id`, `name`, `sku` (UNIQUE), `category`, `unit_price`, `current_stock`, `min_stock_alert`, `location`, timestamps.
- `stock_movements`: `id`, `product_id`, `quantity_changed`, `movement_type` (`IN`, `OUT`), `reason`, `created_by_user_id`, `created_by_user_name`, timestamp.
- `challans`: `id`, `challan_number` (UNIQUE, e.g. `CH-2026-0001`), `customer_id`, `customer_name_snapshot`, `status` (`Draft`, `Confirmed`, `Cancelled`), `total_amount`, `notes`, `created_by_user_id`, timestamps.
- `challan_items`: `id`, `challan_id`, `product_id`, `product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`, `quantity`, `line_total`.

#### [NEW] [seed.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/db/seed.ts)
- Seeds default users for all 4 roles.
- Seeds sample customers, products, stock movements, and a draft challan.

#### [NEW] [migrate.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/db/migrate.ts)
- Auto-runs `schema.sql` and `seed.ts` via `npm run db:migrate`.

---

### Component 2: Backend API & Transaction Logic (`backend/src/`)

#### [NEW] [db.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/src/config/db.ts)
- Creates MySQL pool with `mysql2/promise`. Reads `DATABASE_URL` or individual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.

#### [NEW] [auth.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/src/middleware/auth.ts) & [rbac.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/src/middleware/rbac.ts)
- Middleware verifying JWT tokens and enforcing role permissions (`Admin`, `Sales`, `Warehouse`, `Accounts`).

#### [NEW] [challanService.ts](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/src/services/challanService.ts)
- Core Business Logic:
  - `confirmChallan(id)`:
    1. Starts connection transaction: `await connection.beginTransaction()`.
    2. Fetches line items for challan.
    3. Runs `SELECT current_stock, name FROM products WHERE id = ? FOR UPDATE` for each product.
    4. If `current_stock < line_item.quantity`, aborts, rolls back transaction (`await connection.rollback()`), and throws a `409 Conflict` error with exact shortfall info.
    5. Updates stock (`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).
    6. Writes row to `stock_movements` (`IN/OUT`, `reason: "Sales Challan #CH-..."`).
    7. Updates challan status to `Confirmed`.
    8. Commits transaction (`await connection.commit()`).
  - `cancelChallan(id)`: Restocks inventory inside a transaction if confirmed, logs stock movement `IN` with reason `"Cancellation of Sales Challan #CH-..."`, updates status to `Cancelled`.

#### [NEW] API Routes & Controllers
- Auth routes: `POST /api/auth/login`, `GET /api/auth/me`
- Customer routes: `GET /api/customers`, `POST /api/customers`, `GET /api/customers/:id`, `PUT /api/customers/:id`, `POST /api/customers/:id/followups`
- Product routes: `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `POST /api/products/:id/stock-movements`, `GET /api/products/:id/stock-movements`
- Challan routes: `GET /api/challans`, `POST /api/challans`, `GET /api/challans/:id`, `PATCH /api/challans/:id/confirm`, `PATCH /api/challans/:id/cancel`
- Dashboard routes: `GET /api/dashboard/summary`

---

### Component 3: Frontend Web Application (`frontend/src/`)

#### [NEW] Responsive CSS Design System ([index.css](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/frontend/src/styles/index.css))
- Modern enterprise dark/light layout tokens, responsive grid/flexbox, custom scrollbars, clean status badges, modals, form controls, micro-interactions.

#### [NEW] Pages & Components
- Navigation & Shell: `Sidebar.jsx`, `Topbar.jsx`, `Layout.jsx`, `ProtectedRoute.jsx`
- Auth: `LoginPage.jsx`
- Dashboard: `DashboardPage.jsx` (metric cards for Low Stock, Pending Challans, Active Leads, recent audit logs)
- CRM: `CustomersPage.jsx` (List with filters, Add/Edit modal, Customer Detail view with follow-up activity feed)
- Products & Inventory: `ProductsPage.jsx` (Product table with low-stock warnings, Stock movement log viewer, Manual stock adjustment modal)
- Sales Challans: `ChallansPage.jsx` & `ChallanDetailPage.jsx` (Multi-item line item builder, real-time stock checks, transaction confirm modal with error handling, printable/viewable challan receipt with item snapshots)

---

### Component 4: Deployment Configurations & Documentation

#### [NEW] [vercel.json](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/frontend/vercel.json) & [render.yaml](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/backend/render.yaml)
- Deployment files for Vercel SPA routing and Render web service backend.

#### [NEW] [README.md](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/README.md)
- Complete operational reference guide: system architecture diagram, tech stack, local setup steps for XAMPP MySQL, env vars matrix, step-by-step deploy guide for Vercel + Render + Aiven MySQL, test login credentials table, API endpoint summary table, Postman collection instructions, known limitations.

#### [NEW] [UNDERSTAND.md](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/UNDERSTAND.md)
- Comprehensive technical teaching guide answering all 10 prompt questions with exact code snippets from the codebase, explaining the *why* behind design choices.

#### [NEW] [postman_collection.json](file:///c:/Users/manaj/OneDrive/Desktop/Fundsroom%20Infotech/postman_collection.json)
- Complete Postman API collection with sample request bodies and variables for testing all routes.

---

## Verification Plan

### Automated Tests & Scripts
- Database initialization test: `npm run db:migrate` in `backend/` to verify schema creation & seeding.
- TypeScript build test: `npm run build` in `backend/` to ensure zero compilation errors.
- Frontend build test: `npm run build` in `frontend/` to verify Vite bundle compilation.

### Manual Verification
- **Transactional Stock Verification**:
  1. Create a product with current stock = 5.
  2. Create a draft challan for quantity = 10.
  3. Attempt `PATCH /api/challans/:id/confirm` -> verify it returns `409 Conflict` with clear error message, stock remains 5, and no stock movement log is created.
  4. Edit challan to quantity = 3 and confirm -> verify HTTP 200, stock becomes 2, and an `OUT` movement log is recorded.
  5. Cancel the confirmed challan -> verify stock restores to 5, and an `IN` movement log is recorded.
- **RBAC Verification**:
  1. Login as `Sales` user -> verify unable to adjust manual stock or access admin settings.
  2. Login as `Warehouse` user -> verify able to manage products and confirm challans.
  3. Login as `Accounts` user -> verify view-only access to relevant financial records.
