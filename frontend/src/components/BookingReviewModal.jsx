import React, { useState } from 'react';
import { 
  X, CheckCircle, ShieldCheck, UserCheck, Calendar, Clock, 
  MapPin, AlertCircle, FileText, Sparkles, CreditCard, RefreshCw 
} from 'lucide-react';

export default function BookingReviewModal({ 
  isOpen, 
  onClose, 
  matchData, 
  onConfirmBooking, 
  loading 
}) {
  if (!isOpen || !matchData) return null;

  const {
    equipment,
    operator,
    match_metrics,
    estimated_costs,
    distance_km,
    start_date,
    end_date,
    recommendation_reasons,
    farming_operation,
    duration_hours,
    acreage
  } = matchData;

  const [deliveryOption, setDeliveryOption] = useState('Pickup');
  const [insuranceOptIn, setInsuranceOptIn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Recalculate local item totals based on modal toggles
  const baseRate = estimated_costs?.base_rental || 0;
  const opCharge = (operator && operator.operator_id) ? (estimated_costs?.operator_charges || 0) : 0;
  const transportCharge = deliveryOption === 'Delivery' ? (estimated_costs?.transport_charges || 200) : 0;
  const insuranceCharge = insuranceOptIn ? 150 : 0;
  const subtotal = baseRate + opCharge + transportCharge + insuranceCharge;
  const tax = Math.round(subtotal * 0.05);
  const finalTotal = subtotal + tax;

  const handleProceed = () => {
    onConfirmBooking({
      equipment_id: equipment.id,
      start_date,
      end_date,
      rental_type: 'hourly',
      duration: duration_hours || 4.0,
      acreage: acreage || 2.0,
      farming_operation: farming_operation || 'Fieldwork',
      delivery_option: deliveryOption,
      requires_operator: Boolean(operator && operator.operator_id),
      operator_id: operator?.operator_id,
      insurance_opt_in: insuranceOptIn,
      item_total: finalTotal,
      estimated_cost: finalTotal,
      notes: `AI Match Score: ${match_metrics?.overall_score || 85}% | Operation: ${farming_operation || 'Fieldwork'}`
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400">
                Step 8: Booking Review & Pre-Authorization
              </span>
              <h2 className="text-base font-black text-slate-800 dark:text-white">
                Confirm Equipment & Operator Selection
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Match Score & Suitability Ribbon */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-slate-850 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">AI Suitability Score</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <span>{match_metrics?.overall_score || 88}%</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                  {match_metrics?.suitability_label || 'High Match'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Proximity to Farm</span>
              <strong className="text-sm text-slate-800 dark:text-white">{distance_km} km</strong>
            </div>
          </div>

          {/* Selected Equipment Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Machine & Owner Verification
            </h3>
            <div className="flex gap-4 items-center">
              <img 
                src={equipment.image_url || "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600"} 
                alt={equipment.title}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
              />
              <div className="space-y-1 flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{equipment.title}</div>
                <div className="text-slate-500">Category: <strong className="text-slate-700 dark:text-slate-300">{equipment.category}</strong></div>
                <div className="text-slate-500">Rate: <strong className="text-emerald-600 font-bold">₹{equipment.rental_price_per_hour}/hr</strong></div>
                <div className="text-slate-400 text-[11px]">Owner: {equipment.owner?.username} (Trust Score: {equipment.owner?.reliability_score || 4.8}★)</div>
              </div>
            </div>
          </div>

          {/* Proposed Operator Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Operator Assignment
            </h3>
            {operator && operator.operator_id ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800 dark:text-white">{operator.full_name}</span>
                  <span className="text-blue-600 font-bold">₹{operator.hourly_rate}/hr</span>
                </div>
                <div className="text-slate-500">
                  Experience: <strong>{operator.experience_years} Years</strong> | Supported: {operator.supported_machinery?.join(', ')}
                </div>
                <div className="text-emerald-600 font-medium">✓ Verified Commercial Agricultural Operator</div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Self-drive reservation (No dedicated operator requested or available in radius).</p>
            )}
          </div>

          {/* Schedule & Fulfillment Preferences */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-bold text-[10px]">SCHEDULE WINDOW</span>
              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                {start_date ? new Date(start_date).toLocaleDateString() : 'Today'}
              </div>
              <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Duration: {duration_hours || 4.0} Hours
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-slate-400 block font-bold text-[10px]">DELIVERY MODE</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryOption('Pickup')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${deliveryOption === 'Pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                  Pickup
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryOption('Delivery')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${deliveryOption === 'Delivery' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                  Delivery
                </button>
              </div>
            </div>
          </div>

          {/* Insurance Protection Toggle */}
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">Agricultural Crop & Equipment Insurance</span>
              <span className="text-slate-500 text-[11px]">Protects machinery against accidental breakdown and field hazards (₹150 flat)</span>
            </div>
            <input 
              type="checkbox"
              checked={insuranceOptIn}
              onChange={(e) => setInsuranceOptIn(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>

          {/* Itemized Price Breakdown Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Machinery Base Rental:</span>
              <span className="font-semibold">₹{baseRate}</span>
            </div>
            {opCharge > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Operator Wages:</span>
                <span className="font-semibold">₹{opCharge}</span>
              </div>
            )}
            {transportCharge > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Distance Logistics Fee:</span>
                <span className="font-semibold">₹{transportCharge}</span>
              </div>
            )}
            {insuranceCharge > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Protection Insurance:</span>
                <span className="font-semibold">₹{insuranceCharge}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>GST Tax (5%):</span>
              <span className="font-semibold">₹{tax}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Authoritative Total Payable:</span>
              <span className="text-base text-emerald-600 dark:text-emerald-400">₹{finalTotal}</span>
            </div>
          </div>

          {/* Terms Agreement */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input 
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-emerald-600 rounded"
            />
            <span className="text-[11px] text-slate-500 leading-tight">
              I agree to the equipment rental terms. Payment will be held in secure escrow and only disbursed following field work completion.
            </span>
          </label>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs"
          >
            Back & Edit
          </button>
          <button
            onClick={handleProceed}
            disabled={loading || !acceptedTerms}
            className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            <span>Confirm & Submit Booking Request</span>
          </button>
        </div>

      </div>
    </div>
  );
}
