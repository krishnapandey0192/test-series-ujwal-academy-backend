const Sib = require("@sendinblue/client");

let brevoApi;
function getBrevoApi() {
  if (brevoApi) return brevoApi;
  const apiKey = process.env.BREVO_API_KEY || "";
  if (!apiKey) {
    const err = new Error("BREVO_API_KEY is required for sending emails via Brevo.");
    err.code = "BREVO_MISSING_API_KEY";
    throw err;
  }
  if (apiKey.startsWith("xsmtpsib-")) {
    const err = new Error(
      "BREVO_API_KEY looks like an SMTP key. Generate an API key that starts with 'xkeysib-'."
    );
    err.code = "BREVO_WRONG_KEY_TYPE";
    throw err;
  }
  brevoApi = new Sib.TransactionalEmailsApi();
  brevoApi.setApiKey(Sib.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return brevoApi;
}

async function sendMail({ to, subject, html }) {
  const recipients = Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }];
  const MAIL_FROM = process.env.MAIL_FROM || "no-reply@example.com";
  const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || undefined;

  const payload = {
    sender: MAIL_FROM_NAME ? { email: MAIL_FROM, name: MAIL_FROM_NAME } : { email: MAIL_FROM },
    to: recipients,
    subject,
    htmlContent: html,
  };

  try {
    const api = getBrevoApi();
    const result = await api.sendTransacEmail(payload);
    if (process.env.EMAIL_DEBUG === "true") {
      console.log("[Email Brevo API] Sent:", {
        to: recipients,
        subject,
        messageId: result?.messageId || result?.body?.messageId,
      });
    }
    return result;
  } catch (err) {
    const status = err?.response?.statusCode || err?.response?.status || err?.statusCode;
    const body = err?.response?.body || err?.body;
    const message = body?.message || err?.message || "Email send failed";
    const code = body?.code || err?.code;
    const details = { status, code, message };
    if (process.env.EMAIL_DEBUG === "true") {
      console.error("[Email Brevo API] Error:", details);
    }
    const e = new Error(message);
    e.status = status;
    e.code = code;
    e.details = body || details;
    throw e;
  }
}

module.exports = { sendMail };


