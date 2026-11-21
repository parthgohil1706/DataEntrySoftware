// Safe LocalStorage Manager for Email-Based Auth, Password Recovery OTP, Templates & Records
import { isValidEmail } from './validation';
import { sendOtpEmail } from './mailer';

const STORAGE_KEYS = {
  USERS: 'qe_users',
  CURRENT_USER: 'qe_current_user',
  TEMPLATES_PREFIX: 'qe_templates_',
  RECORDS_PREFIX: 'qe_records_'
};

export const Storage = {
  // Authentication (Email-based)
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  register(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. user@example.com).');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const users = this.getUsers();
    if (users.find(u => (u.email || '').toLowerCase() === cleanEmail)) {
      throw new Error('An account already exists with this email address. Please sign in instead.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      email: cleanEmail,
      createdAt: new Date().toISOString()
    };

    users.push({ ...newUser, password });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    return newUser;
  },

  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    const users = this.getUsers();
    const user = users.find(
      u => (u.email || '').toLowerCase() === cleanEmail && u.password === password
    );

    if (!user) {
      throw new Error('Invalid email or password. If you forgot your password, click "Forgot Password".');
    }

    const safeUser = { id: user.id, email: user.email, createdAt: user.createdAt };
    this.setCurrentUser(safeUser);
    return safeUser;
  },

  // Password Recovery via Real Email OTP (Never exposed on screen)
  async sendPasswordResetOtp(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const users = this.getUsers();
    const user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error('No account found with this email. Please check your email or register.');
    }

    // Generate 6-digit OTP code (e.g. 583921)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    user.resetOtp = {
      code: otp,
      expiresAt
    };

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Send the OTP directly to the user's email inbox
    const emailResult = await sendOtpEmail(user.email, otp);

    return {
      success: true,
      email: user.email,
      delivered: emailResult.delivered
      // Note: OTP is NOT returned to prevent displaying on screen
    };
  },

  verifyOtpAndResetPassword(email, otp, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp || !newPassword) {
      throw new Error('All fields are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const users = this.getUsers();
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

    // OTP Verified! Update password and clear OTP
    user.password = newPassword;
    delete user.resetOtp;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const safeUser = { id: user.id, email: user.email, createdAt: user.createdAt };
    this.setCurrentUser(safeUser);
    return safeUser;
  },

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

  // Templates / Column Schemas per user
  getSheets(userId) {
    if (!userId) return [];
    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`) || '[]');
    } catch {
      return [];
    }
  },

  saveSheets(userId, sheets) {
    if (!userId) return;
    localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(sheets));
  },

  // Records per sheet
  getRecords(userId, sheetId) {
    if (!userId || !sheetId) return [];
    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`) || '[]');
    } catch {
      return [];
    }
  },

  saveRecords(userId, sheetId, records) {
    if (!userId || !sheetId) return;
    localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`, JSON.stringify(records));
  }
};
