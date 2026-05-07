import nodemailer from "nodemailer";
import { env } from "../config/index.js";
import { AppError } from "../errors/index.js";

function createMailService({ logger }) {
  let transporter = null;

  function normalizeMailError(error) {
    const message = String(error?.message || "").trim();
    const host = String(env.SMTP_HOST || "").trim();
    const user = String(env.SMTP_USER || "").trim();
    const isSendGrid = /sendgrid/i.test(host) || user === "apikey";

    if (
      /invalid login/i.test(message) ||
      /authentication failed/i.test(message) ||
      /\b535\b/.test(message)
    ) {
      throw new AppError(
        502,
        isSendGrid
          ? "SendGrid SMTP authentication failed. Update backend SMTP_PASSWORD with active SendGrid API key and restart backend."
          : "SMTP authentication failed. Update backend SMTP credentials and restart backend.",
        "SMTP_AUTH_FAILED",
        {
          host: host || null,
          user: user || null,
          provider: isSendGrid ? "sendgrid" : "smtp",
        },
      );
    }

    if (/configuration is missing/i.test(message)) {
      throw new AppError(
        500,
        "SMTP configuration is missing in backend environment.",
        "SMTP_CONFIG_MISSING",
        {
          host: host || null,
          user: user || null,
        },
      );
    }

    return error;
  }

  function getTransporter() {
    if (!transporter) {
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
        throw new AppError(
          500,
          "SMTP configuration is missing in backend environment.",
          "SMTP_CONFIG_MISSING",
        );
      }

      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        requireTLS: true,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
        },
      });

      logger.info(
        {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          from: env.SMTP_FROM_EMAIL,
        },
        "Mail service initialized"
      );
    }

    return transporter;
  }

  async function sendMail({ to, subject, text, html, cc, bcc, attachments, threadId, references }) {
    try {
      const transport = getTransporter();

      const mailOptions = {
        from: `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        attachments,
        headers: {},
      };

      // Add threading headers if threadId is provided
      if (threadId) {
        mailOptions.headers['In-Reply-To'] = threadId;
        mailOptions.headers['References'] = references || threadId;
        mailOptions.headers['Message-ID'] = threadId;
      }

      const info = await transport.sendMail(mailOptions);

      logger.info(
        {
          messageId: info.messageId,
          to,
          subject,
          threadId,
        },
        "Email sent successfully"
      );

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        threadId: threadId || info.messageId,
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          to,
          subject,
        },
        "Failed to send email"
      );

      throw normalizeMailError(error);
    }
  }

  async function verifyConnection() {
    try {
      const transport = getTransporter();
      await transport.verify();
      logger.info("SMTP connection verified successfully");
      return true;
    } catch (error) {
      logger.error({ err: error }, "SMTP connection verification failed");
      throw normalizeMailError(error);
    }
  }

  return Object.freeze({
    sendMail,
    verifyConnection,
  });
}

export { createMailService };
