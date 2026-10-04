import nodemailer from "nodemailer";

/** Email is optional: without SMTP settings the password-reset link is only written to the server log. */
export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) return false;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, text });
  return true;
}
