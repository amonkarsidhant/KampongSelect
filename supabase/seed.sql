-- ============================================================================
-- KampongSelect — seed data
-- Run after schema.sql to bootstrap the app.
-- ============================================================================

-- ─── TEAMS ──────────────────────────────────────────────────────────────────
insert into teams (code, name, kind, default_day, tier_order) values
  ('H1',     'Heren 1',    'competitive',  null,       1),
  ('H2',     'Heren 2',    'competitive',  null,       2),
  ('H3',     'Heren 3',    'competitive',  null,       3),
  ('H4',     'Heren 4',    'competitive',  null,       4),
  ('H5',     'Heren 5',    'competitive',  null,       5),
  ('Zami 1', 'Zami 1',     'recreational', 'saturday', null),
  ('Zami 2', 'Zami 2',     'recreational', 'saturday', null),
  ('Zomi',   'Zomi',       'recreational', 'sunday',   null);

-- ─── SAMPLE MATCHES (one weekend) ───────────────────────────────────────────
insert into matches (team_code, match_date, weekend_day, start_time, opposition, venue, is_home) values
  ('H1',     '2026-05-03', 'sunday',   '11:00', 'VOC 1',         'Kampong',                     true),
  ('H2',     '2026-05-03', 'sunday',   '11:00', 'VOC 2',         'Schiebroekse Park',          false),
  ('H3',     '2026-05-03', 'sunday',   '13:00', 'Quick 2',       'De Eendracht',               false),
  ('H4',     '2026-05-03', 'sunday',   '13:00', 'Sparta 3',      'Kampong',                     true),
  ('H5',     '2026-05-03', 'sunday',   '13:00', 'Zwolle 2',      'De Verbinding',              false),
  ('Zomi',   '2026-05-03', 'sunday',   '13:00', 'Wanderers Zo',  'Wanderers',                  false),
  ('Zami 1', '2026-05-02', 'saturday', '13:30', 'VOC Za',        'Kampong',                     true),
  ('Zami 2', '2026-05-02', 'saturday', '13:30', 'HCC Za 2',      'HCC',                        false);

-- Initialise match_status rows
insert into match_status (match_id, state)
  select id, 'open' from matches;

-- ─── SAMPLE PLAYERS (use real KNCB IDs from your sheet) ────────────────────
-- Replace the email values with real ones once you import. Auth links by email.
insert into players (email, full_name, kncb_id, role, tier, user_role, captains_team) values
  -- Tier 1 (H1 squad)
  ('scott.edwards@example.com',     'Scott Edwards',          2851,  'Wicketkeeper', 1, 'captain', 'H1'),
  ('max.odowd@example.com',         'Max O''Dowd',            6300,  'Batter',       1, 'player',  null),
  ('lachlan.bangs@example.com',     'Lachlan Bangs',          14648, 'Batter',       1, 'player',  null),
  ('pienaar.buys@example.com',      'Pienaar Buys',           12659, 'All-rounder',  1, 'player',  null),
  ('zach.lc@example.com',           'Zach Lion-Cachet',       15791, 'All-rounder',  1, 'player',  null),
  -- Tier 2 (H2 captain + squad)
  ('lorenzo.ingram@example.com',    'Lorenzo Ingram',         4040,  'Batter',       2, 'captain', 'H2'),
  ('vignesh.s@example.com',         'Vignesh Sattanathan',    7382,  'Batter',       2, 'player',  null),
  ('damien.vdb@example.com',        'Damien van den Berg',    13554, 'All-rounder',  2, 'player',  null),
  ('akhil.g@example.com',           'Akhil Gopinath',         11052, 'All-rounder',  2, 'player',  null),
  ('bir.parkash@example.com',       'Bir Parkash',            13694, 'Bowler',       2, 'player',  null),
  -- Tier 3
  ('shanmugam.g@example.com',       'Shanmugam Gulapala',     13530, 'Bowler',       3, 'captain', 'H3'),
  ('ajmal.a@example.com',           'Ajmal Arghandiwal',      1358,  'All-rounder',  3, 'player',  null),
  ('ajinkya.more@example.com',      'Ajinkya More',           12815, 'Batter',       3, 'player',  null),
  ('talal.ansar@example.com',       'Talal Ansar',            12808, 'Batter',       3, 'player',  null),
  -- Tier 4
  ('amit.das@example.com',          'Amit Das',               2502,  'Bowler',       4, 'captain', 'H4'),
  ('dinesh.d@example.com',          'Dinesh Dhanasekaran',    12147, 'Batter',       4, 'player',  null),
  ('bernard.k@example.com',         'Bernard Kritzinger',     12688, 'Bowler',       4, 'player',  null),
  ('robert.vdh@example.com',        'Robert van der Harten',  3570,  'Batter',       4, 'player',  null),
  -- Recreational captains
  ('zami1.captain@example.com',     'Zami 1 Captain',         null,  'All-rounder',  null, 'captain', 'Zami 1'),
  ('zami2.captain@example.com',     'Zami 2 Captain',         null,  'Bowler',       null, 'captain', 'Zami 2'),
  ('zomi.captain@example.com',      'Zomi Captain',           null,  'Batter',       null, 'captain', 'Zomi'),
  -- Fixture Secretary
  ('secretaris@kampongcricket.nl',  'Fixture Secretary',      null,  'Batter',       null, 'admin',   null);
