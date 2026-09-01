/**
 * EMAIL SERVICE (stub)
 * -------------------------------------------------------------
 * Ships as a MOCK — logs to console instead of sending real email, so the
 * whole password-reset flow runs for $0 with no email-provider signup.
 *
 * PRODUCTION PATH: any transactional email provider works — Resend and
 * SendGrid both have generous free tiers and a simple API. Swap the body
 * of sendEmail() for a real API call; nothing else in the app needs to
 * change since every caller already goes through this one function.
 * -------------------------------------------------------------
 */
export async function sendEmail(to: string, subject: string, body: string) {
  // TODO(production): replace with a real provider call, e.g.:
  //   await fetch("https://api.resend.com/emails", { ... })
  console.log(`\n[MOCK EMAIL] To: ${to}\nSubject: ${subject}\n${body}\n`);
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  // In production this becomes a deep link into the app, e.g.
  // idle://reset-password?token=... opened from an email button.
  await sendEmail(
    to,
    "Reset your Idle password",
    `Someone (hopefully you) requested a password reset.\n\nYour reset code: ${resetToken}\n\nThis code expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't change.`
  );
}
