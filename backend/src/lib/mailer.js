// Sends email through Resend. If no API key is set (local dev), the email is
// printed to the console so you can still grab the code.
import { env, isProd } from "../config/env.js";

export async function sendEmail({ to, subject, text, html }) {
  if (env.RESEND_API_KEY) {
    console.log(`[email] sending "${subject}" to ${to} via Resend…`);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[email] ❌ Resend failed (${res.status}): ${detail}`);
      throw new Error(`Email failed: ${res.status}`);
    }
    console.log(`[email] ✅ delivered to ${to}`);
    return;
  }

  if (isProd) throw new Error("No email provider configured (set RESEND_API_KEY)");

  // Dev mode: no provider configured, so print the email instead of sending it.
  console.log("\n┌─ 📧 DEV EMAIL  (RESEND_API_KEY not set — NOT actually emailed) ──");
  console.log(`│ to:      ${to}`);
  console.log(`│ subject: ${subject}`);
  console.log(`│ ${text}`);
  console.log("└──────────────────────────────────────────────────────────────────\n");
}

export const verificationEmail = (code) => ({
  subject: "Verify your email",
  text: `Your PW Pusher verification code is ${code}. It expires in 10 minutes.`,
  html: `<p>Your verification code is <strong style="font-size:22px">${code}</strong>. It expires in 10 minutes.</p>`,
});

export const resetEmail = (code) => ({
  subject: "Reset your password",
  text: `Your PW Pusher password reset code is ${code}. It expires in 10 minutes.`,
  html: `<p>Your password reset code is <strong style="font-size:22px">${code}</strong>. It expires in 10 minutes.</p>`,
});
