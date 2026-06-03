import nodemailer from "nodemailer";
import { logger } from "../config/logger.js";
import type { PaymentSuccessEmailJob } from "../jobs/queues/email.queue.js";

const createTransporter = () => {
  if (!process.env.SMTP_HOST) {
    logger.warn("SMTP_HOST missing. Emails will be logged instead of sent.");

    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
  });
};

const transporter = createTransporter();

export const sendPaymentSuccessEmail = async (
  payload: PaymentSuccessEmailJob
) => {
  const from = process.env.MAIL_FROM || "ProduceAFilm <no-reply@example.com>";

  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: `Payment successful for ${payload.projectTitle}`,
    text: `
Hi ${payload.username},

Thank you for contributing ₹${payload.amount} to "${payload.projectTitle}".

Payment ID: ${payload.paymentId}
Contribution ID: ${payload.contributionId}

Regards,
ProduceAFilm
    `.trim(),
    html: `
      <p>Hi ${payload.username},</p>
      <p>Thank you for contributing <strong>₹${payload.amount}</strong> to <strong>${payload.projectTitle}</strong>.</p>
      <p>Payment ID: ${payload.paymentId}</p>
      <p>Contribution ID: ${payload.contributionId}</p>
      <p>Regards,<br/>ProduceAFilm</p>
    `
  });

  logger.info(`Payment success email queued/sent: ${JSON.stringify(info)}`);
};