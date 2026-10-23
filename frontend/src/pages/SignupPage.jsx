import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Tractor, User, Mail, Phone, Lock, Eye, AlertCircle, RefreshCw } from 'lucide-react';

export default function SignupPage({ onNavigate }) {
  const { register, verifyOtp } = useAuth();
  const { t } = useLanguage();

  // Signup form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Farmer');

  // Flow control states
  const [otpVerifyScreen, setOtpVerifyScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !phone) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await register(username, email, password, role, phone);
      setOtpVerifyScreen(true);
      setInfoMsg("Registration successful! A simulated 6-digit OTP code has been dispatched. (Use code: '123456')");
    } catch (e) {
      setErrorMsg(e.message || "Registration failed. Username may already be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await verifyOtp(username, otpCode);
      setInfoMsg(t('verificationSuccess'));
      // The session updates and the App router automatically takes the user inside the dashboard.
    } catch (e) {
      setErrorMsg(e.message || "Invalid OTP code. Try entering '123456'.");
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
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 mb-5 animate-pulse-subtle">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* 1. Register input details screen */}
        {!otpVerifyScreen ? (
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
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
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
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
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
          /* 2. OTP Verification Screen */
          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">{t('otpVerification')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('otpPrompt')}</p>
            </div>

            <div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP code"
                className="w-full py-3.5 text-center text-xl tracking-widest font-black rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {t('verify')}
            </button>

            <button
              type="button"
              onClick={() => setOtpVerifyScreen(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
            >
              Back to Details Form
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
