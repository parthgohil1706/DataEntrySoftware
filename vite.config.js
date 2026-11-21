import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import nodemailer from 'nodemailer';

function gmailOtpPlugin() {
  return {
    name: 'gmail-otp-mailer',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { toEmail, otp } = JSON.parse(body || '{}');
              if (!toEmail || !otp) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing toEmail or otp' }));
              }

              const env = loadEnv('development', process.cwd(), '');
              const user = env.GMAIL_USER || 'parthsinhgohil01@gmail.com';
              const pass = (env.GMAIL_APP_PASSWORD || 'kckbikmewiwqpruu').replace(/\s+/g, '');

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass }
              });

              console.log(`[Gmail Mailer] Sending OTP email to ${toEmail}...`);

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
                    <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Password Reset Verification</h2>
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
                      If you did not request this password reset, please ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center;">
                      Sent securely from QuickEntry System
                    </p>
                  </div>
                `
              });

              console.log(`[Gmail Mailer] OTP email successfully delivered to ${toEmail}`);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, delivered: true, recipient: toEmail }));
            } catch (err) {
              console.error('[Gmail Mailer] Delivery failed:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to dispatch email via Gmail SMTP' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    gmailOtpPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'QuickEntry - Data Entry App',
        short_name: 'QuickEntry',
        description: 'Clean, simple dynamic data entry app with Excel export',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f8fafc',
        theme_color: '#2563eb',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
