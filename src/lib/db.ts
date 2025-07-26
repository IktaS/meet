import { Database } from 'bun:sqlite';

const DB_PATH = './database.sqlite';
const db = new Database(DB_PATH);

db.run(`CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  purpose TEXT,
  date TEXT,
  time TEXT,
  timezone TEXT,
  created_at TEXT
);`);

export default db;