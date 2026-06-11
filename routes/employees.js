const express = require('express');
const { getDatabase } = require('../config/db');
const { ensureAuthenticated, ensureAdmin, authenticateAPI, ensureAdminAPI } = require('./auth');
const ExcelJS = require('exceljs');
const router = express.Router();

function buildEmployeeQuery(params) {
  const search = params.q ? `%${params.q.trim()}%` : '%';
  let orderBy = 'full_name ASC';
  if (params.sort === 'joining_date') {
    orderBy = params.dir === 'desc' ? 'joining_date DESC' : 'joining_date ASC';
  } else if (params.sort === 'name') {
    orderBy = params.dir === 'desc' ? 'full_name DESC' : 'full_name ASC';
  }
  return { search, orderBy };
}

function generateEmployeeCode(callback) {
  const db = getDatabase();
  db.get('SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) {
      db.close();
      return callback(err);
    }
    const nextNumber = row ? parseInt(row.employee_code.split('-')[1], 10) + 1 : 1;
    const code = `EMP-${String(nextNumber).padStart(4, '0')}`;
    db.close();
    callback(null, code);
  });
}

function loadDepartments(callback) {
  const db = getDatabase();
  db.all('SELECT * FROM departments ORDER BY name', [], (err, departments) => {
    db.close();
    callback(err, departments || []);
  });
}

function findEmployeeById(id, callback) {
  const db = getDatabase();
  db.get(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = ? AND e.deleted_at IS NULL`,
    [id],
    (err, employee) => {
      db.close();
      callback(err, employee);
    }
  );
}

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  const db = getDatabase();
  const isAdmin = req.session.user.role === 'admin';
  db.serialize(() => {
    db.get('SELECT COUNT(*) AS total FROM employees WHERE deleted_at IS NULL', (err, totalRow) => {
      if (err) {
        db.close();
        return res.render('dashboard', { user: req.session.user, stats: null, recent: [], error: 'Unable to load dashboard.' });
      }
      db.get("SELECT COUNT(*) AS active FROM employees WHERE status = 'Active' AND deleted_at IS NULL", (err2, activeRow) => {
        if (err2) {
          db.close();
          return res.render('dashboard', { user: req.session.user, stats: null, recent: [], error: 'Unable to load dashboard.' });
        }
        db.get("SELECT COUNT(*) AS inactive FROM employees WHERE status = 'Inactive' AND deleted_at IS NULL", (err3, inactiveRow) => {
          if (err3) {
            db.close();
            return res.render('dashboard', { user: req.session.user, stats: null, recent: [], error: 'Unable to load dashboard.' });
          }
          db.all(
            'SELECT e.id, e.employee_code, e.full_name, e.email, e.joining_date FROM employees e WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 5',
            (err4, recents) => {
              db.close();
              res.render('dashboard', {
                user: req.session.user,
                stats: {
                  total: totalRow.total,
                  active: activeRow.active,
                  inactive: inactiveRow.inactive
                },
                recent: recents,
                error: null
              });
            }
          );
        });
      });
    });
  });
});

router.get('/employees', ensureAuthenticated, (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 10;
  const params = buildEmployeeQuery(req.query);
  const offset = (page - 1) * pageSize;
  const isAdmin = req.session.user.role === 'admin';
  const db = getDatabase();

  db.serialize(() => {
    db.get(
      `SELECT COUNT(*) AS total
       FROM employees
       WHERE deleted_at IS NULL AND (full_name LIKE ? OR email LIKE ?)`,
      [params.search, params.search],
      (err, countRow) => {
        if (err) {
          db.close();
          return res.render('employees', { user: req.session.user, employees: [], departments: [], search: req.query.q || '', sort: req.query.sort || 'name', dir: req.query.dir || 'asc', page, pageSize, total: 0, error: 'Unable to load employees.' });
        }
        db.all(
          `SELECT e.*, d.name AS department_name
           FROM employees e
           LEFT JOIN departments d ON e.department_id = d.id
           WHERE e.deleted_at IS NULL AND (e.full_name LIKE ? OR e.email LIKE ?)
           ORDER BY ${params.orderBy}
           LIMIT ? OFFSET ?`,
          [params.search, params.search, pageSize, offset],
          (err2, employees) => {
            db.close();
            res.render('employees', {
              user: req.session.user,
              isAdmin,
              employees: employees || [],
              search: req.query.q || '',
              sort: req.query.sort || 'name',
              dir: req.query.dir || 'asc',
              page,
              pageSize,
              total: countRow.total,
              error: null
            });
          }
        );
      }
    );
  });
});

router.get('/employees/add', ensureAuthenticated, ensureAdmin, (req, res) => {
  loadDepartments((err, departments) => {
    res.render('employee-form', { user: req.session.user, action: '/employees/add', employee: {}, departments, error: null, formTitle: 'Add Employee' });
  });
});

router.post('/employees/add', ensureAuthenticated, ensureAdmin, (req, res) => {
  const { full_name, email, mobile, department_id, designation, salary, joining_date, status } = req.body;

  const errors = [];
  if (!full_name) errors.push('Full Name is required.');
  if (!email) errors.push('Email is required.');
  if (!/^[0-9]{10}$/.test(mobile || '')) errors.push('Mobile Number must be exactly 10 digits.');
  if (!department_id) errors.push('Department is required.');
  if (!designation) errors.push('Designation is required.');
  if (!salary || Number(salary) <= 0) errors.push('Salary must be greater than 0.');
  if (!joining_date) errors.push('Joining Date is required.');

  if (errors.length) {
    return loadDepartments((err, departments) => {
      res.render('employee-form', { user: req.session.user, action: '/employees/add', employee: req.body, departments, error: errors.join(' '), formTitle: 'Add Employee' });
    });
  }

  generateEmployeeCode((err, employee_code) => {
    if (err) {
      return res.render('employee-form', { user: req.session.user, action: '/employees/add', employee: req.body, departments: [], error: 'Unable to generate employee code.', formTitle: 'Add Employee' });
    }
    const db = getDatabase();
    db.run(
      `INSERT INTO employees (employee_code, full_name, email, mobile, department_id, designation, salary, joining_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [employee_code, full_name, email, mobile, department_id, designation, salary, joining_date, status || 'Active'],
      function (dbErr) {
        db.close();
        if (dbErr) {
          const message = dbErr.message.includes('UNIQUE constraint failed') ? 'Email must be unique.' : 'Unable to save employee.';
          return loadDepartments((err, departments) => {
            res.render('employee-form', { user: req.session.user, action: '/employees/add', employee: req.body, departments, error: message, formTitle: 'Add Employee' });
          });
        }
        res.redirect('/employees');
      }
    );
  });
});

router.get('/employees/edit/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  findEmployeeById(req.params.id, (err, employee) => {
    if (err || !employee) {
      return res.redirect('/employees');
    }
    loadDepartments((err, departments) => {
      res.render('employee-form', { user: req.session.user, action: `/employees/edit/${employee.id}`, employee, departments, error: null, formTitle: 'Edit Employee' });
    });
  });
});

router.post('/employees/edit/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  const { full_name, email, mobile, department_id, designation, salary, joining_date, status } = req.body;
  const id = req.params.id;
  const errors = [];
  if (!full_name) errors.push('Full Name is required.');
  if (!email) errors.push('Email is required.');
  if (!/^[0-9]{10}$/.test(mobile || '')) errors.push('Mobile Number must be exactly 10 digits.');
  if (!department_id) errors.push('Department is required.');
  if (!designation) errors.push('Designation is required.');
  if (!salary || Number(salary) <= 0) errors.push('Salary must be greater than 0.');
  if (!joining_date) errors.push('Joining Date is required.');

  if (errors.length) {
    return loadDepartments((err, departments) => {
      res.render('employee-form', { user: req.session.user, action: `/employees/edit/${id}`, employee: { ...req.body, id }, departments, error: errors.join(' '), form_title: 'Edit Employee', formTitle: 'Edit Employee' });
    });
  }

  const db = getDatabase();
  db.run(
    `UPDATE employees SET full_name = ?, email = ?, mobile = ?, department_id = ?, designation = ?, salary = ?, joining_date = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [full_name, email, mobile, department_id, designation, salary, joining_date, status || 'Active', id],
    function (dbErr) {
      db.close();
      if (dbErr) {
        const message = dbErr.message.includes('UNIQUE constraint failed') ? 'Email must be unique.' : 'Unable to update employee.';
        return loadDepartments((err, departments) => {
          res.render('employee-form', { user: req.session.user, action: `/employees/edit/${id}`, employee: { ...req.body, id }, departments, error: message, formTitle: 'Edit Employee' });
        });
      }
      res.redirect('/employees');
    }
  );
});

router.post('/employees/delete/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  const db = getDatabase();
  db.run(
    `UPDATE employees SET deleted_at = datetime('now'), status = 'Inactive', updated_at = datetime('now') WHERE id = ?`,
    [req.params.id],
    (err) => {
      db.close();
      res.redirect('/employees');
    }
  );
});

router.get('/employees/export', ensureAuthenticated, ensureAdmin, (req, res) => {
  const db = getDatabase();
  db.all(
    `SELECT e.employee_code, e.full_name, e.email, e.mobile, d.name AS department, e.designation, e.salary, e.joining_date, e.status
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.deleted_at IS NULL
     ORDER BY e.full_name`,
    [],
    async (err, rows) => {
      db.close();
      if (err) {
        return res.redirect('/employees');
      }
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Employees');
      sheet.columns = [
        { header: 'Employee Code', key: 'employee_code', width: 15 },
        { header: 'Full Name', key: 'full_name', width: 25 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Salary', key: 'salary', width: 12 },
        { header: 'Joining Date', key: 'joining_date', width: 15 },
        { header: 'Status', key: 'status', width: 12 }
      ];
      rows.forEach((row) => {
        sheet.addRow(row);
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="employees.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    }
  );
});

router.get('/api/employees', authenticateAPI, (req, res) => {
  const db = getDatabase();
  const params = buildEmployeeQuery(req.query);
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  db.serialize(() => {
    db.get(`SELECT COUNT(*) AS total FROM employees WHERE deleted_at IS NULL AND (full_name LIKE ? OR email LIKE ?)`, [params.search, params.search], (countErr, countRow) => {
      if (countErr) {
        db.close();
        return res.status(500).json({ message: 'Unable to load employees.' });
      }
      db.all(
        `SELECT e.*, d.name AS department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.deleted_at IS NULL AND (e.full_name LIKE ? OR e.email LIKE ?) ORDER BY ${params.orderBy} LIMIT ? OFFSET ?`,
        [params.search, params.search, pageSize, offset],
        (listErr, employees) => {
          db.close();
          if (listErr) {
            return res.status(500).json({ message: 'Unable to load employees.' });
          }
          res.json({ total: countRow.total, page, pageSize, employees });
        }
      );
    });
  });
});

router.get('/api/employees/:id', authenticateAPI, (req, res) => {
  const db = getDatabase();
  db.get('SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL', [req.params.id], (err, employee) => {
    db.close();
    if (err || !employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    res.json(employee);
  });
});

router.post('/api/employees', authenticateAPI, ensureAdminAPI, (req, res) => {
  const employee = req.body;
  if (!employee.full_name || !employee.email || !/^[0-9]{10}$/.test(employee.mobile || '') || !employee.department_id || !employee.designation || !employee.salary || Number(employee.salary) <= 0 || !employee.joining_date) {
    return res.status(400).json({ message: 'Validation failed. Please check employee data.' });
  }

  generateEmployeeCode((err, employee_code) => {
    if (err) {
      return res.status(500).json({ message: 'Unable to generate employee code.' });
    }
    const db = getDatabase();
    db.run(
      `INSERT INTO employees (employee_code, full_name, email, mobile, department_id, designation, salary, joining_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [employee_code, employee.full_name, employee.email, employee.mobile, employee.department_id, employee.designation, employee.salary, employee.joining_date, employee.status || 'Active'],
      function (insertErr) {
        db.close();
        if (insertErr) {
          return res.status(400).json({ message: insertErr.message.includes('UNIQUE constraint failed') ? 'Email already exists.' : 'Unable to create employee.' });
        }
        res.status(201).json({ id: this.lastID, employee_code });
      }
    );
  });
});

router.put('/api/employees/:id', authenticateAPI, ensureAdminAPI, (req, res) => {
  const employee = req.body;
  if (!employee.full_name || !employee.email || !/^[0-9]{10}$/.test(employee.mobile || '') || !employee.department_id || !employee.designation || !employee.salary || Number(employee.salary) <= 0 || !employee.joining_date) {
    return res.status(400).json({ message: 'Validation failed. Please check employee data.' });
  }
  const db = getDatabase();
  db.run(
    `UPDATE employees SET full_name = ?, email = ?, mobile = ?, department_id = ?, designation = ?, salary = ?, joining_date = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [employee.full_name, employee.email, employee.mobile, employee.department_id, employee.designation, employee.salary, employee.joining_date, employee.status || 'Active', req.params.id],
    function (err) {
      db.close();
      if (err) {
        return res.status(400).json({ message: err.message.includes('UNIQUE constraint failed') ? 'Email already exists.' : 'Unable to update employee.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Employee not found.' });
      }
      res.json({ message: 'Employee updated successfully.' });
    }
  );
});

router.delete('/api/employees/:id', authenticateAPI, ensureAdminAPI, (req, res) => {
  const db = getDatabase();
  db.run(
    `UPDATE employees SET deleted_at = datetime('now'), status = 'Inactive', updated_at = datetime('now') WHERE id = ?`,
    [req.params.id],
    function (err) {
      db.close();
      if (err) {
        return res.status(500).json({ message: 'Unable to delete employee.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Employee not found.' });
      }
      res.json({ message: 'Employee deleted successfully.' });
    }
  );
});

module.exports = router;
