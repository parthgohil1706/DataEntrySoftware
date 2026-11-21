/**
 * Sends a real 6-digit OTP email using your configured Gmail SMTP account.
 */
export const sendOtpEmail = async (toEmail, otp) => {
  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ toEmail, otp })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server could not deliver email.');
    }

    return { success: true, delivered: true, recipient: toEmail };
  } catch (err) {
    console.error('Email delivery error:', err);
    throw new Error(err.message || 'Could not send verification email. Please check your connection.');
  }
};
