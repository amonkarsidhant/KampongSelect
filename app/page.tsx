import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Attempt to link auth user to player record if not already done
  if (user.email) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await adminClient
      .from("players")
      .update({ auth_user_id: user.id })
      .eq("email", user.email)
      .is("auth_user_id", null);
  }

  const { data: player } = await supabase
    .from("players")
    .select("user_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!player) {
    // Auth account exists but no player row — Fixture Secretary needs to add them
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Almost there</h1>
          <p className="text-stone-400">
            Your account is signed in but isn&apos;t linked to a player record
            yet. Please ask the Fixture Secretary to add your email to the
            squad.
          </p>
        </div>
      </main>
    );
  }

  if (player.user_role === "admin") redirect("/admin");
  if (player.user_role === "captain") redirect("/captain");
  redirect("/player");
}
