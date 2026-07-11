/**
 * FootManager Online - Run Migrations via direct PostgreSQL connection
 * Execute: node scripts/migrate.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Session pooler (port 5432)
const HOST = 'aws-0-sa-east-1.pooler.supabase.com';
const PORT = 6543;
const USER = 'postgres.lslphvgdjrftjtxzkolu';
const PASSWORD = 'Vodin4s@vozinha';
const DATABASE = 'postgres';

async function runMigrations() {
  const client = new Client({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!\n');

    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📦 Encontradas ${files.length} migrations\n`);

    for (const file of files) {
      const filepath = join(migrationsDir, file);
      const sql = readFileSync(filepath, 'utf-8');
      
      console.log(`▶ Executando ${file}...`);
      try {
        await client.query(sql);
        console.log(`  ✅ OK\n`);
      } catch (err) {
        // If object already exists, that's fine
        if (err.message.includes('already exists')) {
          console.log(`  ⚠️  Já existe (ignorando)\n`);
        } else {
          console.error(`  ❌ ERRO: ${err.message}\n`);
        }
      }
    }

    console.log('🎉 Migrations concluídas!');
  } catch (err) {
    console.error('❌ Falha na conexão:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();
