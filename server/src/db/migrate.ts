import { getDb, saveDb } from './index';

export async function migrate(): Promise<void> {
  try {
    console.log('Starting database migration...');
    const db = await getDb();

    // Create table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS url_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL UNIQUE,
        urlvoid_score INTEGER,
        urlvoid_data TEXT,
        scamadvisor_score INTEGER,
        scamadvisor_data TEXT,
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

    // Save database to file
    saveDb();

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.main) {
  migrate().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
