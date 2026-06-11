const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, '..', 'data', 'employees.db');
const schemaFile = path.join(__dirname, '..', 'data', 'database.sql');

function createDatabaseFile() {
  const folder = path.dirname(dbFile);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    const db = new sqlite3.Database(dbFile);
    const schema = fs.readFileSync(schemaFile, 'utf-8');
    db.exec(schema, (err) => {
      if (err) {
        console.error('Failed to initialize database schema:', err);
      } else {
        console.log('Database initialized at', dbFile);
      }
      db.close();
    });
  }
}

function initializeDatabase() {
  createDatabaseFile();
}

function getDatabase() {
  return new sqlite3.Database(dbFile);
}

module.exports = {
  initializeDatabase,
  getDatabase
};
