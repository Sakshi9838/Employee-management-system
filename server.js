const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const { initializeDatabase } = require('./config/db');
const { router: authRoutes } = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const app = express();

initializeDatabase();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'employee-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));

app.use(authRoutes);
app.use(employeeRoutes);

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('welcome', { isWelcome: true });
});

app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Employee Management System listening on http://localhost:${PORT}`);
});
