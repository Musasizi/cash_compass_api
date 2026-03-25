# WalletWise API — Backend

> **Teaching Project** | Express.js · MySQL · JWT · REST API Design
>
> This is the backend for the **WalletWise Personal Finance Tracker**.
> It is intentionally written to be read — every file has detailed comments
> explaining *why* the code is written the way it is, not just *what* it does.

---

## Table of Contents
1. [What This Project Teaches](#what-this-project-teaches)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Environment Variables](#environment-variables)
7. [Database Schema](#database-schema)
8. [Running the App](#running-the-app)
9. [API Reference](#api-reference)
10. [Testing with cURL](#testing-with-curl)
11. [Key Concepts Explained](#key-concepts-explained)
12. [Common Errors & Fixes](#common-errors--fixes)

---

## What This Project Teaches

| Concept | Where to look |
|---------|--------------|
| Connecting Node.js to MySQL | `config/db.js` |
| Protecting routes with JWT middleware | `middleware/authMiddleware.js` |
| Password hashing with bcrypt | `controllers/authController.js` |
| Separating concerns (MVC + Service layer) | `models/` · `services/` · `controllers/` |
| Input validation with Joi | `validation/` |
| Consistent API responses | `utils/response.js` |
| Automatic balance recalculation | `services/balanceService.js` |
| Scheduled background jobs (cron) | `jobs/dailyBalanceSnapshot.js` |
| Environment variables & security | `.env` · `config/db.js` |

---

## Architecture Overview

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Express   │  server.js — sets up middleware and mounts all routes
│   Router    │  routes/*.js — maps URL + HTTP method to a controller
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Middleware │  authMiddleware.js — verifies JWT on protected routes
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller  │  controllers/*.js — validates input, calls service, sends response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  services/*.js — business logic (e.g. recalculate balance after every change)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Model    │  models/*.js — SQL queries only; no business logic here
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    MySQL    │  config/db.js — connection pool shared across the whole app
└─────────────┘
```

> **Why this layered structure?**
> Each layer has one responsibility. If the database schema changes, you only
> edit the model. If a business rule changes, you only edit the service.
> Controllers stay small and easy to read.

---

## Project Structure

```
walletwise_api/
│
├── .env                        ← Secret config (DB password, JWT key) — NEVER commit this
├── server.js                   ← App entry point — wires everything together
│
├── config/
│   └── db.js                   ← Creates the MySQL connection pool
│
├── middleware/
│   └── authMiddleware.js       ← Checks the JWT on every protected route
│
├── routes/                     ← One file per resource; maps URLs to controllers
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── referenceDataRoutes.js
│   ├── incomeRoutes.js
│   ├── expenseRoutes.js
│   ├── balanceRoutes.js
│   └── dashboardRoutes.js
│
├── controllers/                ← Handle request/response; delegate work to services
│   ├── authController.js
│   ├── userController.js
│   ├── referenceDataController.js
│   ├── incomeController.js
│   ├── expenseController.js
│   ├── balanceController.js
│   └── dashboardController.js
│
├── services/                   ← Business logic lives here (not in controllers!)
│   ├── incomeService.js
│   ├── expenseService.js
│   ├── balanceService.js
│   └── dashboardService.js
│
├── models/                     ← SQL queries only — one file per database table
│   ├── userModel.js
│   ├── referenceDataModel.js
│   ├── incomeModel.js
│   ├── expenseModel.js
│   └── balanceModel.js
│
├── validation/                 ← Joi schemas — define what valid input looks like
│   ├── incomeValidation.js
│   └── expenseValidation.js
│
├── utils/
│   ├── response.js             ← Helpers to send consistent JSON responses
│   └── formatters.js          ← Date/number formatting utilities
│
├── jobs/
│   └── dailyBalanceSnapshot.js ← Cron job — saves a balance snapshot every night
│
└── scripts/
    └── seed.js                 ← Creates tables and inserts demo data
```

---

## Prerequisites

Before you begin, make sure you have installed:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or higher | https://nodejs.org |
| MySQL | v8.0 or higher | https://dev.mysql.com/downloads/ |
| npm | comes with Node.js | — |
| Postman *(optional)* | any | https://postman.com |

Check your versions:
```bash
node --version   # should print v18.x.x or higher
mysql --version  # should print  8.x.x or higher
npm --version    # should print  9.x.x or higher
```

---

## Step-by-Step Setup

### 1 — Clone the repository

```bash
git clone https://github.com/musasizi/walletwise.git
cd walletwise/walletwise_api
```

### 2 — Install Node.js dependencies

```bash
npm install
```

This reads `package.json` and downloads everything into `node_modules/`.

### 3 — Create the database

Open a MySQL terminal session:

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE walletwise_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

EXIT;
```

> `utf8mb4` supports all Unicode characters including emojis — always use it
> for new databases.

### 4 — Create the `.env` file

Copy the example below into a new file called **`.env`** (note the dot at the
start) in the `walletwise_api/` folder:

```env
# Database — match these to your MySQL setup
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_DATABASE=walletwise_db

# JWT — change this to any long random string; keep it secret!
JWT_SECRET=change_me_to_a_long_random_string

# Server port
PORT=3000
```

> **Security rule:** `.env` is listed in `.gitignore` and will never be
> committed to Git. Never hard-code passwords in source files.

### 5 — Run the seed script

The seed script creates all tables and inserts demo data in one command:

```bash
node scripts/seed.js
```

Expected output:
```
Connected to database. Running WalletWise seed…
✔  Table: users
✔  Table: income_type
✔  Table: expense_type
✔  Table: income
✔  Table: expense
✔  Table: balance
✔  Seeded 4 income types
✔  Seeded 2 expense types
✔  Seeded 2 demo users  (password: password123)
✔  Seeded 6 income records
✔  Seeded 8 expense records
✔  Live balance: 2,269,000

WalletWise seed complete!
Login → username: demo   password: password123
```

> You can safely re-run the seed script — it uses `INSERT IGNORE` and
> `CREATE TABLE IF NOT EXISTS` so it will not duplicate data.

### 6 — Start the server

```bash
# For development (auto-restarts on file changes)
npm run dev

# For production / running normally
npm start
```

You should see:
```
MySQL connected
WalletWise server running on port 3000
Daily balance snapshot job scheduled.
```

Visit `http://localhost:3000/` in your browser — you should see:
```json
{ "message": "WalletWise API is running 🚀", "status": "ok" }
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server hostname | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `secret` |
| `DB_DATABASE` | Database name | `walletwise_db` |
| `JWT_SECRET` | Secret used to sign tokens | any long random string |
| `PORT` | Port the Express server listens on | `3000` |

---

## Database Schema

```
┌─────────────┐       ┌──────────────┐       ┌───────────────┐
│    users    │       │ income_type  │       │ expense_type  │
│─────────────│       │──────────────│       │───────────────│
│ id (PK)     │       │ id (PK)      │       │ id_expense(PK)│
│ username    │       │ name         │       │ name          │
│ password    │       │ description  │       │ description   │
│ email       │       └──────┬───────┘       └──────┬────────┘
│ created_at  │              │ 1:many               │ 1:many
└─────────────┘              │                      │
                      ┌──────▼───────┐       ┌──────▼────────┐
                      │    income    │       │    expense    │
                      │──────────────│       │───────────────│
                      │ id (PK)      │       │ id (PK)       │
                      │ amount       │       │ name_expense  │
                      │income_type_id│       │ amount        │
                      │ date_created │       │amount_expend. │
                      └─────────────┘       │ id_expense    │
                                            │ date_created  │
                                            └───────────────┘
                                                    │
                      ┌─────────────────────────────┘
                      │ (balance recalculated after every income/expense change)
                      ▼
               ┌──────────────┐
               │   balance    │
               │──────────────│
               │ id (PK)      │
               │amount_balance│
               │ total_income │
               │total_expense │
               │snapshot_type │  'live' or 'daily'
               │ date_created │
               └──────────────┘
```

---

## Running the App

| Command | What it does |
|---------|-------------|
| `npm start` | Start the server with `node server.js` |
| `npm run dev` | Start with `nodemon` (auto-restart on changes) |
| `node scripts/seed.js` | Re-seed the database |
| `npm test` | Run Jest unit tests |

---

## API Reference

All API routes are prefixed with `/api`. Protected routes require the header:
```
Authorization: Bearer <your_jwt_token>
```

### Authentication

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/register` | ❌ Public | Create a new account |
| `POST` | `/api/login` | ❌ Public | Login and receive a JWT |

**Register body:**
```json
{ "username": "alice", "password": "password123", "email": "alice@example.com" }
```

**Login body + response:**
```json
// Request body
{ "username": "alice", "password": "password123" }

// Response
{
  "token": "eyJhbGci...",
  "user": { "id": 1, "username": "alice", "email": "alice@example.com" }
}
```

---

### Reference Data (income & expense types)

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/reference-data/income-types` | ✅ Required | List all income types |
| `GET` | `/api/reference-data/expense-types` | ✅ Required | List all expense types |

---

### Income

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/income` | ✅ Required | List income records (supports filters) |
| `GET` | `/api/income/:id` | ✅ Required | Get a single income record |
| `POST` | `/api/income` | ✅ Required | Add a new income record |
| `PUT` | `/api/income/:id` | ✅ Required | Update an income record |
| `DELETE` | `/api/income/:id` | ✅ Required | Delete an income record |

**Query filters for `GET /api/income`:**
```
?type_id=2&from=2026-01-01&to=2026-03-31
```

**Create/Update body:**
```json
{ "amount": 500000, "income_type_id": 1, "date_created": "2026-03-25" }
```

---

### Expense

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/expense` | ✅ Required | List expense records |
| `GET` | `/api/expense/:id` | ✅ Required | Get a single expense |
| `POST` | `/api/expense` | ✅ Required | Add a new expense |
| `PUT` | `/api/expense/:id` | ✅ Required | Update an expense |
| `DELETE` | `/api/expense/:id` | ✅ Required | Delete an expense |

**Create/Update body:**
```json
{
  "name_expense": "Lunch",
  "amount": 30000,
  "amount_expenditure": 25000,
  "id_expense": 2,
  "date_created": "2026-03-25"
}
```

---

### Balance

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/balance` | ✅ Required | Get the live balance |
| `GET` | `/api/balance/trend` | ✅ Required | Get daily snapshot history |

**`GET /api/balance/trend` query params:**
```
?days=30
```

---

### Dashboard

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/dashboard` | ✅ Required | Aggregated stats for the dashboard |

**Query params:**
```
?from=2026-03-01&to=2026-03-31
```

**Response shape:**
```json
{
  "balance":          { "amount_balance": "2269000.00", "total_income": "3580000.00", "total_expense": "1311000.00" },
  "totalIncome":      3580000,
  "totalExpense":     1311000,
  "incomeBreakdown":  [ { "name": "Salary", "total": 3000000 }, ... ],
  "expenseBreakdown": [ { "name": "Necessity", "total": 1174000 }, ... ],
  "trend":            [ { "date": "2026-03-25", "amount_balance": 2269000 } ]
}
```

---

### Users

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/users` | ✅ Required | List all users |
| `GET` | `/api/users/:id` | ✅ Required | Get a single user |
| `PUT` | `/api/users/:id` | ✅ Required | Update a user |
| `DELETE` | `/api/users/:id` | ✅ Required | Delete a user |

---

## Testing with cURL

Save yourself time — copy the snippet below into a terminal. It logs in,
saves the token, and tests every major endpoint automatically.

```bash
# 1. Login and capture the token
TOKEN=$(curl -sf -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN:0:30}..."

# 2. Health check
curl -s http://localhost:3000/

# 3. Income types (reference data)
curl -s http://localhost:3000/api/reference-data/income-types \
  -H "Authorization: Bearer $TOKEN"

# 4. All income records
curl -s http://localhost:3000/api/income \
  -H "Authorization: Bearer $TOKEN"

# 5. Create an income record
curl -s -X POST http://localhost:3000/api/income \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":200000,"income_type_id":1,"date_created":"2026-03-25"}'

# 6. Live balance
curl -s http://localhost:3000/api/balance \
  -H "Authorization: Bearer $TOKEN"

# 7. Dashboard
curl -s "http://localhost:3000/api/dashboard?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Key Concepts Explained

### Why a Service Layer?

A common mistake is to put all logic directly inside a controller:

```javascript
// ❌ Bad — business logic inside the controller
const createIncome = async (req, res) => {
  await db.query('INSERT INTO income ...', [...]);
  // recalculate balance SQL here too
  // send email here too
  // ... controller becomes 200 lines
};
```

Instead we delegate to a service:

```javascript
// ✅ Good — controller is thin, service owns the logic
const createIncome = async (req, res) => {
  const result = await incomeService.createIncome(req.body); // one line!
  return created(res, result, 'Income recorded');
};
```

This makes each piece independently testable and easy to change.

---

### How JWT Authentication Works

```
Client                           Server
  │                                │
  │── POST /api/login ────────────▶│  verify password with bcrypt
  │                                │  sign a JWT with JWT_SECRET
  │◀── { token: "eyJ..." } ───────│
  │                                │
  │  (client stores token)         │
  │                                │
  │── GET /api/income ────────────▶│
  │   Authorization: Bearer eyJ... │  authMiddleware reads header
  │                                │  jwt.verify(token, JWT_SECRET)
  │                                │  attaches decoded user to req.user
  │◀── [ income records ] ─────────│
```

The server never stores the session — the token itself carries the user's
identity, signed with a secret only the server knows.

---

### How Balance is Kept Accurate

Every time an income or expense record is created, updated, or deleted,
`balanceService.recalculateBalance()` is called automatically:

```javascript
// services/incomeService.js
const createIncome = async (data) => {
  await Income.create(...);        // 1. write to income table
  const balance = await recalculateBalance(); // 2. recalculate from scratch
  return { insertId, balance };
};
```

`recalculateBalance()` runs:
```sql
SELECT SUM(amount) FROM income          -- total income
SELECT SUM(amount_expenditure) FROM expense  -- total spent
-- then: balance = income - expense
-- then: UPDATE balance SET ...
```

This means the balance is always mathematically correct — never drifts.

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown database 'walletwise_db'` | Database not created yet | Run `mysql -u root -p -e "CREATE DATABASE walletwise_db;"` |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB password in `.env` | Check `DB_PASSWORD` in `.env` |
| `Cannot find module 'joi'` | Dependencies not installed | Run `npm install` |
| `401 Access denied. No token provided.` | Missing Authorization header | Add `Authorization: Bearer <token>` to your request |
| `403 Invalid or expired token.` | Token is wrong or has expired | Login again to get a fresh token |
| `EADDRINUSE: address already in use` | Port 3000 is taken | Run `lsof -ti:3000 \| xargs kill` or change `PORT` in `.env` |

---

## Author

**Musasizi Kenneth**
GitHub: [github.com/musasizi](https://github.com/musasizi)
Email: kennymusasizi@gmail.com

---

*Happy Coding! 🚀 — Remember: the best way to learn is to read the code,
change something small, and see what breaks.*
