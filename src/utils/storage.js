// Hybrid Storage Manager: Supabase Cloud (Primary) + MySQL (Server) + Local Cache (Fallback)
import { isValidEmail } from './validation';
import { sendOtpEmail } from './mailer';
import { Api } from './api';
import { getSupabase } from './supabase';

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

  // 2. User Registration (Supabase -> MySQL -> Local Fallback)
  async register(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. user@example.com).');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const supabase = getSupabase();

    // 2A. Attempt Supabase Cloud Registration
    if (supabase) {
      try {
        const { data: existing, error: checkErr } = await supabase
          .from('app_users')
          .select('id')
          .eq('email', cleanEmail)
          .limit(1);

        if (!checkErr && existing && existing.length > 0) {
          throw new Error('An account already exists with this email address. Please sign in instead.');
        }

        const newUser = {
          id: 'usr_' + Date.now(),
          email: cleanEmail,
          password
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('app_users')
          .insert(newUser)
          .select('id, email, created_at')
          .single();

        if (insertErr) throw insertErr;

        const safeUser = { id: inserted.id, email: inserted.email, createdAt: inserted.created_at };
        this.setCurrentUser(safeUser);
        return safeUser;
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          throw err;
        }
        console.warn('[Storage] Supabase registration error, falling back:', err.message);
      }
    }

    // 2B. Attempt MySQL Registration
    try {
      const user = await Api.register(cleanEmail, password);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        throw err;
      }
      console.warn('[Storage] MySQL unavailable, using local storage:', err.message);

      // 2C. Local fallback
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

  // 3. User Login (Supabase -> MySQL -> Local Fallback)
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    const supabase = getSupabase();

    // 3A. Attempt Supabase Login
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, email, password, created_at')
          .eq('email', cleanEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          if (data[0].password !== password) {
            throw new Error('Invalid email or password. If you forgot your password, click "Forgot Password".');
          }
          const safeUser = { id: data[0].id, email: data[0].email, createdAt: data[0].created_at };
          this.setCurrentUser(safeUser);
          return safeUser;
        } else if (!error && (!data || data.length === 0)) {
          throw new Error('Invalid email or password. If you forgot your password, click "Forgot Password".');
        }
      } catch (err) {
        if (err.message && (err.message.includes('Invalid') || err.message.includes('Forgot Password'))) {
          throw err;
        }
        console.warn('[Storage] Supabase login error, falling back:', err.message);
      }
    }

    // 3B. Attempt MySQL Login
    try {
      const user = await Api.login(cleanEmail, password);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      if (err.message && (err.message.includes('Invalid') || err.message.includes('password'))) {
        throw err;
      }
      console.warn('[Storage] MySQL unavailable, using local storage login:', err.message);

      // 3C. Local fallback
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

  // 4. Password Recovery via Real Email OTP (Supabase / MySQL / Gmail)
  async sendPasswordResetOtp(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const supabase = getSupabase();

    // 4A. Supabase OTP handling
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, email')
          .eq('email', cleanEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          const user = data[0];
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = Date.now() + 10 * 60 * 1000;

          await supabase
            .from('app_users')
            .update({ reset_otp: { code: otp, expiresAt } })
            .eq('id', user.id);

          await sendOtpEmail(user.email, otp);
          return { success: true, email: user.email };
        } else if (!error && (!data || data.length === 0)) {
          throw new Error('No account found with this email. Please check your email or register.');
        }
      } catch (err) {
        if (err.message && err.message.includes('No account found')) throw err;
        console.warn('[Storage] Supabase reset OTP failed, trying MySQL:', err.message);
      }
    }

    // 4B. MySQL fallback
    try {
      const res = await Api.forgotPassword(cleanEmail);
      return { success: true, email: res.email };
    } catch (err) {
      if (err.message && err.message.includes('No account found')) throw err;
      console.warn('[Storage] MySQL unavailable, using local OTP fallback:', err.message);

      // 4C. Local fallback
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

  // 5. Verify OTP & Reset Password
  async verifyOtpAndResetPassword(email, otp, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp || !newPassword) {
      throw new Error('All fields are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const supabase = getSupabase();

    // 5A. Supabase OTP verification
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, email, reset_otp, created_at')
          .eq('email', cleanEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          const user = data[0];
          const resetOtp = user.reset_otp;
          if (!resetOtp || !resetOtp.code) {
            throw new Error('No OTP request found for this email. Please request a new OTP.');
          }
          if (Date.now() > resetOtp.expiresAt) {
            throw new Error('The OTP code has expired. Please request a new one.');
          }
          if (String(resetOtp.code).trim() !== cleanOtp) {
            throw new Error('Invalid OTP code. Please check the code sent to your email.');
          }

          await supabase
            .from('app_users')
            .update({ password: newPassword, reset_otp: null })
            .eq('id', user.id);

          const safeUser = { id: user.id, email: user.email, createdAt: user.created_at };
          this.setCurrentUser(safeUser);
          return safeUser;
        }
      } catch (err) {
        if (err.message && (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('No OTP'))) {
          throw err;
        }
        console.warn('[Storage] Supabase reset password error, falling back:', err.message);
      }
    }

    // 5B. MySQL
    try {
      const user = await Api.resetPassword(cleanEmail, cleanOtp, newPassword);
      this.setCurrentUser(user);
      return user;
    } catch (err) {
      if (err.message && (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('No OTP'))) {
        throw err;
      }
      console.warn('[Storage] MySQL unavailable, using local OTP verification:', err.message);

      // 5C. Local fallback
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

  // 6. Update Password (from Profile Section)
  async updatePassword(userId, email, currentPassword, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const supabase = getSupabase();
    let cloudSucceeded = false;

    // 6A. Supabase Update
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, password')
          .eq('email', cleanEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          if (data[0].password !== currentPassword) {
            throw new Error('Current password is incorrect.');
          }
          await supabase
            .from('app_users')
            .update({ password: newPassword })
            .eq('id', data[0].id);
          cloudSucceeded = true;
        }
      } catch (err) {
        if (err.message && err.message.includes('Current password is incorrect')) throw err;
        console.warn('[Storage] Supabase update password failed, trying MySQL:', err.message);
      }
    }

    // 6B. MySQL Update
    try {
      await Api.updatePassword(userId, cleanEmail, currentPassword, newPassword);
      cloudSucceeded = true;
    } catch (err) {
      if (err.message && (err.message.includes('incorrect') || err.message.includes('Current password'))) {
        throw err;
      }
      console.warn('[Storage] MySQL update password fallback to local storage:', err.message);
    }

    // 6C. Update local cache
    const users = this.getLocalUsers();
    const userIndex = users.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
    if (userIndex !== -1) {
      if (!cloudSucceeded && users[userIndex].password && users[userIndex].password !== currentPassword) {
        throw new Error('Current password is incorrect.');
      }
      users[userIndex].password = newPassword;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return { success: true };
  },

  // 7. Session Management
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

  // 8. Sheet Templates per user (Supabase -> MySQL -> Local Cache)
  async getSheets(userId) {
    if (!userId) return [];

    const supabase = getSupabase();

    // 8A. Supabase Cloud Sheets
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('sheets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (!error && data && Array.isArray(data)) {
          localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('[Storage] Supabase fetch sheets error:', err.message);
      }
    }

    // 8B. MySQL Sheets
    try {
      const sheets = await Api.getSheets(userId);
      if (sheets && Array.isArray(sheets)) {
        localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(sheets));
        return sheets;
      }
    } catch (err) {
      console.warn('[Storage] Fetching sheets from local cache:', err.message);
    }

    // 8C. Local Cache
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

    const supabase = getSupabase();

    // 8D. Sync to Supabase
    if (supabase) {
      try {
        for (const sheet of sheets) {
          await supabase.from('sheets').upsert({
            id: sheet.id,
            user_id: userId,
            name: sheet.name,
            columns: sheet.columns,
            updated_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('[Storage] Could not sync sheets to Supabase:', err.message);
      }
    }

    // 8E. Sync to MySQL
    try {
      await Api.saveSheets(userId, sheets);
    } catch (err) {
      console.warn('[Storage] Could not sync sheets to MySQL:', err.message);
    }
  },

  // 9. Records per Sheet (Supabase -> MySQL -> Local Cache)
  async getRecords(userId, sheetId) {
    if (!userId || !sheetId) return [];

    const supabase = getSupabase();

    // 9A. Supabase Cloud Records
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .eq('sheet_id', sheetId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const formatted = data.map(r => ({
            _id: r.id,
            createdAt: r.created_at,
            ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data)
          }));
          localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${sheetId}`, JSON.stringify(formatted));
          return formatted;
        }
      } catch (err) {
        console.warn('[Storage] Supabase getRecords error:', err.message);
      }
    }

    // 9B. MySQL Records
    try {
      const records = await Api.getRecords(userId, sheetId);
      if (records && Array.isArray(records)) {
        localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${sheetId}`, JSON.stringify(records));
        return records;
      }
    } catch (err) {
      console.warn('[Storage] Fetching records from local cache:', err.message);
    }

    // 9C. Local Cache
    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.RECORDS_PREFIX}${sheetId}`) || '[]');
    } catch {
      return [];
    }
  },

  async saveRecords(userId, sheetId, records) {
    if (!userId || !sheetId) return;

    // Always update local cache immediately
    localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${sheetId}`, JSON.stringify(records));

    const supabase = getSupabase();

    // 9D. Sync to Supabase Cloud
    if (supabase) {
      try {
        await supabase
          .from('records')
          .delete()
          .eq('sheet_id', sheetId)
          .eq('user_id', userId);

        if (records.length > 0) {
          const rows = records.map(r => {
            const { _id, createdAt, ...data } = r;
            return {
              id: _id,
              sheet_id: sheetId,
              user_id: userId,
              data,
              created_at: createdAt || new Date().toISOString()
            };
          });
          await supabase.from('records').insert(rows);
        }
      } catch (err) {
        console.warn('[Storage] Could not sync records to Supabase:', err.message);
      }
    }

    // 9E. Sync to MySQL
    try {
      await Api.saveRecords(userId, sheetId, records);
    } catch (err) {
      console.warn('[Storage] Could not sync records to MySQL:', err.message);
    }
  }
};
