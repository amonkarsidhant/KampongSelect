import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // First-time sign-in: link the auth user to their players row by email
    if (data.user?.email) {
      await supabase
        .from("players")
        .update({ auth_user_id: data.user.id })
        .eq("email", data.user.email)
        .is("auth_user_id", null);
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
