import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import OperatorRouteMap from '../components/OperatorRouteMap';
import {
  Tractor, CheckCircle, Clock, MapPin, Navigation, Phone, Shield,
  AlertTriangle, DollarSign, Award, Check, X, RefreshCw, Radio,
  ArrowRight, Compass, Calendar, ChevronRight, User, Wrench, FileText,
  CheckCircle2, Bell, Settings, LayoutDashboard, History, Activity,
  Search, Filter, TrendingUp, Star, Map, AlertCircle
} from 'lucide-react';

const STATUS_LABELS = {
  REQUESTED: { label: 'New Job Offer', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' },
  ACCEPTED: { label: 'Accepted — Ready', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300' },
  TRAVELLING_TO_PICKUP: { label: 'Travelling to Pickup', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300' },
  ARRIVED_AT_PICKUP: { label: 'Arrived at Pickup', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300' },
  MACHINE_COLLECTED: { label: 'Machine Handover Done', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300' },
  TRAVELLING_TO_FARM: { label: 'En Route to Farm', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' },
  ARRIVED_AT_FARM: { label: 'Arrived at Farm', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300' },
  IN_PROGRESS: { label: 'Field Operation Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-300' },
  REJECTED: { label: 'Declined', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300' }
};

export default function OperatorDashboard() {
  const { user, apiFetch } = useAuth();
  const { t } = useLanguage();

  // 9 Canonical Sidebar Sections
  const [activeSection, setActiveSection] = useState('dashboard');
  // Sub-tab / filter states
  const [historyFilter, setHistoryFilter] = useState('ALL'); // ALL, COMPLETED, REJECTED, CANCELLED
  const [historySearch, setHistorySearch] = useState('');

  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [gpsSimulating, setGpsSimulating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  // Profile Edit Form State
  const [editProfile, setEditProfile] = useState({
    full_name: '',
    phone: '',
    experience_years: 3,
    service_area: '',
    service_radius_km: 25,
    hourly_compensation_rate: 250,
    skills: '',
    supported_machinery: []
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Fetch Dashboard & Profile
  const loadDashboardData = async () => {
    try {
      const res = await apiFetch('/api/operator/dashboard/');
      setDashboardData(res);
      setProfile(res.profile);
      if (res.profile) {
        setEditProfile({
          full_name: res.profile.full_name || user?.username || '',
          phone: res.profile.phone || user?.phone_number || '',
          experience_years: res.profile.experience_years || 3,
          service_area: res.profile.service_area || 'Coimbatore Rural',
          service_radius_km: res.profile.service_radius_km || 25,
          hourly_compensation_rate: res.profile.hourly_compensation_rate || 250,
          skills: Array.isArray(res.profile.skills) ? res.profile.skills.join(', ') : '',
          supported_machinery: Array.isArray(res.profile.supported_machinery) ? res.profile.supported_machinery : ['Tractor']
        });
      }

      // Default select active job if present
      if (!selectedJob) {
        if (res.active_jobs && res.active_jobs.length > 0) {
          setSelectedJob(res.active_jobs[0]);
        } else if (res.new_requests && res.new_requests.length > 0) {
          setSelectedJob(res.new_requests[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load operator dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tracking data whenever selectedJob changes
  useEffect(() => {
    if (!selectedJob) {
      setTrackingData(null);
      return;
    }
    const fetchTracking = async () => {
      try {
        const trk = await apiFetch(`/api/operator/jobs/${selectedJob.id}/tracking/`);
        setTrackingData(trk);
      } catch (e) {
        console.warn("Could not fetch tracking data:", e);
      }
    };
    fetchTracking();
  }, [selectedJob?.id, selectedJob?.status]);

  // Live GPS Simulation loop
  useEffect(() => {
    if (!gpsSimulating || !selectedJob || selectedJob.status === 'COMPLETED') return;

    const timer = setInterval(async () => {
      try {
        const currentLat = selectedJob.current_operator_lat || 11.0250;
        const currentLng = selectedJob.current_operator_lng || 76.9620;
        
        const isHeadingPickup = ['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(selectedJob.status);
        const targetLat = isHeadingPickup ? parseFloat(selectedJob.pickup_latitude) : parseFloat(selectedJob.destination_latitude);
        const targetLng = isHeadingPickup ? parseFloat(selectedJob.pickup_longitude) : parseFloat(selectedJob.destination_longitude);

        const deltaLat = (targetLat - currentLat) * 0.15;
        const deltaLng = (targetLng - currentLng) * 0.15;

        const newLat = +(currentLat + deltaLat).toFixed(6);
        const newLng = +(currentLng + deltaLng).toFixed(6);

        const updated = await apiFetch(`/api/operator/jobs/${selectedJob.id}/location/`, {
          method: 'POST',
          body: JSON.stringify({ latitude: newLat, longitude: newLng })
        });

        setSelectedJob(prev => ({
          ...prev,
          current_operator_lat: newLat,
          current_operator_lng: newLng,
          estimated_arrival_minutes: updated.estimated_arrival_minutes
        }));

        setTrackingData(prev => prev ? {
          ...prev,
          operator: {
            ...prev.operator,
            current_latitude: newLat,
            current_longitude: newLng
          },
          eta: {
            ...prev.eta,
            minutes: updated.estimated_arrival_minutes
          }
        } : null);
      } catch (e) {
        console.error("GPS simulation ping failed:", e);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [gpsSimulating, selectedJob?.id, selectedJob?.status]);

  // Toggle availability
  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const updated = await apiFetch('/api/operator/availability/', {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !profile.is_available })
      });
      setProfile(updated);
    } catch (e) {
      alert("Failed to update availability: " + e.message);
    }
  };

  // Accept Job
  const handleAcceptJob = async (jobId) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/operator/jobs/${jobId}/accept/`, { method: 'POST' });
      setSelectedJob(res);
      setActiveSection('active-tracking');
      await loadDashboardData();
    } catch (e) {
      alert("Could not accept job: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Job
  const handleRejectJob = async () => {
    if (!showRejectModal) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/operator/jobs/${showRejectModal}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason || 'Operator unavailable at requested time' })
      });
      setShowRejectModal(null);
      setRejectReason('');
      if (selectedJob?.id === showRejectModal) setSelectedJob(null);
      await loadDashboardData();
    } catch (e) {
      alert("Could not decline job: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Transition Step Status
  const handleStatusTransition = async (nextStatus, stepNote = '') => {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/operator/jobs/${selectedJob.id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          note: stepNote,
          latitude: selectedJob.current_operator_lat,
          longitude: selectedJob.current_operator_lng
        })
      });
      setSelectedJob(res);
      await loadDashboardData();
    } catch (e) {
      alert("Status transition failed: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        full_name: editProfile.full_name,
        phone: editProfile.phone,
        experience_years: parseInt(editProfile.experience_years) || 1,
        service_area: editProfile.service_area,
        service_radius_km: parseFloat(editProfile.service_radius_km) || 25,
        hourly_compensation_rate: parseFloat(editProfile.hourly_compensation_rate) || 250,
        skills: editProfile.skills.split(',').map(s => s.trim()).filter(Boolean),
        supported_machinery: editProfile.supported_machinery
      };
      const updated = await apiFetch('/api/operator/profile/', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setProfile(updated);
      setSaveSuccessMsg('Profile and service parameters saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleMachineryChoice = (cat) => {
    setEditProfile(prev => {
      const exists = prev.supported_machinery.includes(cat);
      const list = exists 
        ? prev.supported_machinery.filter(c => c !== cat)
        : [...prev.supported_machinery, cat];
      return { ...prev, supported_machinery: list };
    });
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-emerald-600 font-bold">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span>Loading Operator Smart Jobs Dashboard...</span>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const activeJobs = dashboardData?.active_jobs || [];
  const newRequests = dashboardData?.new_requests || [];
  const upcomingJobs = dashboardData?.upcoming_jobs || [];
  const completedJobs = dashboardData?.completed_jobs || [];
  const historyJobs = dashboardData?.history_jobs || [];
  const notifications = dashboardData?.notifications || [];

  // Filter history jobs
  const filteredHistory = historyJobs.filter(job => {
    if (historyFilter !== 'ALL' && job.status !== historyFilter) return false;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      return (
        job.machine_title?.toLowerCase().includes(q) ||
        job.farmer_name?.toLowerCase().includes(q) ||
        job.owner_name?.toLowerCase().includes(q) ||
        String(job.id).includes(q)
      );
    }
    return true;
  });

  const sidebarNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'profile', label: 'My Profile', icon: User, badge: profile?.verification_status === 'Verified' ? '✓' : '!' },
    { id: 'requests', label: 'Job Requests', icon: Radio, badge: newRequests.length > 0 ? newRequests.length : null, alert: newRequests.length > 0 },
    { id: 'active-tracking', label: 'Active Job & Live Tracking', icon: Navigation, badge: activeJobs.length > 0 ? 'Active' : null, live: activeJobs.length > 0 },
    { id: 'schedule', label: 'My Schedule', icon: Calendar, badge: upcomingJobs.length > 0 ? upcomingJobs.length : null },
    { id: 'history', label: 'Job History', icon: History, badge: null },
    { id: 'earnings', label: 'Earnings & Performance', icon: DollarSign, badge: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.length > 0 ? notifications.length : null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-sans">
      
      {/* 1. TOP HEADER BANNER WITH VERIFICATION & AVAILABILITY STATUS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg flex-shrink-0">
            <Tractor className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                {profile?.full_name || user?.username}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                profile?.verification_status === 'Verified'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : profile?.verification_status === 'Rejected'
                    ? 'bg-rose-50 text-rose-600 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'bg-amber-50 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400'
              }`}>
                {profile?.verification_status === 'Verified' ? '✓ Verified Operator' : `KYC: ${profile?.verification_status || 'Pending'}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                ★ {profile?.reliability_score || 4.9} Trust Score
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{profile?.service_area || 'Coimbatore & Surrounding Taluks'}</span>
              <span>•</span>
              <span>Radius: <strong>{profile?.service_radius_km || 25} km</strong></span>
              <span>•</span>
              <span>Rate: <strong>₹{profile?.hourly_compensation_rate || 250}/hr</strong></span>
            </p>
          </div>
        </div>

        {/* Real-time Availability Toggle */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 w-full md:w-auto justify-between">
          <div>
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Availability Status</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${profile?.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {profile?.is_available ? 'Available for Field Jobs' : 'Unavailable / Offline'}
            </span>
          </div>
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
              profile?.is_available
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 text-slate-700'
            }`}
          >
            {profile?.is_available ? 'Set Unavailable' : 'Set Available'}
          </button>
        </div>
      </div>

      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR NAVIGATION (9 REQUIRED SECTIONS) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1 sticky top-20">
          <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Operator Navigation
          </div>
          {sidebarNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    item.alert
                      ? 'bg-amber-500 text-white animate-pulse'
                      : item.live
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                
                {/* 1. New Job Requests */}
                <div 
                  onClick={() => setActiveSection('requests')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">New Job Requests</span>
                    <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{newRequests.length} Pending</strong>
                  </div>
                </div>

                {/* 2. Upcoming Jobs */}
                <div 
                  onClick={() => setActiveSection('schedule')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Upcoming Jobs</span>
                    <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{upcomingJobs.length} Scheduled</strong>
                  </div>
                </div>

                {/* 3. Active Job */}
                <div 
                  onClick={() => setActiveSection('active-tracking')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active Job</span>
                    <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{activeJobs.length} Ongoing</strong>
                  </div>
                </div>

                {/* 4. Completed Jobs */}
                <div 
                  onClick={() => setActiveSection('history')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Completed Jobs</span>
                    <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{summary.total_jobs_completed || completedJobs.length} Jobs</strong>
                  </div>
                </div>

                {/* 5. Total Earnings */}
                <div 
                  onClick={() => setActiveSection('earnings')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Total Earnings</span>
                    <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">₹{summary.total_earnings || 0}</strong>
                  </div>
                </div>

                {/* 6. Availability Status */}
                <div 
                  onClick={handleToggleAvailability}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${profile?.is_available ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Availability Status</span>
                    <strong className={`text-base sm:text-lg font-black ${profile?.is_available ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {profile?.is_available ? '● Available' : '○ Unavailable'}
                    </strong>
                  </div>
                </div>

              </div>

              {/* Active Assignment Preview Widget if any */}
              {activeJobs.length > 0 && (
                <div className="bg-gradient-to-r from-blue-900/20 to-emerald-900/20 border border-blue-500/30 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-600 text-white flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 animate-pulse" /> Current Field Mission
                    </span>
                    <span className="text-xs font-bold text-slate-400">ETA: ~{activeJobs[0].estimated_arrival_minutes || 15} mins</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white">{activeJobs[0].machine_title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Owner Pickup: {activeJobs[0].pickup_address} ➔ Farm: {activeJobs[0].destination_address}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedJob(activeJobs[0]);
                        setActiveSection('active-tracking');
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
                    >
                      <Navigation className="w-4 h-4" /> Open Full GPS Navigation
                    </button>
                  </div>
                </div>
              )}

              {/* New Incoming Offers Quick View */}
              {newRequests.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Radio className="w-5 h-5 text-amber-500" />
                      Pending Job Requests ({newRequests.length})
                    </h3>
                    <button
                      onClick={() => setActiveSection('requests')}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {newRequests.slice(0, 3).map(job => (
                      <div key={job.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                        <div>
                          <strong className="text-slate-800 dark:text-white font-black text-sm">{job.machine_title}</strong>
                          <p className="text-slate-500 dark:text-slate-400">
                            Client: {job.farmer_name} • Distance: ~{job.estimated_travel_distance_km} km • Payout: <strong>₹{job.compensation_amount}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowRejectModal(job.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptJob(job.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm"
                          >
                            Accept Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* SECTION 2: OPERATOR PROFILE AND VERIFICATION */}
          {activeSection === 'profile' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Operator Profile & Verification Credentials
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage your verified skills, machinery types, operational radius, and availability.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  profile?.verification_status === 'Verified'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40'
                    : 'bg-amber-50 text-amber-600 border-amber-500/30 dark:bg-amber-950/40'
                }`}>
                  Verification: {profile?.verification_status || 'Pending'}
                </span>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-600 rounded-xl text-xs font-bold">
                  {saveSuccessMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={editProfile.full_name}
                      onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editProfile.phone}
                      onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      value={editProfile.experience_years}
                      onChange={(e) => setEditProfile({ ...editProfile, experience_years: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Hourly Compensation Rate (₹/hr)
                    </label>
                    <input
                      type="number"
                      value={editProfile.hourly_compensation_rate}
                      onChange={(e) => setEditProfile({ ...editProfile, hourly_compensation_rate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Service Area
                    </label>
                    <input
                      type="text"
                      value={editProfile.service_area}
                      onChange={(e) => setEditProfile({ ...editProfile, service_area: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Preferred Working Radius (km)
                    </label>
                    <input
                      type="number"
                      value={editProfile.service_radius_km}
                      onChange={(e) => setEditProfile({ ...editProfile, service_radius_km: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                </div>

                {/* Supported Machinery */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Supported Agricultural Machinery Types
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {['Tractor', 'Harvester', 'Rotavator', 'Seeder', 'Sprayer', 'Crop Protection Equipment'].map(cat => {
                      const selected = editProfile.supported_machinery.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleMachineryChoice(cat)}
                          className={`p-2.5 rounded-xl font-bold text-xs border text-left transition-all ${
                            selected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '} {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Professional Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editProfile.skills}
                    onChange={(e) => setEditProfile({ ...editProfile, skills: e.target.value })}
                    placeholder="e.g. Deep Plowing, Rotary Tillage, Laser Leveling, Paddy Harvesting"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2"
                >
                  {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Profile & Verification Information
                </button>
              </form>
            </div>
          )}

          {/* SECTION 3: NEW JOB REQUESTS */}
          {activeSection === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-amber-500" />
                    Nearby Matching Job Requests ({newRequests.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jobs dispatched based on your machinery compatibility, service area radius, and availability.
                  </p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {newRequests.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">No Pending Job Requests</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    New job offers will automatically alert you when a Farmer books compatible machinery requiring operator assistance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {newRequests.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          ⚡ Job #{job.id}
                        </span>
                        <span className="text-sm font-black text-purple-600">
                          ₹{job.compensation_amount} Payout
                        </span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                          <img
                            src={job.machine_image || 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600'}
                            alt={job.machine_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                            {job.machine_title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{job.machine_category}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                        <p><strong>Machine Owner:</strong> {job.owner_name} ({job.pickup_address})</p>
                        <p><strong>Farmer Destination:</strong> {job.farmer_name} ({job.destination_address})</p>
                        <p><strong>Est. Travel:</strong> ~{job.estimated_travel_distance_km || 8} km • ~{job.estimated_arrival_minutes || 20} mins</p>
                        <p><strong>Booking Dates:</strong> {new Date(job.start_date).toLocaleDateString()} to {new Date(job.end_date).toLocaleDateString()}</p>
                      </div>

                      {job.status_notes && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ {job.status_notes}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowRejectModal(job.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
                        >
                          Reject Job
                        </button>
                        <button
                          onClick={() => handleAcceptJob(job.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Accept Job
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: ACTIVE JOB & LIVE GPS TRACKING */}
          {activeSection === 'active-tracking' && (
            <div className="space-y-6">
              {selectedJob ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Leaflet GPS Map */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                          Active Field Route & GPS Navigation
                        </h3>
                      </div>
                      <button
                        onClick={() => setGpsSimulating(!gpsSimulating)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          gpsSimulating
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        {gpsSimulating ? 'GPS Ping Active' : 'Simulate GPS Movement'}
                      </button>
                    </div>

                    <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <OperatorRouteMap
                        operatorLocation={{
                          latitude: selectedJob.current_operator_lat || 11.0250,
                          longitude: selectedJob.current_operator_lng || 76.9620
                        }}
                        pickupLocation={{
                          latitude: selectedJob.pickup_latitude,
                          longitude: selectedJob.pickup_longitude,
                          address: selectedJob.pickup_address,
                          owner_name: selectedJob.owner_name
                        }}
                        destinationLocation={{
                          latitude: selectedJob.destination_latitude,
                          longitude: selectedJob.destination_longitude,
                          address: selectedJob.destination_address,
                          farmer_name: selectedJob.farmer_name
                        }}
                        status={selectedJob.status}
                      />
                    </div>

                    {/* Live ETA Stats */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Current Distance</span>
                        <strong className="text-sm sm:text-base text-slate-800 dark:text-white font-extrabold">
                          {selectedJob.estimated_travel_distance_km || 8.5} km
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Estimated Arrival</span>
                        <strong className="text-sm sm:text-base text-emerald-600 font-extrabold">
                          ~{selectedJob.estimated_arrival_minutes || 15} mins
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Compensation</span>
                        <strong className="text-sm sm:text-base text-purple-600 font-extrabold">
                          ₹{selectedJob.compensation_amount}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Complete 7-Step Workflow Controller */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${STATUS_LABELS[selectedJob.status]?.color}`}>
                          {STATUS_LABELS[selectedJob.status]?.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">Job #{selectedJob.id}</span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                          <img
                            src={selectedJob.machine_image || 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600'}
                            alt={selectedJob.machine_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                            {selectedJob.machine_title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{selectedJob.machine_category}</p>
                        </div>
                      </div>

                      {/* Contacts & Addresses */}
                      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">1. Machine Owner (Pickup)</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.owner_name}</p>
                          <p className="text-slate-500 text-[11px]">{selectedJob.pickup_address}</p>
                          <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedJob.owner_phone || '+91 98765 43212'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">2. Farmer (Farm Destination)</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.farmer_name}</p>
                          <p className="text-slate-500 text-[11px]">{selectedJob.destination_address}</p>
                          <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedJob.farmer_phone || '+91 98765 43211'}
                          </span>
                        </div>
                      </div>

                      {/* 7-STEP STATUS-UPDATE BUTTONS */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                          Execute Workflow Action
                        </h5>

                        {/* Step 1: Start Travel to Pickup */}
                        {selectedJob.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleStatusTransition('TRAVELLING_TO_PICKUP', 'Operator started driving to pickup location.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            1. Start Travel to Pickup
                          </button>
                        )}

                        {/* Step 2: Mark Arrived at Pickup */}
                        {selectedJob.status === 'TRAVELLING_TO_PICKUP' && (
                          <button
                            onClick={() => handleStatusTransition('ARRIVED_AT_PICKUP', 'Operator arrived at machine owner yard.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            2. Mark Arrived at Pickup
                          </button>
                        )}

                        {/* Step 3: Confirm Machine Collected */}
                        {selectedJob.status === 'ARRIVED_AT_PICKUP' && (
                          <button
                            onClick={() => handleStatusTransition('MACHINE_COLLECTED', 'Machine inspected and handover completed.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            3. Confirm Machine Collected
                          </button>
                        )}

                        {/* Step 4: Start Travel to Farmer */}
                        {selectedJob.status === 'MACHINE_COLLECTED' && (
                          <button
                            onClick={() => handleStatusTransition('TRAVELLING_TO_FARM', 'Operator driving machinery towards farm.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            4. Start Travel to Farmer
                          </button>
                        )}

                        {/* Step 5: Mark Arrived at Farm */}
                        {selectedJob.status === 'TRAVELLING_TO_FARM' && (
                          <button
                            onClick={() => handleStatusTransition('ARRIVED_AT_FARM', 'Operator reached farm coordinates.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            5. Mark Arrived at Farm
                          </button>
                        )}

                        {/* Step 6: Start Work */}
                        {selectedJob.status === 'ARRIVED_AT_FARM' && (
                          <button
                            onClick={() => handleStatusTransition('IN_PROGRESS', 'Field work and machine operation underway.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <Tractor className="w-4 h-4" />
                            6. Start Work
                          </button>
                        )}

                        {/* Step 7: Complete Job */}
                        {selectedJob.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleStatusTransition('COMPLETED', 'Agricultural task completed successfully.')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            7. Complete Job
                          </button>
                        )}

                        {selectedJob.status === 'COMPLETED' && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                            <span className="text-xs font-bold text-emerald-600">Job Complete. Payout ₹{selectedJob.compensation_amount} credited!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <Compass className="w-12 h-12 text-slate-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">No Active Job Selected</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Accept an incoming request from the "Job Requests" page to start live navigation and tracking.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: UPCOMING JOBS AND SCHEDULE */}
          {activeSection === 'schedule' && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                Upcoming Assigned Jobs & Schedule ({upcomingJobs.length})
              </h3>

              {upcomingJobs.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">No Upcoming Assignments Scheduled</h4>
                  <p className="text-xs text-slate-500">All accepted upcoming field operations will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upcomingJobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                          Scheduled Mission
                        </span>
                        <span className="text-sm font-black text-purple-600">₹{job.compensation_amount}</span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{job.machine_title}</h4>
                      <p className="text-xs text-slate-500">Farmer: <strong>{job.farmer_name}</strong> • Owner: <strong>{job.owner_name}</strong></p>
                      
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
                        <p><strong>Scheduled Date:</strong> {new Date(job.start_date).toLocaleDateString()} {new Date(job.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>Pickup:</strong> {job.pickup_address}</p>
                        <p><strong>Destination:</strong> {job.destination_address}</p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedJob(job);
                          setActiveSection('active-tracking');
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-4 h-4" /> Open Navigation Mission
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: JOB HISTORY WITH FILTERING & SEARCH */}
          {activeSection === 'history' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    Job History & Inspection Records
                  </h3>
                  <p className="text-xs text-slate-500">Review past completed, rejected, and cancelled operations.</p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                    />
                  </div>

                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Declined</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">No matching job records found.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistory.map(job => (
                    <div key={job.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800 dark:text-white font-black">{job.machine_title}</strong>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${STATUS_LABELS[job.status]?.color}`}>
                            {STATUS_LABELS[job.status]?.label}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                          Farmer: <strong>{job.farmer_name}</strong> • Machine Owner: <strong>{job.owner_name}</strong>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(job.requested_at).toLocaleDateString()} {new Date(job.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {job.rejection_reason && <span className="text-rose-500 ml-2">Reason: {job.rejection_reason}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-800 dark:text-white">₹{job.compensation_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: EARNINGS AND PERFORMANCE */}
          {activeSection === 'earnings' && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Earnings & Field Performance Metrics
              </h3>

              {/* Financial & Performance Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Earnings</span>
                  <strong className="text-xl sm:text-2xl font-black text-purple-600 block">₹{summary.total_earnings || 0}</strong>
                  <span className="text-[10px] text-slate-400">Settled via Escrow</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pending Payments</span>
                  <strong className="text-xl sm:text-2xl font-black text-amber-500 block">₹{summary.pending_earnings || 0}</strong>
                  <span className="text-[10px] text-slate-400">In-progress contracts</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Acceptance Rate</span>
                  <strong className="text-xl sm:text-2xl font-black text-emerald-600 block">{summary.acceptance_rate || 96}%</strong>
                  <span className="text-[10px] text-slate-400">Matching response</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Completion Rate</span>
                  <strong className="text-xl sm:text-2xl font-black text-blue-600 block">{summary.completion_rate || 100}%</strong>
                  <span className="text-[10px] text-slate-400">Jobs fulfilled</span>
                </div>
              </div>

              {/* Work Volume Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Operating Hours</span>
                  <strong className="text-lg font-black text-slate-800 dark:text-white block">{summary.total_hours_worked || 78} Hours</strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Travel Distance</span>
                  <strong className="text-lg font-black text-slate-800 dark:text-white block">{summary.total_distance_covered || 142} km</strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Farmer Rating</span>
                  <strong className="text-lg font-black text-amber-500 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500" /> {summary.rating || 4.9} / 5.0
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Live Assignment & Verification Notifications
              </h3>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">No notifications recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.map((n, idx) => (
                    <div key={idx} className="py-3.5 flex items-start gap-3 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{n.content}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 9: SETTINGS */}
          {activeSection === 'settings' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 text-xs">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                Operator Workspace Settings & Preferences
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">Auto-Accept Nearby Matches</h5>
                    <p className="text-slate-500 text-[11px]">Automatically accept job offers within 5 km radius.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-emerald-600 rounded h-4 w-4" />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">SMS & WhatsApp Alerts</h5>
                    <p className="text-slate-500 text-[11px]">Receive field job dispatches directly on your phone.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-emerald-600 rounded h-4 w-4" />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">High Precision GPS Refresh</h5>
                    <p className="text-slate-500 text-[11px]">Share live coordinate updates every 5 seconds during active trips.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-emerald-600 rounded h-4 w-4" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Decline Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-black text-base text-slate-800 dark:text-white">Decline Field Assignment</h4>
            <p className="text-xs text-slate-500">
              Declining this assignment will immediately trigger automated AI reassignment to another verified operator in the region.
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason (Optional)</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule conflict or location too far"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectJob}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
