import nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    encoding?: string;
    cid?: string;
  }>;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "Zipline Maldives <noreply@zipline.mv>";
}

function getTransporter() {
  if (!smtpConfigured()) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    requireTLS: true,
  });
}

export async function sendMail(message: MailMessage) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    attachments: message.attachments,
  });
}

