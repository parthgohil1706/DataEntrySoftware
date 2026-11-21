import React, { useState } from 'react';
import { Storage } from '../utils/storage';
import { isValidEmail } from '../utils/validation';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthModal({ onAuthSuccess }) {
  // Modes: 'login' | 'register' | 'forgot_request' | 'forgot_verify'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetFormState = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setLoading(false);
  };

  // 1. Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please fill in both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await Storage.login(cleanEmail, password);
      onAuthSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = await Storage.register(cleanEmail, password);
      onAuthSuccess(user);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await Storage.sendPasswordResetOtp(cleanEmail);
      setSuccessMsg(`We sent a 6-digit OTP code to ${res.email}. Please check your inbox.`);
      setMode('forgot_verify');
    } catch (err) {
      setError(err.message || 'Failed to dispatch OTP email.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify OTP & Set New Password
  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = await Storage.verifyOtpAndResetPassword(cleanEmail, cleanOtp, password);
      onAuthSuccess(user);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 p-5 sm:p-7 md:p-8 relative">

        {/* Header Icon & Title */}
        <div className="text-center mb-5 sm:mb-6 mt-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-3 shadow-inner">
            {mode === 'login' && <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            {mode === 'register' && <Mail className="w-5 h-5 sm:w-6 sm:h-6" />}
            {(mode === 'forgot_request' || mode === 'forgot_verify') && <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {mode === 'login' && 'Sign In with Email'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'forgot_request' && 'Reset Password'}
            {mode === 'forgot_verify' && 'Check Your Email'}
          </h2>

          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {mode === 'login' && 'Access your workspace across all your devices'}
            {mode === 'register' && 'Create an account to store and sync data in MySQL'}
            {mode === 'forgot_request' && 'We will send a 6-digit OTP code to your email'}
            {mode === 'forgot_verify' && `Enter the 6-digit OTP code sent to ${email}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && !error && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('forgot_request');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] min-h-[44px] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Your email is used to log in and sync data across any device
              </p>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] min-h-[44px] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering in MySQL...</span>
                </>
              ) : (
                <>
                  <span>Register & Access Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD */}
        {mode === 'forgot_request' && (
          <form onSubmit={handleRequestOtp} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                A 6-digit OTP will be emailed directly to your inbox.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering Email...</span>
                </>
              ) : (
                <>
                  <span>Send OTP to Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetFormState();
                setMode('login');
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* MODE 4: RESET PASSWORD */}
        {mode === 'forgot_verify' && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-3 sm:space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  6-Digit OTP
                </label>
                <span className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[150px]">{email}</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] min-h-[44px] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating in MySQL...</span>
                </>
              ) : (
                <>
                  <span>Reset Password & Enter</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  resetFormState();
                  setMode('login');
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Footer Mode Switcher */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                resetFormState();
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              {mode === 'login'
                ? "Don't have an account yet? Register with Email"
                : 'Already have an account? Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
