PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  designation TEXT NOT NULL,
  salary REAL NOT NULL,
  joining_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

INSERT OR IGNORE INTO departments (name) VALUES
  ('Engineering'),
  ('Human Resources'),
  ('Finance'),
  ('Sales'),
  ('Marketing');

INSERT OR IGNORE INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$VTp4zWa.h1vX.VVPmPvBJO4U.E4GB5NMkeEpmkH39DSwFo0hLLIiy', 'admin'),
  ('viewer', '$2b$10$PXRZcff.HgR85A43.3LsFO4/Ewly1UcErwwJu1MK/X2rp2FMaQAO6', 'viewer');

INSERT OR IGNORE INTO employees (employee_code, full_name, email, mobile, department_id, designation, salary, joining_date, status, created_at, updated_at) VALUES
  ('EMP-0001', 'Priya Sharma', 'priya.sharma@example.com', '9876543210', 1, 'Software Engineer', 65000, '2024-01-15', 'Active', datetime('now', '-10 days'), datetime('now', '-10 days')),
  ('EMP-0002', 'Rohit Singh', 'rohit.singh@example.com', '9876543211', 2, 'HR Manager', 55000, '2024-02-01', 'Active', datetime('now', '-20 days'), datetime('now', '-20 days')),
  ('EMP-0003', 'Anjali Patel', 'anjali.patel@example.com', '9876543212', 3, 'Finance Analyst', 58000, '2024-03-05', 'Active', datetime('now', '-5 days'), datetime('now', '-5 days'));
