import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'cache.db');
const dataDir = path.dirname(dbPath);

let db: any = null;
let SQL: any = null;
let initialized = false;

async function runMigrations(): Promise<void> {
  if (initialized) return;
  
  try {
    const db = await getDb();

    // Check if old table schema exists and drop it to recreate with new schema
    try {
      const tables = db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="url_checks"');
      if (tables && tables.length > 0) {
        // Table exists, check if it has old columns
        const columns = db.exec('PRAGMA table_info(url_checks)');
        const hasOldSchema = columns[0]?.values?.some((col: any) => 
          col[1] === 'urlvoid_score' || col[1] === 'scamadvisor_score'
        );
        
        if (hasOldSchema) {
          console.log('[db] Detected old schema, dropping and recreating table');
          db.run('DROP TABLE IF EXISTS url_checks');
        }
      }
    } catch (e) {
      // If check fails, just proceed - table might not exist
    }

    // Create table if it doesn't exist (or recreate with new schema)
    db.run(`
      CREATE TABLE IF NOT EXISTS url_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL UNIQUE,
        virustotal_score REAL,
        virustotal_data TEXT,
        googlesafebrowsing_score REAL,
        googlesafebrowsing_data TEXT,
        combined_risk_score REAL NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);

    // Create index on domain for faster lookups
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_domain ON url_checks(domain);
    `);

    // Create index on expiresAt for cleanup queries
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON url_checks(expires_at);
    `);

    saveDb();
    initialized = true;
    console.log('[db] Migration completed successfully');
  } catch (error) {
    console.error('[db] Migration failed:', error);
    throw error;
  }
}

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

      // Run migrations
      await runMigrations();
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
