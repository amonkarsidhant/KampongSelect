import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "KampongSelect <onboarding@resend.dev>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://kampong-select.vercel.app";

// Service client for logging
const logClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function logNotification(
  playerId: string | null,
  email: string,
  type: string,
  status: string,
  error?: string,
) {
  await logClient.from("notification_log").insert({
    player_id: playerId,
    email,
    type,
    status,
    error_message: error || null,
  });
}

export async function sendNudgeEmail(
  playerId: string,
  email: string,
  fullName: string,
  weekendLabel: string,
) {
  if (!resend) {
    console.log(
      `[Pulse Mock] Would send nudge to ${fullName} (${email}) for ${weekendLabel}`,
    );
    await logNotification(playerId, email, "nudge", "mocked");
    return { success: true, mocked: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Action Required: Availability for ${weekendLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Hi ${fullName},</h2>
          <p>The selection deadline for <strong>${weekendLabel}</strong> is approaching and we haven't heard from you.</p>
          <p>Please log in to the selection portal to set your availability so the captains can finalize the teams.</p>
          <div style="margin-top: 30px;">
            <a href="${APP_URL}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Availability</a>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #71717a;">Cricket Club Kampong · Selection System</p>
        </div>
      `,
    });
    await logNotification(playerId, email, "cascade_alert", "success");
    return { success: true };
  } catch (error: unknown) {
    console.error("Pulse Error:", error);
    await logNotification(
      playerId,
      email,
      "cascade_alert",
      "failed",
      (error as Error).message,
    );
    return { success: false, error };
  }
}

export async function sendSelectionNotification(
  playerId: string,
  email: string,
  fullName: string,
  matchDetails: string,
) {
  if (!resend) {
    console.log(
      `[Pulse Mock] Selection alert to ${fullName} (${email}): ${matchDetails}`,
    );
    await logNotification(playerId, email, "selection_alert", "mocked");
    return { success: true, mocked: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🏏 You've been selected!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Great news, ${fullName}!</h2>
          <p>You have been selected for the upcoming fixture:</p>
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 18px;">${matchDetails}</p>
          </div>
          <p>Please log in to the portal to see the venue, meet-up time, and full XI.</p>
          <div style="margin-top: 30px;">
            <a href="${APP_URL}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Match Details</a>
          </div>
        </div>
      `,
    });
    await logNotification(playerId, email, "selection_alert", "success");
    return { success: true };
  } catch (error: unknown) {
    console.error("Pulse Error:", error);
    await logNotification(
      playerId,
      email,
      "selection_alert",
      "failed",
      (error as Error).message,
    );
    return { success: false, error };
  }
}

export async function sendCascadeNotification(
  playerId: string | null,
  email: string,
  fullName: string,
  matchDetails: string,
  nextTeamCode: string,
) {
  if (!resend) {
    console.log(
      `[Pulse Mock] Cascade alert to ${fullName} (${email}) for team ${nextTeamCode}`,
    );
    await logNotification(playerId, email, "cascade_alert", "mocked");
    return { success: true, mocked: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `📢 Your turn to pick: Higher tier is finished`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${fullName},</h2>
          <p><strong>${matchDetails}</strong> XI has just been confirmed.</p>
          <p>The player pool for <strong>${nextTeamCode}</strong> is now stable and ready for your selection.</p>
          <div style="margin-top: 30px;">
            <a href="${APP_URL}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Selection Hub</a>
          </div>
        </div>
      `,
    });
    await logNotification(playerId, email, "cascade_alert", "success");
    return { success: true };
  } catch (error: unknown) {
    console.error("Pulse Error:", error);
    await logNotification(
      playerId,
      email,
      "cascade_alert",
      "failed",
      (error as Error).message,
    );
    return { success: false, error };
  }
}
