import { readFileSync } from 'fs';

function peek(file, rows = 3) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  console.log(`\n=== ${file} (${lines.length} total rows) ===`);
  lines.slice(0, rows).forEach(l => console.log(l));
}

peek('scripts/clubs_raw.csv', 2);
peek('scripts/players_raw.csv', 2);
