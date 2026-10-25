import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Tractor, Lock, Mail, AlertCircle, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { login, forgotPassword, resetPassword } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password flow states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenSent, setResetTokenSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (e) {
      setErrorMsg(e.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forgotPassword(forgotEmail);
      setResetTokenSent(true);
      setSuccessMsg(res.message || "If an account with that email exists, reset instructions have been dispatched.");
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !resetToken || !newPassword) return;
    if (newPassword.length < 12) {
      setErrorMsg("Password must be at least 12 characters long.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPassword(forgotEmail, resetToken, newPassword);
      setSuccessMsg("Password reset successfully. You can now log in with your new password.");
      setTimeout(() => {
        setShowForgot(false);
        setResetTokenSent(false);
        setForgotEmail('');
        setResetToken('');
        setNewPassword('');
        setSuccessMsg('');
      }, 2000);
    } catch (e) {
      setErrorMsg(e.message);
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
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Tractor className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">{t('appName')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('tagline')}</p>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Regular Login Form */}
        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {t('login')}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                {t('signup')}
              </button>
            </div>

            {/* Quick Demo Account Selector with Email and Role Display */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Quick Demo Accounts
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Pune Cluster
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => { setEmail('farmer.suresh@agrirent.demo'); setPassword('Demo@AgriRent2026'); }}
                  className="px-2 py-1.5 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-center border border-emerald-200 dark:border-emerald-800/50 transition-colors"
                >
                  🌾 Farmer (Suresh)
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('operator.rajesh@agrirent.demo'); setPassword('Demo@AgriRent2026'); }}
                  className="px-2 py-1.5 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-center border border-blue-200 dark:border-blue-800/50 transition-colors"
                >
                  🚜 Operator (Rajesh)
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('owner.balasaheb@agrirent.demo'); setPassword('Demo@AgriRent2026'); }}
                  className="px-2 py-1.5 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg text-center border border-amber-200 dark:border-amber-800/50 transition-colors"
                >
                  🏢 Owner (Balasaheb)
                </button>
              </div>

              {/* View all 15 demo accounts expander */}
              <details className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  View all 15 demo accounts (Pune)
                </summary>
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                  <div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Farmers: </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {[
                        { label: 'Suresh', email: 'farmer.suresh@agrirent.demo' },
                        { label: 'Anita', email: 'farmer.anita@agrirent.demo' },
                        { label: 'Vikram', email: 'farmer.vikram@agrirent.demo' },
                        { label: 'Priya', email: 'farmer.priya@agrirent.demo' },
                        { label: 'Ramesh', email: 'farmer.ramesh@agrirent.demo' }
                      ].map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => { setEmail(acc.email); setPassword('Demo@AgriRent2026'); }}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px] hover:border-emerald-500"
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-blue-600 dark:text-blue-400">Operators: </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {[
                        { label: 'Rajesh', email: 'operator.rajesh@agrirent.demo' },
                        { label: 'Sunil', email: 'operator.sunil@agrirent.demo' },
                        { label: 'Amit', email: 'operator.amit@agrirent.demo' },
                        { label: 'Ganesh', email: 'operator.ganesh@agrirent.demo' },
                        { label: 'Sachin', email: 'operator.sachin@agrirent.demo' }
                      ].map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => { setEmail(acc.email); setPassword('Demo@AgriRent2026'); }}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px] hover:border-blue-500"
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">Owners: </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {[
                        { label: 'Balasaheb', email: 'owner.balasaheb@agrirent.demo' },
                        { label: 'Kavita', email: 'owner.kavita@agrirent.demo' },
                        { label: 'Dattatray', email: 'owner.dattatray@agrirent.demo' },
                        { label: 'Meena', email: 'owner.meena@agrirent.demo' },
                        { label: 'Sanjay', email: 'owner.sanjay@agrirent.demo' }
                      ].map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => { setEmail(acc.email); setPassword('Demo@AgriRent2026'); }}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px] hover:border-amber-500"
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </form>
        ) : (
          /* Forgot Password Token / Reset Form */
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Reset Account Password
            </h3>
            
            {!resetTokenSent ? (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full px-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setErrorMsg(''); setSuccessMsg(''); }}
                    className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter single-use reset token"
                    className="w-full px-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password (min 12 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full px-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setResetTokenSent(false)}
                    className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save New Password
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
