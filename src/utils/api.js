/**
 * Client API for MySQL Backend
 */

export const Api = {
  async getDbStatus() {
    try {
      const res = await fetch('/api/db-status');
      if (!res.ok) return { connected: false };
      return await res.json();
    } catch {
      return { connected: false };
    }
  },

  async register(email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data.user;
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data.user;
  },

  async forgotPassword(email) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return data;
  },

  async resetPassword(email, otp, newPassword) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed');
    return data.user;
  },

  async updatePassword(userId, email, currentPassword, newPassword) {
    const res = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update password');
    return data;
  },

  async getSheets(userId) {
    const res = await fetch(`/api/sheets?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch sheets from MySQL');
    return await res.json();
  },

  async saveSheets(userId, sheets) {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sheets })
    });
    if (!res.ok) throw new Error('Failed to save sheets to MySQL');
    return await res.json();
  },

  async getRecords(userId, sheetId) {
    const res = await fetch(`/api/records?userId=${encodeURIComponent(userId)}&sheetId=${encodeURIComponent(sheetId)}`);
    if (!res.ok) throw new Error('Failed to fetch records from MySQL');
    return await res.json();
  },

  async saveRecords(userId, sheetId, records) {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sheetId, records })
    });
    if (!res.ok) throw new Error('Failed to save records to MySQL');
    return await res.json();
  }
};
