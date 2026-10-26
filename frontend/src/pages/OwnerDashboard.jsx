import React, { useState, useEffect } from 'react';
import { Tractor, Sparkles, Sprout, Plus, Edit2, Check, X, TrendingUp, RefreshCw, Landmark, Calendar, MessageCircle, Send, ShieldAlert, Bell, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const getFallbackImage = (category) => {
  const cat = String(category || '').trim().toUpperCase();
  const images = {
    TRACTOR: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    HARVESTER: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    ROTAVATOR: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    SEEDER: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    SPRAYER: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    "CROP PROTECTION EQUIPMENT": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    "OTHER AGRICULTURAL MACHINERY": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600"
  };
  const remoteUrl = images[cat] || images.TRACTOR;
  console.log(`[getFallbackImage] Category: "${category}". Resolved remote URL: "${remoteUrl}"`);
  return remoteUrl;
};

const handleImageError = (e, category) => {
  const cat = String(category || '').trim().toUpperCase();
  const localImages = {
    TRACTOR: "/images/tractor.jpg",
    HARVESTER: "/images/harvester.jpg",
    ROTAVATOR: "/images/rotavator.jpg",
    SEEDER: "/images/seeder.jpg",
    SPRAYER: "/images/sprayer.jpg",
    "CROP PROTECTION EQUIPMENT": "/images/cropprotection.jpg",
    "OTHER AGRICULTURAL MACHINERY": "/images/tractor.jpg"
  };
  const localUrl = localImages[cat] || "/images/tractor.jpg";
  
  if (e.target.src.endsWith(localUrl)) {
    console.error(`[handleImageError] Local fallback image "${localUrl}" also failed to load for "${category}"!`);
    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2050/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2364748b'>" + category + "</text></svg>";
    return;
  }
  
  console.warn(`[handleImageError] Failed to load remote image for "${category}" (URL: "${e.target.src}"). Falling back to local: "${localUrl}"`);
  e.target.src = localUrl;
};

export default function OwnerDashboard() {
  const { apiFetch, user } = useAuth();
  const { t } = useLanguage();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Tab State & Interactive Map State
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'escrow', 'notifications'
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [expandedHealthId, setExpandedHealthId] = useState(null);


  // Add/Edit listing modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tractor');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(600);
  const [address, setAddress] = useState('Coimbatore, Tamil Nadu');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Price suggestion tool
  const [suggestEquip, setSuggestEquip] = useState('Tractor');
  const [suggestDemand, setSuggestDemand] = useState('Medium');
  const [suggestSeason, setSuggestSeason] = useState('Harvesting');
  const [suggestResult, setSuggestResult] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Chat window
  const [activeChatBooking, setActiveChatBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const loadOwnerData = async () => {
    setLoading(true);
    try {
      // 1. Load Listings
      const listingsData = await apiFetch('/api/equipment/');
      // Filter listings owned by current user
      const myListings = listingsData.filter(l => l.owner === user?.id);
      setListings(myListings);

      // 2. Load Bookings
      const bookingsData = await apiFetch('/api/bookings/');
      setBookings(bookingsData);

      // 3. Load Analytics
      const stats = await apiFetch('/api/dashboard/owner/');
      setAnalytics(stats);

      // 4. Load Notifications
      try {
        const notifs = await apiFetch('/api/notifications/');
        setNotifications(notifs || []);
      } catch (err) {
        console.warn("Could not load owner notifications:", err);
      }
    } catch (e) {
      console.error("Failed to load owner data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, []);

  useEffect(() => {
    const handleNewMessage = (e) => {
      if (activeChatBooking && e.detail.bookingId === activeChatBooking.id) {
        apiFetch(`/api/bookings/${activeChatBooking.id}/messages/`)
          .then(msgs => setChatMessages(msgs))
          .catch(err => console.error(err));
      }
    };
    window.addEventListener('agrirent_new_message', handleNewMessage);
    return () => {
      window.removeEventListener('agrirent_new_message', handleNewMessage);
    };
  }, [activeChatBooking]);

  const handleMarkNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn("Could not mark notifications read:", e);
    }
  };

  const handleOpenAdd = () => {
    setEditingListing(null);
    setTitle('');
    setCategory('Tractor');
    setDescription('');
    setPrice(600);
    setAddress('Coimbatore, Tamil Nadu');
    setImageUrl('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingListing(item);
    setTitle(item.title);
    setCategory(item.category);
    setDescription(item.description);
    setPrice(parseFloat(item.rental_price_per_hour));
    setAddress(item.address);
    setImageUrl(item.image_url || '');
    setShowAddModal(true);
  };

  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitLoading(true);
    try {
      const payload = {
        title,
        category,
        description,
        rental_price_per_hour: parseFloat(price),
        address,
        image_url: imageUrl || getFallbackImage(category),
      };

      if (editingListing) {
        await apiFetch(`/api/equipment/${editingListing.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/equipment/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowAddModal(false);
      loadOwnerData();
    } catch (err) {
      alert("Submission failed: " + err.message);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await apiFetch(`/api/equipment/${item.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_available: !item.is_available })
      });
      loadOwnerData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyAIPrice = async (itemId, recommendedPrice) => {
    try {
      await apiFetch(`/api/equipment/${itemId}/`, {
        method: 'PUT',
        body: JSON.stringify({ rental_price_per_hour: recommendedPrice })
      });
      loadOwnerData();
    } catch (e) {
      alert("Failed to apply AI pricing: " + e.message);
    }
  };


  const handleBookingStatus = async (bookingId, nextStatus) => {
    try {
      await apiFetch(`/api/bookings/${bookingId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      loadOwnerData();
    } catch (e) {
      alert("Status change failed: " + e.message);
    }
  };

  const handleRequestOperator = async (bookingId) => {
    try {
      const res = await apiFetch(`/api/operator/request/${bookingId}/`, {
        method: 'POST'
      });
      alert(res.message || "AI Operator Dispatch initiated! Nearby online verified operators notified.");
      loadOwnerData();
    } catch (e) {
      alert("Operator request failed: " + e.message);
    }
  };

  const handleSuggestPrice = async () => {
    setSuggestLoading(true);
    setSuggestResult(null);
    try {
      const res = await apiFetch('/api/ai/predict-price/', {
        method: 'POST',
        body: JSON.stringify({
          equipment_type: suggestEquip,
          demand: suggestDemand,
          season: suggestSeason
        })
      });
      setSuggestResult(res);
    } catch (e) {
      alert("Price suggestion failed: " + e.message);
    } finally {
      setSuggestLoading(false);
    }
  };

  // Chat integration
  const openChat = async (booking) => {
    setActiveChatBooking(booking);
    try {
      const messages = await apiFetch(`/api/bookings/${booking.id}/messages/`);
      setChatMessages(messages);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatBooking) return;
    try {
      const sent = await apiFetch(`/api/bookings/${activeChatBooking.id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage })
      });
      setChatMessages(prev => [...prev, sent]);
      setNewMessage('');
    } catch (e) {
      alert("Message failed: " + e.message);
    }
  };

  // Calculate dynamic stats for Owner
  const totalListings = listings.length;
  const pendingRequestsCount = bookings.filter(b => b.status === 'Pending' && b.equipment_details?.owner === user?.id).length;
  const activeRentalsCount = bookings.filter(b => b.status === 'In Progress' && b.equipment_details?.owner === user?.id).length;
  
  // Rented/utilized listings count
  const utilizedListingsCount = new Set(
    bookings.filter(b => ['Approved', 'In Progress', 'Completed'].includes(b.status) && b.equipment_details?.owner === user?.id).map(b => b.equipment)
  ).size;
  const utilizationRate = totalListings > 0 ? Math.round((utilizedListingsCount / totalListings * 100) * 10) / 10 : 0.0;

  return (

    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Owner Dashboard 🚜
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              List and manage equipment, review pending bookings, chat with farmers, and check AI pricing tips.
            </p>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 text-[10px] font-black border border-emerald-500/20">
              🛡️ Owner Reliability: 97%
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
              Aadhaar KYC Verified
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown && notifications.some(n => !n.is_read)) {
                  handleMarkNotificationsRead();
                }
              }}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-400 relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[700] p-4 animate-scale-up space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-xs text-slate-800 dark:text-white">Owner Notifications</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{notifications.length} recent</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">No notifications right now.</p>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <p className="text-slate-800 dark:text-slate-200 font-medium leading-snug">{n.content}</p>
                        <span className="text-[9px] text-slate-400 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md text-xs hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Listing
          </button>
          <button
            onClick={loadOwnerData}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-400"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Earnings Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
          <div className="glass p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Revenue Analytics</span>
              <strong className="text-base sm:text-lg text-slate-800 dark:text-white">₹{analytics.total_earnings}</strong>
              <span className="block text-[9px] text-emerald-600 font-extrabold mt-0.5">▲ +12.4% MoM Growth</span>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Equipment Utilization</span>
                <strong className="text-base sm:text-lg text-slate-800 dark:text-white">{utilizationRate}%</strong>
              </div>
            </div>
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-600 dark:text-purple-400"
                  strokeWidth="3.5"
                  strokeDasharray={`${utilizationRate}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-purple-600 dark:text-purple-400">
                {Math.round(utilizationRate)}%
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-450">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Booking Requests</span>
              <strong className="text-base sm:text-lg text-slate-800 dark:text-white">{pendingRequestsCount} Pending</strong>
              <span className="block text-[9px] text-slate-450 font-bold mt-0.5">Approval Required</span>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Rentals</span>
              <strong className="text-base sm:text-lg text-slate-800 dark:text-white">{activeRentalsCount} Active</strong>
              <span className="block text-[9px] text-slate-450 font-bold mt-0.5">{analytics.completed_rentals} Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Escrow Settlements & Payouts Tab */}
      {activeTab === 'escrow' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
                  <span>💳</span> Owner Escrow Accounts & Machinery Rental Payouts
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pre-authorized payments captured via Razorpay are safely held in RBI-compliant escrow. Funds auto-disburse to your bank account upon farmer mission sign-off.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-[10px]">
                  Direct Escrow Active
                </span>
                <button
                  onClick={async () => {
                    const res = await apiFetch('/api/payments/history/');
                    setPaymentsList(res || []);
                  }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>

            {/* Escrow summary tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Settled Payouts</span>
                <div className="text-lg font-black text-emerald-600">
                  ₹{paymentsList.filter(p => p.status === 'Captured').reduce((acc, p) => acc + parseFloat(p.amount || 0), 0)}
                </div>
                <span className="text-[10px] text-slate-400">Credited to connected bank</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending in Escrow</span>
                <div className="text-lg font-black text-amber-500">
                  ₹{bookings.filter(b => b.escrow_status === 'Held' || (b.payment_status === 'Captured' && b.status !== 'Completed' && b.status !== 'Closed')).reduce((acc, b) => acc + parseFloat(b.total_cost || 0), 0)}
                </div>
                <span className="text-[10px] text-slate-400">Releases upon completion</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Transactions</span>
                <div className="text-lg font-black text-slate-800 dark:text-white">
                  {paymentsList.length} Records
                </div>
                <span className="text-[10px] text-slate-400">Across all equipment fleet</span>
              </div>
            </div>

            {paymentsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <p className="text-sm font-medium">No payment transactions recorded yet.</p>
                <p className="text-xs max-w-md mx-auto">
                  When farmers book your machinery and process payment via Razorpay, transaction receipts and escrow balances will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-850/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4 font-semibold">Tx ID</th>
                      <th className="py-3 px-4 font-semibold">Machinery & Renter</th>
                      <th className="py-3 px-4 font-semibold">Booking ID</th>
                      <th className="py-3 px-4 font-semibold">Razorpay Payment ID</th>
                      <th className="py-3 px-4 font-semibold">Net Payout</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {paymentsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                          #{tx.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          <span className="block text-slate-800 dark:text-white">{tx.equipment_title || 'Equipment'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Farmer: {tx.farmer_name || 'Renter'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          #AGR-{tx.booking}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {tx.razorpay_payment_id || 'pay_test_active'}
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                          ₹{tx.amount}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            tx.status === 'Captured'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : tx.status === 'Refunded'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-xs sm:text-sm font-black border-b-2 transition-all uppercase tracking-wider ${
            activeTab === 'inventory' 
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          🚜 Inventory & Bookings
        </button>

        <button
          onClick={() => setActiveTab('escrow')}
          className={`px-6 py-3 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-1.5 uppercase tracking-wider ${
            activeTab === 'escrow' 
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          💳 Escrow Settlements & Payouts ({paymentsList.length})
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Booking Requests */}
        <div className="lg:col-span-8 space-y-6">
          {/* Pending Booking Requests */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md space-y-4">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">Pending Booking Requests</h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
              {bookings.filter(b => b.status === 'Pending' && b.equipment_details?.owner === user?.id).map(b => (
                <div key={b.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{b.equipment_details?.title}</h4>
                    <p className="text-slate-500 font-medium">Farmer: <strong className="text-slate-700 dark:text-slate-300">{b.farmer_name}</strong></p>
                    <p className="text-slate-400">Requested Dates: {new Date(b.start_date).toLocaleDateString()} to {new Date(b.end_date).toLocaleDateString()} • Option: <strong>{b.delivery_option}</strong></p>
                    <p className="text-slate-450">Total Revenue: <strong className="text-slate-705 dark:text-emerald-400">₹{b.total_cost}</strong></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBookingStatus(b.id, 'Approved')}
                      className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-650 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleBookingStatus(b.id, 'Rejected')}
                      className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-650 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => openChat(b)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}

              {bookings.filter(b => b.status === 'Pending' && b.equipment_details?.owner === user?.id).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-8">No pending rental requests right now.</p>
              )}
            </div>
          </div>

          {/* Active Rentals & Booking Tracking */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md space-y-4">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">Active Rentals & Booking Tracking</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
              {bookings.filter(b => b.status !== 'Pending' && b.equipment_details?.owner === user?.id).map(b => (
                <div key={b.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{b.equipment_details?.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        b.status === 'Approved' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                        b.status === 'In Progress' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 animate-pulse' :
                        b.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                        'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-405'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">Farmer: <strong className="text-slate-700 dark:text-slate-300">{b.farmer_name}</strong></p>
                    <p className="text-slate-450">Dates: {new Date(b.start_date).toLocaleDateString()} to {new Date(b.end_date).toLocaleDateString()} • Option: <strong>{b.delivery_option}</strong></p>
                    {b.notes && <p className="text-slate-450">Notes: <span className="italic">"{b.notes}"</span></p>}
                    <p className="text-slate-400">Booking ID: <strong className="text-slate-700 dark:text-slate-350">#AGR-{b.id}</strong></p>
                  </div>
                  <div className="flex gap-2">
                    {['Approved', 'In Progress'].includes(b.status) && !b.operator_assigned && (
                      <button
                        onClick={() => handleRequestOperator(b.id)}
                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                        title="Dispatch nearby verified operator for this machinery"
                      >
                        🚜 Request Operator
                      </button>
                    )}
                    {b.operator_assigned && (
                      <span className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1">
                        ✓ Operator Assigned
                      </span>
                    )}
                    {b.status === 'Approved' && (
                      <button
                        onClick={() => handleBookingStatus(b.id, 'In Progress')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Start Rental
                      </button>
                    )}
                    {b.status === 'In Progress' && (
                      <button
                        onClick={() => handleBookingStatus(b.id, 'Completed')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Complete Rental
                      </button>
                    )}
                    <button
                      onClick={() => openChat(b)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>
                </div>
              ))}

              {bookings.filter(b => b.status !== 'Pending' && b.equipment_details?.owner === user?.id).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-8">No active or historic rentals found.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Price Prediction Tool */}
        <div className="lg:col-span-4 glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t('pricePredictorTitle')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{t('pricePredictorDesc')}</p>
            
            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Equipment Category</label>
                <select 
                  value={suggestEquip} 
                  onChange={(e) => setSuggestEquip(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option>Tractor</option>
                  <option>Harvester</option>
                  <option>Rotavator</option>
                  <option>Seeder</option>
                  <option>Sprayer</option>
                  <option>Crop Protection Equipment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Demand Level</label>
                  <select 
                    value={suggestDemand} 
                    onChange={(e) => setSuggestDemand(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Season</label>
                  <select 
                    value={suggestSeason} 
                    onChange={(e) => setSuggestSeason(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option>Sowing</option>
                    <option>Harvesting</option>
                    <option>Off-season</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSuggestPrice}
            disabled={suggestLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {suggestLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {t('predictPrice')}
          </button>

          {suggestResult && (
            <div className="mt-4 p-4 rounded-xl border border-amber-100 bg-amber-50/20 dark:bg-slate-800/40 dark:border-slate-800 text-xs animate-fade-in text-slate-800 dark:text-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Optimal Rent Curve
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                  <span className="block text-[8px] text-slate-400 uppercase leading-none mb-1">Minimum</span>
                  <strong className="text-slate-700 dark:text-slate-300">₹{suggestResult.min_price}</strong>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg shadow-sm border border-emerald-100 dark:border-slate-800">
                  <span className="block text-[8px] text-emerald-600 dark:text-emerald-400 uppercase leading-none mb-1">Recommended</span>
                  <strong className="text-emerald-700 dark:text-emerald-400">₹{suggestResult.recommended_price}</strong>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                  <span className="block text-[8px] text-slate-400 uppercase leading-none mb-1">Maximum</span>
                  <strong className="text-slate-700 dark:text-slate-300">₹{suggestResult.max_price}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. Equipment Inventory Listings */}
      <div className="space-y-4">
        <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">Listed Equipment & Inventory</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {listings.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                <div className="relative flex justify-center items-center h-[110px] bg-slate-50 dark:bg-slate-950/40 p-2 border-b border-slate-100 dark:border-slate-800">
                  <img 
                    src={item.image || item.image_url || getFallbackImage(item.category)} 
                    alt={item.title} 
                    onError={(e) => handleImageError(e, item.category)}
                    style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                    className="rounded-lg shadow-sm"
                  />
                  {item.is_verified ? (
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-md">
                      Verified
                    </span>
                  ) : (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Pending Verification
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.category}</span>
                  <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight">{item.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  
                  {/* AI Price Suggestion Banner */}
                  <div className="mt-3.5 p-2.5 bg-amber-50 dark:bg-slate-850/65 rounded-xl border border-amber-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                    <div>
                      <span className="block font-black text-[9px] text-amber-700 dark:text-amber-400 uppercase tracking-wider">AI Suggested Price</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">₹{
                        item.category === 'Tractor' ? 1500 :
                        item.category === 'Harvester' ? 2200 :
                        item.category === 'Rotavator' ? 900 :
                        item.category === 'Seeder' ? 750 :
                        item.category === 'Sprayer' ? 350 : 800
                      }/day</span>
                    </div>
                    {item.rental_price_per_hour !== (
                      item.category === 'Tractor' ? 1500 :
                      item.category === 'Harvester' ? 2200 :
                      item.category === 'Rotavator' ? 900 :
                      item.category === 'Seeder' ? 750 :
                      item.category === 'Sprayer' ? 350 : 800
                    ) && (
                      <button
                        onClick={() => handleApplyAIPrice(item.id, 
                          item.category === 'Tractor' ? 1500 :
                          item.category === 'Harvester' ? 2200 :
                          item.category === 'Rotavator' ? 900 :
                          item.category === 'Seeder' ? 750 :
                          item.category === 'Sprayer' ? 350 : 800
                        )}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[8px] font-black uppercase tracking-wider shadow-sm transition-all"
                      >
                        Apply AI Price
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="block text-[9px] text-slate-400">Rent Cost</span>
                    <strong className="text-emerald-600 text-base">₹{item.rental_price_per_hour}/hr</strong>
                  </div>
                  
                  {/* Availability toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Available:</span>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all ${
                        item.is_available ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-3.5 h-3.5 w-3.5 transform rounded-full bg-white transition-all ${
                        item.is_available ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setExpandedHealthId(expandedHealthId === item.id ? null : item.id)}
                      className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                    >
                      📋 Health Passport
                    </button>
                  </div>
                </div>

                {expandedHealthId === item.id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-xs space-y-3 animate-fade-in font-sans">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="block font-black text-[9px] text-slate-400 uppercase tracking-wider">Machine Passport ID</span>
                        <strong className="text-slate-700 dark:text-slate-350 font-mono text-[10px]">#HPP-{item.id}-{item.category.slice(0,3).toUpperCase()}</strong>
                        <span className="block text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Status: Operational</span>
                      </div>
                      {/* Mock QR Code */}
                      <div className="w-10 h-10 bg-white p-1 rounded border border-slate-200 flex-shrink-0 flex items-center justify-center">
                        <div className="w-8 h-8 flex flex-col gap-[2px] justify-between">
                          <div className="flex justify-between gap-[2px]">
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                          </div>
                          <div className="flex justify-between gap-[2px]">
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]"></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Purchase Date</span>
                        <span className="font-semibold text-slate-750 dark:text-slate-350">Jan 2025</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Fuel Economy</span>
                        <span className="font-semibold text-slate-750 dark:text-slate-350">
                          {item.category === 'Tractor' ? '4.8 L/hr' :
                           item.category === 'Harvester' ? '7.5 L/hr' :
                           item.category === 'Rotavator' ? '3.2 L/hr' : '2.1 L/hr'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <span className="block text-[8px] uppercase font-bold text-slate-400">Service & Breakdown Log</span>
                      <ul className="list-disc pl-3 text-[10px] text-slate-500 space-y-0.5">
                        <li>Last Service: 14 May 2026 (General service & tune-up)</li>
                        <li>Breakdown log: None (100% active operational uptime)</li>
                      </ul>
                    </div>

                    {/* Real-time IoT sensors */}
                    <div className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2">
                      <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">📡 IoT Predictive Diagnostics</span>
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[9px]">
                        <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="block text-[7px] text-slate-400 font-sans">Core Temp</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">82°C</span>
                        </div>
                        <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="block text-[7px] text-slate-400 font-sans">Vibration</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">2.4m/s</span>
                        </div>
                        <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="block text-[7px] text-slate-400 font-sans">Fluids</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">91%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {listings.length === 0 && (
            <p className="col-span-full py-12 text-center text-slate-400">You haven't listed any farm machinery yet.</p>
          )}
        </div>
      </div>
      </>
      )}

      {/* 5. Proper Multi-Party Equipment Messaging Window */}
      {activeChatBooking && (
        <div className="fixed bottom-6 right-6 sm:right-20 z-[998] w-88 sm:w-[420px] h-[520px] rounded-3xl shadow-2xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm">{activeChatBooking.equipment_details?.title || 'Machinery'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                    #{activeChatBooking.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Farmer: <strong className="text-white">{activeChatBooking.farmer_name}</strong>
                  {activeChatBooking.operator_assigned && (
                    <span className="text-emerald-300 ml-1.5 font-semibold">• Operator assigned</span>
                  )}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveChatBooking(null)} 
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              title="Close message window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Context Strip */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Status: <strong className="text-slate-800 dark:text-slate-200">{activeChatBooking.status}</strong></span>
            <span>Delivery: <strong className="text-slate-800 dark:text-slate-200">{activeChatBooking.delivery_option}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{activeChatBooking.equipment_details?.rental_price_per_hour || 600}/hr</span>
          </div>

          {/* Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-slate-950/40 no-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400">No messages exchanged yet. Send a message to coordinate pickup or delivery.</p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isMe = (msg.sender_name === user?.username || msg.sender === user?.id);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">
                      {isMe ? 'You (Owner)' : msg.sender_name}
                    </span>
                    <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isMe 
                        ? 'bg-emerald-600 text-white rounded-tr-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/70 rounded-tl-xs'
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                    <span className="text-[8px] text-slate-400 mt-0.5 px-1">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message to farmer / operator..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()} 
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-sm"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 6. Add/Edit Machinery Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up">
            
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {editingListing ? "Edit Equipment Details" : "List New Farm Equipment"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEditSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Listing Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. John Deere 5050D Tractor"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option>Tractor</option>
                    <option>Harvester</option>
                    <option>Rotavator</option>
                    <option>Seeder</option>
                    <option>Sprayer</option>
                    <option>Crop Protection Equipment</option>
                    <option>Other Agricultural Machinery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Rental Price (₹/hr)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Equipment Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe horse power, attachments, drive details..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Address Location</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Pollachi Road, Coimbatore"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter external web link to picture"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitLoading ? t('submitting') : "Submit Listing"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
