import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Tractor, User, Mail, Phone, Lock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SignupPage({ onNavigate }) {
  const { register, verifyEmail } = useAuth();
  const { t } = useLanguage();

  // Signup form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Farmer');

  // Flow control states
  const [verifyScreen, setVerifyScreen] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMsg("Username, email, and password are required.");
      return;
    }
    if (password.length < 12) {
      setErrorMsg("Password must be at least 12 characters long.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await register(username, email, password, role, phone);
      setVerifyScreen(true);
      setInfoMsg("Registration successful! A secure verification link and code has been sent to your email.");
    } catch (e) {
      setErrorMsg(e.message || "Registration failed. Check if username or email is already taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationToken) {
      setErrorMsg("Please enter the verification code sent to your email.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await verifyEmail(email, verificationToken);
      setInfoMsg(t('verificationSuccess') || "Email verified successfully! Redirecting...");
    } catch (e) {
      setErrorMsg(e.message || "Invalid or expired verification token.");
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

        {/* 1. Register input details screen */}
        {!verifyScreen ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Create username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email Address (Required)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Password (Min 12 Characters)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create secure password (12+ chars)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Role select */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Registering As</label>
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
              className="w-full py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
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
        ) : (
          /* 2. Verification Token Screen */
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Verify Your Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please enter the verification token or code sent to <strong className="text-emerald-600">{email}</strong>.
              </p>
            </div>

            <div>
              <input
                type="text"
                required
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                placeholder="Enter verification code or token"
                className="w-full py-3.5 text-center text-sm font-mono tracking-wider font-bold rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Verify & Enter Dashboard
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setVerifyScreen(false)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Change Registration Details
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
