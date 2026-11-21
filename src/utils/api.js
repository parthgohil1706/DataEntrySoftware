/**
 * Client API for Backend Services (Gmail OTP delivery)
 */

export const Api = {
  async sendOtpEmail(toEmail, otp) {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch OTP email');
    return data;
  }
};
