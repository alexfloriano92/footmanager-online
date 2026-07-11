/**
 * Cria um único arquivo SQL limpo sem headers do Windows
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const outputFile = join(__dirname, '..', 'supabase', 'all_migrations_clean.sql');

const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.includes('all_migrations'))
  .sort();

let combined = `-- ============================================================
-- FootManager Online - ALL MIGRATIONS (combined clean)
-- Execute this entire file in the Supabase SQL Editor
-- ============================================================

`;

for (const file of files) {
  const filepath = join(migrationsDir, file);
  const content = readFileSync(filepath, 'utf-8');
  combined += `\n-- ============================================================\n`;
  combined += `-- FILE: ${file}\n`;
  combined += `-- ============================================================\n`;
  combined += content;
  combined += '\n';
}

writeFileSync(outputFile, combined, 'utf-8');
console.log(`✅ Arquivo criado: ${outputFile}`);
console.log(`   Tamanho: ${(combined.length / 1024).toFixed(1)} KB`);
