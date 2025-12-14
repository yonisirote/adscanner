import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'cache.db');
const dataDir = path.dirname(dbPath);

let db: any = null;
let SQL: any = null;

export async function getDb(): Promise<any> {
  if (!db) {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      SQL = await initSqlJs();

      // Load existing database or create new one
      if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }
    } catch (error) {
      console.error(`Failed to connect to database at ${dbPath}:`, error);
      throw error;
    }
  }
  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(dbPath, buffer);
  }
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
