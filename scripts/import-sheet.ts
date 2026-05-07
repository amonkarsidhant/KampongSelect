// ============================================================================
// Google Sheet importer
// ----------------------------------------------------------------------------
// Reads the public Kampong availability sheet (CSV export) and upserts player
// rows into Supabase. Matches by KNCB ID where present; falls back to email.
//
// Run locally:
//   npm run import-sheet -- --sheet-id 1oqrgxl0CyzBbKQtXZr3iqQesvZPWzmINeQMzeN51A8A --gid 2072158670
// or once a week from GitHub Actions (see .github/workflows/sheet-sync.yml).
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role bypasses RLS

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

function arg(flag: string, fallback?: string): string {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required arg: ${flag}`);
}

const sheetId = arg("--sheet-id");
const gid = arg("--gid", "0");
const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

interface ImportRow {
  full_name: string;
  kncb_id: number | null;
  email: string;
}

// Naive CSV parser — handles quoted fields with commas, no escapes beyond quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* ignore */ }
      else field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  console.log(`Fetching ${csvUrl}`);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    console.error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const csv = await res.text();
  const rows = parseCsv(csv);

  // Find the header row — looks for "KNCB ID" + "Name" in any row near the top
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const lower = rows[i].map((c) => c.toLowerCase());
    if (lower.some((c) => c.includes("kncb")) && lower.some((c) => c.includes("name"))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex < 0) {
    console.error("Couldn't find header row with 'KNCB' and 'Name' columns.");
    process.exit(1);
  }
  const header = rows[headerIndex].map((c) => c.toLowerCase());
  const idCol = header.findIndex((c) => c.includes("kncb"));
  const nameCol = header.findIndex((c) => c.includes("name"));
  const emailCol = header.findIndex((c) => c.includes("email") || c.includes("e-mail"));

  const players: ImportRow[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[nameCol] ?? "").trim();
    const idText = (r[idCol] ?? "").trim();
    const email = (emailCol >= 0 ? r[emailCol] : "").trim();
    if (!name) continue;
    const kncb_id = /^\d+$/.test(idText) ? Number(idText) : null;
    const fallbackEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@kampongcricket.nl`;
    players.push({ full_name: name, kncb_id, email: fallbackEmail });
  }

  console.log(`Parsed ${players.length} player rows.`);

  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!);

  let inserted = 0, updated = 0;
  for (const p of players) {
    // Try match by kncb_id, then email
    const { data: existing } = p.kncb_id
      ? await supabase.from("players").select("id").eq("kncb_id", p.kncb_id).maybeSingle()
      : await supabase.from("players").select("id").eq("email", p.email).maybeSingle();

    if (existing) {
      await supabase.from("players").update({ full_name: p.full_name }).eq("id", existing.id);
      updated++;
    } else {
      const { error } = await supabase.from("players").insert(p);
      if (error) console.warn(`Insert failed for ${p.full_name}:`, error.message);
      else inserted++;
    }
  }

  console.log(`Done. Inserted ${inserted}, updated ${updated}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
