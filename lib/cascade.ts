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
// ============================================================================

import type { Match, Player, Selection, Team, AvailStatus, Availability, MatchStatus } from "./types";

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
  /** Detailed availability records for excused status. */
  availabilityDetails: Availability[];
  /** All current selections in the system. */
  selections: Selection[];
  /** Status of all matches. */
  matchStatus: MatchStatus[];
}

export interface PoolPlayer {
  player: Player;
  status: "available" | "taken_by_higher" | "already_picked";
  response: AvailStatus | null;
  is_provisional?: boolean;
  is_excused?: boolean;
  takenBy?: string;
}

/**
 * Computes the available pool for a captain selecting for `match`.
 * Marks each as available, already taken by a higher tier (confirmed or provisional), 
 * or already picked for this same match.
 */
export function poolForMatch(input: CaptainPoolInput): PoolPlayer[] {
  const { match, teams, allMatches, playersById, availability, availabilityDetails, selections, matchStatus } = input;
  const myTeam = teams.find((t) => t.code === match.team_code);
  if (!myTeam) return [];

  // Find all H-team matches on the same date with HIGHER tier_order
  const higherTierMatches = new Map<string, string>(); // match_id -> team_code
  for (const m of allMatches) {
    if (m.match_date === match.match_date && m.id !== match.id) {
      const t = teams.find((x) => x.code === m.team_code);
      if (t && t.tier_order != null && myTeam.tier_order != null && t.tier_order < myTeam.tier_order) {
        higherTierMatches.set(m.id, t.code);
      }
    }
  }

  // Players already picked by a higher-tier team
  const takenByHigher = new Map<string, { team: string; confirmed: boolean }>();
  if (myTeam.tier_order != null) {
    for (const sel of selections) {
      const teamCode = higherTierMatches.get(sel.match_id);
      if (teamCode) {
        const status = matchStatus.find(ms => ms.match_id === sel.match_id);
        const isConfirmed = status?.state === "confirmed";
        takenByHigher.set(sel.player_id, { team: teamCode, confirmed: isConfirmed });
      }
    }
  }

  // Players already picked for THIS match
  const pickedHere = new Set<string>();
  for (const s of selections) {
    if (s.match_id === match.id) {
      pickedHere.add(s.player_id);
    }
  }

  const result: PoolPlayer[] = [];
  const excusedSet = new Set(availabilityDetails.filter(ad => ad.is_excused).map(ad => ad.player_id));

  for (const player of Array.from(playersById.values())) {
    if (!player.active) continue;
    
    const playerId = player.id;
    const response = availability.get(playerId) || null;

    if (pickedHere.has(playerId)) {
      result.push({ player, status: "already_picked", response, is_excused: excusedSet.has(playerId) });
    } else if (takenByHigher.has(playerId)) {
      const info = takenByHigher.get(playerId)!;
      result.push({ 
        player, 
        status: "taken_by_higher", 
        response, 
        takenBy: info.team, 
        is_provisional: !info.confirmed,
        is_excused: excusedSet.has(playerId)
      });
    } else {
      result.push({ player, status: "available", response, is_excused: excusedSet.has(playerId) });
    }
  }

  // Sort: available first, then by tier (lower = higher skill), then by name
  return result.sort((a, b) => {
    const order = { available: 0, already_picked: 1, taken_by_higher: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    
    // Within groups, prioritize those who actually said YES
    if (a.response === "yes" && b.response !== "yes") return -1;
    if (b.response === "yes" && a.response !== "yes") return 1;

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
