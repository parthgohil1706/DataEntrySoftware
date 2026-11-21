// Hybrid Storage Manager: MySQL Database + Local Cache Fallback
import { isValidEmail } from './validation';
import { sendOtpEmail } from './mailer';
import { Api } from './api';

const STORAGE_KEYS = {
  USERS: 'qe_users',
  CURRENT_USER: 'qe_current_user',
  TEMPLATES_PREFIX: 'qe_templates_',
  RECORDS_PREFIX: 'qe_records_'
};

export const Storage = {
  // 1. Get Users from Local Cache
  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  // 2. User Registration (MySQL with Local Fallback)
  async register(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. user@example.com).');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      // Attempt MySQL Registration
      const user = await Api.register(cleanEmail, password);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      // If server explicitly reported user exists, don't fall back, throw it
      if (err.message && err.message.includes('already exists')) {
        throw err;
      }

      console.warn('[Storage] MySQL unavailable, using local storage:', err.message);

      // Local fallback
      const users = this.getLocalUsers();
      if (users.find(u => (u.email || '').toLowerCase() === cleanEmail)) {
        throw new Error('An account already exists with this email address. Please sign in instead.');
      }
      const newUser = { id: 'usr_' + Date.now(), email: cleanEmail, createdAt: new Date().toISOString() };
      users.push({ ...newUser, password });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      this.setCurrentUser(newUser);
      return newUser;
    }
  },

  // 3. User Login (MySQL with Local Fallback)
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    try {
      // Attempt MySQL Login
      const user = await Api.login(cleanEmail, password);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      // If server returned invalid credentials, rethrow
      if (err.message && (err.message.includes('Invalid') || err.message.includes('password'))) {
        throw err;
      }

      console.warn('[Storage] MySQL unavailable, using local storage login:', err.message);

      // Local fallback
      const users = this.getLocalUsers();
      const user = users.find(
        u => (u.email || '').toLowerCase() === cleanEmail && u.password === password
      );

      if (!user) {
        throw new Error('Invalid email or password. If you forgot your password, click "Forgot Password".');
      }

      const safeUser = { id: user.id, email: user.email, createdAt: user.createdAt };
      this.setCurrentUser(safeUser);
      return safeUser;
    }
  },

  // 4. Password Recovery via Real Email OTP (MySQL + Gmail)
  async sendPasswordResetOtp(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      const res = await Api.forgotPassword(cleanEmail);
      return { success: true, email: res.email };
    } catch (err) {
      if (err.message && err.message.includes('No account found')) {
        throw err;
      }

      console.warn('[Storage] MySQL unavailable, using local OTP fallback:', err.message);

      // Local fallback
      const users = this.getLocalUsers();
      const user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
      if (!user) {
        throw new Error('No account found with this email. Please check your email or register.');
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      user.resetOtp = { code: otp, expiresAt };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      await sendOtpEmail(user.email, otp);
      return { success: true, email: user.email };
    }
  },

  // 5. Verify OTP & Reset Password (MySQL with Local Fallback)
  async verifyOtpAndResetPassword(email, otp, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp || !newPassword) {
      throw new Error('All fields are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    try {
      const user = await Api.resetPassword(cleanEmail, cleanOtp, newPassword);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      if (err.message && (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('No OTP'))) {
        throw err;
      }

      console.warn('[Storage] MySQL unavailable, using local OTP verification:', err.message);

      // Local fallback
      const users = this.getLocalUsers();
      const user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
      if (!user || !user.resetOtp) {
        throw new Error('No OTP request found for this email. Please request a new OTP.');
      }
      if (Date.now() > user.resetOtp.expiresAt) {
        throw new Error('The OTP code has expired. Please request a new one.');
      }
      if (user.resetOtp.code !== cleanOtp) {
        throw new Error('Invalid OTP code. Please check the code sent to your email and try again.');
      }

      user.password = newPassword;
      delete user.resetOtp;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      const safeUser = { id: user.id, email: user.email, createdAt: user.createdAt };
      this.setCurrentUser(safeUser);
      return safeUser;
    }
  },

  // 6. Session Management
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  logout() {
    this.setCurrentUser(null);
  },

  // 7. Sheet Templates per user (MySQL + Local Cache)
  async getSheets(userId) {
    if (!userId) return [];

    try {
      const sheets = await Api.getSheets(userId);
      if (sheets && Array.isArray(sheets)) {
        localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(sheets));
        return sheets;
      }
    } catch (err) {
      console.warn('[Storage] Fetching sheets from local cache:', err.message);
    }

    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`) || '[]');
    } catch {
      return [];
    }
  },

  async saveSheets(userId, sheets) {
    if (!userId) return;

    // Always update local cache immediately
    localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(sheets));

    try {
      await Api.saveSheets(userId, sheets);
    } catch (err) {
      console.warn('[Storage] Could not sync sheets to MySQL, saved locally:', err.message);
    }
  },

  // 8. Records per sheet (MySQL + Local Cache)
  async getRecords(userId, sheetId) {
    if (!userId || !sheetId) return [];

    try {
      const records = await Api.getRecords(userId, sheetId);
      if (records && Array.isArray(records)) {
        localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`, JSON.stringify(records));
        return records;
      }
    } catch (err) {
      console.warn('[Storage] Fetching records from local cache:', err.message);
    }

    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`) || '[]');
    } catch {
      return [];
    }
  },

  async saveRecords(userId, sheetId, records) {
    if (!userId || !sheetId) return;

    // Always update local cache immediately
    localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`, JSON.stringify(records));

    try {
      await Api.saveRecords(userId, sheetId, records);
    } catch (err) {
      console.warn('[Storage] Could not sync records to MySQL, saved locally:', err.message);
    }
  }
};
