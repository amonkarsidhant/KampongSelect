import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const adminEmail = process.argv[2];

if (!adminEmail) {
  console.error("Please provide the email address to promote to admin.");
  console.error("Usage: npx tsx scripts/bootstrap-admin.ts <email>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!);

  console.log(`Promoting ${adminEmail} to admin...`);

  // First check if the player exists
  const { data: player, error: fetchErr } = await supabase
    .from("players")
    .select("*")
    .eq("email", adminEmail)
    .maybeSingle();

  if (fetchErr) {
    console.error("Error fetching player:", fetchErr.message);
    process.exit(1);
  }

  if (player) {
    // Update existing player
    const { error: updateErr } = await supabase
      .from("players")
      .update({ user_role: "admin", active: true })
      .eq("id", player.id);

    if (updateErr) {
      console.error("Error updating player:", updateErr.message);
      process.exit(1);
    }
    console.log(`Success! ${adminEmail} is now an admin.`);
  } else {
    // Create new player record as admin
    const { error: insertErr } = await supabase.from("players").insert({
      email: adminEmail,
      full_name: "Fixture Secretary",
      user_role: "admin",
      role: "Batter",
      active: true,
    });

    if (insertErr) {
      console.error("Error creating admin player:", insertErr.message);
      process.exit(1);
    }
    console.log(
      `Success! Created new player record for ${adminEmail} and set as admin.`,
    );
  }
}

main().catch(console.error);
