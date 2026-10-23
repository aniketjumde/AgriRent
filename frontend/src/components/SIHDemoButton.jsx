import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Play, Square, SkipForward, ArrowRight, ArrowLeft, RefreshCw, Tractor, Bot, Mic, CheckCircle, TrendingUp, Shield, X, AlertCircle } from 'lucide-react';

export default function SIHDemoButton() {
  const { login, logout, user, apiFetch } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1: AI Advisor, 2: Voice Booking, 3: Owner Approve, 4: Owner Complete, 5: Admin Audit
  const [demoBookingId, setDemoBookingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  
  const steps = [
    {
      title: "Welcome to AgriRent SIH Demo Mode ⚡",
      desc: "This interactive wizard simulates a full transactional lifecycle: Farmer Booking with Operator ➔ AI Operator Matching ➔ Operator Mission & GPS Navigation ➔ Owner Handover ➔ Farm Work & Completion ➔ Admin Audit.",
      actionText: "Initialize Demo Mode"
    },
    {
      title: "Step 1: Farmer AI Recommendation & Catalog Filtering",
      desc: "Simulating a login as 'farmer' and running the AI Advisor. The KNN model recommends a Harvester for Paddy crops. This automatically updates the machinery directory filter.",
      actionText: "Run AI Advisor"
    },
    {
      title: "Step 2: Voice Booking Prefill with Operator Assistance",
      desc: "Simulating speech-to-text input. The NLP engine parses dates, category, and location. Booking is created with 'requires_operator: true'.",
      actionText: "Simulate Voice & Operator Booking"
    },
    {
      title: "Step 3: Owner Approval & AI Operator Dispatch",
      desc: "Simulating login as 'owner' to approve the booking. Approval automatically triggers AI matching to nearby verified operators and creates a field job offer.",
      actionText: "Approve Booking & Trigger Operator Match"
    },
    {
      title: "Step 4: Operator Dashboard & Live Mission Execution",
      desc: "Simulating login as 'operator' (Ramesh Kumar). The operator accepts the job, tracks GPS route, confirms machine collection from Owner, transits to farm, and starts field work.",
      actionText: "Switch to Operator & Execute Field Mission"
    },
    {
      title: "Step 5: Mission Completion & Admin Panel Audit",
      desc: "Work is marked completed, releasing escrow payouts to both the Machine Owner and the Operator. Logging in as 'admin' to audit platform transactions and charts.",
      actionText: "Finish & View Admin Dashboard"
    }
  ];

  const handleStartDemo = () => {
    setIsOpen(true);
    setCurrentStep(0);
  };

  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 0) {
        // Logging in as farmer
        await logout();
        await login('farmer', 'password123');
        setCurrentStep(1);
      } 
      else if (currentStep === 1) {
        // Filter is category 'Harvester'
        // Simulate running AI Recommendation API call
        await apiFetch('/api/ai/recommend/', {
          method: 'POST',
          body: JSON.stringify({ crop_type: 'Paddy', land_size: 5.0, task_type: 'Harvesting' })
        });
        
        // Dispatch custom event to trigger filter search in FarmerDashboard
        window.dispatchEvent(new CustomEvent('agrirent_demo_filter', { detail: { category: 'Harvester' } }));
        
        setCurrentStep(2);
      } 
      else if (currentStep === 2) {
        // Run voice typing effect
        const text = "Rent harvester tomorrow in Coimbatore for 3 days.";
        setVoiceText("");
        for (let i = 1; i <= text.length; i++) {
          await new Promise(r => setTimeout(r, 20));
          setVoiceText(text.substring(0, i));
        }

        // Post a booking programmatically
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const threeDaysAfter = new Date();
        threeDaysAfter.setDate(threeDaysAfter.getDate() + 4);
        const threeDaysAfterStr = threeDaysAfter.toISOString().split('T')[0];

        const booking = await apiFetch('/api/bookings/', {
          method: 'POST',
          body: JSON.stringify({
            equipment: 2, // Kubota Harvester DC-68G
            start_date: new Date(tomorrowStr).toISOString(),
            end_date: new Date(threeDaysAfterStr).toISOString(),
            delivery_option: 'Delivery',
            requires_operator: true,
            notes: '[Voice Booking Input] Rent harvester tomorrow in Coimbatore for 3 days.'
          })
        });

        setDemoBookingId(booking.id);
        window.dispatchEvent(new CustomEvent('agrirent_new_booking_created'));
        setCurrentStep(3);
      } 
      else if (currentStep === 3) {
        // Switch to owner
        await logout();
        await login('owner', 'password123');
        
        // If booking id is set, approve booking (triggers AI operator dispatch)
        if (demoBookingId) {
          await apiFetch(`/api/bookings/${demoBookingId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Approved' })
          });
        }
        
        setCurrentStep(4);
      } 
      else if (currentStep === 4) {
        // Switch to Operator and execute field job steps
        await logout();
        await login('operator', 'password123');
        
        const opDash = await apiFetch('/api/operator/dashboard/');
        if (opDash.new_requests && opDash.new_requests.length > 0) {
          const reqId = opDash.new_requests[0].id;
          await apiFetch(`/api/operator/jobs/${reqId}/accept/`, { method: 'POST' });
          await apiFetch(`/api/operator/jobs/${reqId}/status/`, { method: 'PATCH', body: JSON.stringify({ status: 'TRAVELLING_TO_PICKUP' }) });
          await apiFetch(`/api/operator/jobs/${reqId}/status/`, { method: 'PATCH', body: JSON.stringify({ status: 'MACHINE_COLLECTED' }) });
          await apiFetch(`/api/operator/jobs/${reqId}/status/`, { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }) });
        }
        
        setCurrentStep(5);
      } 
      else if (currentStep === 5) {
        // Switch to admin
        await logout();
        await login('admin', 'password123');
        setIsOpen(false);
        setCurrentStep(0);
      }
    } catch (e) {
      alert("Demo action failed: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      await logout();
      // Clear localStorage DB to reseed initial values
      localStorage.removeItem('agrirent_mock_db');
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Demo Trigger Button */}
      <div className="fixed bottom-4 left-4 z-[999]">
        <button
          onClick={handleStartDemo}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full font-black text-xs shadow-2xl hover:scale-105 transition-all duration-300 border border-amber-400/30 animate-bounce"
        >
          <Play className="w-4 h-4 fill-white" />
          ⚡ Hackathon Demo Mode
        </button>
      </div>

      {/* Demo Modal Controller Console */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-amber-400">
                  SIH Presentation Console
                </h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Status Indicator */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-850 bg-slate-950/40">
              <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-500">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <div 
                    key={s} 
                    className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold transition-all ${
                      currentStep === s 
                        ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md scale-110' 
                        : currentStep > s 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'border-slate-800 text-slate-600 bg-slate-900'
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-slate-500 font-extrabold mt-1.5 uppercase px-1">
                <span>Start</span>
                <span>AI Recommend</span>
                <span>Voice & Op</span>
                <span>Owner Match</span>
                <span>Operator</span>
                <span>Admin Charts</span>
              </div>
            </div>

            {/* Step Panel Details */}
            <div className="p-6 space-y-6">
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Step {currentStep} of 5
                </span>
                <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                  {steps[currentStep].title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                  {steps[currentStep].desc}
                </p>
              </div>

              {/* Step specifics rendering (e.g. typing text) */}
              {currentStep === 2 && voiceText && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-mono text-emerald-400">"{voiceText}"</span>
                </div>
              )}

              {demoBookingId && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Tracking Demo Booking: <strong>#AGR-{demoBookingId}</strong></span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleResetDemo}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Database
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{steps[currentStep].actionText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
