import React, { useState } from 'react';
import { X, CheckCircle, Shield, Award, Fuel, MapPin, Star, Calendar, Clock, Truck, UserCheck, AlertCircle, ShoppingBag } from 'lucide-react';

export default function EquipmentDetailDrawer({
  equipment,
  userLocation,
  onClose,
  onAddToCart,
  onDirectBook
}) {
  if (!equipment) return null;

  const [farmingOperation, setFarmingOperation] = useState('Land Preparation / Plowing');
  const [acreage, setAcreage] = useState(2.0);
  const [rentalType, setRentalType] = useState('hourly'); // 'hourly' or 'daily'
  const [duration, setDuration] = useState(4); // hours or days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [requiresOperator, setRequiresOperator] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('Pickup'); // 'Pickup' or 'Delivery'
  const [insuranceOptIn, setInsuranceOptIn] = useState(true);

  // Dynamic cost calculation
  const hourlyRate = parseFloat(equipment.rental_price_per_hour || 1200);
  const dailyRate = parseFloat(equipment.rental_price_per_day || (hourlyRate * 8));

  const rentalBase = rentalType === 'daily'
    ? dailyRate * duration
    : hourlyRate * duration;

  const operatorCost = requiresOperator
    ? (350 * (rentalType === 'daily' ? duration : Math.max(1, Math.ceil(duration / 8))))
    : 0;

  const deliveryCost = deliveryOption === 'Delivery'
    ? (equipment.delivery_charge_estimate || 500)
    : 0;

  const insuranceCost = insuranceOptIn
    ? (150 * (rentalType === 'daily' ? duration : Math.max(1, Math.ceil(duration / 24))))
    : 0;

  const subtotal = rentalBase + operatorCost + deliveryCost + insuranceCost;
  const taxGst = Math.round(subtotal * 0.05);
  const totalEstimate = subtotal + taxGst;

  const handleAddCart = () => {
    const sDate = new Date(startDate);
    const eDate = new Date(sDate.getTime() + (rentalType === 'daily' ? duration * 24 * 3600000 : duration * 3600000));

    const cartItem = {
      id: `cart_${equipment.id}_${Date.now()}`,
      equipment_id: equipment.id,
      equipment_title: equipment.title,
      equipment_category: equipment.category,
      equipment_image: equipment.image || equipment.image_url,
      owner_name: equipment.owner_name || 'Verified Machine Owner',
      farming_operation: farmingOperation,
      acreage: acreage,
      rental_type: rentalType,
      duration: duration,
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
      rental_base_amount: rentalBase,
      start_date: sDate.toISOString(),
      end_date: eDate.toISOString(),
      requires_operator: requiresOperator,
      operator_charge: operatorCost,
      delivery_option: deliveryOption,
      delivery_charge: deliveryCost,
      insurance_opt_in: insuranceOptIn,
      insurance_charge: insuranceCost,
      gst_tax: taxGst,
      item_total: totalEstimate,
      estimated_cost: totalEstimate
    };

    onAddToCart(cartItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs uppercase font-black text-slate-500 tracking-wider">
              {equipment.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Machine Header Banner */}
          <div className="flex flex-col sm:flex-row gap-4">
            <img
              src={equipment.image || equipment.image_url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=300'}
              alt={equipment.title}
              className="w-full sm:w-44 h-32 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-md font-bold text-[10px]">
                  {equipment.effective_available ?? equipment.is_available ? 'Available Now' : 'Reserved'}
                </span>
                {equipment.distance_km !== undefined && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md font-bold text-[10px]">
                    📍 {equipment.distance_km} km away
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {equipment.title}
              </h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {equipment.address || 'Local Hub Hub, Coimbatore Rural'}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  {equipment.average_rating || '4.8'} (26 reviews)
                </span>
                <span>•</span>
                <span className="text-slate-500">
                  Owner: <strong className="text-slate-800 dark:text-slate-200">{equipment.owner_name || 'Verified Owner'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Ribbon */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Hourly Rental</span>
              <strong className="text-base text-emerald-600 dark:text-emerald-400">₹{hourlyRate}</strong>
              <span className="text-[10px] text-slate-400"> / hour</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Shift (8 hrs)</span>
              <strong className="text-base text-slate-900 dark:text-white">₹{dailyRate}</strong>
              <span className="text-[10px] text-slate-400"> / day</span>
            </div>
          </div>

          {/* Machine Specifications */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Specifications & Condition</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <Fuel className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <span className="text-[10px] text-slate-400 block">Fuel Efficiency</span>
                <strong className="text-xs text-slate-800 dark:text-slate-200">{equipment.fuel_efficiency || 4.2} L/hr</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <Shield className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <span className="text-[10px] text-slate-400 block">Maintenance</span>
                <strong className="text-xs text-emerald-600 font-bold">100% Inspected</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <Award className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                <span className="text-[10px] text-slate-400 block">Telemetry</span>
                <strong className="text-xs text-purple-600 font-bold">IoT Active</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              {equipment.description || 'Modern agricultural machinery maintained in prime condition with up-to-date service history and verified field readiness.'}
            </p>
          </div>

          {/* Smart Booking Configurator */}
          <div className="border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span>🌾</span> Configure Your Farm Job Parameters
            </h4>

            {/* Farming Operation & Acreage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Farming Operation</label>
                <select
                  value={farmingOperation}
                  onChange={(e) => setFarmingOperation(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option>Land Preparation / Plowing</option>
                  <option>Sowing / Direct Seeding</option>
                  <option>Crop Protection / Spraying</option>
                  <option>Rotavation & Soil Conditioning</option>
                  <option>Harvesting & Threshing</option>
                  <option>Post-Harvest Transportation</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cultivated Farm Acreage</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={acreage}
                    onChange={(e) => setAcreage(parseFloat(e.target.value) || 1)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                  <span className="text-xs font-bold text-slate-500">Acres</span>
                </div>
              </div>
            </div>

            {/* Rental Type & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rental Type</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => { setRentalType('hourly'); setDuration(4); }}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      rentalType === 'hourly'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRentalType('daily'); setDuration(1); }}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      rentalType === 'daily'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Daily (8 hrs)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Duration ({rentalType === 'daily' ? 'Days' : 'Hours'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={rentalType === 'daily' ? 30 : 72}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Booking Start Schedule</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            {/* Operator and Delivery Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-emerald-100 dark:border-emerald-950/60">
              <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Certified Machine Operator</span>
                    <span className="text-[10px] text-slate-400">Includes verified skilled driver (+₹350/shift)</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requiresOperator}
                  onChange={(e) => setRequiresOperator(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Farm-Gate Flatbed Delivery</span>
                    <span className="text-[10px] text-slate-400">Delivered directly to your field coordinate (+₹500)</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={deliveryOption === 'Delivery'}
                  onChange={(e) => setDeliveryOption(e.target.checked ? 'Delivery' : 'Pickup')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Kisan Shield Equipment Insurance</span>
                    <span className="text-[10px] text-slate-400">Zero-liability damage coverage (+₹150/day)</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={insuranceOptIn}
                  onChange={(e) => setInsuranceOptIn(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
              </label>
            </div>

            {/* Estimated Total Breakdown Card */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Base Machinery Rental:</span>
                <span>₹{rentalBase}</span>
              </div>
              {requiresOperator && (
                <div className="flex justify-between text-slate-500">
                  <span>Operator Charge:</span>
                  <span>₹{operatorCost}</span>
                </div>
              )}
              {deliveryOption === 'Delivery' && (
                <div className="flex justify-between text-slate-500">
                  <span>Logistics / Delivery:</span>
                  <span>₹{deliveryCost}</span>
                </div>
              )}
              {insuranceOptIn && (
                <div className="flex justify-between text-slate-500">
                  <span>Comprehensive Insurance:</span>
                  <span>₹{insuranceCost}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>GST Tax (5%):</span>
                <span>₹{taxGst}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Estimated Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{totalEstimate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <button
            onClick={handleAddCart}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Smart Booking Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
