# UNDERSTAND.md — Comprehensive Technical Architecture & Engineering Guide

This document is a technical guide explaining **why** the Mini ERP + CRM Operations Portal was architected and built the way it is. It breaks down every core architectural decision, security mechanism, database design choice, and transaction safety pattern using real code snippets from this codebase.

---

## 1. How JWT Authentication & Multi-Role RBAC Work

### Concept Explanation
JSON Web Tokens (JWT) allow stateless, cryptographically signed user authentication. Instead of storing session states in server memory or database tables, the server signs a payload containing user claims (e.g. `id`, `email`, `role`) with a secret key (`JWT_SECRET`) and returns it to the client. The client attaches this token in the `Authorization: Bearer <token>` HTTP header on subsequent requests.

Role-Based Access Control (RBAC) must happen on **both server and client**:
- **Server-Side Enforcement (Security Control)**: The server verifies the token signature and inspects the embedded role claim. Client-submitted tokens cannot be forged without knowing `JWT_SECRET`.
- **Client-Side Enforcement (UX Control)**: The React app reads the role claim from local state to hide buttons and navigation links that the user is forbidden from using, providing a seamless user experience.

### Code Implementation from this Project

#### 1. Token Generation on Login (`backend/src/services/authService.ts`)
```typescript
const payload: UserPayload = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
};

const token = jwt.sign(payload, ENV.JWT_SECRET, {
  expiresIn: ENV.JWT_EXPIRES_IN
});
```

#### 2. Authentication Middleware (`backend/src/middleware/auth.ts`)
```typescript
export function authenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Authentication token missing or invalid'));
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}
```

#### 3. Role-Based Access Control Middleware (`backend/src/middleware/rbac.ts`)
```typescript
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`User role '${req.user?.role}' is not authorized.`));
    }
    next();
  };
}
```

### Reasoning Behind Implementation Choice
Storing user roles directly inside the signed JWT payload enables instant permission checks without performing database `SELECT` queries on every API request. Role verification middleware acts as a gatekeeper before controllers are invoked.

---

## 2. Express + TypeScript Layered Architecture & Request Pipeline

### Concept Explanation
A layered architecture separates concerns into distinct layers:
1. **Routes**: Define HTTP paths, HTTP methods, and associate middleware.
2. **Controllers**: Handle HTTP request parsing, status codes, Zod schema validation, and response formatting.
3. **Services**: Contain pure business logic and database transaction orchestration.
4. **Models / Data Access**: Interface directly with MySQL via `mysql2/promise`.

Middleware functions execute sequentially in a pipeline. A request passes through CORS, body parsers, auth checks, RBAC checks, controllers, and finally hits a centralized error handler if an exception is thrown.

### End-to-End Request Pipeline Diagram
```
HTTP Request → [cors] → [express.json] → [authenticateToken] → [requireRoles] → [Controller Validation] → [Service Business Logic / DB Transaction] → Response / [errorHandler]
```

### Code Snippet (`backend/src/routes/challanRoutes.ts` & `backend/src/app.ts`)
```typescript
// Route Pipeline Wiring
router.patch(
  '/:id/confirm',
  authenticateToken,
  requireRoles(['Admin', 'Warehouse', 'Sales']),
  challanController.confirmChallan
);

// Centralized Error Middleware (backend/src/middleware/errorHandler.ts)
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, ...(err.field ? { field: err.field } : {}) }
    });
  }
  return res.status(500).json({ error: { message: 'Internal server error occurred' } });
}
```

### Reasoning Behind Implementation Choice
Decoupling Express request handling from business logic ensures that services can be unit-tested in isolation without mocking Express `req` and `res` objects.

---

## 3. MySQL Schema Design & Audit Trail Architecture

### Concept Explanation
The schema consists of 7 relational tables: `users`, `customers`, `customer_followups`, `products`, `stock_movements`, `challans`, and `challan_items`.

Two critical enterprise database design rules are enforced:
1. **Price & Name Snapshotting (`challan_items`)**: When a sales challan is created, product details (`product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`) are copied into `challan_items` instead of relying solely on a foreign key link to `products`. If a manager updates a product's price from ₹500 to ₹800 next month, historical sales challans remain accurate to what was billed.
2. **Append-Only Stock Audit Log (`stock_movements`)**: Inventory adjustments are never done by silently overwriting a number. Every stock change anywhere in the app writes an immutable audit row (`quantity_changed`, `movement_type`, `reason`, `created_by_user_id`, `timestamp`).

### Code Snippet (`backend/db/schema.sql`)
```sql
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
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity_changed INT NOT NULL,
  movement_type ENUM('IN', 'OUT') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by_user_id INT NOT NULL,
  created_by_user_name VARCHAR(100) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

---

## 4. Database Transactions, Pessimistic Row Locking & Race Condition Prevention

### Concept Explanation
Without database transactions and row-level locks, a **race condition** (Double-Spend bug) occurs when two sales managers confirm orders for the same low-stock product simultaneously:
- Product stock = 3 units.
- Order A requests 3 units; Order B requests 3 units.
- Both threads read `current_stock = 3` at the same time. Both pass validation and decrement stock by 3.
- Final stock becomes `-3`, breaking business constraints and causing physical inventory mismatch.

To solve this, we execute the operation inside a MySQL transaction (`connection.beginTransaction()`) using **Pessimistic Locking (`SELECT ... FOR UPDATE`)**. This places an exclusive write lock on the target product rows. The second concurrent transaction is forced to wait until the first transaction completes and commits.

### Code Snippet (`backend/src/services/challanService.ts`)
```typescript
export async function confirmChallan(challanId: number, userId: number, userName: string) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock Challan row
    const [challanRows]: any = await connection.query(
      `SELECT * FROM challans WHERE id = ? FOR UPDATE`,
      [challanId]
    );

    // 2. Lock Product rows and re-verify live stock
    for (const item of items) {
      const [prodRows]: any = await connection.query(
        `SELECT id, name, current_stock FROM products WHERE id = ? FOR UPDATE`,
        [item.product_id]
      );

      const prod = prodRows[0];
      if (prod.current_stock < item.quantity) {
        insufficientStockErrors.push(
          `Product "${prod.name}" has insufficient stock (Required: ${item.quantity}, Available: ${prod.current_stock})`
        );
      }
    }

    // 3. Rollback if any product is short
    if (insufficientStockErrors.length > 0) {
      await connection.rollback();
      throw new ConflictError(
        `Challan confirmation failed due to insufficient stock:\n- ${insufficientStockErrors.join('\n- ')}`
      );
    }

    // 4. Atomic decrement & audit log insertion
    for (const item of items) {
      await connection.query(
        `UPDATE products SET current_stock = current_stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );

      await connection.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by_user_id, created_by_user_name)
         VALUES (?, ?, 'OUT', ?, ?, ?)`,
        [item.product_id, item.quantity, `Sales Challan #${challan.challan_number}`, userId, userName]
      );
    }

    await connection.query(`UPDATE challans SET status = 'Confirmed' WHERE id = ?`, [challanId]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
```

---

## 5. REST API Design & Error Semantics

### Concept Explanation
The API strictly respects HTTP specification standards:
- `200 OK`: Successful retrieval or update.
- `201 Created`: Successful creation of customer, product, or challan.
- `400 Bad Request`: Zod schema validation failure.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Authenticated user lacks required role permissions.
- `404 Not Found`: Resource ID does not exist in MySQL.
- `409 Conflict`: Business rule violation (e.g. insufficient stock during order confirmation or duplicate SKU).
- `500 Internal Server Error`: Unexpected runtime failure.

Pagination is standardized across all list endpoints using `?page=1&limit=10` returning `{ data: [...], pagination: { page, limit, total, totalPages } }`.

---

## 6. React Frontend Architecture & State Flow

### Concept Explanation
The frontend is built using Vite, React 18, and Context API.
- `AuthContext`: Holds active JWT token, user claims, and role helper functions (`hasRole(['Admin', 'Sales'])`).
- `client.js`: Axios client with interceptors to automatically append `Authorization: Bearer <token>` and redirect on HTTP 401.
- Components are modularized into Layout, Sidebar, Topbar, StatusBadge, Modal, and Pagination.

### Code Snippet (`frontend/src/api/client.js`)
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 7. Responsive CSS Layout Technique

### Concept Explanation
The styling uses modern CSS Custom Properties (`:root` variables) with Flexbox and CSS Grid.
- **Desktop View**: Fixed-width sidebar (260px) + flexible main content area (`flex: 1`).
- **Mobile View (`@media (max-width: 768px)`)**: Sidebar transforms to an off-canvas drawer (`position: fixed; left: -260px; transition: 0.25s ease`), toggled via a hamburger menu in the topbar. Data tables wrap inside `.table-responsive { overflow-x: auto; }`.

---

## 8. Environment Variables & 12-Factor App Philosophy

### Concept Explanation
According to Factor III of the 12-Factor App methodology, configuration and secrets must be strictly separated from application code.

The backend uses `dotenv` to load database credentials. If `DATABASE_URL` is set, the pool connects directly to the production cloud host (Aiven MySQL) with SSL. If `DATABASE_URL` is absent, it falls back to individual variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Thus, transitioning from local XAMPP to cloud MySQL requires zero code changes.

---

## 9. Full Deployment Pipeline & Cloud Architecture

### Continuous Deployment Flow
1. Developer pushes code to GitHub repository (`git push`).
2. **Vercel** detects push to `frontend/`, executes `npm run build` (Vite compilation into `/dist`), and serves static SPA assets worldwide.
3. **Render** detects push to `backend/`, executes `npm install && npm run build` (TypeScript compilation into `/dist`), and starts the web service with `npm run start`.
4. Render connects securely to **Aiven for MySQL** using the connection URI stored in Render's Environment Variables setting.

---

## 10. Technical Interview Q&A (Focus on Stock Transactions & Schema)

### Question 1: How do you prevent negative inventory during high-concurrency order confirmation?
**Model Answer:**
> "I implement pessimistic row-level locking using MySQL's `SELECT ... FOR UPDATE` inside an explicit database transaction (`connection.beginTransaction()`). When a confirmation request arrives, we lock the relevant product rows, re-query the live `current_stock`, and verify if `current_stock >= requested_quantity`. If any item is short, we roll back the transaction immediately and throw an HTTP 409 Conflict error. Because of row locking, concurrent transactions must wait, preventing race conditions and negative inventory."

### Question 2: Why do you snapshot product details inside `challan_items` instead of just referencing `product_id`?
**Model Answer:**
> "Referencing only a `product_id` foreign key creates a historical data corruption risk. If a product's price or name changes in the catalog next month, querying an old sales challan would dynamically compute line items with the *new* price instead of the actual price charged at the time of sale. Storing `product_name_snapshot`, `sku_snapshot`, and `unit_price_snapshot` in `challan_items` ensures historical immutability."

### Question 3: How is inventory auditing handled across manual adjustments and sales orders?
**Model Answer:**
> "We implement an append-only audit log table named `stock_movements`. Every operation that mutates stock — whether product creation, manual stock adjustment, sales challan confirmation (`OUT`), or order cancellation (`IN`) — writes an immutable row with `product_id`, `quantity_changed`, `movement_type`, `reason`, `created_by_user_id`, and a timestamp."

### Question 4: How is Role-Based Access Control (RBAC) enforced securely?
**Model Answer:**
> "RBAC is enforced on the server using Express middleware (`requireRoles(['Admin', 'Warehouse'])`). We verify the user's role extracted from cryptographically verified JWT tokens. Client-side role checks only control UI visibility for better UX, but server middleware guarantees API security."

### Question 5: How does your database layer support seamless migration between local XAMPP and Cloud MySQL?
**Model Answer:**
> "We use `mysql2/promise` connection pooling configured via environment variables. The connection pool checks if a unified `DATABASE_URL` (such as Aiven's TLS connection URI) is defined; if not, it constructs a pool from individual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables. This 12-factor pattern ensures identical code runs in dev and prod."
