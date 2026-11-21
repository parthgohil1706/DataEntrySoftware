// Hybrid Storage Manager: Supabase Cloud Database + Offline LocalStorage Cache
import { isValidEmail } from './validation';
import { sendOtpEmail } from './mailer';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  USERS: 'qe_users',
  CURRENT_USER: 'qe_current_user',
  TEMPLATES_PREFIX: 'qe_templates_',
  RECORDS_PREFIX: 'qe_records_'
};

export const Storage = {
  isCloudEnabled() {
    return isSupabaseConfigured;
  },

  // 1. Get Users (Local cache helper)
  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  // 2. User Registration (Cloud + Local)
  async register(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. user@example.com).');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      email: cleanEmail,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      // 1. Check if user already exists in Supabase
      const { data: existingUser, error: checkErr } = await supabase
        .from('app_users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (checkErr && checkErr.code !== 'PGRST116') {
        console.warn('Supabase check error, falling back:', checkErr);
      }
      if (existingUser) {
        throw new Error('An account already exists with this email address. Please sign in instead.');
      }

      // 2. Insert into Supabase app_users table
      const { error: insertErr } = await supabase.from('app_users').insert({
        id: newUser.id,
        email: cleanEmail,
        password: password,
        created_at: newUser.createdAt
      });

      if (insertErr) {
        throw new Error('Database error: ' + (insertErr.message || 'Failed to save account to cloud'));
      }
    } else {
      // Local fallback
      const users = this.getLocalUsers();
      if (users.find(u => (u.email || '').toLowerCase() === cleanEmail)) {
        throw new Error('An account already exists with this email address. Please sign in instead.');
      }
      users.push({ ...newUser, password });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    this.setCurrentUser(newUser);
    return newUser;
  },

  // 3. User Login (Cloud + Local)
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    if (isSupabaseConfigured) {
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', password)
        .maybeSingle();

      if (error || !user) {
        throw new Error('Invalid email or password. If you forgot your password, click "Forgot Password".');
      }

      const safeUser = { id: user.id, email: user.email, createdAt: user.created_at };
      this.setCurrentUser(safeUser);
      return safeUser;
    }

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
  },

  // 4. Password Recovery via Real Email OTP
  async sendPasswordResetOtp(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (isSupabaseConfigured) {
      const { data: user, error } = await supabase
        .from('app_users')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error || !user) {
        throw new Error('No account found with this email. Please check your email or register.');
      }

      await supabase
        .from('app_users')
        .update({ reset_otp: { code: otp, expiresAt } })
        .eq('id', user.id);

      const emailResult = await sendOtpEmail(user.email, otp);
      return { success: true, email: user.email, delivered: emailResult.delivered };
    }

    // Local fallback
    const users = this.getLocalUsers();
    const user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('No account found with this email. Please check your email or register.');
    }

    user.resetOtp = { code: otp, expiresAt };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const emailResult = await sendOtpEmail(user.email, otp);
    return { success: true, email: user.email, delivered: emailResult.delivered };
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

    if (isSupabaseConfigured) {
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error || !user || !user.reset_otp) {
        throw new Error('No OTP request found for this email. Please request a new OTP.');
      }

      if (Date.now() > user.reset_otp.expiresAt) {
        throw new Error('The OTP code has expired. Please request a new one.');
      }

      if (user.reset_otp.code !== cleanOtp) {
        throw new Error('Invalid OTP code. Please check the code sent to your email and try again.');
      }

      await supabase
        .from('app_users')
        .update({ password: newPassword, reset_otp: null })
        .eq('id', user.id);

      const safeUser = { id: user.id, email: user.email, createdAt: user.created_at };
      this.setCurrentUser(safeUser);
      return safeUser;
    }

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
  },

  // 6. Session Persistence
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

  // 7. Sheet Templates per user (Cloud + Local)
  async getSheets(userId) {
    if (!userId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('sheets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          // Sync to local cache
          localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Supabase getSheets error, using local cache:', err);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`) || '[]');
    } catch {
      return [];
    }
  },

  async saveSheets(userId, sheets) {
    if (!userId) return;

    // Always update local cache
    localStorage.setItem(`${STORAGE_KEYS.TEMPLATES_PREFIX}${userId}`, JSON.stringify(sheets));

    if (isSupabaseConfigured && sheets && sheets.length > 0) {
      try {
        const rows = sheets.map(s => ({
          id: s.id,
          user_id: userId,
          name: s.name,
          columns: s.columns,
          updated_at: s.updatedAt || new Date().toISOString()
        }));

        await supabase.from('sheets').upsert(rows);
      } catch (err) {
        console.error('Failed to sync sheets to Supabase cloud:', err);
      }
    }
  },

  // 8. Records per sheet (Cloud + Local)
  async getRecords(userId, sheetId) {
    if (!userId || !sheetId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .eq('sheet_id', sheetId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map(r => ({
            _id: r.id,
            createdAt: r.created_at,
            ...r.data
          }));
          localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${userId}_${sheetId}`, JSON.stringify(formatted));
          return formatted;
        }
      } catch (err) {
        console.warn('Supabase getRecords error, using local cache:', err);
      }
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

    if (isSupabaseConfigured) {
      try {
        // Delete old records for this sheet & batch insert updated ones
        await supabase.from('records').delete().eq('sheet_id', sheetId).eq('user_id', userId);

        if (records && records.length > 0) {
          const payload = records.map(r => {
            const { _id, createdAt, ...fields } = r;
            return {
              id: _id,
              sheet_id: sheetId,
              user_id: userId,
              data: fields,
              created_at: createdAt || new Date().toISOString()
            };
          });

          await supabase.from('records').insert(payload);
        }
      } catch (err) {
        console.error('Failed to sync records to Supabase cloud:', err);
      }
    }
  }
};
