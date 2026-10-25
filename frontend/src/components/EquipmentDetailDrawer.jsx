import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Shield, Award, Fuel, MapPin, Star, Calendar, Clock, Truck, UserCheck, AlertCircle, ShoppingBag, RefreshCw, Zap } from 'lucide-react';

export default function EquipmentDetailDrawer({
  equipment,
  userLocation,
  onClose,
  onAddToCart,
  onDirectBook,
  apiFetch
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

  // Dynamic Quote State from Backend Engine
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const hourlyRate = parseFloat(equipment.rental_price_per_hour || 800);
  const dailyRate = parseFloat(equipment.rental_price_per_day || (hourlyRate * 8));

  // Fetch real-time authoritative dynamic quote from server
  useEffect(() => {
    let isMounted = true;
    const fetchQuote = async () => {
      if (!apiFetch || !equipment?.id) return;
      setQuoteLoading(true);
      setQuoteError(null);

      const sDate = new Date(startDate);
      const eDate = new Date(sDate.getTime() + (rentalType === 'daily' ? duration * 24 * 3600000 : duration * 3600000));

      try {
        const res = await apiFetch('/api/pricing/quote/', {
          method: 'POST',
          body: JSON.stringify({
            equipment_id: equipment.id,
            farmer_lat: userLocation?.latitude || 18.5204,
            farmer_lng: userLocation?.longitude || 73.8567,
            start_date: sDate.toISOString(),
            end_date: eDate.toISOString(),
            rental_type: rentalType,
            duration: duration,
            acreage: acreage,
            farming_operation: farmingOperation,
            requires_operator: requiresOperator,
            delivery_option: deliveryOption,
            insurance_opt_in: insuranceOptIn
          })
        });
        if (isMounted) {
          setQuoteData(res);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Dynamic pricing quote fetch failed:", err);
          setQuoteError(err.message);
        }
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    };

    fetchQuote();
    return () => { isMounted = false; };
  }, [
    equipment?.id,
    userLocation?.latitude,
    userLocation?.longitude,
    startDate,
    rentalType,
    duration,
    acreage,
    farmingOperation,
    requiresOperator,
    deliveryOption,
    insuranceOptIn
  ]);

  // Fallback calculations if backend quote is loading
  const rentalBase = quoteData?.pricing_breakdown?.raw_base_rental ?? (rentalType === 'daily' ? dailyRate * duration : hourlyRate * duration);
  const adjustedRental = quoteData?.pricing_breakdown?.adjusted_rental ?? rentalBase;
  const operatorCost = quoteData?.pricing_breakdown?.operator_charges ?? (requiresOperator ? (150 * (rentalType === 'daily' ? duration * 8 : duration)) : 0);
  const deliveryCost = quoteData?.pricing_breakdown?.transport_charges ?? (deliveryOption === 'Delivery' ? (equipment.delivery_charge_estimate || 250) : 0);
  const insuranceCost = quoteData?.pricing_breakdown?.insurance_charges ?? (insuranceOptIn ? (150 * (rentalType === 'daily' ? duration : Math.max(1, Math.ceil(duration / 24)))) : 0);
  const discounts = quoteData?.pricing_breakdown?.total_discounts ?? 0;
  const taxGst = quoteData?.pricing_breakdown?.taxes_amount ?? Math.round((adjustedRental + operatorCost + deliveryCost + insuranceCost - discounts) * 0.05);
  const totalEstimate = quoteData?.pricing_breakdown?.estimated_total ?? (adjustedRental + operatorCost + deliveryCost + insuranceCost + taxGst - discounts);

  const handleAddCart = () => {
    const sDate = new Date(startDate);
    const eDate = new Date(sDate.getTime() + (rentalType === 'daily' ? duration * 24 * 3600000 : duration * 3600000));

    const cartItem = {
      id: `cart_${equipment.id}_${Date.now()}`,
      quote_id: quoteData?.quote_id,
      quote_expires_at: quoteData?.quote_expires_at,
      equipment_id: equipment.id,
      equipment_title: equipment.title,
      equipment_category: equipment.category,
      equipment_image: equipment.image || equipment.image_url,
      owner_name: equipment.owner_name || equipment.owner?.username || 'Verified Machine Owner',
      owner_rating: equipment.average_rating || 4.8,
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
      season_name: quoteData?.pricing_breakdown?.season_name,
      seasonal_factor: quoteData?.pricing_breakdown?.seasonal_factor,
      demand_factor: quoteData?.pricing_breakdown?.demand_factor,
      demand_level: quoteData?.pricing_breakdown?.demand_level,
      duration_discount_amount: discounts,
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
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Machine Header & Image */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 h-48 sm:h-56">
            <img
              src={equipment.image_url || equipment.image || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600'}
              alt={equipment.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-emerald-600 shadow-md">
              ₹{hourlyRate}/hr • ₹{dailyRate}/day
            </div>
            {equipment.distance_km !== undefined && (
              <div className="absolute bottom-3 left-3 bg-blue-600/90 text-white backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{equipment.distance_km} km away</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              {equipment.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {equipment.description || "High performance agricultural machinery with multi-purpose implements."}
            </p>
          </div>

          {/* Owner & Hub specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Owner</span>
              <strong className="text-slate-800 dark:text-slate-200">{equipment.owner_name || equipment.owner?.username || 'Owner'}</strong>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Rating</span>
              <strong className="text-amber-500 flex items-center gap-1">★ {equipment.average_rating || 4.8}</strong>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Location</span>
              <strong className="text-slate-800 dark:text-slate-200 truncate block">{equipment.address || 'Pune'}</strong>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Status</span>
              <strong className="text-emerald-600 font-black">
                {equipment.effective_available ?? equipment.is_available ? '● Available' : '○ Busy'}
              </strong>
            </div>
          </div>

          {/* Dynamic Pricing Engine Live Indicator */}
          {quoteData?.pricing_breakdown && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 text-xs space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Dynamic Pricing Engine (Live Marketplace)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {quoteData.pricing_breakdown.demand_level}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                🌱 <strong>{quoteData.pricing_breakdown.season_name}</strong>: {quoteData.pricing_breakdown.seasonal_reason}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                📊 <strong>Cluster Pressure</strong>: {quoteData.pricing_breakdown.demand_reason}
              </p>
              {quoteData.pricing_breakdown.total_discounts > 0 && (
                <p className="text-[11px] text-emerald-600 font-bold">
                  🎁 Volume Discount: -₹{quoteData.pricing_breakdown.total_discounts} ({quoteData.pricing_breakdown.duration_discount_reason})
                </p>
              )}
            </div>
          )}

          {/* Smart Booking Configurator */}
          <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
              Configure Agricultural Rental Parameters
            </h4>

            {/* Farming Operation & Acreage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Farming Operation</label>
                <select
                  value={farmingOperation}
                  onChange={(e) => setFarmingOperation(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                <label className="text-[10px] font-bold text-slate-500 uppercase">Farm Acreage (Acres)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={acreage}
                  onChange={(e) => setAcreage(parseFloat(e.target.value) || 1)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Rental Type & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rental Billing Type</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setRentalType('hourly')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      rentalType === 'hourly'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Hourly Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalType('daily')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      rentalType === 'daily'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Daily Shift (8h)
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
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Toggles: Operator, Flatbed, Insurance */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Certified Machine Operator</span>
                    <span className="text-[10px] text-slate-400">Trained & insured operator dispatched (+₹150/hr or ₹1200/day)</span>
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
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Farm-Gate Flatbed Transport</span>
                    <span className="text-[10px] text-slate-400">Delivered directly to your field coordinate (₹20/km)</span>
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

            {/* Estimated Total Itemized Breakdown Card */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Base Machinery Rental:</span>
                <span className="font-semibold">₹{rentalBase}</span>
              </div>
              {quoteData?.pricing_breakdown?.demand_adjustment !== 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Market & Seasonal Adjustment:</span>
                  <span className={`font-semibold ${(quoteData?.pricing_breakdown?.demand_adjustment || 0) >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {(quoteData?.pricing_breakdown?.demand_adjustment || 0) >= 0 ? '+' : ''}₹{quoteData?.pricing_breakdown?.demand_adjustment}
                  </span>
                </div>
              )}
              {requiresOperator && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Operator Charge:</span>
                  <span className="font-semibold">₹{operatorCost}</span>
                </div>
              )}
              {deliveryOption === 'Delivery' && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Logistics & Transport:</span>
                  <span className="font-semibold">₹{deliveryCost}</span>
                </div>
              )}
              {insuranceOptIn && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Comprehensive Insurance:</span>
                  <span className="font-semibold">₹{insuranceCost}</span>
                </div>
              )}
              {discounts > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>Duration Discounts:</span>
                  <span>-₹{discounts}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500">
                <span>GST Tax (5%):</span>
                <span className="font-semibold">₹{taxGst}</span>
              </div>
              <div className="flex justify-between items-center font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span>Estimated Total:</span>
                  {quoteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                </div>
                <span className="text-base text-emerald-600 dark:text-emerald-400 font-black">
                  ₹{totalEstimate}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 text-right pt-0.5">
                *Itemized estimate dynamically calculated by backend engine.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <button
            onClick={handleAddCart}
            disabled={quoteLoading}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Smart Booking Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
