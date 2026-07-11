import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // 1. Process weekly wages for all clubs
    const { data: clubs } = await supabase.from('clubs').select('id');
    
    if (clubs) {
      for (const club of clubs) {
        await supabase.rpc('process_weekly_wages', { p_club_id: club.id });
      }
    }

    // 2. Reduce injury durations
    await supabase.from('players')
      .update({ status: 'active' }) // simplified, would normally check injury tables
      .eq('status', 'injured');

    // 3. Process daily training improvements
    // (MVP: simple randomized small growth for young players)

    return new Response(JSON.stringify({ success: true, processedClubs: clubs?.length || 0 }), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
