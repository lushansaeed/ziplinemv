import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
  }>;
};

export type EmailSendResult = {
  messageId?: string;
  accepted: string[];
  rejected: string[];
  response?: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || "Zipline Maldives <noreply@zipline.mv>";

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from,
  };
}

function getTransporter() {
  if (!transporter) {
    const config = smtpConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail(message: EmailMessage) {
  const config = smtpConfig();
  const result = await getTransporter().sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments,
  });
  return {
    messageId: result.messageId,
    accepted: (result.accepted ?? []).map(String),
    rejected: (result.rejected ?? []).map(String),
    response: result.response,
  } satisfies EmailSendResult;
}
