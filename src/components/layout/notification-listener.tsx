"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NotificationListener() {
  const [clubId, setClubId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // 1. Get the current user's club ID
    const fetchClub = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single();
      const cid = coach?.club_owners?.[0]?.club_id;
      if (cid) setClubId(cid);
    };
    fetchClub();
  }, []);

  useEffect(() => {
    if (!clubId) return;

    // 2. Subscribe to INSERT events on transfer_offers where to_club_id == my club
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfer_offers',
          filter: `to_club_id=eq.${clubId}`,
        },
        async (payload) => {
          // fetch player name
          const { data: player } = await supabase.from('players').select('name').eq('id', payload.new.target_player_id).single();
          
          toast("🚨 Nova Proposta de Transferência", {
            description: `Recebemos uma oferta milionária por ${player?.name || 'um jogador'}!`,
            action: {
              label: "Ver",
              onClick: () => router.push("/dashboard/negotiations"),
            },
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, router, supabase]);

  return null; // Invisible component
}
