import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import CaptainView from "./CaptainView";
import type { Match, Player, Team, Availability, Selection } from "@/lib/types";

export default async function CaptainPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("players")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Player>();

  if (!me || (me.user_role !== "captain" && me.user_role !== "admin")) redirect("/");
  // Captains can only select for the team they're assigned to.
  // Admins can pick any team — we default to H1 for them.
  const myTeamCode = me.captains_team ?? "H1";

  const today = new Date().toISOString().slice(0, 10);

  // Get all data for the next 14 days of matches
  const fortnight = new Date();
  fortnight.setDate(fortnight.getDate() + 14);
  const horizon = fortnight.toISOString().slice(0, 10);

  const [{ data: teams }, { data: matches }, { data: players }, { data: avail }, { data: selections }] = await Promise.all([
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").gte("match_date", today).lte("match_date", horizon).order("match_date"),
    supabase.from("players").select("*").eq("active", true),
    supabase.from("availability").select("*").gte("match_date", today).lte("match_date", horizon),
    supabase.from("selections").select("*"),
  ]);

  return (
    <CaptainView
      me={me}
      myTeamCode={myTeamCode}
      teams={(teams ?? []) as Team[]}
      matches={(matches ?? []) as Match[]}
      players={(players ?? []) as Player[]}
      availability={(avail ?? []) as Availability[]}
      selections={(selections ?? []) as Selection[]}
    />
  );
}
