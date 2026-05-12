// Types matching the Supabase schema in supabase/schema.sql

export type UserRole = "player" | "captain" | "admin";
export type PlayerRole = "Batter" | "Bowler" | "All-rounder" | "Wicketkeeper";
export type WeekendDay = "saturday" | "sunday";
export type AvailStatus = "yes" | "no";

export interface Player {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  kncb_id: number | null;
  role: PlayerRole;
  tier: number | null;
  user_role: UserRole;
  captains_team: string | null;
  active: boolean;
}

export interface Team {
  code: string;
  name: string;
  kind: "competitive" | "recreational";
  default_day: WeekendDay | null;
  tier_order: number | null;
  active: boolean;
}

export interface Match {
  id: string;
  team_code: string;
  match_date: string; // YYYY-MM-DD
  weekend_day: WeekendDay;
  start_time: string | null;
  opposition: string;
  venue: string | null;
  is_home: boolean;
  notes: string | null;
}

export interface Availability {
  id: string;
  player_id: string;
  match_date: string;
  status: AvailStatus;
  note: string | null;
  is_excused: boolean;
  updated_at: string;
}

export interface Selection {
  id: string;
  match_id: string;
  player_id: string;
  selected_by: string | null;
  selected_at: string;
  is_captain: boolean;
  is_keeper: boolean;
}

export interface PoolPlayer {
  player: Player;
  status: "available" | "taken_by_higher" | "already_picked";
  response: AvailStatus | null;
  is_provisional?: boolean;
  is_excused?: boolean;
  takenBy?: string;
}

export interface MatchStatus {
  match_id: string;
  state: "open" | "selecting" | "confirmed";
  confirmed_at: string | null;
  confirmed_by: string | null;
}

// Joined view from v_match_pool
export interface PoolEntry {
  match_id: string;
  team_code: string;
  match_date: string;
  weekend_day: WeekendDay;
  player_id: string;
  full_name: string;
  kncb_id: number | null;
  player_role: PlayerRole;
  tier: number | null;
  taken_by_higher_tier: boolean;
}
