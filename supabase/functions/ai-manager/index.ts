import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Basic AI Manager Logic

    // 1. Check AI clubs that need a coach
    const { data: aiClubs } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('is_ai_controlled', true)
      .limit(50);
      
    if (!aiClubs) return new Response("No AI clubs found");

    // Implement logic where AI managers buy/sell players, 
    // respond to offers, and adjust tactics based on their current situation.
    
    // Process pending offers to AI clubs
    const { data: pendingOffers } = await supabase
      .from('offers')
      .select('*, player:players(overall, market_value)')
      .in('to_club_id', aiClubs.map(c => c.id))
      .eq('status', 'pending');
      
    if (pendingOffers) {
      for (const offer of pendingOffers) {
        // Simple logic: accept if offer > market_value * 1.2
        const playerValue = offer.player.market_value;
        const acceptableAmount = playerValue * 1.2;
        
        if (offer.offered_amount >= acceptableAmount) {
          // Accept
          await supabase.rpc('complete_transfer', {
            p_offer_id: offer.id,
            p_player_id: offer.player_id,
            p_from_club_id: offer.to_club_id,
            p_to_club_id: offer.from_club_id,
            p_transfer_fee: offer.offered_amount,
            p_weekly_salary: offer.proposed_weekly_salary,
            p_contract_years: offer.proposed_contract_years
          });
        } else {
          // Reject
          await supabase.from('offers').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', offer.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processedOffers: pendingOffers?.length || 0 }), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
