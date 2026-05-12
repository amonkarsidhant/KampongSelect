
"use server";

import { sendNudgeEmail, sendSelectionNotification } from "@/lib/pulse";
import { createClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function nudgePlayersAction(playerIds: string[], weekendLabel: string) {
  const { data: { user: session } } = await createClient().auth.getUser();
  if (!session) throw new Error("Unauthorized");

  const supabase = createClient();
  const { data: players } = await supabase.from("players").select("email, full_name").in("id", playerIds);

  if (!players) return { success: false, error: "No players found" };

  const results = await Promise.all(
    players.map(p => sendNudgeEmail(p.email, p.full_name, weekendLabel))
  );

  return { success: true, count: results.filter(r => r.success).length };
}

export async function notifySelectionAction(matchId: string) {
  const { data: { user: session } } = await createClient().auth.getUser();
  if (!session) throw new Error("Unauthorized");

  const supabase = createClient();
  
  // Get match and selected players in parallel (Performance optimization)
  const [matchRes, selectionsRes] = await Promise.all([
    supabase.from("matches").select("*").eq("id", matchId).single(),
    supabase.from("selections").select("player_id").eq("match_id", matchId)
  ]);
  
  const match = matchRes.data;
  const selections = selectionsRes.data;
  
  if (!match || !selections) return { success: false, error: "Match or selections not found" };

  const playerIds = selections.map(s => s.player_id);
  
  // Fetch players and teams in parallel
  const [playersRes, teamsRes] = await Promise.all([
    supabase.from("players").select("email, full_name").in("id", playerIds),
    supabase.from("teams").select("*").order("tier_order", { ascending: true })
  ]);

  const players = playersRes.data;
  const teams = teamsRes.data;

  if (!players) return { success: false, error: "No players found" };

  const matchDetails = `${match.team_code} vs ${match.opposition} on ${match.match_date}`;
  
  const results = await Promise.all(
    players.map(p => sendSelectionNotification(p.email, p.full_name, matchDetails))
  );

  // TRIGGER CASCADE: Notify next captain in tier order
  const myTeam = teams?.find(t => t.code === match.team_code);
  
  if (myTeam?.tier_order) {
    const nextTeam = teams?.find(t => t.tier_order === myTeam.tier_order! + 1);
    if (nextTeam) {
      const { data: nextCaptains } = await supabase.from("players").select("email, full_name").eq("captains_team", nextTeam.code);
      
      if (nextCaptains && resend) {
        await Promise.all(nextCaptains.map(cap => 
          resend.emails.send({
            from: "KampongSelect <onboarding@resend.dev>",
            to: cap.email,
            subject: `📢 Your turn to pick: ${match.team_code} is finished`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hi ${cap.full_name},</h2>
                <p><strong>${match.team_code}</strong> has just confirmed their XI for ${match.match_date}.</p>
                <p>The player pool for <strong>${nextTeam.code}</strong> is now stable and ready for your selection.</p>
                <div style="margin-top: 30px;">
                  <a href="https://kampong-select.vercel.app" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Selection Hub</a>
                </div>
              </div>
            `
          })
        ));
      }
    }
  }

  return { success: true, count: results.filter(r => r.success).length };
}

export async function updatePlayerAvailabilityAction(playerId: string, matchDate: string, status: "yes" | "no" | null) {
  const { data: { user: session } } = await createClient().auth.getUser();
  if (!session) throw new Error("Unauthorized");

  const supabase = createClient();

  // Check if current user is admin
  const { data: admin } = await supabase.from("players").select("user_role").eq("auth_user_id", session.id).single();
  if (admin?.user_role !== "admin") throw new Error("Only admins can override availability");

  if (status === null) {
    await supabase.from("availability").delete().eq("player_id", playerId).eq("match_date", matchDate);
  } else {
    await supabase.from("availability").upsert({
      player_id: playerId,
      match_date: matchDate,
      status: status,
      updated_at: new Date().toISOString()
    }, { onConflict: "player_id,match_date" });
  }

  return { success: true };
}
