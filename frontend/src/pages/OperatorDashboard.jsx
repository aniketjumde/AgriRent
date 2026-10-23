import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import OperatorRouteMap from '../components/OperatorRouteMap';
import {
  Tractor, CheckCircle, Clock, MapPin, Navigation, Phone, Shield,
  AlertTriangle, DollarSign, Award, Check, X, RefreshCw, Radio,
  ArrowRight, Compass, Calendar, ChevronRight, User, Wrench, FileText, CheckCircle2
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

  const [activeTab, setActiveTab] = useState('live'); // live, requests, active, history, profile
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [gpsSimulating, setGpsSimulating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  // Profile edit form state
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

      // Pick first active job or latest request if selectedJob not chosen
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

  // Live GPS Simulation effect
  useEffect(() => {
    if (!gpsSimulating || !selectedJob || selectedJob.status === 'COMPLETED') return;

    const timer = setInterval(async () => {
      try {
        // Move slightly towards destination
        const currentLat = selectedJob.current_operator_lat || 11.0250;
        const currentLng = selectedJob.current_operator_lng || 76.9620;
        
        // Target: pickup if before handover, destination if after
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
      setActiveTab('live');
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
        body: JSON.stringify({ reason: rejectReason || 'Operator declined' })
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
      setSaveSuccessMsg('Profile and service parameters updated successfully!');
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
          <span>Loading Operator Smart Jobs Workspace...</span>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const activeJobs = dashboardData?.active_jobs || [];
  const newRequests = dashboardData?.new_requests || [];
  const completedJobs = dashboardData?.completed_jobs || [];
  const historyJobs = dashboardData?.history_jobs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. Top Header Banner with Live Availability Switch */}
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
              <span>{profile?.service_area || 'Coimbatore Region'}</span>
              <span>•</span>
              <span>Radius: <strong>{profile?.service_radius_km || 25} km</strong></span>
              <span>•</span>
              <span>Rate: <strong>₹{profile?.hourly_compensation_rate || 250}/hr</strong></span>
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 w-full md:w-auto justify-between">
          <div>
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Current Work Status</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${profile?.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {profile?.is_available ? 'Available for Field Jobs' : 'Offline / On Leave'}
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
            {profile?.is_available ? 'Set Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">New Job Offers</span>
            <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{newRequests.length} Pending</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active In-Field</span>
            <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{activeJobs.length} Ongoing</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Completed Jobs</span>
            <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">{summary.total_jobs_completed || completedJobs.length} Jobs</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Earned Payout</span>
            <strong className="text-xl sm:text-2xl text-slate-800 dark:text-white font-black">₹{summary.total_earnings || 0}</strong>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1 text-xs font-black">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'live'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Navigation className="w-4 h-4" />
          Live Mission & GPS Route
          {activeJobs.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Radio className="w-4 h-4" />
          Job Requests ({newRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Compass className="w-4 h-4" />
          All Active ({activeJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          History & Logs ({historyJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Operator Profile & Skills
        </button>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: LIVE MISSION & GPS ROUTE */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {selectedJob ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Interactive Map */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                      Live Field GPS Navigation
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
                    {gpsSimulating ? 'Live GPS Ping Active' : 'Simulate GPS Movement'}
                  </button>
                </div>

                {/* Leaflet Map Component */}
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

                {/* Live Distance and ETA Bar */}
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

              {/* Right Column: Step-by-Step Operations Controller */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Job Card Overview */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${STATUS_LABELS[selectedJob.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABELS[selectedJob.status]?.label || selectedJob.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Job #{selectedJob.id} • Booking #{selectedJob.booking_id}</span>
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

                  {/* Stakeholders Info Box */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <MapPin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">1. Machine Owner (Pickup)</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.owner_name || 'Machine Owner'}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedJob.pickup_address}</p>
                        <span className="text-emerald-600 font-bold inline-flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {selectedJob.owner_phone || '+91 98765 43212'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">2. Farmer (Farm Destination)</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{selectedJob.farmer_name || 'Farmer Client'}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedJob.destination_address}</p>
                        <span className="text-emerald-600 font-bold inline-flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {selectedJob.farmer_phone || '+91 98765 43211'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4-STEP WORKFLOW CONTROLLER */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Operations Workflow Execution
                    </h5>

                    {/* Step 1: Navigate to Machine Owner */}
                    {selectedJob.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStatusTransition('TRAVELLING_TO_PICKUP', 'Operator started driving to pickup location.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Step 1: Start Travelling to Machine Owner
                      </button>
                    )}

                    {selectedJob.status === 'TRAVELLING_TO_PICKUP' && (
                      <button
                        onClick={() => handleStatusTransition('ARRIVED_AT_PICKUP', 'Operator arrived at machine yard.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Mark Arrival at Pickup Location
                      </button>
                    )}

                    {/* Step 2: Pick Up the Machine */}
                    {selectedJob.status === 'ARRIVED_AT_PICKUP' && (
                      <button
                        onClick={() => handleStatusTransition('MACHINE_COLLECTED', 'Machine health checked and hand-over signed.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Step 2: Confirm Machine Collected & Inspected
                      </button>
                    )}

                    {/* Step 3: Navigate to Farmer */}
                    {selectedJob.status === 'MACHINE_COLLECTED' && (
                      <button
                        onClick={() => handleStatusTransition('TRAVELLING_TO_FARM', 'Operator driving machinery to farm field.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Step 3: Start Transit to Farmer's Farm
                      </button>
                    )}

                    {selectedJob.status === 'TRAVELLING_TO_FARM' && (
                      <button
                        onClick={() => handleStatusTransition('ARRIVED_AT_FARM', 'Operator reached farm boundaries.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Mark Arrival at Farm
                      </button>
                    )}

                    {/* Step 4: Complete the Job */}
                    {selectedJob.status === 'ARRIVED_AT_FARM' && (
                      <button
                        onClick={() => handleStatusTransition('IN_PROGRESS', 'Field work and plowing underway.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Tractor className="w-4 h-4" />
                        Step 4: Start Agricultural Field Operation
                      </button>
                    )}

                    {selectedJob.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusTransition('COMPLETED', 'Agricultural task completed to farmer satisfaction.')}
                        disabled={actionLoading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Finish & Mark Job Completed (Release Escrow)
                      </button>
                    )}

                    {selectedJob.status === 'COMPLETED' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                        <span className="text-xs font-bold text-emerald-600">Mission Accomplished! Payout ₹{selectedJob.compensation_amount} credited.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone Activity Timeline */}
                {selectedJob.status_history && selectedJob.status_history.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Audit Trail & Status History
                    </h5>
                    <div className="space-y-2 text-xs">
                      {selectedJob.status_history.map((h, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                          <div className="flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {STATUS_LABELS[h.to_status]?.label || h.to_status}
                            </span>
                            {h.note && <p className="text-[11px] text-slate-500 italic">"{h.note}"</p>}
                            <span className="text-[9px] text-slate-400">
                              {new Date(h.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Compass className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white">No Active Job Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check the "Job Requests" tab to accept incoming field assignments or view available jobs in your service radius.
              </p>
              {newRequests.length > 0 && (
                <button
                  onClick={() => setActiveTab('requests')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  View {newRequests.length} Pending Job Requests <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: JOB REQUESTS & OFFERS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500" />
              Pending Job Requests ({newRequests.length})
            </h3>
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
              <h4 className="text-base font-bold text-slate-800 dark:text-white">No New Job Requests Right Now</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your profile is active and matching. When a Farmer requests machinery requiring operator assistance in your service area, notifications and offers will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newRequests.map(job => (
                <div key={job.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      ⚡ Incoming Offer
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
                    <p><strong>Pickup:</strong> {job.pickup_address} (Owner: {job.owner_name})</p>
                    <p><strong>Destination:</strong> {job.destination_address} (Farmer: {job.farmer_name})</p>
                    <p><strong>Est. Travel:</strong> ~{job.estimated_travel_distance_km || 10} km • ~{job.estimated_arrival_minutes || 20} mins</p>
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
                      Decline
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

      {/* TAB 3: ALL ACTIVE IN-PROGRESS JOBS */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Currently Assigned Jobs ({activeJobs.length})
          </h3>

          {activeJobs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white">No Jobs Currently In Progress</h4>
              <p className="text-xs text-slate-500">You do not have any active field assignments at this moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeJobs.map(job => (
                <div key={job.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_LABELS[job.status]?.color}`}>
                      {STATUS_LABELS[job.status]?.label}
                    </span>
                    <span className="text-xs font-black text-purple-600">₹{job.compensation_amount}</span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{job.machine_title}</h4>
                  <p className="text-xs text-slate-500">Farmer: <strong>{job.farmer_name}</strong> • Owner: <strong>{job.owner_name}</strong></p>

                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setActiveTab('live');
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-4 h-4" /> Open Live GPS Navigation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HISTORY & AUDIT LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Field Job History & Payout Records
          </h3>

          {historyJobs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No job history entries recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyJobs.map(job => (
                <div key={job.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 dark:text-white font-black">{job.machine_title}</strong>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${STATUS_LABELS[job.status]?.color}`}>
                        {STATUS_LABELS[job.status]?.label}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Client: {job.farmer_name} • Machine Owner: {job.owner_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(job.requested_at).toLocaleDateString()} {new Date(job.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* TAB 5: OPERATOR PROFILE, SKILLS & SERVICE AREA */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                Operator Qualifications & Operational Parameters
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Keep your supported machinery, skills, and service radius up-to-date to maximize matching scores.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
              profile?.verification_status === 'Verified'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-50 text-amber-600 border-amber-500/30'
            }`}>
              Status: {profile?.verification_status || 'Pending'}
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
                  Hourly Rate (₹/hr)
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
                  Working Radius (km)
                </label>
                <input
                  type="number"
                  value={editProfile.service_radius_km}
                  onChange={(e) => setEditProfile({ ...editProfile, service_radius_km: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

            </div>

            {/* Supported Machinery multi-select */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Supported Machinery Categories (AI Match Factor)
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
                placeholder="e.g. Laser Leveling, Deep Tillage, Paddy Puddling"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2"
            >
              {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Save Profile & Verification Details
            </button>
          </form>
        </div>
      )}

      {/* Reject Job Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-black text-base text-slate-800 dark:text-white">Decline Field Assignment</h4>
            <p className="text-xs text-slate-500">
              Declining this assignment will immediately make the job eligible for automated AI reassignment to another verified operator.
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason (Optional)</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule conflict or machine distance"
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
