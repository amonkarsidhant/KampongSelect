"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, Download, AlertTriangle, Users, Calendar, CheckCircle, Circle, Plus, Trash2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import { findConflicts } from "@/lib/cascade";
import type { Match, Player, Team, Availability, Selection, MatchStatus } from "@/lib/types";

interface Props {
  me: Player;
  teams: Team[];
  matches: Match[];
  players: Player[];
  availability: Availability[];
  selections: Selection[];
  matchStatus: MatchStatus[];
}

export default function AdminView({ me, teams, matches: initialMatches, players, availability, selections, matchStatus }: Props) {
  const [showConflicts, setShowConflicts] = useState(false);
  const [showMatchManager, setShowMatchManager] = useState(false);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Group matches by weekend
  const weekends = useMemo(() => groupByWeekend(matches), [matches]);
  const [activeWeekend, setActiveWeekend] = useState<string>(weekends[0]?.id ?? "");
  const weekend = weekends.find((w) => w.id === activeWeekend);

  const stats = useMemo(() => {
    if (!weekend) return null;
    const dates = weekend.dates;
    const respondedSet = new Set(
      availability.filter((a) => dates.includes(a.match_date)).map((a) => `${a.player_id}|${a.match_date}`)
    );
    const totalNeeded = players.length * dates.length;
    const responded = respondedSet.size;
    const availYes = availability.filter((a) => dates.includes(a.match_date) && a.status === "yes").length;
    return { totalPlayers: players.length, responded, totalNeeded, availYes };
  }, [weekend, availability, players]);

  const teamProgress = useMemo(() => {
    if (!weekend) return [];
    return weekend.matches.map((m) => {
      const picked = selections.filter((s) => s.match_id === m.id).length;
      const status = matchStatus.find((s) => s.match_id === m.id)?.state ?? "open";
      const team = teams.find((t) => t.code === m.team_code);
      return { match: m, picked, status, team };
    });
  }, [weekend, selections, matchStatus, teams]);

  const conflicts = useMemo(() => findConflicts(selections, matches), [selections, matches]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const nonResponders = useMemo(() => {
    if (!weekend) return [];
    const responded = new Set<string>();
    for (const a of availability) {
      if (weekend.dates.includes(a.match_date)) responded.add(a.player_id);
    }
    return players.filter((p) => !responded.has(p.id));
  }, [weekend, availability, players]);

  async function nudgeNonResponders() {
    if (nonResponders.length === 0) {
      alert("Everyone has responded already.");
      return;
    }
    const ok = confirm(`Send a reminder to ${nonResponders.length} players who haven't responded for ${weekend?.label}?`);
    if (ok) alert(`Reminder queued for ${nonResponders.length} players.`);
  }

  function exportTeamSheets() {
    if (!weekend) return;
    const lines: string[] = [`Team sheets — ${weekend.label}`, ""];
    for (const tp of teamProgress) {
      const picks = selections.filter((s) => s.match_id === tp.match.id);
      lines.push(`${tp.match.team_code} vs ${tp.match.opposition} — ${tp.match.match_date}`);
      lines.push(`Venue: ${tp.match.venue ?? "TBC"}`);
      if (picks.length === 0) {
        lines.push("  (no XI confirmed)");
      } else {
        picks.forEach((p, i) => {
          const player = playersById.get(p.player_id);
          lines.push(`  ${i + 1}. ${player?.full_name ?? "Unknown"}`);
        });
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-sheets-${weekend.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddMatch(newMatch: any) {
    startTransition(async () => {
      const { data, error } = await supabase.from("matches").insert(newMatch).select().single();
      if (data) {
        setMatches(prev => [...prev, data as Match]);
      } else if (error) {
        alert("Failed to add match: " + error.message);
      }
    });
  }

  async function handleDeleteMatch(id: string) {
    if (!confirm("Are you sure you want to delete this match?")) return;
    startTransition(async () => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (!error) {
        setMatches(prev => prev.filter(m => m.id !== id));
      } else {
        alert("Failed to delete match: " + error.message);
      }
    });
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Header me={me} />
        <RoleSwitcher current="admin" userRole={me.user_role} />

        <div className="flex justify-between items-center mt-6 mb-4">
          <div className="flex gap-2 flex-wrap">
            {weekends.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWeekend(w.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                  activeWeekend === w.id
                    ? "border-stone-100/30 bg-stone-100/[0.08]"
                    : "border-stone-100/10 hover:border-stone-100/20 text-stone-400"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowMatchManager(!showMatchManager)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-stone-100/10 hover:bg-stone-100/[0.04] flex items-center gap-1.5"
          >
            <Plus size={14} /> {showMatchManager ? "Hide Manager" : "Manage Fixtures"}
          </button>
        </div>

        {showMatchManager && (
          <MatchManager teams={teams} onAdd={handleAddMatch} matches={matches} onDelete={handleDeleteMatch} />
        )}

        {!showMatchManager && weekend && stats && (
          <>
            <h2 className="text-xl font-semibold mt-6 mb-4">{weekend.label}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Stat label="Squad size" value={stats.totalPlayers} icon={<Users size={12} />} />
              <Stat
                label="Responses"
                value={`${stats.responded}/${stats.totalNeeded}`}
                icon={<CheckCircle size={12} />}
                accent="info"
              />
              <Stat label="Said Yes" value={stats.availYes} icon={<Calendar size={12} />} accent="success" />
              <Stat
                label="Conflicts"
                value={conflicts.length}
                icon={<AlertTriangle size={12} />}
                accent={conflicts.length > 0 ? "danger" : "stone"}
                onClick={() => setShowConflicts((v) => !v)}
              />
            </div>

            {showConflicts && (
              <div className="mb-6 p-4 rounded-lg border border-rose-500/30 bg-rose-950/15">
                <p className="text-sm font-medium text-rose-300 mb-2">Double-bookings</p>
                {conflicts.length === 0 ? (
                  <p className="text-xs text-stone-300">No conflicts — every player is in at most one team per date.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {conflicts.map((c, i) => (
                      <li key={i} className="text-stone-300">
                        <span className="font-medium text-rose-200">{playersById.get(c.playerId)?.full_name ?? "Unknown"}</span>
                        {" "}is selected for {c.teams.join(", ")} on {c.date}.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Selection cascade</p>
              <div className="border border-stone-100/10 rounded-lg overflow-hidden">
                {teamProgress.map((tp, i) => (
                  <div
                    key={tp.match.id}
                    className={`grid grid-cols-12 gap-3 items-center px-4 py-3 text-sm ${
                      i > 0 ? "border-t border-stone-100/[0.06]" : ""
                    }`}
                  >
                    <div className="col-span-2 font-medium">{tp.match.team_code}</div>
                    <div className="col-span-5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-stone-100/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            tp.status === "confirmed"
                              ? "bg-emerald-500"
                              : tp.picked > 0
                              ? "bg-blue-500"
                              : "bg-stone-600"
                          }`}
                          style={{ width: `${(tp.picked / 11) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 min-w-[36px]">{tp.picked}/11</span>
                    </div>
                    <div className="col-span-2 text-xs text-stone-400">
                      {tp.team?.tier_order ? `Tier ${tp.team.tier_order}` : "Rec"}
                    </div>
                    <div className="col-span-2 text-xs text-stone-400">
                      {new Date(tp.match.match_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <StatusBadge state={tp.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={nudgeNonResponders}
                className="px-3 py-2 text-xs font-medium rounded-md border border-stone-100/15 hover:bg-stone-100/[0.04] flex items-center gap-1.5"
              >
                <Bell size={12} /> Nudge {nonResponders.length} non-responder{nonResponders.length === 1 ? "" : "s"}
              </button>
              <button
                onClick={exportTeamSheets}
                className="px-3 py-2 text-xs font-medium rounded-md border border-stone-100/15 hover:bg-stone-100/[0.04] flex items-center gap-1.5"
              >
                <Download size={12} /> Export team sheets
              </button>
              <button
                onClick={() => setShowConflicts((v) => !v)}
                className="px-3 py-2 text-xs font-medium rounded-md border border-stone-100/15 hover:bg-stone-100/[0.04] flex items-center gap-1.5"
              >
                <AlertTriangle size={12} /> {showConflicts ? "Hide" : "Check"} conflicts
              </button>
            </div>
          </>
        )}

        {weekends.length === 0 && !showMatchManager && (
          <p className="mt-6 text-sm text-stone-400">No upcoming matches in the next 14 days.</p>
        )}
      </div>
    </main>
  );
}

function MatchManager({ teams, onAdd, matches, onDelete }: { teams: Team[]; onAdd: (m: any) => void; matches: Match[]; onDelete: (id: string) => void }) {
  const [newMatch, setNewMatch] = useState({
    team_code: teams[0]?.code ?? "",
    match_date: new Date().toISOString().slice(0, 10),
    opposition: "",
    venue: "",
    is_home: true,
    start_time: "11:00:00",
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="p-4 rounded-lg border border-stone-100/10 bg-stone-100/[0.02]">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Plus size={14} className="text-stone-400" />
          Add New Fixture
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[10px] uppercase text-stone-500 font-mono">Team</span>
            <select
              value={newMatch.team_code}
              onChange={(e) => setNewMatch({ ...newMatch, team_code: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-100/10 rounded-md p-2 text-sm text-stone-300"
            >
              {teams.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase text-stone-500 font-mono">Date</span>
            <input
              type="date"
              value={newMatch.match_date}
              onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-100/10 rounded-md p-2 text-sm text-stone-300"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase text-stone-500 font-mono">Opposition</span>
            <input
              type="text"
              placeholder="e.g. VRA 1"
              value={newMatch.opposition}
              onChange={(e) => setNewMatch({ ...newMatch, opposition: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-100/10 rounded-md p-2 text-sm text-stone-300"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase text-stone-500 font-mono">Venue</span>
            <input
              type="text"
              placeholder="e.g. Maarschalkerweerd"
              value={newMatch.venue}
              onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-100/10 rounded-md p-2 text-sm text-stone-300"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase text-stone-500 font-mono">Start Time</span>
            <input
              type="time"
              value={newMatch.start_time.slice(0, 5)}
              onChange={(e) => setNewMatch({ ...newMatch, start_time: e.target.value + ":00" })}
              className="mt-1 w-full bg-stone-900 border border-stone-100/10 rounded-md p-2 text-sm text-stone-300"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={() => {
                onAdd({
                  ...newMatch,
                  weekend_day: new Date(newMatch.match_date).getDay() === 0 ? "sunday" : "saturday",
                });
                setNewMatch({ ...newMatch, opposition: "", venue: "" });
              }}
              className="w-full bg-stone-100 text-stone-900 h-9 rounded-md text-xs font-medium hover:bg-white transition-colors"
            >
              Save Fixture
            </button>
          </div>
        </div>
      </div>

      <div className="border border-stone-100/10 rounded-lg overflow-hidden">
        <div className="bg-stone-100/[0.03] px-4 py-2 border-b border-stone-100/10 flex justify-between items-center">
          <p className="text-[10px] uppercase text-stone-500 font-mono">Existing Fixtures</p>
          <span className="text-[10px] text-stone-500 font-mono">{matches.length} Total</span>
        </div>
        <div className="divide-y divide-stone-100/[0.06]">
          {matches
            .sort((a, b) => a.match_date.localeCompare(b.match_date))
            .map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between hover:bg-stone-100/[0.01] transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-kampong-red">{m.team_code}</span>
                    <span className="text-sm font-medium">vs {m.opposition}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-stone-500">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {m.match_date} ({m.weekend_day})</span>
                    <span className="flex items-center gap-1"><MapPin size={10} /> {m.venue ?? "No venue"}</span>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(m.id)}
                  className="p-1.5 text-stone-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function Header({ me }: { me: Player }) {
  return (
    <div className="flex items-center gap-3 pb-4 mb-2 border-b border-stone-100/10">
      <div className="w-9 h-9 rounded-full bg-kampong-red flex items-center justify-center text-white font-semibold text-sm">
        K
      </div>
      <div>
        <p className="font-semibold leading-tight">KampongSelect</p>
        <p className="text-xs text-stone-400">Fixture Secretary — {me.full_name}</p>
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "info" | "success" | "danger" | "stone";
  onClick?: () => void;
}
function Stat({ label, value, icon, accent = "stone", onClick }: StatProps) {
  const colors = {
    info: "text-blue-300",
    success: "text-emerald-300",
    danger: "text-rose-300",
    stone: "text-stone-300",
  };
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-md border border-stone-100/10 bg-stone-100/[0.02] ${onClick ? "cursor-pointer hover:bg-stone-100/[0.04]" : ""}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-stone-500 flex items-center gap-1">
        <span className={colors[accent]}>{icon}</span>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    confirmed: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-300", icon: <CheckCircle size={10} /> },
    selecting: { label: "Selecting", cls: "bg-blue-500/10 text-blue-300", icon: <Circle size={10} /> },
    open: { label: "Open", cls: "bg-stone-500/10 text-stone-400", icon: <Circle size={10} /> },
  };
  const v = map[state] ?? map.open;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${v.cls}`}>
      {v.icon}
      {v.label}
    </span>
  );
}

interface WeekendBucket {
  id: string;
  label: string;
  dates: string[];
  matches: Match[];
}

function groupByWeekend(matches: Match[]): WeekendBucket[] {
  // Group consecutive Sat+Sun pairs
  const byDate = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = byDate.get(m.match_date) ?? [];
    arr.push(m);
    byDate.set(m.match_date, arr);
  }
  const buckets = new Map<string, WeekendBucket>();
  for (const date of byDate.keys()) {
    const d = new Date(date);
    const day = d.getDay();
    // Saturday is start of weekend bucket; Sunday joins the previous Saturday
    const sat = new Date(d);
    if (day === 0) sat.setDate(d.getDate() - 1); // Sunday → use Saturday's date
    if (day === 6) sat.setDate(d.getDate());
    const id = sat.toISOString().slice(0, 10);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const dates = [sat.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
    const label = `${sat.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    if (!buckets.has(id)) {
      buckets.set(id, { id, label, dates, matches: [] });
    }
    const bucket = buckets.get(id)!;
    bucket.matches.push(...(byDate.get(date) ?? []));
  }
  return Array.from(buckets.values()).sort((a, b) => a.id.localeCompare(b.id));
}
