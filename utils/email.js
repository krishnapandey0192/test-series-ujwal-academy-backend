const nodemailer = require("nodemailer");
let BrevoClient;
try {
  BrevoClient = require("@sendinblue/client");
} catch (_) {
  BrevoClient = null;
}

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const {
    BREVO_API_KEY,
    BREVO_SMTP_USER,
    MAIL_FROM,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  // Prefer Brevo if API key is provided (no extra deps, use SMTP relay)
  if (BREVO_API_KEY) {
    const brevoUser = BREVO_SMTP_USER || MAIL_FROM;
    cachedTransporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: brevoUser, pass: BREVO_API_KEY },
      pool: true,
    });
    return cachedTransporter;
  }

  // Generic SMTP if fully configured
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    // Fallback transporter that just logs emails (development-safe)
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
  const from = process.env.MAIL_FROM || "no-reply@example.com";

  // Use Brevo Transactional API if API key is present
  if (process.env.BREVO_API_KEY && BrevoClient) {
    // Guard: common mistake is using SMTP key (prefix `xsmtpsib-`) instead of API key (`xkeysib-`)
    if (process.env.BREVO_API_KEY.startsWith("xsmtpsib-")) {
      const err = new Error(
        "BREVO_API_KEY appears to be an SMTP key. Use an API key (starts with 'xkeysib-')."
      );
      err.code = "BREVO_WRONG_KEY_TYPE";
      throw err;
    }

    const api = new BrevoClient.TransactionalEmailsApi();
    api.setApiKey(
      BrevoClient.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    const senderName = process.env.MAIL_FROM_NAME || undefined;
    const recipients = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];

    const payload = {
      sender: senderName ? { email: from, name: senderName } : { email: from },
      to: recipients,
      subject,
      htmlContent: html,
    };

    return api.sendTransacEmail(payload);
  }

  // Fallback to SMTP (if configured) or dev logger
  const transporter = getTransporter();
  return transporter.sendMail({ from, to, subject, html });
}

module.exports = { sendMail };


