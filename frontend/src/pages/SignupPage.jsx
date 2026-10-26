import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Tractor, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SignupPage({ onNavigate }) {
  const { register } = useAuth();
  const { t } = useLanguage();

  // Signup form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Farmer');

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState({});

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Client-side field validation
  const validateForm = () => {
    const errors = {};
    const trimmedUsername = username.trim();

    // Username validation
    if (!trimmedUsername) {
      errors.username = "Username is required.";
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      errors.username = "Username must be between 3 and 30 characters.";
    } else if (trimmedUsername.includes('@')) {
      errors.username = "Username cannot be an email address.";
    } else if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedUsername)) {
      errors.username = "Only letters, numbers, underscores, and hyphens are allowed.";
    }

    // Email validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g., name@example.com).";
    }

    // Phone validation (optional but validated if provided)
    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s\-()]/g, '');
      if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone) && !/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
        errors.phone = "Enter a valid 10-digit Indian number (+91) or international format (+).";
      }
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.trim() !== password || password.trim().length === 0) {
      errors.password = "Password cannot be empty or contain only whitespace.";
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters long.";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const trimmedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const res = await register(trimmedUsername, normalizedEmail, password, role, phone.trim());
      setInfoMsg(res.message || "Registration successful! Redirecting to your dashboard...");
      // Account created immediately; AuthContext sets user/token and navigation is handled automatically
    } catch (e) {
      setErrorMsg(e.message || "Registration failed. Check if username or email is already taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[100px] -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[100px] -z-10"></div>

      <div className="w-full max-w-md glass p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl animate-scale-up">
        
        {/* Brand */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Tractor className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">{t('appName')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('tagline')}</p>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Register input details form */}
        <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Choose a username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: null });
                }}
                placeholder="e.g. kisan_suresh"
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.username ? 'border border-red-400 focus:ring-red-400' : 'focus:ring-emerald-500'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                }}
                placeholder="name@example.com"
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.email ? 'border border-red-400 focus:ring-red-400' : 'focus:ring-emerald-500'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Mobile number (for booking SMS updates)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: null });
                }}
                placeholder="e.g. +91 98220 11001"
                className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.phone ? 'border border-red-400 focus:ring-red-400' : 'focus:ring-emerald-500'
                }`}
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.phone}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">At least 12 characters</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                }}
                placeholder="Create secure password (12+ characters)"
                className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.password ? 'border border-red-400 focus:ring-red-400' : 'focus:ring-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: null });
                }}
                placeholder="Re-enter your password"
                className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.confirmPassword ? 'border border-red-400 focus:ring-red-400' : 'focus:ring-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Role select */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Select what best describes you</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('Farmer')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  role === 'Farmer'
                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t('farmer')}
              </button>
              <button
                type="button"
                onClick={() => setRole('Owner')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  role === 'Owner'
                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t('owner')}
              </button>
              <button
                type="button"
                onClick={() => setRole('Operator')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  role === 'Operator'
                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t('operator') || 'Operator'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {t('signup')}
          </button>

          <div className="text-center pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Already registered? </span>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              {t('login')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
