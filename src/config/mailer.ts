import nodemailer from 'nodemailer';
import 'dotenv/config';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const gmailUser = process.env.EMAIL_USER;
const gmailPass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || gmailUser || 'no-reply@example.com';

let transporter: nodemailer.Transporter | null = null;

// Preference: if EMAIL_USER and EMAIL_PASS are set, use Gmail (or generic SMTP via nodemailer service)
if (gmailUser && gmailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass }
  });
} else if (smtpHost && smtpPort && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: { user: smtpUser, pass: smtpPass }
  });
} else {
  // No SMTP configured — leave transporter null and fall back to console
  console.warn('Mailer: SMTP not configured. Emails will be logged to console. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS to enable real sending.');
}

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (transporter) {
    return transporter.sendMail({ from, to, subject, text, html });
  }
  // Fallback for development: log the mail and resolve
  console.log('--- Mailer fallback (email not sent) ---');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Text:', text);
  if (html) console.log('HTML:', html);
  return Promise.resolve({ accepted: [to] });
}
