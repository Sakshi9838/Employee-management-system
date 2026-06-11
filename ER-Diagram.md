# ER Diagram

The Employee Management System database schema contains the following tables:

## Tables

### users
- `id` INTEGER PRIMARY KEY
- `username` TEXT UNIQUE
- `password_hash` TEXT
- `role` TEXT
- `created_at` TEXT

### departments
- `id` INTEGER PRIMARY KEY
- `name` TEXT UNIQUE

### employees
- `id` INTEGER PRIMARY KEY
- `employee_code` TEXT UNIQUE
- `full_name` TEXT
- `email` TEXT UNIQUE
- `mobile` TEXT
- `department_id` INTEGER
- `designation` TEXT
- `salary` REAL
- `joining_date` TEXT
- `status` TEXT
- `deleted_at` TEXT
- `created_at` TEXT
- `updated_at` TEXT

## Relationships

- `employees.department_id` -> `departments.id`
- `employees` uses soft delete via `deleted_at`

## Notes

- `username` and `email` are unique.
- `employee_code` is auto-generated in the format `EMP-0001`, `EMP-0002`, ...
- `status` can be `Active` or `Inactive`.
- The `users` table supports authentication, API JWT issuance, and role-based access control via the `role` field.
