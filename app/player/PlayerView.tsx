"use client";

import { useState, useTransition } from "react";
import { Check, X, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import type { Match, Player, Availability, AvailStatus } from "@/lib/types";

interface Props {
  player: Player;
  sat: string;
  sun: string;
  matches: Match[];
  initialAvailability: Availability[];
}

export default function PlayerView({ player, sat, sun, matches, initialAvailability }: Props) {
  const [avail, setAvail] = useState<Record<string, AvailStatus | null>>(() => {
    const map: Record<string, AvailStatus | null> = { [sat]: null, [sun]: null };
    for (const a of initialAvailability) map[a.match_date] = a.status;
    return map;
  });
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function setStatus(date: string, status: AvailStatus) {
    // Optimistic update
    setAvail((prev) => ({ ...prev, [date]: status }));
    startTransition(async () => {
      await supabase.from("availability").upsert(
        { player_id: player.id, match_date: date, status, updated_at: new Date().toISOString() },
        { onConflict: "player_id,match_date" }
      );
    });
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Header player={player} />
        <RoleSwitcher current="player" userRole={player.user_role} />

        <p className="text-sm text-stone-400 mt-6 mb-4">
          Set your availability for the upcoming weekend. Captains will pick from those who say yes.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <DayCard
            label="Saturday"
            date={sat}
            status={avail[sat]}
            matches={matches.filter((m) => m.match_date === sat)}
            onChange={(s) => setStatus(sat, s)}
          />
          <DayCard
            label="Sunday"
            date={sun}
            status={avail[sun]}
            matches={matches.filter((m) => m.match_date === sun)}
            onChange={(s) => setStatus(sun, s)}
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
  matches: Match[];
  onChange: (s: AvailStatus) => void;
}

function DayCard({ label, date, status, matches, onChange }: DayCardProps) {
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
