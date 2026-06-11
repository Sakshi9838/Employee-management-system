const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'employees.db');
const schemaFile = path.join(dataDir, 'database.sql');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(schemaFile)) {
  console.error('Schema file not found:', schemaFile);
  process.exit(1);
}

if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Existing database removed:', dbFile);
}

const schema = fs.readFileSync(schemaFile, 'utf-8');
const db = new sqlite3.Database(dbFile);

db.exec(schema, (err) => {
  if (err) {
    console.error('Failed to execute schema:', err.message);
    process.exit(1);
  }
  console.log('Database created successfully at', dbFile);
  db.close();
});
