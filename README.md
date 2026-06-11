# Employee Management System

A small Employee Management System with authentication, CRUD operations, reporting, and REST APIs.

## Features

- Login, logout, session-based browser auth
- JWT-based `/api/login` for API access
- Employee list with search, pagination, sorting
- Add, edit, soft delete employees
- Dashboard totals and recent hires
- Export employee data to Excel
- SQLite persistence with `users`, `departments`, and `employees` tables

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create or reset the database:
   ```bash
   npm run migrate
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:4000`

## Run with Docker

Build and run the app locally using Docker:

```bash
docker build -t employee-management-system .
docker run --rm -p 4000:4000 employee-management-system
```

Or use Docker Compose:

```bash
docker-compose up --build
```

## API Endpoints

- `POST /api/login` - returns JWT token
- `GET /api/employees` - list employees (JWT required)
- `GET /api/employees/:id` - get employee by ID (JWT required)
- `POST /api/employees` - create a new employee (admin only, JWT required)
- `PUT /api/employees/:id` - update employee (admin only, JWT required)
- `DELETE /api/employees/:id` - soft delete employee (admin only, JWT required)

## Database Schema

The schema and table definitions are in `data/database.sql`.
Required tables:
- `users`
- `departments`
- `employees`

A migration helper is available at `migrate.js` to create or reset `data/employees.db` from the schema.

The ER diagram is available as `ER-Diagram.svg`.

## API Usage

### Authentication
Send a POST request to `/api/login` with JSON body:

```json
{
  "username": "admin",
  "password": "Password123"
}
```

The response contains a JWT token to use in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Employee list
GET `/api/employees` supports optional query parameters:

- `page` - page number (default `1`)
- `q` - search term for name or email
- `sort` - `name` or `joining_date`
- `dir` - `asc` or `desc`

### Create employee
POST `/api/employees` body:

```json
{
  "full_name": "New Employee",
  "email": "new.employee@example.com",
  "mobile": "9876543219",
  "department_id": 1,
  "designation": "Developer",
  "salary": 50000,
  "joining_date": "2025-01-01",
  "status": "Active"
}
```

### Update employee
PUT `/api/employees/:id` body is the same as create.

### Delete employee
DELETE `/api/employees/:id` performs a soft delete and marks the employee inactive.

## API Docs Page

You can also view the live API documentation at `http://localhost:4000/api-docs`.

## Default users

- Username: `admin`
  - Password: `Password123`
  - Role: `admin`
- Username: `viewer`
  - Password: `Viewer123!`
  - Role: `viewer`

Admins can add, edit, delete, and export employees. Viewer accounts can access the dashboard and employee list in read-only mode.
