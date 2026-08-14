import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, ShieldCheck, RefreshCw, BarChart2, Users, FileText, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { apiFetch } = useAuth();
  
  const [unverifiedListings, setUnverifiedListings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch listings and filter unverified
      const listings = await apiFetch('/api/equipment/');
      setUnverifiedListings(listings.filter(l => !l.is_verified));

      // 2. Fetch all support tickets
      const ticketLogs = await apiFetch('/api/support/tickets/');
      setTickets(ticketLogs);

      // 3. Fetch admin analytics
      const stats = await apiFetch('/api/dashboard/admin/');
      setAnalytics(stats);
    } catch (e) {
      console.error("Failed to load admin dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifyListing = async (listingId) => {
    try {
      await apiFetch(`/api/equipment/${listingId}/verify/`, {
        method: 'POST'
      });
      loadAdminData();
    } catch (e) {
      alert("Verification failed: " + e.message);
    }
  };

  const handleTicketStatus = async (ticketId, nextStatus) => {
    try {
      await apiFetch(`/api/support/tickets/${ticketId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      loadAdminData();
    } catch (e) {
      alert("Ticket update failed: " + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Admin Panel 🛡️
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            System administration, listings verification queue, user analytics, and platform tickets.
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Analytics widgets */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Revenue</span>
              <strong className="text-lg text-slate-800 dark:text-white">₹{analytics.total_revenue}</strong>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Farmers / Owners</span>
              <strong className="text-lg text-slate-800 dark:text-white">{analytics.total_farmers} / {analytics.total_owners}</strong>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Utilization Rate</span>
              <strong className="text-lg text-slate-800 dark:text-white">{analytics.equipment_utilization_rate}%</strong>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Open Tickets</span>
              <strong className="text-lg text-slate-800 dark:text-white">{analytics.open_tickets}</strong>
            </div>
          </div>
        </div>
      )}

      {/* SIH Presentation SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        
        {/* Chart 1: Revenue Chart */}
        <div className="glass p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Platform Revenue Chart (Jan - Jun)
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Aggregate rental revenues processed in INR (thousands)</p>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <svg viewBox="0 0 500 200" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <line x1="50" y1="30" x2="450" y2="30" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="50" y1="80" x2="450" y2="80" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="50" y1="130" x2="450" y2="130" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="50" y1="180" x2="450" y2="180" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
              
              <path
                d="M 50 180 L 50 142.5 L 130 128.4 L 210 109.7 L 290 95.6 L 370 67.5 L 450 44.1 L 450 180 Z"
                fill="url(#areaGrad)"
              />
              <path
                d="M 50 142.5 L 130 128.4 L 210 109.7 L 290 95.6 L 370 67.5 L 450 44.1"
                fill="none"
                stroke="url(#strokeGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="142.5" r="4.5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
              <circle cx="130" cy="128.4" r="4.5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
              <circle cx="210" cy="109.7" r="4.5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
              <circle cx="290" cy="95.6" r="4.5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
              <circle cx="370" cy="67.5" r="4.5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
              <circle cx="450" cy="44.1" r="5.5" fill="#10b981" stroke="#fff" strokeWidth="2" />
              
              <text x="50" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Jan</text>
              <text x="130" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Feb</text>
              <text x="210" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Mar</text>
              <text x="290" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Apr</text>
              <text x="370" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">May</text>
              <text x="450" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Jun</text>
              
              <text x="50" y="130" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-bold">₹40k</text>
              <text x="130" y="116" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-bold">₹55k</text>
              <text x="210" y="97" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-bold">₹75k</text>
              <text x="290" y="83" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-bold">₹90k</text>
              <text x="370" y="55" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-bold">₹120k</text>
              <text x="450" y="30" textAnchor="middle" className="text-[10px] fill-emerald-600 dark:fill-emerald-450 font-black">₹145k</text>
            </svg>
          </div>
        </div>

        {/* Chart 2: Equipment Usage Chart */}
        <div className="glass p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Machinery Usage Share (Hours)
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Cumulative engine rental hours clocked by category</p>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <svg viewBox="0 0 450 200" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <line x1="30" y1="40" x2="420" y2="40" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="30" y1="110" x2="420" y2="110" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="30" y1="180" x2="420" y2="180" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
              
              <rect x="45" y="82" width="30" height="98" rx="4" fill="url(#barGrad)" className="hover:opacity-80 transition-opacity" />
              <rect x="125" y="45.6" width="30" height="134.4" rx="4" fill="url(#barGrad)" className="hover:opacity-80 transition-opacity" />
              <rect x="205" y="121.2" width="30" height="58.8" rx="4" fill="url(#barGrad)" className="hover:opacity-80 transition-opacity" />
              <rect x="285" y="129.6" width="30" height="50.4" rx="4" fill="url(#barGrad)" className="hover:opacity-80 transition-opacity" />
              <rect x="365" y="154.8" width="30" height="25.2" rx="4" fill="url(#barGrad)" className="hover:opacity-80 transition-opacity" />
              
              <text x="60" y="194" textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">Tractor</text>
              <text x="140" y="194" textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">Harvester</text>
              <text x="220" y="194" textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">Rotavator</text>
              <text x="300" y="194" textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">Seeder</text>
              <text x="380" y="194" textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">Sprayer</text>
              
              <text x="60" y="72" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">350h</text>
              <text x="140" y="35" textAnchor="middle" className="text-[10px] fill-blue-600 dark:fill-blue-400 font-black">480h</text>
              <text x="220" y="112" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">210h</text>
              <text x="300" y="120" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">180h</text>
              <text x="380" y="145" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">90h</text>
            </svg>
          </div>
        </div>

        {/* Chart 3: Booking Trends Chart */}
        <div className="glass p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Monthly Booking Trends (Jan - Jun)
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Total transaction booking counts across seasons</p>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <svg viewBox="0 0 500 200" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <line x1="50" y1="30" x2="450" y2="30" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="50" y1="105" x2="450" y2="105" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-800" />
              <line x1="50" y1="180" x2="450" y2="180" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
              
              <path
                d="M 50 159.5 L 130 150 L 210 128.1 L 290 118.6 L 370 95.4 L 450 43.6"
                fill="none"
                stroke="url(#trendGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="159.5" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx="130" cy="150" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx="210" cy="128.1" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx="290" cy="118.6" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx="370" cy="95.4" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx="450" cy="43.6" r="6" fill="#d97706" stroke="#fff" strokeWidth="2.5" />
              
              <text x="50" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Jan</text>
              <text x="130" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Feb</text>
              <text x="210" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Mar</text>
              <text x="290" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Apr</text>
              <text x="370" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">May</text>
              <text x="450" y="194" textAnchor="middle" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">Jun</text>
              
              <text x="50" y="148" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">15</text>
              <text x="130" y="138" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">22</text>
              <text x="210" y="116" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">38</text>
              <text x="290" y="106" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">45</text>
              <text x="370" y="83" textAnchor="middle" className="text-[9px] fill-slate-600 dark:text-slate-350 font-bold">62</text>
              <text x="450" y="28" textAnchor="middle" className="text-[10px] fill-amber-600 dark:fill-amber-500 font-black">100</text>
            </svg>
          </div>
        </div>

      </div>

      {/* Verification Queue & Active tickets split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Verification Queue */}
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-550" />
            Machinery Verification Queue ({unverifiedListings.length})
          </h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
            {unverifiedListings.map(item => (
              <div key={item.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.title}</h4>
                  <p className="text-slate-400">Category: {item.category} • Owner: {item.owner_name}</p>
                  <p className="text-slate-400">Rent Cost: ₹{item.rental_price_per_hour}/hr</p>
                </div>
                <button
                  onClick={() => handleVerifyListing(item.id)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" /> Verify Listing
                </button>
              </div>
            ))}

            {unverifiedListings.length === 0 && (
              <p className="text-xs text-slate-450 italic text-center py-10">All equipment listings are verified.</p>
            )}
          </div>
        </div>

        {/* Support Tickets Queue */}
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Farmer / Owner Support Tickets ({tickets.length})
          </h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
            {tickets.map(t => (
              <div key={t.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5 text-xs">
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100">#{t.id}: {t.subject}</h4>
                    <p className="text-slate-500 font-medium">Submitted by: {t.username}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                    t.status === 'Open' ? 'bg-red-100 text-red-700 dark:bg-red-950/30' :
                    t.status === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-850/40'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">{t.message}</p>
                
                {t.status !== 'Closed' && (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleTicketStatus(t.id, 'In Progress')}
                      className="px-2.5 py-1 text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded font-bold"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => handleTicketStatus(t.id, 'Closed')}
                      className="px-2.5 py-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 rounded font-bold"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}

            {tickets.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-10">No support tickets filed.</p>
            )}
          </div>
        </div>

      </div>

      {/* 5. Sustainability Analytics & Village Shortage Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in font-sans">
        {/* Sustainability Dashboard */}
        <div className="lg:col-span-6 glass p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sustainability & Carbon Analytics</h3>
              <p className="text-[10px] text-slate-400">Collective green metrics from cooperative shared machinery renting</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-slate-800/80 rounded-xl text-center">
              <span className="block text-[8px] text-slate-400 uppercase font-black">Carbon Offset</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-lg font-black block mt-1">420.8 kg</strong>
              <span className="text-[7px] text-emerald-600 dark:text-emerald-450 block mt-0.5">CO2 Prevented</span>
            </div>
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-slate-800/80 rounded-xl text-center">
              <span className="block text-[8px] text-slate-400 uppercase font-black">Fuel Savings</span>
              <strong className="text-teal-600 dark:text-teal-400 text-lg font-black block mt-1">168 Litres</strong>
              <span className="text-[7px] text-teal-500 dark:text-teal-450 block mt-0.5">Shared Transport</span>
            </div>
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-slate-800/80 rounded-xl text-center">
              <span className="block text-[8px] text-slate-400 uppercase font-black">Coop Bookings</span>
              <strong className="text-indigo-600 dark:text-indigo-400 text-lg font-black block mt-1">48%</strong>
              <span className="text-[7px] text-indigo-500 dark:text-indigo-455 block mt-0.5">Shared Usage Rate</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-550 leading-normal space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-350 block">🌳 Green Impact Note</span>
            <p>
              By matching local farmers with machinery in their immediate village clusters, AgriRent has reduced trailer transport distances by an average of 14.5 kilometers per booking.
            </p>
          </div>
        </div>

        {/* Shortage & Deficit Grid Heatmap */}
        <div className="lg:col-span-6 glass p-6 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              🗺️ Platform Resource Heatmap
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time status of district equipment levels across all zones</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 border border-red-500/20 rounded-xl space-y-1">
              <div className="flex justify-between font-bold items-center">
                <span className="text-slate-700 dark:text-slate-300">Coimbatore Cluster</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] uppercase tracking-wider font-black">DEFICIT</span>
              </div>
              <p className="text-[10px] text-slate-450">Shortage of 14 Harvesters. Sowing curves peaking early.</p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-red-500/20 rounded-xl space-y-1">
              <div className="flex justify-between font-bold items-center">
                <span className="text-slate-700 dark:text-slate-300">Tiruppur Cluster</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] uppercase tracking-wider font-black">DEFICIT</span>
              </div>
              <p className="text-[10px] text-slate-450">Shortage of 8 Tractors. Heavy soil tilling prep is active.</p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-xl space-y-1">
              <div className="flex justify-between font-bold items-center">
                <span className="text-slate-700 dark:text-slate-300">Erode Cluster</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] uppercase tracking-wider font-black">SURPLUS</span>
              </div>
              <p className="text-[10px] text-slate-450">Surplay of 15 Sprayers. Turmeric crop cycles finished.</p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-xl space-y-1">
              <div className="flex justify-between font-bold items-center">
                <span className="text-slate-700 dark:text-slate-300">Salem Cluster</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] uppercase tracking-wider font-black">SURPLUS</span>
              </div>
              <p className="text-[10px] text-slate-450">Surplus of 20 Rotavators. Cooperative inventory is high.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
