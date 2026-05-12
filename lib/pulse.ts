
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendNudgeEmail(email: string, fullName: string, weekendLabel: string) {
  if (!resend) {
    console.log(`[Pulse Mock] Would send nudge to ${fullName} (${email}) for ${weekendLabel}`);
    return { success: true, mocked: true };
  }

  try {
    await resend.emails.send({
      from: "KampongSelect <onboarding@resend.dev>",
      to: email,
      subject: `Action Required: Availability for ${weekendLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Hi ${fullName},</h2>
          <p>The selection deadline for <strong>${weekendLabel}</strong> is approaching and we haven't heard from you.</p>
          <p>Please log in to the selection portal to set your availability so the captains can finalize the teams.</p>
          <div style="margin-top: 30px;">
            <a href="https://kampong-select.vercel.app" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Availability</a>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #71717a;">Cricket Club Kampong · Selection System</p>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error("Pulse Error:", error);
    return { success: false, error };
  }
}

export async function sendSelectionNotification(email: string, fullName: string, matchDetails: string) {
  if (!resend) {
    console.log(`[Pulse Mock] Selection alert to ${fullName} (${email}): ${matchDetails}`);
    return { success: true, mocked: true };
  }

  try {
    await resend.emails.send({
      from: "KampongSelect <onboarding@resend.dev>",
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
            <a href="https://kampong-select.vercel.app" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Match Details</a>
          </div>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error("Pulse Error:", error);
    return { success: false, error };
  }
}
