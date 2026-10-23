import React, { useState } from 'react';
import { ShoppingCart, Trash2, Edit3, CheckCircle, AlertTriangle, ChevronRight, X, Shield, UserCheck, Truck, RefreshCw, Calendar, Clock, MapPin } from 'lucide-react';

export default function SmartBookingCart({
  cartItems,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onValidateCart,
  validating = false,
  validationResult = null
}) {
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = (itemId) => {
    onUpdateItem(itemId, editFormData);
    setEditingItemId(null);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + (parseFloat(item.item_total || item.estimated_cost || 0)), 0);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">Agricultural Equipment Rental Cart</h3>
            <p className="text-xs text-emerald-100">
              {cartItems.length} {cartItems.length === 1 ? 'Machinery item' : 'Machinery items'} selected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <button
              onClick={onValidateCart}
              disabled={validating}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
              title="Revalidate slots & rates from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Verify Rates</span>
            </button>
          )}
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-xs"
              title="Clear cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {cartItems.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-3">
            <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Your Agricultural Cart is Empty</p>
            <p className="text-xs max-w-sm mx-auto text-slate-400">
              Select agricultural machinery from the live map or nearby equipment list, configure your farming acreage and duration, and add to cart.
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const isEditing = editingItemId === item.id;
            const conflict = item.conflict_warning;

            return (
              <div
                key={item.id}
                className={`border rounded-2xl p-4 transition-all ${
                  conflict
                    ? 'border-red-300 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                }`}
              >
                {/* Conflict warning pill */}
                {conflict && (
                  <div className="mb-3 px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-lg text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{conflict}</span>
                  </div>
                )}

                {/* Top Item Summary */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={item.equipment_image || item.image_url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=150'}
                      alt={item.equipment_title || item.title}
                      className="w-16 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {item.equipment_category || item.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          by <strong className="text-slate-700 dark:text-slate-300">{item.owner_name || 'Owner'}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {item.equipment_title || item.title}
                      </h4>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        Task: <strong>{item.farming_operation || 'General Fieldwork'}</strong> • {item.acreage || 2} Acres
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => (isEditing ? handleSaveEdit(item.id) : startEditing(item))}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold"
                      title={isEditing ? 'Save changes' : 'Edit parameters'}
                    >
                      {isEditing ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Edit3 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Mode Inline */}
                {isEditing ? (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Farming Operation</label>
                        <select
                          value={editFormData.farming_operation || 'Land Preparation'}
                          onChange={(e) => setEditFormData({ ...editFormData, farming_operation: e.target.value })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
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
                          value={editFormData.acreage || 2}
                          onChange={(e) => setEditFormData({ ...editFormData, acreage: parseFloat(e.target.value) || 1 })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Rental Type</label>
                        <select
                          value={editFormData.rental_type || 'hourly'}
                          onChange={(e) => setEditFormData({ ...editFormData, rental_type: e.target.value })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          <option value="hourly">Hourly Rental</option>
                          <option value="daily">Daily Rental (8 hrs shift)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Duration ({editFormData.rental_type === 'daily' ? 'Days' : 'Hours'})
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={editFormData.rental_type === 'daily' ? 30 : 72}
                          value={editFormData.duration || 4}
                          onChange={(e) => setEditFormData({ ...editFormData, duration: parseFloat(e.target.value) || 1 })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={editFormData.start_date ? editFormData.start_date.slice(0, 16) : ''}
                          onChange={(e) => setEditFormData({ ...editFormData, start_date: new Date(e.target.value).toISOString() })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={editFormData.end_date ? editFormData.end_date.slice(0, 16) : ''}
                          onChange={(e) => setEditFormData({ ...editFormData, end_date: new Date(e.target.value).toISOString() })}
                          className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={!!editFormData.requires_operator}
                          onChange={(e) => setEditFormData({ ...editFormData, requires_operator: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Request Certified Operator</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={editFormData.delivery_option === 'Delivery'}
                          onChange={(e) => setEditFormData({ ...editFormData, delivery_option: e.target.checked ? 'Delivery' : 'Pickup' })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Farm Gate Delivery (+₹500)</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        Apply Updates
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Item Breakdown View */
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.start_date).toLocaleDateString()} {new Date(item.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>
                        Duration: <strong>{item.duration || 4} {item.rental_type === 'daily' ? 'Days' : 'Hours'}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase">Base Rental</span>
                        <strong>₹{item.rental_base_amount || (item.hourly_rate * (item.duration || 4))}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase">Operator</span>
                        <strong>{item.requires_operator ? `₹${item.operator_charge || 350}` : 'Self-drive'}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase">Logistics</span>
                        <strong>{item.delivery_option === 'Delivery' ? `₹${item.delivery_charge || 500}` : 'Self Pickup'}</strong>
                      </div>
                      <div className="text-right">
                        <span className="block text-slate-400 text-[9px] uppercase">Taxes & Fees</span>
                        <strong>₹{item.gst_tax || 0}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 pt-2 mt-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Item Estimated Total</span>
                      <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.item_total || item.estimated_cost || 0}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cart Footer / Checkout Action */}
      {cartItems.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'equipment' : 'equipments'})</span>
              <span className="font-semibold">₹{calculateSubtotal()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Escrow Security Protection</span>
              <span className="font-bold text-emerald-600">✓ 100% Guaranteed</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Estimated Total Payable</span>
              <span className="text-base text-emerald-600 dark:text-emerald-400">₹{calculateSubtotal()}</span>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              *Estimate only until booking confirmation and final owner dispatch schedule.
            </p>
          </div>

          <button
            onClick={onProceedToCheckout}
            disabled={validating || cartItems.some((i) => i.conflict_warning)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <span>Proceed to Booking Confirmation & Checkout</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
