# Mini ERP + CRM Operations Portal

An enterprise-grade **Mini ERP + CRM Operations Portal** built with a **Node.js, TypeScript, Express.js & MySQL** REST API backend and a modern, responsive **React (Vite) & Vanilla CSS** SPA frontend. Enforces strict database transaction safety for inventory sales challans, pessimistic row-locking (`FOR UPDATE`) to prevent negative stock race conditions, historical price/sku snapshotting, an append-only stock movement audit trail, and multi-role RBAC (`Admin`, `Sales`, `Warehouse`, `Accounts`).

```mermaid
graph TD
    Client["React SPA Frontend (Vite + Axios)<br/>[Vercel Host]"]
    API["Express.js + TypeScript REST API<br/>[Render Host]"]
    Auth["JWT + bcrypt RBAC Middleware"]
    DB[("MySQL Database<br/>[XAMPP Local / Aiven Cloud]")]
     
    Client -->|HTTPS / JSON API| API
    API -->|Bearer Token Verification| Auth
    API -->|ACID DB Transactions & Locking| DB
```

---

## 1. Tech Stack Used

- **Frontend**: React 18, Vite, React Router DOM v6, Axios, Lucide React Icons, Vanilla CSS Design System.
- **Backend**: Node.js, TypeScript 5, Express.js, `mysql2/promise` (Connection Pooling & Transaction Support), Zod Schema Validation, bcryptjs, jsonwebtoken.
- **Local DB Environment**: XAMPP MySQL Server / phpMyAdmin.
- **Production Target Deployment**:
  - Frontend → **Vercel** (`vercel.json`)
  - Backend → **Render** (`render.yaml`)
  - Cloud Database → **Aiven for MySQL** (Free tier MySQL 8.0)

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **XAMPP / MySQL Server**: MySQL 5.7+ or 8.0+ running locally on port `3306`

---

## 3. Local Setup Instructions

### Step 1: Install Dependencies
Open terminal in project root and install dependencies for both backend and frontend:

```bash
# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables
Create `.env` files for both projects using the `.env.example` templates:

```bash
# In backend/ directory
cp .env.example .env

# In frontend/ directory
cp .env.example .env
```

### Step 3: Start Local MySQL Server (XAMPP)
- Launch **XAMPP Control Panel**.
- Click **Start** next to **MySQL** (Default port `3306`, user `root`, no password).

### Step 4: Run Database Migration & Seeding
From the `backend/` directory, execute the database migration and seeding script:

```bash
cd backend
npm run db:migrate
```
*This automatically creates the `mini_erp_crm` database, initializes all SQL tables, and seeds default accounts and sample business data.*

### Step 5: Start Development Servers

```bash
# Terminal 1: Run Backend API (http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Run Frontend UI (http://localhost:5173)
cd frontend
npm run dev
```

---

## 4. Environment Variables Matrix

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Example Value | Required |
| :--- | :--- | :--- | :---: |
| `PORT` | Server listening port | `5000` | Yes |
| `NODE_ENV` | Environment mode | `development` / `production` | Yes |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` | Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | `super_secret_erp_crm_jwt_key_2026` | Yes |
| `JWT_EXPIRES_IN` | JWT token validity duration | `24h` | Yes |
| `DB_HOST` | MySQL host address | `localhost` | Yes (if no URL) |
| `DB_PORT` | MySQL port | `3306` | Yes (if no URL) |
| `DB_USER` | MySQL user | `root` | Yes (if no URL) |
| `DB_PASSWORD` | MySQL password | `""` (empty for XAMPP) | Yes (if no URL) |
| `DB_NAME` | Database name | `mini_erp_crm` | Yes (if no URL) |
| `DATABASE_URL` | Unified MySQL connection string (Cloud) | `mysql://user:pass@host:3306/db?ssl-mode=REQUIRED` | Optional |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Example Value | Required |
| :--- | :--- | :--- | :---: |
| `VITE_API_BASE_URL` | Base URL for REST API endpoints | `http://localhost:5000/api` | Yes |

---

## 5. Seeded Test Login Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fundsroom.com` | `Admin@123` | Full access across all modules |
| **Sales** | `sales@fundsroom.com` | `Sales@123` | Manage Customers CRM, Create & View Sales Challans |
| **Warehouse** | `warehouse@fundsroom.com` | `Warehouse@123` | Manage Products, Adjust Stock, Confirm & Cancel Challans |
| **Accounts** | `accounts@fundsroom.com` | `Accounts@123` | View-only financial records, Customers & Dashboard telemetry |

---

## 6. Production Deployment Guide

### Deployment Target 1: Database → Aiven for MySQL (Cloud)
1. Sign up at [Aiven.io](https://aiven.io) and create a **Free MySQL Service**.
2. Note down the Connection URI, host, port, user, and password from the Aiven console.
3. In your local terminal, run migrations against the Aiven cloud host:
   ```bash
   DATABASE_URL="mysql://<user>:<password>@<aiven-host>:<port>/defaultdb?ssl-mode=REQUIRED" npm run db:migrate
   ```

### Deployment Target 2: Backend → Render
1. Push repository to GitHub.
2. Log in to [Render.com](https://render.com) and click **New → Blueprint**.
3. Connect your repository — Render automatically picks up `backend/render.yaml`.
4. Configure Environment Variables in Render Dashboard:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (or `DATABASE_URL` from Aiven).
   - `FRONTEND_URL` set to your Vercel URL.
5. Deploy Web Service.

### Deployment Target 3: Frontend → Vercel
1. Log in to [Vercel.com](https://vercel.com) and click **Add New → Project**.
2. Select your repository and set Root Directory to `frontend`.
3. Set Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>.onrender.com/api`
4. Click **Deploy**. Vercel will use `frontend/vercel.json` to configure SPA routing.

---

## 7. REST API Endpoint Reference

| Method | Endpoint Path | Auth Required | Allowed Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/auth/login` | No | Public | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | Yes | All | Get current user profile |
| `GET` | `/api/customers` | Yes | All | List customers (paginated & filtered) |
| `POST` | `/api/customers` | Yes | Admin, Sales | Create new CRM customer |
| `GET` | `/api/customers/:id` | Yes | All | Get customer details & follow-up log |
| `PUT` | `/api/customers/:id` | Yes | Admin, Sales | Update customer details |
| `POST` | `/api/customers/:id/followups` | Yes | Admin, Sales | Add timestamped follow-up note |
| `GET` | `/api/products` | Yes | All | List product catalog (low-stock filter) |
| `POST` | `/api/products` | Yes | Admin, Warehouse | Create product & log initial stock |
| `PUT` | `/api/products/:id` | Yes | Admin, Warehouse | Update product information |
| `POST` | `/api/products/:id/stock-movements` | Yes | Admin, Warehouse | Manual stock adjustment & audit log |
| `GET` | `/api/products/:id/stock-movements` | Yes | All | Get product stock movement history |
| `GET` | `/api/challans` | Yes | All | List sales challans |
| `POST` | `/api/challans` | Yes | Admin, Sales | Create draft sales challan |
| `GET` | `/api/challans/:id` | Yes | All | Get challan details & snapshot items |
| `PATCH` | `/api/challans/:id/confirm` | Yes | Admin, Warehouse, Sales | Confirm challan inside DB transaction |
| `PATCH` | `/api/challans/:id/cancel` | Yes | Admin, Warehouse, Sales | Cancel challan & restock inventory |
| `GET` | `/api/dashboard/summary` | Yes | All | Executive summary metrics |

---

## 8. Importing Postman Collection

1. Open Postman.
2. Click **Import** and select the file `postman_collection.json` located in the project root.
3. Set the `baseUrl` variable to `http://localhost:5000/api`.
4. Execute `Login (Admin)` request. Copy the `token` from the JSON response.
5. Set `authToken` collection variable to the copied token.

---

## 9. Known Limitations

- Multi-currency support is omitted (all monetary values are standardized in INR `₹`).
- PDF generation for sales challans is handled via browser native `window.print()` rendering rather than server-side PDF stream compilation.
