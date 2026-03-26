/**
 * scripts/seed.js – Cash Compass database schema bootstrap + seed data
 *
 * Run with:  npm run seed
 *
 * IDEMPOTENT: tables use IF NOT EXISTS, rows use INSERT IGNORE.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function seed() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 3306,
  });

  console.log('Connected to database. Running Cash Compass seed…\n');

  // ── Schema ─────────────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      username    VARCHAR(100) NOT NULL UNIQUE,
      email       VARCHAR(150) NOT NULL UNIQUE,
      password    VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✔  Table: users');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS income_type (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100) NOT NULL UNIQUE,
      description TEXT
    )
  `);
  console.log('✔  Table: income_type');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expense_type (
      id_expense  INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100) NOT NULL UNIQUE,
      description TEXT
    )
  `);
  console.log('✔  Table: expense_type');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS income (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      amount          DECIMAL(15,2) NOT NULL,
      date_created    DATE NOT NULL DEFAULT (CURDATE()),
      income_type_id  INT NOT NULL,
      FOREIGN KEY (income_type_id) REFERENCES income_type(id) ON DELETE RESTRICT
    )
  `);
  console.log('✔  Table: income');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expense (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      name_expense        VARCHAR(200) NOT NULL,
      amount              DECIMAL(15,2) NOT NULL,
      amount_expenditure  DECIMAL(15,2) NOT NULL,
      date_created        DATE NOT NULL DEFAULT (CURDATE()),
      id_expense          INT NOT NULL,
      FOREIGN KEY (id_expense) REFERENCES expense_type(id_expense) ON DELETE RESTRICT
    )
  `);
  console.log('✔  Table: expense');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS balance (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      amount_balance  DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_income    DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_expense   DECIMAL(15,2) NOT NULL DEFAULT 0,
      date_created    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      snapshot_type   ENUM('live','daily') NOT NULL DEFAULT 'daily'
    )
  `);
  console.log('✔  Table: balance');

  // ── Reference data ─────────────────────────────────────────────────────────

  const incomeTypes = [
    ['Pocket Money', 'Personal allowance or pocket money'],
    ['Gigs', 'Income from freelance or gig work'],
    ['Salary', 'Regular employment salary'],
    ['Gifts', 'Money received as gifts'],
  ];
  for (const [name, desc] of incomeTypes) {
    await db.execute('INSERT IGNORE INTO income_type (name, description) VALUES (?, ?)', [name, desc]);
  }
  console.log(`✔  Seeded ${incomeTypes.length} income types`);

  const expenseTypes = [
    ['Luxury', 'Non-essential luxury spending'],
    ['Necessity', 'Essential day-to-day expenses'],
  ];
  for (const [name, desc] of expenseTypes) {
    await db.execute('INSERT IGNORE INTO expense_type (name, description) VALUES (?, ?)', [name, desc]);
  }
  console.log(`✔  Seeded ${expenseTypes.length} expense types`);

  // ── Demo users ─────────────────────────────────────────────────────────────

  const demoPass = await bcrypt.hash('password123', 10);
  await db.execute(
    'INSERT IGNORE INTO users (username, email, password) VALUES (?, ?, ?)',
    ['demo', 'demo@cashcompass.app', demoPass]
  );
  await db.execute(
    'INSERT IGNORE INTO users (username, email, password) VALUES (?, ?, ?)',
    ['alice', 'alice@cashcompass.app', demoPass]
  );
  console.log('✔  Seeded 2 demo users  (password: password123)');

  // ── Demo income records ────────────────────────────────────────────────────

  const [[salary]] = await db.execute("SELECT id FROM income_type WHERE name = 'Salary'");
  const [[gigs]] = await db.execute("SELECT id FROM income_type WHERE name = 'Gigs'");
  const [[pocket]] = await db.execute("SELECT id FROM income_type WHERE name = 'Pocket Money'");
  const [[gifts]] = await db.execute("SELECT id FROM income_type WHERE name = 'Gifts'");

  const incomeRows = [
    [1500000, salary.id, '2026-03-01'],
    [250000, gigs.id, '2026-03-05'],
    [50000, pocket.id, '2026-03-10'],
    [100000, gifts.id, '2026-03-15'],
    [1500000, salary.id, '2026-02-01'],
    [180000, gigs.id, '2026-02-12'],
  ];
  for (const [amount, type_id, date] of incomeRows) {
    await db.execute(
      'INSERT INTO income (amount, income_type_id, date_created) VALUES (?, ?, ?)',
      [amount, type_id, date]
    );
  }
  console.log(`✔  Seeded ${incomeRows.length} income records`);

  // ── Demo expense records ───────────────────────────────────────────────────

  const [[luxury]] = await db.execute("SELECT id_expense FROM expense_type WHERE name = 'Luxury'");
  const [[necessity]] = await db.execute("SELECT id_expense FROM expense_type WHERE name = 'Necessity'");

  const expenseRows = [
    ['Rent', 400000, 400000, necessity.id_expense, '2026-03-01'],
    ['Groceries', 150000, 143000, necessity.id_expense, '2026-03-03'],
    ['New Shoes', 80000, 75000, luxury.id_expense, '2026-03-07'],
    ['Electricity', 50000, 48000, necessity.id_expense, '2026-03-10'],
    ['Restaurant', 60000, 62000, luxury.id_expense, '2026-03-14'],
    ['Internet', 45000, 45000, necessity.id_expense, '2026-03-15'],
    ['Rent (Feb)', 400000, 400000, necessity.id_expense, '2026-02-01'],
    ['Groceries (Feb)', 150000, 138000, necessity.id_expense, '2026-02-05'],
  ];
  for (const [name, amt, expenditure, type_id, date] of expenseRows) {
    await db.execute(
      'INSERT INTO expense (name_expense, amount, amount_expenditure, id_expense, date_created) VALUES (?, ?, ?, ?, ?)',
      [name, amt, expenditure, type_id, date]
    );
  }
  console.log(`✔  Seeded ${expenseRows.length} expense records`);

  // ── Compute and seed live balance ──────────────────────────────────────────

  const [[{ ti }]] = await db.execute('SELECT COALESCE(SUM(amount), 0) AS ti FROM income');
  const [[{ te }]] = await db.execute('SELECT COALESCE(SUM(amount_expenditure), 0) AS te FROM expense');
  const bal = Number(ti) - Number(te);

  await db.execute(
    "INSERT INTO balance (amount_balance, total_income, total_expense, snapshot_type) VALUES (?, ?, ?, 'live') ON DUPLICATE KEY UPDATE amount_balance=VALUES(amount_balance), total_income=VALUES(total_income), total_expense=VALUES(total_expense)",
    [bal, ti, te]
  );
  await db.execute(
    "INSERT INTO balance (amount_balance, total_income, total_expense, snapshot_type) VALUES (?, ?, ?, 'daily')",
    [bal, ti, te]
  );

  console.log(`✔  Live balance: ${bal.toLocaleString()} (income=${Number(ti).toLocaleString()}, expense=${Number(te).toLocaleString()})`);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' Cash Compass seed complete!');
  console.log(' Login →  username: demo   password: password123');
  console.log('═══════════════════════════════════════════════════════');

  await db.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
