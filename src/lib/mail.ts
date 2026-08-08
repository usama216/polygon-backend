import nodemailer from 'nodemailer';

export interface ContactEmailPayload {
  name: string;
  email: string;
  projectType: string;
  message: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !user || !pass) {
    throw new Error('Email service is not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendContactEmail(data: ContactEmailPayload): Promise<void> {
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!to) {
    throw new Error('CONTACT_EMAIL is not configured');
  }

  const transporter = getTransporter();

  const text = [
    `New contact form submission`,
    ``,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Project type: ${data.projectType}`,
    ``,
    `Message:`,
    data.message,
  ].join('\n');

  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
    <p><strong>Project type:</strong> ${escapeHtml(data.projectType)}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
  `;

  await transporter.sendMail({
    from: `"Polygon Paradise" <${from}>`,
    to,
    replyTo: data.email,
    subject: `New inquiry: ${data.projectType} — ${data.name}`,
    text,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
