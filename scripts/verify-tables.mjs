import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = ['tactics', 'training_sessions', 'transfer_offers'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    console.log(`${table}: ${error ? '❌ ERRO - ' + error.message : '✅ OK'}`);
  }
}
check();
