/**
 * FootManager Online - Run Migrations via Supabase SQL API
 * Uses the pg_dump endpoint - execute as: node scripts/migrate-http.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lslphvgdjrftjtxzkolu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHBodmdkanJmdGp0eHprb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc4MDAzMiwiZXhwIjoyMDk5MzU2MDMyfQ.mGAu8t8knngVrFg5RypUfvuqKA0S3UCdrzZOooN1v3s';

// Supabase has a SQL endpoint through the management API
// We need the personal access token (not service role) for this.
// Alternative: use pg.js through the IPv4 direct address

// First, let's try to find the actual IP of the Supabase project using their API
async function getProjectInfo() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  const data = await res.json();
  console.log('Supabase host:', data.host);
  return data.host;
}

// Try direct SQL via database API endpoint
async function executeSQL(statements) {
  // The Supabase endpoint for executing SQL is available through their API
  // We'll try to create a function first via PostgREST
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/version`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  const text = await res.text();
  console.log('Version endpoint:', res.status, text.substring(0, 100));
}

async function main() {
  await getProjectInfo();
  await executeSQL('SELECT 1');
  
  // Show instructions for manual migration
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  console.log('\n=== MIGRATION FILES ===');
  for (const file of files) {
    console.log(`- ${file}: ${join(migrationsDir, file)}`);
  }
}

main().catch(console.error);
