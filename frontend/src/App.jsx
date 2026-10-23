import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { HashRouter as Router, useNavigate, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

import FarmerDashboard from './pages/FarmerDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import SupportCenter from './pages/SupportCenter';

import AIChatBot from './components/AIChatBot';
import SIHDemoButton from './components/SIHDemoButton';
import { Tractor, LogOut, Globe, Sun, Moon, HelpCircle, LayoutDashboard, UserCheck } from 'lucide-react';

function AppContent() {
  const { user, logout, loading } = useAuth();
  const { locale, setLanguage, t } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation state (for simple single-page-app routing synced with Router)
  const [currentPage, setCurrentPage] = useState('landing'); // landing, login, signup, dashboard, support
  const [showSupportTab, setShowSupportTab] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (!user) {
      if (path === '/login') {
        setCurrentPage('login');
      } else if (path === '/signup') {
        setCurrentPage('signup');
      } else {
        setCurrentPage('landing');
        if (path !== '/' && path !== '') {
          navigate('/');
        }
      }
    } else {
      if (path === '/support') {
        setShowSupportTab(true);
      } else if (path.startsWith('/dashboard')) {
        setShowSupportTab(false);
        setCurrentPage('dashboard');
      } else {
        setShowSupportTab(false);
        setCurrentPage('dashboard');
        navigate('/dashboard');
      }
    }
  }, [location.pathname, user]);

  const handleNavigate = (page) => {
    if (page === 'login') navigate('/login');
    else if (page === 'signup') navigate('/signup');
    else if (page === 'landing' || page === 'landing-page') navigate('/');
    else if (page === 'dashboard') navigate('/dashboard');
    else if (page === 'support') navigate('/support');
  };

  // If auth is verifying a persistent session token on boot
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-500 font-bold">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
          <span>Loading AgriRent AI Platform...</span>
        </div>
      </div>
    );
  }

  // --- UNAUTHENTICATED NAVIGATION ROUTING ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        
        {/* Floating Controls (Language, Theme) at top-right */}
        <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
          
          {/* Language Selector */}
          <div className="relative group">
            <button className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold shadow-sm">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>{locale === 'en' ? 'English' : locale === 'ta' ? 'தமிழ்' : 'हिन्दी'}</span>
            </button>
            <div className="absolute right-0 mt-1.5 w-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-fade-in z-[200]">
              <button onClick={() => setLanguage('en')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">English</button>
              <button onClick={() => setLanguage('ta')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">தமிழ்</button>
              <button onClick={() => setLanguage('hi')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">हिन्दी</button>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>

        {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentPage === 'signup' && <SignupPage onNavigate={handleNavigate} />}

        {/* Floating Chatbot Assistant */}
        <AIChatBot />
      </div>
    );
  }

  // --- AUTHENTICATED WORKSPACE ROUTING ---
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-[100] border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Tractor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
              {t('appName')}
            </h1>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wider uppercase leading-none">{user.role} workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Navigation links */}
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              !showSupportTab
                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">{t('dashboard')}</span>
          </button>

          <button
            onClick={() => handleNavigate('support')}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              showSupportTab
                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('support')}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* Language select */}
          <div className="relative group">
            <button className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold shadow-sm">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{locale === 'en' ? 'English' : locale === 'ta' ? 'தமிழ்' : 'हिन्दी'}</span>
            </button>
            <div className="absolute right-0 mt-1.5 w-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-fade-in z-[200]">
              <button onClick={() => setLanguage('en')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">English</button>
              <button onClick={() => setLanguage('ta')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">தமிழ்</button>
              <button onClick={() => setLanguage('hi')} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">हिन्दी</button>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-xl transition-all shadow-sm"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-1 pb-16 bg-slate-50/50 dark:bg-slate-950/30">
        {showSupportTab ? (
          <SupportCenter />
        ) : (
          <>
            {user.role === 'Farmer' && <FarmerDashboard />}
            {user.role === 'Owner' && <OwnerDashboard />}
            {user.role === 'Operator' && <OperatorDashboard />}
            {user.role === 'Admin' && <AdminDashboard />}
          </>
        )}
      </main>

      {/* Floating Chatbot Assistant */}
      <AIChatBot />

      {/* Floating SIH Demo Controller */}
      <SIHDemoButton />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
