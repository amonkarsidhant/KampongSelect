"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, Circle } from "lucide-react";
import RoleSwitcher from "@/components/RoleSwitcher";
import { findConflicts } from "@/lib/cascade";
import {
  nudgePlayersAction,
  updatePlayerAvailabilityAction,
  savePlayerAction,
} from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  Match,
  Player,
  Team,
  Availability,
  Selection,
  MatchStatus,
} from "@/lib/types";

interface Props {
  me: Player;
  teams: Team[];
  matches: Match[];
  players: Player[];
  availability: Availability[];
  selections: Selection[];
  matchStatus: MatchStatus[];
}

export default function AdminView({
  me,
  teams,
  matches: initialMatches,
  players,
  availability,
  selections,
  matchStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "weekend" | "squad" | "matches" | "players"
  >("weekend");
  const [matches] = useState<Match[]>(initialMatches);
  const [, startTransition] = useTransition();

  const weekends = useMemo(() => groupByWeekend(matches), [matches]);
  const [activeWeekend, setActiveWeekend] = useState<string>(
    weekends[0]?.id ?? "",
  );
  const weekend = weekends.find((w) => w.id === activeWeekend);

  const playerStats = useMemo(() => {
    return players.map((p) => {
      const gamesPlayed = selections.filter((s) => {
        const m = matches.find((x) => x.id === s.match_id);
        return s.player_id === p.id && m && new Date(m.match_date) < new Date();
      }).length;
      const responses = availability.filter((a) => a.player_id === p.id).length;
      const totalPossible = weekends.length * 2;
      const responseRate =
        totalPossible > 0 ? Math.round((responses / totalPossible) * 100) : 0;
      return { ...p, gamesPlayed, responseRate };
    });
  }, [players, selections, matches, availability, weekends]);

  const stats = useMemo(() => {
    if (!weekend) return null;
    const dates = weekend.dates;
    const respondedSet = new Set(
      availability
        .filter((a) => dates.includes(a.match_date))
        .map((a) => `${a.player_id}|${a.match_date}`),
    );
    const totalNeeded = players.length * dates.length;
    const responded = respondedSet.size;
    const availYes = availability.filter(
      (a) => dates.includes(a.match_date) && a.status === "yes",
    ).length;
    return { totalPlayers: players.length, responded, totalNeeded, availYes };
  }, [weekend, availability, players]);

  const teamProgress = useMemo(() => {
    if (!weekend) return [];
    return weekend.matches.map((m) => {
      const picked = selections.filter((s) => s.match_id === m.id).length;
      const status =
        matchStatus.find((s) => s.match_id === m.id)?.state ?? "open";
      const team = teams.find((t) => t.code === m.team_code);
      return { match: m, picked, status, team };
    });
  }, [weekend, selections, matchStatus, teams]);

  const conflicts = useMemo(
    () => findConflicts(selections, matches),
    [selections, matches],
  );
  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const nonResponders = useMemo(() => {
    if (!weekend) return [];
    const responded = new Set<string>();
    for (const a of availability) {
      if (weekend.dates.includes(a.match_date)) responded.add(a.player_id);
    }
    return players.filter((p) => !responded.has(p.id));
  }, [weekend, availability, players]);

  async function nudgeNonResponders() {
    if (nonResponders.length === 0)
      return alert("Everyone has responded already.");
    if (confirm(`Send Pulse nudges to ${nonResponders.length} players?`)) {
      startTransition(async () => {
        const res = await nudgePlayersAction(
          nonResponders.map((p) => p.id),
          weekend?.label ?? "upcoming weekend",
        );
        if (res.success) alert(`Pulse Engine: ${res.count} nudges sent.`);
      });
    }
  }

  async function toggleAvailability(
    playerId: string,
    date: string,
    current: string | null,
    currentExcused: boolean,
  ) {
    let next: { status: "yes" | "no" | null; excused: boolean };

    if (current === "yes") next = { status: "no", excused: false };
    else if (current === "no" && !currentExcused)
      next = { status: "no", excused: true };
    else if (current === "no" && currentExcused)
      next = { status: null, excused: false };
    else next = { status: "yes", excused: false };

    startTransition(async () => {
      await updatePlayerAvailabilityAction(
        playerId,
        date,
        next.status,
        next.excused,
      );
    });
  }

  // Waterfall visualization calculation
  const totalYes = stats?.availYes ?? 0;
  let remainingPool = totalYes;
  const waterfallData = teamProgress
    .sort((a, b) => (a.team?.tier_order ?? 99) - (b.team?.tier_order ?? 99))
    .map((tp) => {
      const isRec = tp.team?.kind === "recreational";
      const poolAtStart = isRec ? totalYes : remainingPool; // Rec teams pick from full pool
      if (!isRec && tp.status === "confirmed") remainingPool -= 11;
      return { ...tp, poolAtStart };
    });

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="pt-8 pb-4">
          <RoleSwitcher current="admin" userRole={me.user_role} />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            Command Centre
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-6 mt-4 border-b border-border/50 overflow-x-auto hide-scrollbar">
          {(["weekend", "squad", "matches", "players"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-bold uppercase tracking-widest font-mono transition-colors relative whitespace-nowrap",
                activeTab === tab
                  ? "text-crimson"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {tab === "weekend"
                ? "War Room"
                : tab === "squad"
                  ? "Squad Intel"
                  : tab === "matches"
                    ? "Fixtures"
                    : "Players"}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "weekend" && weekend && stats && (
            <motion.div
              key="weekend"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8"
            >
              {/* Weekend Selector */}
              <select
                value={activeWeekend}
                onChange={(e) => setActiveWeekend(e.target.value)}
                className="bg-transparent font-display text-2xl font-bold focus:outline-none mb-8 cursor-pointer hover:text-crimson transition-colors"
              >
                {weekends.map((w) => (
                  <option
                    key={w.id}
                    value={w.id}
                    className="bg-surface text-base font-sans"
                  >
                    {w.label}
                  </option>
                ))}
              </select>

              {/* Timeline War Room View */}
              <div className="grid grid-cols-2 gap-8 mb-12 relative">
                {/* Conflict Rendering over timeline */}
                {conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 -translate-x-1/2 top-4 z-10 flex flex-col items-center"
                  >
                    <div className="size-8 rounded-full bg-danger/20 border border-danger flex items-center justify-center text-danger animate-pulse-slow shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <AlertTriangle size={16} />
                    </div>
                    <span className="text-[10px] font-mono mt-1 text-danger">
                      {playersById.get(c.playerId)?.full_name}
                    </span>
                  </div>
                ))}

                {weekend.dates.map((date) => {
                  const dayName = new Date(date).toLocaleDateString("en-GB", {
                    weekday: "long",
                  });
                  const dayMatches = teamProgress.filter(
                    (tp) => tp.match.match_date === date,
                  );
                  return (
                    <div key={date}>
                      <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-muted mb-4 border-b border-border/50 pb-2">
                        {dayName}
                      </h3>
                      <div className="space-y-3">
                        {dayMatches.map((tp) => (
                          <div
                            key={tp.match.id}
                            className={cn(
                              "p-4 rounded-xl border transition-all",
                              tp.status === "confirmed"
                                ? "bg-success/5 border-success/30"
                                : tp.status === "selecting"
                                  ? "bg-warning/5 border-warning/30"
                                  : "bg-danger/5 border-danger/30",
                            )}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-display font-bold text-lg">
                                {tp.team?.code}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded",
                                  tp.status === "confirmed"
                                    ? "bg-success/20 text-success"
                                    : tp.status === "selecting"
                                      ? "bg-warning/20 text-warning"
                                      : "bg-danger/20 text-danger",
                                )}
                              >
                                {tp.status}
                              </span>
                            </div>
                            <p className="text-sm text-foreground-muted mt-1">
                              vs {tp.match.opposition}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Rings */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="p-6 rounded-2xl bg-surface border border-border">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-muted mb-6">
                      Response Rate
                    </h3>
                    <div className="relative size-32 mx-auto">
                      <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-border"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={283}
                          strokeDashoffset={
                            283 - 283 * (stats.responded / stats.totalNeeded)
                          }
                          strokeLinecap="round"
                          className="text-crimson"
                          initial={{ strokeDashoffset: 283 }}
                          animate={{
                            strokeDashoffset:
                              283 - 283 * (stats.responded / stats.totalNeeded),
                          }}
                          transition={{ duration: 1, delay: 0.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-3xl font-bold">
                          {Math.round(
                            (stats.responded / stats.totalNeeded) * 100,
                          )}
                          %
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={nudgeNonResponders}
                      disabled={nonResponders.length === 0}
                      className="w-full mt-6 py-2 bg-crimson text-white font-bold rounded-lg hover:bg-crimson-500 disabled:opacity-50 transition"
                    >
                      Nudge {nonResponders.length} Players
                    </button>
                  </div>
                </div>

                {/* Waterfall */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-border">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-muted mb-6">
                    Cascade Flow
                  </h3>
                  <div className="space-y-4">
                    {waterfallData.map((tp, i) => (
                      <div key={tp.match.id} className="relative pl-6">
                        {/* Connecting line */}
                        {i > 0 && (
                          <div className="absolute left-2.5 top-[-16px] bottom-6 w-[2px] bg-border/50" />
                        )}
                        <div className="absolute left-1.5 top-2 size-2 rounded-full bg-border" />

                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">
                            {tp.team?.code}
                          </span>
                          <span className="font-mono text-[10px] text-foreground-muted">
                            Pool: {tp.poolAtStart}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(tp.picked / 11) * 100}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={cn(
                              "h-full",
                              tp.status === "confirmed"
                                ? "bg-success"
                                : "bg-blue-500",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "squad" && (
            <motion.div
              key="squad"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="mb-6 p-4 rounded-xl border border-warning/20 bg-warning/5 text-xs text-warning/80">
                Tip: Click the reliability score to manually override
                availability for the active weekend ({weekend?.label}). Cycles
                through: Yes (Green) → No (Red) → Excused (Blue) → Clear.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {playerStats
                  .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                  .map((p) => {
                    const satRec = availability.find(
                      (a) =>
                        a.player_id === p.id &&
                        a.match_date === weekend?.dates[0],
                    );
                    const satAvail = satRec?.status ?? null;
                    const satExcused = satRec?.is_excused ?? false;

                    const sunRec = availability.find(
                      (a) =>
                        a.player_id === p.id &&
                        a.match_date === weekend?.dates[1],
                    );
                    const sunAvail = sunRec?.status ?? null;
                    const sunExcused = sunRec?.is_excused ?? false;

                    return (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-surface border border-border shadow-sm group transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-display text-lg font-bold">
                              {p.full_name}
                            </h3>
                            <p className="font-mono text-[10px] uppercase text-foreground-muted mt-1">
                              {p.role} · Tier {toRoman(p.tier)}
                            </p>
                          </div>
                          {p.active ? (
                            <CheckCircle size={16} className="text-success" />
                          ) : (
                            <Circle size={16} className="text-border" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-background rounded-lg p-3">
                            <p className="font-mono text-[9px] uppercase text-foreground-muted">
                              Caps
                            </p>
                            <p className="font-display text-2xl font-bold">
                              {p.gamesPlayed}
                            </p>
                          </div>
                          <div
                            className="bg-background rounded-lg p-3 group relative cursor-pointer overflow-hidden active:scale-95 transition-transform"
                            onClick={() =>
                              weekend &&
                              toggleAvailability(
                                p.id,
                                weekend.dates[0],
                                satAvail,
                                satExcused,
                              )
                            }
                          >
                            <p className="font-mono text-[9px] uppercase text-foreground-muted flex justify-between">
                              <span>Reliability</span>
                              <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                                Override
                              </span>
                            </p>
                            <p
                              className={cn(
                                "font-display text-2xl font-bold transition-colors",
                                p.responseRate < 50
                                  ? "text-danger"
                                  : p.responseRate > 80
                                    ? "text-success"
                                    : "",
                              )}
                            >
                              {p.responseRate}%
                            </p>
                            <div className="absolute inset-x-0 bottom-0 h-1 flex">
                              <div
                                className={cn(
                                  "flex-1",
                                  satAvail === "yes"
                                    ? "bg-success"
                                    : satAvail === "no"
                                      ? satExcused
                                        ? "bg-blue-500"
                                        : "bg-danger"
                                      : "bg-transparent",
                                )}
                              />
                              <div
                                className={cn(
                                  "flex-1",
                                  sunAvail === "yes"
                                    ? "bg-success"
                                    : sunAvail === "no"
                                      ? sunExcused
                                        ? "bg-blue-500"
                                        : "bg-danger"
                                      : "bg-transparent",
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {activeTab === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="p-6 bg-surface border border-border rounded-2xl mb-8">
                <h3 className="font-display text-xl mb-4">
                  Fixtures Management
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  Fixture management happens via SQL import or dashboard sync in
                  this version.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "players" && (
            <motion.div
              key="players"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <PlayerManager players={players} />
            </motion.div>
          )}
        </AnimatePresence>

        {weekends.length === 0 && activeTab === "weekend" && (
          <div className="mt-12 text-center">
            <svg
              viewBox="0 0 200 100"
              className="w-full max-w-md mx-auto opacity-20"
            >
              <rect
                x="10"
                y="10"
                width="180"
                height="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="80"
                y="10"
                width="40"
                height="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="80"
                y1="30"
                x2="120"
                y2="30"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <line
                x1="80"
                y1="70"
                x2="120"
                y2="70"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            </svg>
            <h2 className="font-display text-2xl mt-6">
              No fixtures scheduled
            </h2>
            <p className="text-foreground-muted mt-2">Enjoy the weekend off.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function PlayerManager({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filteredPlayers = players.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleToggleActive(p: Player) {
    if (
      confirm(
        `Are you sure you want to ${p.active ? "deactivate" : "activate"} ${p.full_name}?`,
      )
    ) {
      startTransition(async () => {
        await savePlayerAction({ id: p.id, active: !p.active });
      });
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display text-2xl">Roster Management</h3>
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-crimson"
        />
      </div>

      <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-background/50 border-b border-border text-[10px] font-mono text-foreground-muted uppercase tracking-widest">
        <div className="col-span-3">Name</div>
        <div className="col-span-3">Email</div>
        <div className="col-span-2">Role / Tier</div>
        <div className="col-span-2">App Role</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      <div className="divide-y divide-border/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {filteredPlayers.map((p) => (
          <div
            key={p.id}
            className={cn(
              "grid grid-cols-12 gap-3 items-center px-4 py-3 transition-colors",
              p.active ? "hover:bg-white/[0.02]" : "opacity-50 grayscale",
            )}
          >
            <div className="col-span-3">
              <p className="font-bold text-sm">{p.full_name}</p>
              {p.kncb_id && (
                <p className="text-[10px] font-mono text-foreground-muted">
                  KNCB: {p.kncb_id}
                </p>
              )}
            </div>
            <div
              className="col-span-3 text-xs text-foreground-muted truncate"
              title={p.email}
            >
              {p.email}
            </div>
            <div className="col-span-2 text-xs">
              {p.role} {p.tier ? `(T${p.tier})` : ""}
            </div>
            <div className="col-span-2 text-xs uppercase font-mono tracking-widest">
              <span
                className={cn(
                  "px-2 py-0.5 rounded",
                  p.user_role === "admin"
                    ? "bg-danger/20 text-danger"
                    : p.user_role === "captain"
                      ? "bg-warning/20 text-warning"
                      : "bg-white/10 text-white",
                )}
              >
                {p.user_role}
              </span>
            </div>
            <div className="col-span-2 text-right flex justify-end gap-2">
              <button
                onClick={() => handleToggleActive(p)}
                className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted hover:text-foreground"
              >
                {p.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-foreground-muted mt-4">
        Note: Editing player details in v1 requires CSV sync or direct dashboard
        access. Activate/Deactivate is supported here.
      </p>
    </div>
  );
}

function toRoman(num: number | null) {
  if (!num) return "—";
  const romans = ["", "I", "II", "III", "IV", "V"];
  return romans[num] || num.toString();
}

interface WeekendBucket {
  id: string;
  label: string;
  dates: string[];
  matches: Match[];
}

function groupByWeekend(matches: Match[]): WeekendBucket[] {
  const byDate = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = byDate.get(m.match_date) ?? [];
    arr.push(m);
    byDate.set(m.match_date, arr);
  }
  const buckets = new Map<string, WeekendBucket>();
  for (const date of Array.from(byDate.keys())) {
    const d = new Date(date);
    const day = d.getDay();
    const sat = new Date(d);
    if (day === 0) sat.setDate(d.getDate() - 1);
    if (day === 6) sat.setDate(d.getDate());
    const id = sat.toISOString().slice(0, 10);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const dates = [
      sat.toISOString().slice(0, 10),
      sun.toISOString().slice(0, 10),
    ];
    const label = `${sat.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    if (!buckets.has(id)) {
      buckets.set(id, { id, label, dates, matches: [] });
    }
    const bucket = buckets.get(id)!;
    bucket.matches.push(...(byDate.get(date) ?? []));
  }
  return Array.from(buckets.values()).sort((a, b) => a.id.localeCompare(b.id));
}
