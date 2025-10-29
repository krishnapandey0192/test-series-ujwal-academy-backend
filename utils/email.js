const nodemailer = require("nodemailer");

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    // Fallback transporter that just logs emails
    cachedTransporter = {
      sendMail: async (options) => {
        console.log("[Email fallback] To:", options.to);
        console.log("[Email fallback] Subject:", options.subject);
        console.log("[Email fallback] HTML:\n", options.html);
        return { messageId: "fallback" };
      },
    };
  }

  return cachedTransporter;
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || "no-reply@example.com";
  return transporter.sendMail({ from, to, subject, html });
}

module.exports = { sendMail };


