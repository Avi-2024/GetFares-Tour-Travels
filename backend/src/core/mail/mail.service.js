import nodemailer from "nodemailer";
import { env } from "../config/index.js";

function createMailService({ logger }) {
  let transporter = null;

  function getTransporter() {
    if (!transporter) {
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
        throw new Error("SMTP configuration is missing in environment variables");
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

      throw error;
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
      throw error;
    }
  }

  return Object.freeze({
    sendMail,
    verifyConnection,
  });
}

export { createMailService };
