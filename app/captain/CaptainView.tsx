"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Check, MapPin, Clock, AlertCircle, Shield, Star, Activity, Hand, ShieldAlert, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import { poolForMatch } from "@/lib/cascade";
import { notifySelectionAction } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Match, Player, Team, Availability, Selection, AvailStatus, MatchStatus } from "@/lib/types";

interface Props {
  me: Player;
  myTeamCode: string;
  teams: Team[];
  matches: Match[];
  players: Player[];
  availability: Availability[];
  selections: Selection[];
  matchStatus: MatchStatus[];
}

function roleIcon(role: string) {
  switch (role) {
    case "Batter": return <Star size={14} className="text-amber-400" />;
    case "Bowler": return <Activity size={14} className="text-crimson-400" />;
    case "All-rounder": return <div className="flex -space-x-1"><Star size={12} className="text-amber-400"/><Activity size={12} className="text-crimson-400"/></div>;
    case "Wicketkeeper": return <Hand size={14} className="text-emerald-400" />;
    default: return <Star size={14} />;
  }
}

function toRoman(num: number | null) {
  if (!num) return "—";
  const romans = ["", "I", "II", "III", "IV", "V"];
  return romans[num] || num.toString();
}

function PlayerRow({
  player,
  status,
  response,
  takenBy,
  note,
  picked,
  xiCount,
  tierOrder,
  onTogglePick,
  onToggleRole,
  isCaptain,
  isKeeper,
  isProvisional,
  isExcused
}: {
  player: Player;
  status: string;
  response: AvailStatus | null;
  takenBy?: string;
  note: string;
  picked: boolean;
  xiCount: number;
  tierOrder: number | null;
  onTogglePick: (id: string) => void;
  onToggleRole: (id: string, role: "is_captain" | "is_keeper") => void;
  isCaptain: boolean;
  isKeeper: boolean;
  isProvisional?: boolean;
  isExcused?: boolean;
}) {
  const canPick = status === "available" || status === "already_picked";
  const isTaken = status === "taken_by_higher";

  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col border-b border-border/50 transition-colors relative",
        picked ? "bg-success/5" : "hover:bg-surface/50",
        isTaken ? "opacity-40 grayscale blur-[0.5px]" : ""
      )}
    >
      <div className="grid grid-cols-12 gap-3 items-center px-4 py-3">
        {picked && (
          <motion.div
            layoutId="active-pulse"
            className="absolute left-0 top-0 bottom-0 w-1 bg-success animate-pulse-slow"
          />
        )}

        {/* Pick Toggle */}
        <div className="col-span-1">
          <button
            onClick={() => canPick && onTogglePick(player.id)}
            disabled={!canPick || (xiCount >= 11 && !picked)}
            className={cn(
              "size-6 rounded border-2 flex items-center justify-center transition-all duration-200",
              picked
                ? "border-success bg-success text-background"
                : canPick && xiCount < 11
                ? "border-border hover:border-foreground/50"
                : "border-border/30 cursor-not-allowed"
            )}
          >
            {picked && <Check size={14} strokeWidth={4} />}
          </button>
        </div>

        {/* Name */}
        <div className="col-span-5 relative">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-medium", isTaken && "line-through text-foreground-muted")}>
              {player.full_name}
            </p>
            {tierOrder && player.tier && player.tier < (tierOrder - 1) && (
              <div title={`High tier player (${player.tier})`}>
                <ShieldAlert size={12} className="text-warning" />
              </div>
            )}
            {isExcused && <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 rounded font-bold uppercase">Excused</span>}
          </div>
          {isTaken && (
            <span className={cn(
              "absolute top-1/2 -translate-y-1/2 right-0 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border",
              isProvisional ? "border-warning/40 text-warning" : "border-border text-foreground-muted bg-background"
            )}>
              {isProvisional ? "Drafted" : "Taken"} · {takenBy}
            </span>
          )}
        </div>

        {/* Role */}
        <div className="col-span-2 flex items-center justify-center" title={player.role}>
          {roleIcon(player.role)}
        </div>

        {/* Tier */}
        <div className="col-span-1 text-center font-display text-sm text-foreground-muted">
          {toRoman(player.tier)}
        </div>

        {/* Captain/Keeper Flags */}
        <div className="col-span-2 flex justify-center gap-2">
          {picked && (
            <>
              <button
                onClick={() => onToggleRole(player.id, "is_captain")}
                className={cn("p-1 rounded transition", isCaptain ? "bg-crimson/20 text-crimson" : "text-foreground-muted hover:text-foreground")}
              >
                <Star size={14} fill={isCaptain ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => onToggleRole(player.id, "is_keeper")}
                className={cn("p-1 rounded transition", isKeeper ? "bg-success/20 text-success" : "text-foreground-muted hover:text-foreground")}
              >
                <Shield size={14} fill={isKeeper ? "currentColor" : "none"} />
              </button>
            </>
          )}
        </div>

        {/* Status Dot */}
        <div className="col-span-1 flex justify-end">
          <div className={cn(
            "size-2.5 rounded-full shadow-[0_0_8px_currentColor]",
            response === "yes" ? "text-success bg-success" : 
            response === "no" ? "text-danger bg-danger" : 
            "text-stone-600 bg-stone-600"
          )} title={response ? `Responded: ${response.toUpperCase()}` : "No response yet"} />
        </div>
      </div>
      
      {/* High-Visibility Note */}
      {note && !isTaken && (
        <div className="px-12 pb-3">
          <div className="bg-warning/5 border border-warning/20 rounded-lg px-3 py-1.5 flex items-start gap-2">
            <AlertCircle size={10} className="text-warning mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-warning font-medium leading-relaxed">{note}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function CaptainView({
  me,
  myTeamCode,
  teams,
  matches,
  players,
  availability,
  selections: initialSelections,
  matchStatus,
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState(myTeamCode);
  const teamMatches = useMemo(() => matches.filter((m) => m.team_code === selectedTeam), [matches, selectedTeam]);
  const [matchId, setMatchId] = useState(teamMatches[0]?.id ?? "");

  useEffect(() => {
    if (teamMatches.length && !teamMatches.find((m) => m.id === matchId)) {
      setMatchId(teamMatches[0].id);
    }
  }, [teamMatches, matchId]);

  const [selections, setSelections] = useState<Selection[]>(initialSelections);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("captain-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "selections" }, (payload) => {
        setSelections((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((s) => s.id !== (payload.old as Selection).id);
          }
          const next = payload.new as Selection;
          const idx = prev.findIndex((s) => s.id === next.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          }
          return [...prev, next];
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);

  const match = teamMatches.find((m) => m.id === matchId);
  const myTeam = teams.find((t) => t.code === selectedTeam);

  const pool = useMemo(() => {
    if (!match) return [];
    const playersById = new Map(players.map((p) => [p.id, p]));
    const availForDate = new Map<string, AvailStatus>(
      availability.filter((a) => a.match_date === match.match_date).map((a) => [a.player_id, a.status])
    );
    const availDetails = availability.filter((a) => a.match_date === match.match_date);
    const notesForDate = new Map<string, string>(
      availDetails.map((a) => [a.player_id, a.note ?? ""])
    );

    return poolForMatch({
      match,
      teams,
      allMatches: matches,
      playersById,
      availability: availForDate,
      availabilityDetails: availDetails,
      selections,
      matchStatus,
    }).map(p => ({ ...p, note: notesForDate.get(p.player.id) || "" }));
  }, [match, teams, matches, players, availability, selections, matchStatus]);

  const myPicks = useMemo(() => selections.filter((s) => s.match_id === matchId), [selections, matchId]);
  const xiCount = myPicks.length;

  const squadBalance = useMemo(() => {
    const balance = { Batter: 0, Bowler: 0, "All-rounder": 0, Wicketkeeper: 0 };
    myPicks.forEach(s => {
      const p = players.find(x => x.id === s.player_id);
      if (p) balance[p.role]++;
    });
    return balance;
  }, [myPicks, players]);

  const tierOrder = myTeam?.tier_order ?? null;
  const isRec = myTeam?.kind === "recreational";

  const higherTeams = teams.filter((t) => t.tier_order != null && tierOrder != null && t.tier_order < tierOrder);
  const takenCount = pool.filter((p) => p.status === "taken_by_higher").length;
  const availableCount = pool.filter((p) => p.status === "available").length;

  function togglePick(playerId: string) {
    if (!match) return;
    const existing = selections.find((s) => s.match_id === match.id && s.player_id === playerId);

    if (existing) {
      setSelections((prev) => prev.filter((s) => s.id !== existing.id));
      startTransition(async () => {
        await supabase.from("selections").delete().eq("id", existing.id);
      });
    } else {
      if (xiCount >= 11) return;
      const optimistic: Selection = {
        id: `temp-${Date.now()}`,
        match_id: match.id,
        player_id: playerId,
        selected_by: me.id,
        selected_at: new Date().toISOString(),
        is_captain: false,
        is_keeper: false,
      };
      setSelections((prev) => [...prev, optimistic]);
      startTransition(async () => {
        const { data } = await supabase.from("selections").insert({ match_id: match.id, player_id: playerId, selected_by: me.id }).select().single();
        if (data) {
          setSelections((prev) => prev.map((s) => (s.id === optimistic.id ? (data as Selection) : s)));
        }
      });
    }
  }

  function toggleRole(playerId: string, role: "is_captain" | "is_keeper") {
    const existing = selections.find((s) => s.match_id === matchId && s.player_id === playerId);
    if (!existing) return;
    const nextValue = !existing[role];
    setSelections(prev => prev.map(s => s.id === existing.id ? { ...s, [role]: nextValue } : s));
    startTransition(async () => {
      await supabase.from("selections").update({ [role]: nextValue }).eq("id", existing.id);
    });
  }

  async function confirmXI() {
    if (!match || xiCount !== 11) return;
    startTransition(async () => {
      const { error } = await supabase.from("match_status").upsert({ match_id: match.id, state: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: me.id });
      if (!error) {
        await notifySelectionAction(match.id);
        alert(`XI confirmed for ${match.team_code} vs ${match.opposition}. The Pulse is notifying your players.`);
      }
    });
  }

  function copyWhatsAppBriefing() {
    if (!match) return;
    const dateStr = new Date(match.match_date).toLocaleDateString("en-GB", { weekday: 'long', day: 'numeric', month: 'long' });
    const squadNames = myPicks.map((s, i) => {
      const p = players.find(x => x.id === s.player_id);
      let name = p?.full_name ?? "Unknown";
      if (s.is_captain) name += " (c)";
      if (s.is_keeper) name += " (wk)";
      return `${i + 1}. ${name}`;
    }).join("\n");

    const text = `🏏 *Match Day Briefing: ${match.team_code}*
vs ${match.opposition}
📅 ${dateStr}
⏰ Meet: ${match.start_time?.slice(0, 5) ?? "TBC"}
📍 Venue: ${match.venue ?? "TBC"} ${match.is_home ? "(Home)" : "(Away)"}

*The Squad:*
${squadNames}

Please log in to the portal to confirm you've seen this!
https://kampong-select.vercel.app`;

    navigator.clipboard.writeText(text);
    alert("WhatsApp Briefing copied to clipboard!");
  }

  const visibleTeams = me.user_role === "admin" ? teams : teams.filter((t) => t.code === myTeamCode);

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between pt-8 pb-4">
          <RoleSwitcher current="captain" userRole={me.user_role} />
        </div>

        {/* Scoreboard Header */}
        <div className={cn("flex items-end justify-between mb-2 pb-4 border-b transition-colors duration-1000", availableCount < 11 ? "border-warning/50" : "border-border")}>
          <div>
            <h1 className={cn("font-display text-4xl font-semibold tracking-tight transition-colors duration-1000", availableCount < 11 ? "text-warning" : "text-white")}>Selection</h1>
            <p className="text-foreground-muted font-mono text-sm mt-1">{me.captains_team ?? "Admin"}</p>
          </div>
          <div className="flex items-baseline gap-1" style={{ perspective: 1000 }}>
            <motion.div 
              key={xiCount}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={cn("font-display text-5xl font-bold", xiCount === 11 ? "text-success" : availableCount < 11 ? "text-warning animate-pulse-slow" : "text-white")}
            >
              {xiCount}
            </motion.div>
            <span className="font-display text-5xl font-black text-border mx-1">/</span>
            <span className="font-display text-5xl font-bold text-foreground-muted">11</span>
          </div>
        </div>

        {/* Live Squad Balance */}
        <div className="flex gap-4 py-3 overflow-x-auto hide-scrollbar mb-4 border-b border-border/30">
          {Object.entries(squadBalance).map(([role, count]) => (
            <div key={role} className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-white/5 border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                {roleIcon(role)}
                <span className="text-[10px] font-mono font-bold text-foreground-muted uppercase tracking-wider">{role}s</span>
                <span className={cn("text-xs font-bold", count > 0 ? "text-white" : "text-white/20")}>{count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Ticker / Banner */}
        {takenCount > 0 && !isRec && (
          <div className="overflow-hidden bg-warning/10 border-y border-warning/20 mb-6 py-2">
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="whitespace-nowrap flex gap-8"
            >
              <p className="text-xs font-mono font-bold text-warning uppercase tracking-widest inline-block">
                CASCADE UPDATE • {takenCount} PLAYERS SECURED BY HIGHER TIERS ({higherTeams.map(t => t.code).join(", ")}) • REMOVED FROM CURRENT POOL
              </p>
              <p className="text-xs font-mono font-bold text-warning uppercase tracking-widest inline-block">
                CASCADE UPDATE • {takenCount} PLAYERS SECURED BY HIGHER TIERS ({higherTeams.map(t => t.code).join(", ")}) • REMOVED FROM CURRENT POOL
              </p>
            </motion.div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-1">
            {me.user_role === "admin" && (
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
              >
                {visibleTeams.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
            )}
            {teamMatches.length > 0 && (
              <select
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none flex-1"
              >
                {teamMatches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.opposition} • {new Date(m.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button 
            onClick={copyWhatsAppBriefing}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
          >
            <MessageCircle size={16} />
            Copy WhatsApp Brief
          </button>
        </div>

        {match && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-background/50 border-b border-border text-[10px] font-mono text-foreground-muted uppercase tracking-widest">
              <div className="col-span-1">Pick</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-center">Role</div>
              <div className="col-span-1 text-center">Tier</div>
              <div className="col-span-2 text-center">Flags</div>
              <div className="col-span-1 text-right">Stat</div>
            </div>

            {/* Players */}
            <AnimatePresence mode="popLayout">
              {pool.length === 0 ? (
                <div className="p-12 text-center text-foreground-muted">No availability for this date.</div>
              ) : (
                pool.map(({ player, status, response, takenBy, note, is_provisional, is_excused }) => {
                  const sel = selections.find(s => s.match_id === matchId && s.player_id === player.id);
                  return (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      status={status}
                      response={response}
                      takenBy={takenBy}
                      note={note}
                      picked={!!sel}
                      xiCount={xiCount}
                      tierOrder={tierOrder}
                      onTogglePick={togglePick}
                      onToggleRole={toggleRole}
                      isCaptain={sel?.is_captain ?? false}
                      isKeeper={sel?.is_keeper ?? false}
                      isProvisional={is_provisional}
                      isExcused={is_excused}
                    />
                  );
                })
              )}
            </AnimatePresence>
            
            {/* Action Footer */}
            <div className="p-4 bg-background/50 border-t border-border flex justify-between items-center">
              <p className="font-mono text-sm text-foreground-muted">
                {xiCount === 11 ? <span className="text-success font-bold">11/11 SELECTED</span> : `${xiCount}/11 SELECTED`}
              </p>
              <button
                disabled={xiCount !== 11 || isPending}
                onClick={confirmXI}
                className={cn(
                  "relative overflow-hidden px-6 py-2.5 rounded-lg font-bold transition-all",
                  xiCount === 11 
                    ? "bg-white text-background hover:scale-105" 
                    : "bg-surface text-foreground-muted border border-border cursor-not-allowed"
                )}
              >
                {xiCount === 11 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
                )}
                Confirm XI
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
