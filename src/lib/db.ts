import Database from 'better-sqlite3';
import { existsSync } from 'fs';

const DB_PATH = './database.sqlite';
const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS meetings (
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