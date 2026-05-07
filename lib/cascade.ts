// ============================================================================
// Tiered cascade selection
// ----------------------------------------------------------------------------
// Rules of the cascade for competitive H teams (H1 highest, H5 lowest):
//   1. A player who said YES for a given match_date is in the pool for ANY
//      H team playing that date.
//   2. H1 picks first. Any player picked by H1 disappears from the pool of
//      every lower-tier H team (H2..H5) on that same date.
//   3. H2 then picks from the remaining pool. And so on down to H5.
//   4. Recreational teams (Zami 1, Zami 2, Zomi) have INDEPENDENT pools —
//      they do not interact with the H-team cascade. A player who said yes
//      for Saturday and is picked by Zami 1 stays available for any H team
//      that happens to play that Sunday (different match_date).
//   5. If two teams play on the same date AND a player is picked by both
//      (rec + competitive on the same day), that's a conflict — admin sees
//      it in the dashboard and resolves manually.
//
// All of this is enforceable in a single Postgres query via the v_match_pool
// view in schema.sql. This file provides the same logic in TypeScript for
// client-side optimistic UI and unit testing.
// ============================================================================

import type { Match, Player, Selection, Team, AvailStatus } from "./types";

export interface CaptainPoolInput {
  /** The match the captain is selecting for. */
  match: Match;
  /** Team metadata for the cascade ordering. */
  teams: Team[];
  /** All matches in the system (we filter to same date inside). */
  allMatches: Match[];
  /** All players keyed by id. */
  playersById: Map<string, Player>;
  /** Availability for the relevant date — { player_id: status }. */
  availability: Map<string, AvailStatus>;
  /** All current selections in the system. */
  selections: Selection[];
}

export interface PoolPlayer {
  player: Player;
  status: "available" | "taken_by_higher" | "already_picked";
  takenBy?: string; // team code that took them, when status != available
}

/**
 * Computes the available pool for a captain selecting for `match`.
 * Returns only players who said YES for that date. Marks each as available,
 * already taken by a higher tier, or already picked for this same match.
 */
export function poolForMatch(input: CaptainPoolInput): PoolPlayer[] {
  const { match, teams, allMatches, playersById, availability, selections } = input;
  const myTeam = teams.find((t) => t.code === match.team_code);
  if (!myTeam) return [];

  // Find all H-team matches on the same date with HIGHER tier_order
  // (i.e. tier_order < mine — H1 has order 1, H5 has order 5).
  const higherTierMatchIds = new Set(
    allMatches
      .filter((m) => m.match_date === match.match_date && m.id !== match.id)
      .filter((m) => {
        const t = teams.find((x) => x.code === m.team_code);
        if (!t || t.tier_order == null || myTeam.tier_order == null) return false;
        return t.tier_order < myTeam.tier_order;
      })
      .map((m) => m.id)
  );

  // Players already picked by a higher-tier team (only relevant for competitive cascade)
  const takenByHigher = new Map<string, string>(); // player_id -> team_code
  if (myTeam.tier_order != null) {
    for (const sel of selections) {
      if (higherTierMatchIds.has(sel.match_id)) {
        const m = allMatches.find((x) => x.id === sel.match_id);
        if (m) takenByHigher.set(sel.player_id, m.team_code);
      }
    }
  }

  // Players already picked for THIS match
  const pickedHere = new Set(
    selections.filter((s) => s.match_id === match.id).map((s) => s.player_id)
  );

  const result: PoolPlayer[] = [];
  for (const [playerId, status] of availability) {
    if (status !== "yes") continue;
    const player = playersById.get(playerId);
    if (!player || !player.active) continue;

    if (pickedHere.has(playerId)) {
      result.push({ player, status: "already_picked" });
    } else if (takenByHigher.has(playerId)) {
      result.push({ player, status: "taken_by_higher", takenBy: takenByHigher.get(playerId) });
    } else {
      result.push({ player, status: "available" });
    }
  }

  // Sort: available first, then by tier (lower = higher skill), then by name
  return result.sort((a, b) => {
    const order = { available: 0, already_picked: 1, taken_by_higher: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const ta = a.player.tier ?? 99;
    const tb = b.player.tier ?? 99;
    if (ta !== tb) return ta - tb;
    return a.player.full_name.localeCompare(b.player.full_name);
  });
}

/**
 * Detects players double-booked across teams on the same date.
 * Used in the admin conflicts view.
 */
export function findConflicts(
  selections: Selection[],
  matches: Match[]
): { playerId: string; date: string; teams: string[] }[] {
  const byPlayerDate = new Map<string, string[]>(); // "playerId|date" -> [teamCode]
  for (const sel of selections) {
    const m = matches.find((x) => x.id === sel.match_id);
    if (!m) continue;
    const key = `${sel.player_id}|${m.match_date}`;
    const arr = byPlayerDate.get(key) ?? [];
    arr.push(m.team_code);
    byPlayerDate.set(key, arr);
  }
  const conflicts: { playerId: string; date: string; teams: string[] }[] = [];
  for (const [key, teams] of byPlayerDate) {
    if (teams.length > 1) {
      const [playerId, date] = key.split("|");
      conflicts.push({ playerId, date, teams });
    }
  }
  return conflicts;
}
