/**
 * Decompresses the gzip CSV files and shows the first 5 rows to understand the schema
 */
import { createReadStream, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

async function decompress(input, output) {
  const src = createReadStream(input);
  const dest = createWriteStream(output);
  const gunzip = createGunzip();
  await pipeline(src, gunzip, dest);
  console.log(`✅ Decompressed: ${output}`);
}

await decompress('scripts/clubs_raw.csv.gz', 'scripts/clubs_raw.csv');
await decompress('scripts/players_raw.csv.gz', 'scripts/players_raw.csv');
