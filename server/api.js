import nodemailer from 'nodemailer';
import { getDbPool } from './mysql.js';

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

  // 1. MySQL Database Status
  if (pathname === '/api/db-status' && req.method === 'GET') {
    try {
      const pool = await getDbPool(env);
      if (pool) {
        await pool.query('SELECT 1');
        return sendJson(200, {
          connected: true,
          type: 'mysql',
          database: env.MYSQL_DATABASE || 'quickentry_db',
          host: env.MYSQL_HOST || '127.0.0.1'
        });
      }
      return sendJson(200, { connected: false, type: 'mysql', message: 'MySQL server not responding' });
    } catch (err) {
      return sendJson(200, { connected: false, type: 'mysql', error: err.message });
    }
  }

  // 2. Auth: Register (MySQL)
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const { email, password } = await readBody();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password || password.length < 6) {
      return sendJson(400, { error: 'Valid email and password (min 6 chars) are required.' });
    }

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL database is not connected.' });

      const [existing] = await pool.query('SELECT id FROM app_users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (existing && existing.length > 0) {
        return sendJson(400, { error: 'An account already exists with this email address.' });
      }

      const id = 'usr_' + Date.now();
      await pool.query('INSERT INTO app_users (id, email, password) VALUES (?, ?, ?)', [id, cleanEmail, password]);

      return sendJson(200, {
        user: { id, email: cleanEmail, createdAt: new Date().toISOString() }
      });
    } catch (err) {
      return sendJson(500, { error: err.message || 'Registration failed in MySQL.' });
    }
  }

  // 3. Auth: Login (MySQL)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await readBody();
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL database is not connected.' });

      const [rows] = await pool.query('SELECT id, email, created_at FROM app_users WHERE email = ? AND password = ? LIMIT 1', [cleanEmail, password]);
      if (!rows || rows.length === 0) {
        return sendJson(401, { error: 'Invalid email or password.' });
      }

      const user = rows[0];
      return sendJson(200, {
        user: { id: user.id, email: user.email, createdAt: user.created_at }
      });
    } catch (err) {
      return sendJson(500, { error: err.message || 'Login failed in MySQL.' });
    }
  }

  // 4. Auth: Request Password Reset OTP (MySQL + Gmail)
  if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
    const { email } = await readBody();
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL database is not connected.' });

      const [rows] = await pool.query('SELECT id, email FROM app_users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (!rows || rows.length === 0) {
        return sendJson(404, { error: 'No account found with this email in MySQL.' });
      }

      const user = rows[0];
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await pool.query('UPDATE app_users SET reset_otp = ? WHERE id = ?', [JSON.stringify({ code: otp, expiresAt }), user.id]);

      // Send via Gmail SMTP
      await sendGmailOtp(env, user.email, otp);

      return sendJson(200, { success: true, email: user.email });
    } catch (err) {
      return sendJson(500, { error: err.message || 'Failed to dispatch password recovery OTP.' });
    }
  }

  // 5. Auth: Verify OTP & Reset Password (MySQL)
  if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
    const { email, otp, newPassword } = await readBody();
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL database is not connected.' });

      const [rows] = await pool.query('SELECT id, email, reset_otp, created_at FROM app_users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (!rows || rows.length === 0) {
        return sendJson(404, { error: 'No account found with this email.' });
      }

      const user = rows[0];
      let resetOtp = user.reset_otp;
      if (typeof resetOtp === 'string') {
        try { resetOtp = JSON.parse(resetOtp); } catch {}
      }

      if (!resetOtp || !resetOtp.code) {
        return sendJson(400, { error: 'No OTP requested. Please request a new code.' });
      }

      if (Date.now() > resetOtp.expiresAt) {
        return sendJson(400, { error: 'The OTP code has expired. Please request a new one.' });
      }

      if (String(resetOtp.code).trim() !== String(otp).trim()) {
        return sendJson(400, { error: 'Invalid OTP code. Please check your email.' });
      }

      await pool.query('UPDATE app_users SET password = ?, reset_otp = NULL WHERE id = ?', [newPassword, user.id]);

      return sendJson(200, {
        user: { id: user.id, email: user.email, createdAt: user.created_at }
      });
    } catch (err) {
      return sendJson(500, { error: err.message || 'Failed to reset password.' });
    }
  }

  // 6. Sheets: Get Sheets (MySQL)
  if (pathname === '/api/sheets' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return sendJson(400, { error: 'userId is required' });

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL not connected' });

      const [rows] = await pool.query('SELECT id, user_id, name, columns, created_at, updated_at FROM sheets WHERE user_id = ? ORDER BY created_at ASC', [userId]);

      const formatted = rows.map(r => ({
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        columns: typeof r.columns === 'string' ? JSON.parse(r.columns) : r.columns,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));

      return sendJson(200, formatted);
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // 7. Sheets: Save/Update Sheets (MySQL)
  if (pathname === '/api/sheets' && req.method === 'POST') {
    const { userId, sheets } = await readBody();
    if (!userId) return sendJson(400, { error: 'userId is required' });

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL not connected' });

      for (const s of (sheets || [])) {
        await pool.query(
          `INSERT INTO sheets (id, user_id, name, columns, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE name = VALUES(name), columns = VALUES(columns), updated_at = NOW()`,
          [s.id, userId, s.name, JSON.stringify(s.columns)]
        );
      }

      return sendJson(200, { success: true });
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // 8. Records: Get Records (MySQL)
  if (pathname === '/api/records' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const sheetId = url.searchParams.get('sheetId');
    if (!userId || !sheetId) return sendJson(400, { error: 'userId and sheetId are required' });

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL not connected' });

      const [rows] = await pool.query(
        'SELECT id, sheet_id, user_id, data, created_at FROM records WHERE user_id = ? AND sheet_id = ? ORDER BY created_at DESC',
        [userId, sheetId]
      );

      const formatted = rows.map(r => {
        const payload = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          _id: r.id,
          createdAt: r.created_at,
          ...payload
        };
      });

      return sendJson(200, formatted);
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // 9. Records: Save Records (MySQL)
  if (pathname === '/api/records' && req.method === 'POST') {
    const { userId, sheetId, records } = await readBody();
    if (!userId || !sheetId) return sendJson(400, { error: 'userId and sheetId are required' });

    try {
      const pool = await getDbPool(env);
      if (!pool) return sendJson(503, { error: 'MySQL not connected' });

      // Clean existing records for this sheet & batch insert
      await pool.query('DELETE FROM records WHERE user_id = ? AND sheet_id = ?', [userId, sheetId]);

      if (records && records.length > 0) {
        for (const r of records) {
          const { _id, createdAt, ...data } = r;
          await pool.query(
            'INSERT INTO records (id, sheet_id, user_id, data, created_at) VALUES (?, ?, ?, ?, ?)',
            [_id, sheetId, userId, JSON.stringify(data), createdAt ? new Date(createdAt) : new Date()]
          );
        }
      }

      return sendJson(200, { success: true });
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // 10. Fallback OTP Mailer
  if (pathname === '/api/send-otp' && req.method === 'POST') {
    const { toEmail, otp } = await readBody();
    try {
      await sendGmailOtp(env, toEmail, otp);
      return sendJson(200, { success: true, delivered: true });
    } catch (err) {
      return sendJson(500, { error: err.message });
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
        <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">MySQL Password Reset Verification</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Hello,<br>
          We received a request to reset your QuickEntry account password. Please enter the 6-digit OTP code below into the app:
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
          If you did not request this password reset, you can safely ignore this email.
        </p>
      </div>
    `
  });
}
