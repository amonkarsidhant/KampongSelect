import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AdminView from "./AdminView";
import type { Match, Player, Team, Availability, Selection, MatchStatus } from "@/lib/types";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("players")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Player>();
  if (!me || me.user_role !== "admin") redirect("/");

  const today = new Date().toISOString().slice(0, 10);
  const fortnight = new Date();
  fortnight.setDate(fortnight.getDate() + 14);
  const horizon = fortnight.toISOString().slice(0, 10);

  const [
    { data: teams },
    { data: matches },
    { data: players },
    { data: avail },
    { data: selections },
    { data: matchStatus },
  ] = await Promise.all([
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").gte("match_date", today).lte("match_date", horizon).order("match_date"),
    supabase.from("players").select("*").eq("active", true),
    supabase.from("availability").select("*").gte("match_date", today).lte("match_date", horizon),
    supabase.from("selections").select("*"),
    supabase.from("match_status").select("*"),
  ]);

  return (
    <AdminView
      me={me}
      teams={(teams ?? []) as Team[]}
      matches={(matches ?? []) as Match[]}
      players={(players ?? []) as Player[]}
      availability={(avail ?? []) as Availability[]}
      selections={(selections ?? []) as Selection[]}
      matchStatus={(matchStatus ?? []) as MatchStatus[]}
    />
  );
}
