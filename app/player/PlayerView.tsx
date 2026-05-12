"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { Check, X, MapPin, Clock, Info } from "lucide-react";
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

export default function PlayerView({ player, sat, sun, matches, initialAvailability, selections, matchStatus }: Props) {
  const [avail, setAvail] = useState<Record<string, { status: AvailStatus | null; note: string }>>(() => {
    const map: Record<string, { status: AvailStatus | null; note: string }> = {
      [sat]: { status: null, note: "" },
      [sun]: { status: null, note: "" },
    };
    for (const a of initialAvailability) {
      map[a.match_date] = { status: a.status, note: a.note ?? "" };
    }
    return map;
  });
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  function updateAvailability(date: string, updates: Partial<{ status: AvailStatus; note: string }>) {
    if (typeof navigator !== "undefined" && navigator.vibrate && updates.status) {
      navigator.vibrate(12);
    }

    const current = avail[date];
    const nextStatus = updates.status ?? current.status;
    const nextNote = updates.note ?? current.note;

    setAvail((prev) => ({ ...prev, [date]: { status: nextStatus, note: nextNote } }));

    if (nextStatus) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
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
      <div className="max-w-md mx-auto">
        <div className="px-6 pt-8 pb-4">
          <RoleSwitcher current="player" userRole={player.user_role} />
          <h1 className="font-display text-4xl font-bold mt-6 tracking-tight leading-none text-balance">
            Kampong<br />Select
          </h1>
          <p className="text-foreground-muted mt-2 text-sm max-w-[280px]">
            Welcome back, {player.full_name.split(" ")[0]}. Set your weekend availability below.
          </p>
        </div>

        {selectedMatches.length > 0 && (
          <div className="px-6 mt-4 space-y-4">
            <h2 className="font-display text-xl flex items-center gap-2">
              <Check className="text-success" size={24} strokeWidth={3} />
              You&apos;re in the XI
            </h2>
            {selectedMatches.map((m) => {
              const status = matchStatus.find((s) => s.match_id === m.id)?.state ?? "open";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative p-5 rounded-2xl border border-success/30 bg-[#10b981]/5 overflow-hidden"
                >
                  <CricketBall className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 grayscale" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-success mb-1">
                          {status === "confirmed" ? "Confirmed" : "Provisional"}
                        </p>
                        <h3 className="font-display text-2xl font-bold text-white">{m.team_code}</h3>
                        <p className="text-foreground-muted">vs {m.opposition}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-foreground-muted uppercase">Date</p>
                        <p className="font-mono text-sm">
                          {new Date(m.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-foreground-muted uppercase">Time</p>
                        <p className="font-mono text-sm">{m.start_time?.slice(0, 5) ?? "TBC"}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-[10px] font-mono text-foreground-muted uppercase">Venue</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm">{m.venue ?? "TBC"} {m.is_home ? "(Home)" : "(Away)"}</p>
                          {m.venue && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-success hover:underline text-xs"
                            >
                              Maps ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-8 px-6">
          <h2 className="font-display text-xl mb-4">Availability</h2>
        </div>

        {/* Responsive container: Grid on desktop, swipeable on mobile */}
        <div className="px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Saturday", date: sat },
              { label: "Sunday", date: sun },
            ].map((day) => {
              const dayStatus = avail[day.date].status;
              const dayNote = avail[day.date].note;
              const dayMatches = matches.filter((m) => m.match_date === day.date);

              return (
                <div
                  key={day.date}
                  className={cn(
                    "rounded-3xl p-6 border relative overflow-hidden transition-all duration-500 shadow-xl",
                    dayStatus === "no" ? "bg-surface/30 border-border opacity-60" : "bg-surface border-border"
                  )}
                >
                  {dayStatus === "no" && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center rotate-[-15deg] opacity-10">
                      <span className="font-display text-6xl font-bold tracking-widest uppercase border-4 border-current p-2 rounded-lg text-white">
                        Unavailable
                      </span>
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-baseline mb-8">
                      <h3 className="font-display text-3xl">{day.label}</h3>
                      <p className="font-mono text-sm text-foreground-muted">
                        {new Date(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>

                    <div className="flex gap-4 mb-8">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateAvailability(day.date, { status: "yes" })}
                        className={cn(
                          "relative flex-1 h-[56px] rounded-2xl font-bold text-base overflow-hidden flex items-center justify-center transition-all",
                          dayStatus === "yes"
                            ? "bg-success text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                            : "bg-background border border-border text-foreground hover:bg-white/5"
                        )}
                      >
                        <AnimatePresence>
                          {dayStatus === "yes" && (
                            <motion.div
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: 20, opacity: 0 }}
                              className="absolute left-4"
                            >
                              <CricketBall className="w-6 h-6 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <span className={dayStatus === "yes" ? "ml-6" : ""}>Yes</span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateAvailability(day.date, { status: "no" })}
                        className={cn(
                          "flex-1 h-[56px] rounded-2xl font-bold text-base flex items-center justify-center transition-all",
                          dayStatus === "no"
                            ? "bg-danger text-white shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                            : "bg-background border border-border text-foreground hover:bg-white/5"
                        )}
                      >
                        No
                      </motion.button>
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                      <label className="text-[10px] font-mono text-foreground-muted uppercase mb-2 block">Optional Note</label>
                      <textarea
                        placeholder="e.g. need a lift, playing half day"
                        value={dayNote}
                        onChange={(e) => updateAvailability(day.date, { note: e.target.value })}
                        className="w-full h-16 bg-background border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-crimson resize-none transition-colors shadow-inner"
                      />
                    </motion.div>

                    <div className="mt-6 pt-6 border-t border-border/50">
                      <p className="text-[10px] font-mono text-foreground-muted uppercase mb-4 tracking-widest">Fixtures</p>
                      {dayMatches.length === 0 ? (
                        <p className="text-sm text-foreground-muted italic">No fixtures scheduled.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {dayMatches.map((m) => {
                            const isH = m.team_code.startsWith("H");
                            const isZami = m.team_code.startsWith("Zam");
                            return (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                                  isH ? "bg-crimson/10 border-crimson/20 text-crimson-300" : isZami ? "bg-warning-muted border-warning/20 text-warning" : "bg-white/5 border-border text-white"
                                )}
                              >
                                <span className="text-[10px] font-bold uppercase">{m.team_code}</span>
                                <span className="text-[10px] opacity-60">vs {m.opposition}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
