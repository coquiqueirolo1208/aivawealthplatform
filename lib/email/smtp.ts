// Thin wrapper around nodemailer's SMTP transport, using AIVA's own mail server.
// Same "optional until configured" pattern as lib/ai/anthropic.ts: every caller
// checks isEmailConfigured() first and skips sending (logging instead) when it's
// false, so the rest of the app never has to care whether SMTP is wired up yet.

import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email:mock] would send "${opts.subject}" to ${opts.to} (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD to send for real)`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
