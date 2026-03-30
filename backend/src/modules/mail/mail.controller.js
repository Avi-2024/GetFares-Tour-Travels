import { asyncHandler } from "../../core/utils/index.js";

function createMailController({ mailService }) {
  return {
    sendTestEmail: asyncHandler(async (req, res) => {
      const { to, subject, text, html, threadId, references } = req.body;

      const result = await mailService.sendMail({
        to,
        subject: subject || "Test Email from Get2Vacations CRM",
        text: text || "This is a test email from your Travel CRM system.",
        html: html || "<h1>Test Email</h1><p>This is a test email from your Travel CRM system.</p>",
        threadId,
        references,
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
        data: result,
      });
    }),

    verifyConnection: asyncHandler(async (req, res) => {
      await mailService.verifyConnection();

      res.status(200).json({
        success: true,
        message: "SMTP connection verified successfully",
      });
    }),
  };
}

export { createMailController };
