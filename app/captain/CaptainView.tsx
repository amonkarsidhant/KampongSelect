"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Check, Users, MapPin, Clock, ArrowDown, AlertCircle, ChevronRight, Shield, Star } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import { poolForMatch } from "@/lib/cascade";
import { notifySelectionAction } from "@/app/actions";
import type { Match, Player, Team, Availability, Selection, AvailStatus } from "@/lib/types";

interface Props {
  me: Player;
  myTeamCode: string;
  teams: Team[];
  matches: Match[];
  players: Player[];
  availability: Availability[];
  selections: Selection[];
}

function PlayerRow({
  player,
  status,
  takenBy,
  note,
  picked,
  xiCount,
  tierOrder,
  onTogglePick,
  onToggleRole,
  isCaptain,
  isKeeper
}: {
  player: Player;
  status: string;
  takenBy?: string;
  note: string;
  picked: boolean;
  xiCount: number;
  tierOrder: number | null;
  onTogglePick: (id: string) => void;
  onToggleRole: (id: string, role: "is_captain" | "is_keeper") => void;
  isCaptain: boolean;
  isKeeper: boolean;
}) {
  const canPick = status === "available" || status === "already_picked";
  return (
    <div
      className={`grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-md border transition ${
        picked
          ? "border-kampong-red/40 bg-red-950/15"
          : "border-stone-100/[0.06] bg-stone-100/[0.015]"
      } ${!canPick ? "opacity-50" : ""}`}
    >
      <div className="col-span-1">
        <button
          onClick={() => canPick && onTogglePick(player.id)}
          disabled={!canPick || (xiCount >= 11 && !picked)}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
            picked
              ? "border-kampong-red bg-kampong-red"
              : canPick && xiCount < 11
              ? "border-stone-500 hover:border-stone-300"
              : "border-stone-700 cursor-not-allowed"
          }`}
        >
          {picked && <Check size={13} strokeWidth={3} />}
        </button>
      </div>
      <div className="col-span-4">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">{player.full_name}</p>
          {tierOrder && player.tier && player.tier < (tierOrder - 1) && (
            <div title={`Warning: Player tier (${player.tier}) is significantly higher than team tier (${tierOrder})`} className="text-amber-400">
              <AlertCircle size={12} />
            </div>
          )}
        </div>
        {note && (
          <p className="text-[10px] text-amber-200/70 italic mt-0.5">{note}</p>
        )}
        {!note && player.kncb_id && (
          <p className="text-[10px] font-mono text-stone-500">KNCB #{player.kncb_id}</p>
        )}
      </div>
      <div className="col-span-3 text-xs text-stone-300">{player.role}</div>
      <div className="col-span-1 text-center text-xs font-mono">
        {player.tier ?? "—"}
      </div>
      <div className="col-span-1 flex justify-center gap-1">
        {picked && (
          <>
            <button
              onClick={() => onToggleRole(player.id, "is_captain")}
              title="Mark as Captain"
              className={`p-1 rounded hover:bg-white/10 ${isCaptain ? "text-size-4 text-kampong-red" : "text-stone-600"}`}
            >
              <Star size={14} fill={isCaptain ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onToggleRole(player.id, "is_keeper")}
              title="Mark as Wicketkeeper"
              className={`p-1 rounded hover:bg-white/10 ${isKeeper ? "text-blue-400" : "text-stone-600"}`}
            >
              <Shield size={14} fill={isKeeper ? "currentColor" : "none"} />
            </button>
          </>
        )}
      </div>
      <div className="col-span-2 flex justify-end">
        {status === "available" ? (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
            Available
          </span>
        ) : status === "already_picked" ? (
          <span className="text-[10px] px-2 py-0.5 rounded bg-kampong-red/15 text-red-300">
            In your XI
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-500/10 text-stone-400">
            Taken by {takenBy}
          </span>
        )}
      </div>
    </div>
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
}: Props) {
  // ... state initialization
  const [selectedTeam, setSelectedTeam] = useState(myTeamCode);
  const teamMatches = useMemo(
    () => matches.filter((m) => m.team_code === selectedTeam),
    [matches, selectedTeam]
  );
  const [matchId, setMatchId] = useState(teamMatches[0]?.id ?? "");

  // Update matchId when team changes
  useEffect(() => {
    if (teamMatches.length && !teamMatches.find((m) => m.id === matchId)) {
      setMatchId(teamMatches[0].id);
    }
  }, [teamMatches, matchId]);

  const [selections, setSelections] = useState<Selection[]>(initialSelections);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Live updates: subscribe to selection + availability changes
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
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const match = teamMatches.find((m) => m.id === matchId);
  const myTeam = teams.find((t) => t.code === selectedTeam);

  // Build the pool using shared cascade logic
  const pool = useMemo(() => {
    if (!match) return [];
    const playersById = new Map(players.map((p) => [p.id, p]));
    const availForDate = new Map<string, AvailStatus>(
      availability.filter((a) => a.match_date === match.match_date).map((a) => [a.player_id, a.status])
    );
    const notesForDate = new Map<string, string>(
      availability.filter((a) => a.match_date === match.match_date).map((a) => [a.player_id, a.note ?? ""])
    );

    return poolForMatch({
      match,
      teams,
      allMatches: matches,
      playersById,
      availability: availForDate,
      selections,
    }).map(p => ({ ...p, note: notesForDate.get(p.player.id) || "" }));
  }, [match, teams, matches, players, availability, selections]);

  const myPicks = useMemo(
    () => selections.filter((s) => s.match_id === matchId),
    [selections, matchId]
  );
  const myPickIds = useMemo(() => myPicks.map(s => s.player_id), [myPicks]);

  const tierOrder = myTeam?.tier_order ?? null;
  const isRec = myTeam?.kind === "recreational";

  // Count higher-tier picks for cascade messaging
  const higherTeams = teams.filter(
    (t) => t.tier_order != null && tierOrder != null && t.tier_order < tierOrder
  );
  const takenCount = pool.filter((p) => p.status === "taken_by_higher").length;
  const availableCount = pool.filter((p) => p.status === "available").length;
  const xiCount = myPicks.length;

  function togglePick(playerId: string) {
    if (!match) return;
    const existing = selections.find((s) => s.match_id === match.id && s.player_id === playerId);

    if (existing) {
      // Unpick
      setSelections((prev) => prev.filter((s) => s.id !== existing.id));
      startTransition(async () => {
        await supabase.from("selections").delete().eq("id", existing.id);
      });
    } else {
      if (xiCount >= 11) return; // hard cap at 11
      // Optimistic: insert with a temp id
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
        const { data } = await supabase
          .from("selections")
          .insert({ match_id: match.id, player_id: playerId, selected_by: me.id })
          .select()
          .single();
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
    
    // Optimistic update
    setSelections(prev => prev.map(s => s.id === existing.id ? { ...s, [role]: nextValue } : s));

    startTransition(async () => {
      await supabase.from("selections").update({ [role]: nextValue }).eq("id", existing.id);
    });
  }

  async function confirmXI() {
    if (!match || xiCount !== 11) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("match_status")
        .upsert({ match_id: match.id, state: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: me.id });
      
      if (!error) {
        // Trigger The Pulse: Notify selected players
        await notifySelectionAction(match.id);
        alert(`XI confirmed for ${match.team_code} vs ${match.opposition}. The Pulse is notifying your players.`);
      }
    });
  }

  // Tabs the captain can switch between (admins see all, captains see only their team)
  const visibleTeams = me.user_role === "admin" ? teams : teams.filter((t) => t.code === myTeamCode);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Header me={me} />
        <RoleSwitcher current="captain" userRole={me.user_role} />

        {/* Team tabs (admin only sees them all) */}
        {me.user_role === "admin" && (
          <div className="flex gap-2 mt-6 mb-4 flex-wrap">
            {visibleTeams.map((t) => (
              <button
                key={t.code}
                onClick={() => setSelectedTeam(t.code)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                  selectedTeam === t.code
                    ? "border-stone-100/30 bg-stone-100/[0.08]"
                    : "border-stone-100/10 hover:border-stone-100/20 text-stone-400"
                }`}
              >
                {t.code}
              </button>
            ))}
          </div>
        )}

        {/* Match selector */}
        {teamMatches.length > 0 ? (
          <div className="mt-6 mb-4 flex gap-2 flex-wrap">
            {teamMatches.map((m) => (
              <button
                key={m.id}
                onClick={() => setMatchId(m.id)}
                className={`px-3 py-2 text-left rounded-md border text-xs transition ${
                  matchId === m.id
                    ? "border-kampong-red/60 bg-red-950/20"
                    : "border-stone-100/10 hover:border-stone-100/20"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                  {new Date(m.match_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div className="font-medium mt-0.5">vs {m.opposition}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 mt-6">No upcoming fixtures for {selectedTeam}.</p>
        )}

        {match && myTeam && (
          <>
            {/* Match header */}
            <div className="mt-2 mb-5 pb-4 border-b border-stone-100/10">
              <h2 className="text-2xl font-semibold leading-tight">
                {match.team_code} <span className="text-stone-500 italic font-normal">vs</span> {match.opposition}
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-stone-400">
                {match.start_time && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {match.start_time.slice(0, 5)}
                  </span>
                )}
                {match.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    {match.venue} {match.is_home ? "(home)" : "(away)"}
                  </span>
                )}
              </div>
            </div>

            {/* Cascade note */}
            {!isRec && tierOrder && tierOrder > 1 && (
              <div className="mb-4 p-3 rounded-md bg-amber-500/[0.06] border border-amber-500/20 flex items-start gap-2">
                <ArrowDown size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200/90">
                  {takenCount} player{takenCount === 1 ? " has" : "s have"} been picked by{" "}
                  {higherTeams.map((t) => t.code).join(", ")} on this date and are excluded from your pool.
                </p>
              </div>
            )}
            {isRec && (
              <div className="mb-4 p-3 rounded-md bg-stone-500/[0.06] border border-stone-500/20">
                <p className="text-xs text-stone-300">
                  Recreational team — independent pool. Your selections don&apos;t affect H-team selection.
                </p>
              </div>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <Stat label="Available" value={availableCount} accent="emerald" />
              <Stat label="Taken (higher tier)" value={takenCount} accent="stone" />
              <Stat label="Your XI" value={`${xiCount}/11`} accent="red" />
            </div>

            {/* Player list */}
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider text-stone-500 font-mono">
                <div className="col-span-1">Pick</div>
                <div className="col-span-4">Player</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-1 text-center">Tier</div>
                <div className="col-span-1 text-center">Cap/Wk</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              {pool.length === 0 ? (
                <div className="p-6 text-center border border-stone-100/10 rounded-lg text-sm text-stone-400">
                  No players have set themselves available for this date yet.
                </div>
              ) : (
                pool.map(({ player, status, takenBy, note }) => {
                  const sel = selections.find(s => s.match_id === matchId && s.player_id === player.id);
                  return (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      status={status}
                      takenBy={takenBy}
                      note={note}
                      picked={!!sel}
                      xiCount={xiCount}
                      tierOrder={tierOrder}
                      onTogglePick={togglePick}
                      onToggleRole={toggleRole}
                      isCaptain={sel?.is_captain ?? false}
                      isKeeper={sel?.is_keeper ?? false}
                    />
                  );
                })
              )}
            </div>

            {/* Confirm bar */}
            <div className="mt-6 flex items-center justify-between p-4 rounded-lg border border-stone-100/10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500">XI Summary</p>
                <p className="text-sm mt-1">
                  {xiCount === 11
                    ? <span className="text-emerald-300">Squad complete — ready to confirm</span>
                    : <span className="text-stone-300">{11 - xiCount} more to pick</span>
                  }
                </p>
              </div>
              <button
                disabled={xiCount !== 11 || isPending}
                onClick={confirmXI}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition ${
                  xiCount === 11
                    ? "bg-stone-100 text-stone-900 hover:bg-white"
                    : "bg-stone-800 text-stone-500 cursor-not-allowed"
                }`}
              >
                Confirm XI <ChevronRight size={14} />
              </button>
            </div>

            {availableCount < 11 && (
              <div className="mt-3 p-3 rounded-md bg-rose-500/[0.06] border border-rose-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-200/90">
                  Pool is short — only {availableCount} players available. Consider nudging non-responders or pulling someone from a lower tier.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Header({ me }: { me: Player }) {
  return (
    <div className="flex items-center justify-between pb-4 mb-2 border-b border-stone-100/10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-kampong-red flex items-center justify-center text-white font-semibold text-sm">
          K
        </div>
        <div>
          <p className="font-semibold leading-tight">KampongSelect</p>
          <p className="text-xs text-stone-400">
            Captain — {me.captains_team ?? "Admin"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: "emerald" | "stone" | "red" }) {
  const colors = {
    emerald: "text-emerald-300",
    stone: "text-stone-300",
    red: "text-red-300",
  };
  return (
    <div className="p-3 rounded-md border border-stone-100/10 bg-stone-100/[0.02]">
      <p className="text-[10px] uppercase tracking-wider text-stone-500 flex items-center gap-1">
        <Users size={10} className={colors[accent]} />
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
