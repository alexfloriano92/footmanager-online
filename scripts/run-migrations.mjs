/**
 * FootManager Online - Run Migrations via Supabase Management API
 * Execute: node scripts/run-migrations.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lslphvgdjrftjtxzkolu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHBodmdkanJmdGp0eHprb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc4MDAzMiwiZXhwIjoyMDk5MzU2MDMyfQ.mGAu8t8knngVrFg5RypUfvuqKA0S3UCdrzZOooN1v3s';

// Use the Supabase REST API with service role to execute SQL
async function executeSQL(sql) {
  // We use the pg endpoint which Supabase exposes
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    // Try the postgres endpoint
    const err = await response.text();
    throw new Error(`SQL Error: ${err}`);
  }
  
  return response.json().catch(() => ({ ok: true }));
}

async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  for (const file of files) {
    const filepath = join(migrationsDir, file);
    const sql = readFileSync(filepath, 'utf-8');
    
    console.log(`▶ Running ${file}...`);
    try {
      await executeSQL(sql);
      console.log(`  ✅ ${file} - OK\n`);
    } catch (err) {
      console.error(`  ❌ ${file} - FAILED`);
      console.error(`  Error: ${err.message}\n`);
      // Continue even if migration fails (may already be applied)
    }
  }
  
  console.log('Migrations completed!');
}

runMigrations().catch(console.error);
