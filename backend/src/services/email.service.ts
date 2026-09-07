export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Email delivery is not configured; set RESEND_API_KEY and EMAIL_FROM.");
    console.log(`\n[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${body}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected the message (${response.status}): ${detail}`);
  }
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
