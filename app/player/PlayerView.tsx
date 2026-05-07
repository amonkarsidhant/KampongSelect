"use client";

import { useState, useTransition, useMemo } from "react";
import { Check, X, Calendar, MapPin, Clock, Info } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import type { Match, Player, Availability, AvailStatus, Selection, MatchStatus } from "@/lib/types";

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

  function updateAvailability(date: string, updates: Partial<{ status: AvailStatus; note: string }>) {
    const current = avail[date];
    const nextStatus = updates.status ?? current.status;
    const nextNote = updates.note ?? current.note;

    // Optimistic update
    setAvail((prev) => ({ ...prev, [date]: { status: nextStatus, note: nextNote } }));

    if (nextStatus) {
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
    }
  }

  const selectedMatches = useMemo(() => {
    return matches.filter(m => selections.some(s => s.match_id === m.id));
  }, [matches, selections]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Header player={player} />
        <RoleSwitcher current="player" userRole={player.user_role} />

        {selectedMatches.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Check className="text-emerald-400" size={20} />
              You&apos;re in the XI!
            </h2>
            {selectedMatches.map(m => {
              const status = matchStatus.find(s => s.match_id === m.id)?.state ?? "open";
              return (
                <div key={m.id} className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 shadow-lg shadow-emerald-900/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-mono font-bold">Confirmed Selection</p>
                      <h3 className="text-xl font-bold mt-1">{m.team_code} vs {m.opposition}</h3>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-1 rounded font-bold uppercase">
                      {status === "confirmed" ? "Final XI" : "Provisional"}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-stone-300">
                        <Calendar size={16} className="text-emerald-500" />
                        <span>{new Date(m.match_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-300">
                        <Clock size={16} className="text-emerald-500" />
                        <span>{m.start_time?.slice(0, 5) ?? "TBC"} Meet / {m.start_time?.slice(0, 5) ?? "TBC"} Start</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-stone-300">
                        <MapPin size={16} className="text-emerald-500" />
                        <span className="flex-1">{m.venue ?? "TBC"} {m.is_home ? "(Home)" : "(Away)"}</span>
                      </div>
                      {m.venue && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 ml-6"
                        >
                          Open in Maps
                        </a>
                      )}
                    </div>
                  </div>

                  {m.notes && (
                    <div className="mt-4 pt-4 border-t border-emerald-500/20 flex gap-2">
                      <Info size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-stone-400 italic">{m.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <h2 className="text-lg font-semibold mt-8 mb-4">Your Availability</h2>
        <p className="text-sm text-stone-400 mb-6">
          Set your availability for the upcoming weekend. Captains will pick from those who say yes.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <DayCard
            label="Saturday"
            date={sat}
            status={avail[sat].status}
            note={avail[sat].note}
            matches={matches.filter((m) => m.match_date === sat)}
            onChange={(s) => updateAvailability(sat, { status: s })}
            onNoteChange={(n) => updateAvailability(sat, { note: n })}
          />
          <DayCard
            label="Sunday"
            date={sun}
            status={avail[sun].status}
            note={avail[sun].note}
            matches={matches.filter((m) => m.match_date === sun)}
            onChange={(s) => updateAvailability(sun, { status: s })}
            onNoteChange={(n) => updateAvailability(sun, { note: n })}
          />
        </div>

        <div className="mt-6 p-4 rounded-lg border border-stone-100/10 bg-stone-100/[0.02]">
          <p className="text-sm font-medium mb-2">How selection works</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            If you say yes, you&apos;re in the pool for any team playing that day. H1 picks first,
            then H2 → H3 → H4 → H5. Whoever isn&apos;t picked at the top filters down. Recreational
            teams (Zami 1, Zami 2, Zomi) have separate pools. You&apos;ll get a notification when a
            captain picks you.
          </p>
        </div>

        {isPending && <p className="text-xs text-stone-500 mt-3">Saving…</p>}
      </div>
    </main>
  );
}

function Header({ player }: { player: Player }) {
  const initials = player.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-3 pb-4 mb-2 border-b border-stone-100/10">
      <div className="w-10 h-10 rounded-full bg-kampong-red flex items-center justify-center text-white font-semibold text-sm">
        {initials}
      </div>
      <div className="flex-1">
        <p className="font-semibold leading-tight">{player.full_name}</p>
        <p className="text-xs text-stone-400">
          {player.role}
          {player.kncb_id ? ` · KNCB #${player.kncb_id}` : ""}
          {player.tier ? ` · Tier ${player.tier} pool` : ""}
        </p>
      </div>
    </div>
  );
}

interface DayCardProps {
  label: string;
  date: string;
  status: AvailStatus | null;
  note: string;
  matches: Match[];
  onChange: (s: AvailStatus) => void;
  onNoteChange: (n: string) => void;
}

function DayCard({ label, date, status, note, matches, onChange, onNoteChange }: DayCardProps) {
  const dateLabel = new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return (
    <div className="border border-stone-100/10 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-semibold flex items-center gap-2">
          <Calendar size={14} className="text-stone-500" />
          {label}
        </p>
        <p className="text-xs text-stone-400">{dateLabel}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => onChange("yes")}
          className={`py-2.5 rounded-lg text-sm font-medium border transition flex items-center justify-center gap-1.5 ${
            status === "yes"
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-stone-100/10 text-stone-300 hover:border-stone-100/20"
          }`}
        >
          <Check size={14} strokeWidth={3} /> Yes
        </button>
        <button
          onClick={() => onChange("no")}
          className={`py-2.5 rounded-lg text-sm font-medium border transition flex items-center justify-center gap-1.5 ${
            status === "no"
              ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
              : "border-stone-100/10 text-stone-300 hover:border-stone-100/20"
          }`}
        >
          <X size={14} strokeWidth={3} /> No
        </button>
      </div>

      <div className="mb-4">
        <textarea
          placeholder="Optional note (e.g. need a lift, half day only)"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          className="w-full bg-stone-100/[0.04] border border-stone-100/10 rounded-lg p-2 text-xs text-stone-300 focus:outline-none focus:border-stone-100/20 resize-none h-12"
        />
      </div>

      <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Teams playing</p>
      {matches.length === 0 ? (
        <p className="text-xs text-stone-500 italic">No fixtures scheduled.</p>
      ) : (
        <ul className="space-y-0.5">
          {matches.map((m) => (
            <li key={m.id} className="text-xs text-stone-300">
              {m.team_code} vs {m.opposition}
              <span className="text-stone-500"> · {m.venue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
