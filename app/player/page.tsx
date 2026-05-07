import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import PlayerView from "./PlayerView";
import type { Match, Player, Availability } from "@/lib/types";

// Get the dates for the upcoming weekend (next Sat + Sun)
function upcomingWeekend(): { sat: string; sun: string } {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun, 6 = Sat
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { sat: fmt(sat), sun: fmt(sun) };
}

export default async function PlayerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Player>();
  if (!player) redirect("/");

  const { sat, sun } = upcomingWeekend();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .in("match_date", [sat, sun])
    .order("start_time", { ascending: true });

  const { data: avail } = await supabase
    .from("availability")
    .select("*")
    .eq("player_id", player.id)
    .in("match_date", [sat, sun]);

  const { data: selections } = await supabase
    .from("selections")
    .select("*, matches!inner(*)")
    .eq("player_id", player.id)
    .in("matches.match_date", [sat, sun]);

  const { data: matchStatus } = await supabase
    .from("match_status")
    .select("*")
    .in("match_id", (matches ?? []).map((m) => m.id));

  return (
    <PlayerView
      player={player}
      sat={sat}
      sun={sun}
      matches={(matches ?? []) as Match[]}
      initialAvailability={(avail ?? []) as Availability[]}
      selections={(selections ?? []) as any[]}
      matchStatus={(matchStatus ?? []) as any[]}
    />
  );
}
