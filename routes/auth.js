const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getDatabase } = require('../config/db');

const JWT_SECRET = 'employee-management-jwt-key';

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('403', { user: req.session.user });
}

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

router.get('/api-docs', (req, res) => {
  res.render('api-docs', { user: req.session ? req.session.user : null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDatabase();

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    db.close();
    if (err) {
      return res.render('login', { error: 'Unable to process login.' });
    }
    if (!user) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    const passwordMatched = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatched) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect('/dashboard');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = getDatabase();
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    db.close();
    if (err || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatched = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatched) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '2h'
    });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
});

function authenticateAPI(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = payload;
    next();
  });
}

function ensureAdminAPI(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
}

module.exports = {
  router,
  ensureAuthenticated,
  ensureAdmin,
  authenticateAPI,
  ensureAdminAPI
};
