import nodemailer from 'nodemailer';

export async function handleApiRequest(req, res, env) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // Helper to send JSON
  const sendJson = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  // Helper to read JSON body
  const readBody = () => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  };

  // 1. Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(200, { status: 'ok', time: new Date().toISOString() });
  }

  // 2. Gmail OTP Mailer
  if (pathname === '/api/send-otp' && req.method === 'POST') {
    const { toEmail, otp } = await readBody();
    if (!toEmail || !otp) {
      return sendJson(400, { error: 'toEmail and otp are required' });
    }
    try {
      await sendGmailOtp(env, toEmail, otp);
      return sendJson(200, { success: true, delivered: true });
    } catch (err) {
      return sendJson(500, { error: err.message || 'Failed to dispatch email' });
    }
  }

  return false;
}

// Gmail OTP sender helper
async function sendGmailOtp(env, toEmail, otp) {
  const user = env.GMAIL_USER || 'parthsinhgohil01@gmail.com';
  const pass = (env.GMAIL_APP_PASSWORD || 'kckbikmewiwqpruu').replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: `"QuickEntry Verification" <${user}>`,
    to: toEmail,
    subject: `QuickEntry - Your Verification OTP: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">
            QuickEntry
          </div>
        </div>
        <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Account Security Verification</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Hello,<br>
          We received a request to verify your QuickEntry account. Please enter the 6-digit OTP code below into the app:
        </p>
        <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
          ⏱ This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
          If you did not request this OTP, you can safely ignore this email.
        </p>
      </div>
    `
  });
}
