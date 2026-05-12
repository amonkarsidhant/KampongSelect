"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { Check, X, MapPin, Clock, Calendar, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import { CricketBall } from "@/components/ui/CricketBall";
import { motion, AnimatePresence } from "framer-motion";
import type { Match, Player, Availability, AvailStatus, Selection, MatchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  player: Player;
  sat: string;
  sun: string;
  matches: Match[];
  initialAvailability: Availability[];
  selections: Selection[];
  matchStatus: MatchStatus[];
}

export default function PlayerView({ player, matches, initialAvailability, selections, matchStatus }: Props) {
  const [activeTab, setActiveTab] = useState<"planner" | "fixtures">("planner");
  const [avail, setAvail] = useState<Record<string, { status: AvailStatus | null; note: string }>>(() => {
    const map: Record<string, { status: AvailStatus | null; note: string }> = {};
    for (const a of initialAvailability) {
      map[a.match_date] = { status: a.status, note: a.note ?? "" };
    }
    return map;
  });
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();
  const debounceTimer = useRef<Record<string, NodeJS.Timeout>>( {});

  const weekends = useMemo(() => groupByWeekend(matches), [matches]);

  function updateAvailability(date: string, updates: Partial<{ status: AvailStatus; note: string }>) {
    if (typeof navigator !== "undefined" && navigator.vibrate && updates.status) {
      navigator.vibrate(12);
    }

    const current = avail[date] || { status: null, note: "" };
    const nextStatus = updates.status !== undefined ? updates.status : current.status;
    const nextNote = updates.note !== undefined ? updates.note : current.note;

    setAvail((prev) => ({ ...prev, [date]: { status: nextStatus, note: nextNote } }));

    if (nextStatus) {
      if (debounceTimer.current[date]) clearTimeout(debounceTimer.current[date]);
      debounceTimer.current[date] = setTimeout(() => {
        startTransition(async () => {
          await supabase.from("availability").upsert(
            {
              player_id: player.id,
              match_date: date,
              status: nextStatus,
              note: nextNote || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "player_id,match_date" }
          );
        });
      }, 300);
    }
  }

  const selectedMatches = useMemo(() => {
    return matches.filter((m) => selections.some((s) => s.match_id === m.id));
  }, [matches, selections]);

  return (
    <main className="min-h-screen pb-20 bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6">
        <div className="pt-8 pb-4">
          <RoleSwitcher current="player" userRole={player.user_role} />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8">
            <div>
              <h1 className="font-display text-5xl font-bold tracking-tight leading-none text-white">
                Player Hub
              </h1>
              <p className="text-foreground-muted mt-2 font-mono text-xs uppercase tracking-widest">
                Kampong Cricket Club • {player.full_name}
              </p>
            </div>
            
            <div className="flex bg-surface p-1 rounded-xl border border-border">
              <button 
                onClick={() => setActiveTab("planner")}
                className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", activeTab === "planner" ? "bg-crimson text-white shadow-lg" : "text-foreground-muted hover:text-foreground")}
              >
                Availability
              </button>
              <button 
                onClick={() => setActiveTab("fixtures")}
                className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", activeTab === "fixtures" ? "bg-crimson text-white shadow-lg" : "text-foreground-muted hover:text-foreground")}
              >
                Full Schedule
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "planner" ? (
            <motion.div 
              key="planner" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12 mt-8"
            >
              {/* Confirmed Selection Spotlight */}
              {selectedMatches.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-success animate-pulse" />
                    Confirmed Selection
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedMatches.map((m) => {
                      const status = matchStatus.find((s) => s.match_id === m.id)?.state ?? "open";
                      return (
                        <div key={m.id} className="relative p-6 rounded-3xl border border-success/30 bg-success/5 overflow-hidden group">
                          <CricketBall className="absolute -right-12 -bottom-12 w-48 h-48 opacity-[0.03] grayscale transition-transform group-hover:scale-110 duration-1000" />
                          <div className="relative z-10">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-success uppercase tracking-widest bg-success/10 px-2 py-0.5 rounded">
                                  {status === "confirmed" ? "Final XI" : "Provisional"}
                                </span>
                                <h3 className="font-display text-3xl font-bold mt-2 text-white">{m.team_code}</h3>
                                <p className="text-foreground-muted text-sm">vs {m.opposition}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 mt-8">
                              <div className="space-y-1">
                                <p className="text-[9px] font-mono text-foreground-muted uppercase tracking-widest">When</p>
                                <p className="font-display text-lg">{new Date(m.match_date).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                <p className="font-mono text-xs text-foreground-muted">{m.start_time?.slice(0, 5) ?? "TBC"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-mono text-foreground-muted uppercase tracking-widest">Where</p>
                                <p className="font-display text-lg truncate" title={m.venue ?? "TBC"}>{m.venue ?? "TBC"}</p>
                                {m.venue && (
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`} target="_blank" rel="noreferrer" className="text-success text-[10px] uppercase font-bold hover:underline">
                                    Google Maps ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Season Planner */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl">Season Planner</h2>
                  <p className="text-[10px] font-mono text-foreground-muted uppercase tracking-widest">Plan your availability</p>
                </div>

                <div className="space-y-8">
                  {weekends.slice(0, 8).map((w) => (
                    <div key={w.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {w.dates.map(date => {
                        const dayStatus = avail[date]?.status || null;
                        const dayNote = avail[date]?.note || "";
                        const dayMatches = matches.filter(m => m.match_date === date);
                        const isSaturday = new Date(date).getDay() === 6;

                        return (
                          <div
                            key={date}
                            className={cn(
                              "rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden",
                              dayStatus === "no" ? "bg-surface/30 border-border opacity-50 grayscale" : "bg-surface border-border shadow-xl hover:border-border/50"
                            )}
                          >
                            <div className="flex justify-between items-baseline mb-6">
                              <div>
                                <h3 className="font-display text-2xl">{isSaturday ? "Saturday" : "Sunday"}</h3>
                                <p className="font-mono text-[10px] text-foreground-muted uppercase tracking-widest">
                                  {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {dayMatches.map(m => (
                                  <span key={m.id} className="size-5 rounded bg-white/5 border border-border flex items-center justify-center text-[8px] font-bold uppercase text-foreground-muted">
                                    {m.team_code === "Zami 1" ? "Z1" : m.team_code === "Zami 2" ? "Z2" : m.team_code}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-3 mb-6">
                              <button
                                onClick={() => updateAvailability(date, { status: "yes" })}
                                className={cn(
                                  "flex-1 h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                                  dayStatus === "yes" ? "bg-success text-background" : "bg-background border border-border text-foreground hover:bg-white/5"
                                )}
                              >
                                {dayStatus === "yes" && <CricketBall className="size-4 text-background" />}
                                YES
                              </button>
                              <button
                                onClick={() => updateAvailability(date, { status: "no" })}
                                className={cn(
                                  "flex-1 h-12 rounded-xl font-bold text-sm transition-all",
                                  dayStatus === "no" ? "bg-danger text-white" : "bg-background border border-border text-foreground hover:bg-white/5"
                                )}
                              >
                                NO
                              </button>
                            </div>

                            <textarea
                              placeholder="Add a note..."
                              value={dayNote}
                              onChange={(e) => updateAvailability(date, { note: e.target.value })}
                              className="w-full h-10 bg-background/50 border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-crimson resize-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="fixtures" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="mt-8 space-y-4"
            >
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-background/50 border-b border-border text-[10px] font-mono text-foreground-muted uppercase tracking-widest">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2 text-center">Team</div>
                  <div className="col-span-4">Opposition</div>
                  <div className="col-span-3">Venue</div>
                  <div className="col-span-1 text-right">Time</div>
                </div>
                <div className="divide-y divide-border/30 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {matches.map((m) => (
                    <div key={m.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">
                      <div className="col-span-2 font-mono text-xs">
                        {new Date(m.match_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", m.team_code.startsWith("H") ? "bg-crimson/20 text-crimson" : "bg-white/10 text-white")}>
                          {m.team_code}
                        </span>
                      </div>
                      <div className="col-span-4 font-display font-bold text-sm">
                        {m.opposition}
                      </div>
                      <div className="col-span-3 text-xs text-foreground-muted flex items-center gap-1">
                        <MapPin size={10} className="text-crimson" />
                        <span className="truncate">{m.venue}</span>
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs">
                        {m.start_time?.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

interface WeekendBucket {
  id: string;
  label: string;
  dates: string[];
}

function groupByWeekend(matches: Match[]): WeekendBucket[] {
  const buckets = new Map<string, WeekendBucket>();
  for (const m of matches) {
    const d = new Date(m.match_date);
    const day = d.getDay();
    const sat = new Date(d);
    if (day === 0) sat.setDate(d.getDate() - 1);
    if (day === 6) sat.setDate(d.getDate());
    
    const id = sat.toISOString().slice(0, 10);
    if (!buckets.has(id)) {
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      buckets.set(id, {
        id,
        label: `${sat.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        dates: [id, sun.toISOString().slice(0, 10)]
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.id.localeCompare(b.id));
}
