import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Basic match simulation engine MVP
    
    // 1. Fetch live or scheduled matches that should be played now
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        home:clubs!home_club_id(id, name, prestige),
        away:clubs!away_club_id(id, name, prestige)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);
      
    if (error) throw error;
    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ message: "No matches to simulate" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];

    // 2. Simulate each match
    for (const match of matches) {
      // Simplified MVP Logic: Compare prestige/quality to get probabilities
      const homeStrength = match.home.prestige + 5; // Home advantage
      const awayStrength = match.away.prestige;
      
      const totalStrength = homeStrength + awayStrength;
      const homeProb = homeStrength / totalStrength;
      
      // Poisson distribution approximation
      const expectedGoals = 2.5; 
      const homeExpectedGoals = expectedGoals * homeProb;
      const awayExpectedGoals = expectedGoals * (1 - homeProb);
      
      // Randomize goals based on expected
      const homeScore = Math.max(0, Math.round(homeExpectedGoals + (Math.random() * 2 - 1)));
      const awayScore = Math.max(0, Math.round(awayExpectedGoals + (Math.random() * 2 - 1)));
      
      // Update match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          home_score: homeScore,
          away_score: awayScore,
          played_at: new Date().toISOString(),
          match_report: {
            narrative: [
              { minute: 90, type: 'narrative', text: `Partida encerrada. Placar final: ${homeScore} x ${awayScore}` }
            ]
          }
        })
        .eq('id', match.id);
        
      if (updateError) {
        console.error(`Failed to update match ${match.id}`, updateError);
      } else {
        results.push({ matchId: match.id, homeScore, awayScore });
      }
    }

    return new Response(JSON.stringify({ simulated: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
