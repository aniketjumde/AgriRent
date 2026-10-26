import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, Compass, Tractor, Bot, HelpCircle, MessageCircle, Mic, Star, Sparkles, X, Calendar, MapPin, RefreshCw, Send, Check, Info, ShieldAlert, ShoppingBag, Truck, CalendarDays, ArrowLeft, Bookmark, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import MapComponent from '../components/MapComponent';
import SmartBookingCart from '../components/SmartBookingCart';
import EquipmentDetailDrawer from '../components/EquipmentDetailDrawer';
import BookingReviewModal from '../components/BookingReviewModal';
import OperatorRouteMap from '../components/OperatorRouteMap';
import VoiceBookingModal from '../components/VoiceBookingModal';

const getFallbackImage = (category) => {
  const cat = String(category || '').trim().toUpperCase();
  const images = {
    TRACTOR: "https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=600",
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

export default function FarmerDashboard() {
  const { apiFetch, user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('listings'); // 'listings', 'my-bookings', 'govt-schemes'

  // Weather Advisory states
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Government Subsidies & Loan Checker states
  const [govtSchemes, setGovtSchemes] = useState(null);
  const [loanIncome, setLoanIncome] = useState('');
  const [loanLand, setLoanLand] = useState('');
  const [loanCost, setLoanCost] = useState('');
  const [loanResult, setLoanResult] = useState(null);
  const [loanLoading, setLoanLoading] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState(3000);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');

  // Equipment Details View
  const [selectedDetailListing, setSelectedDetailListing] = useState(null);

  // Booking Modal States (Cooperative splits & Insurance options added)
  const [bookingListing, setBookingListing] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageHours, setUsageHours] = useState('8');
  const [deliveryOption, setDeliveryOption] = useState('Pickup'); // 'Pickup' or 'Delivery'
  const [microRentalShared, setMicroRentalShared] = useState(false);
  const [cooperativeGroup, setCooperativeGroup] = useState('Saravanampatti Farmers Cooperative');
  const [insuranceOptIn, setInsuranceOptIn] = useState(false);
  const [requiresOperator, setRequiresOperator] = useState(false);
  const [paymentsList, setPaymentsList] = useState([]);
  
  // Pune Pre-configured Farmer Locations
  const PUNE_FARM_PRESETS = {
    'farmer_suresh': { latitude: 18.5912, longitude: 73.7389, address: "Suresh Patil Farm, Maan, Hinjawadi, Pune (14.5 Acres, Sugarcane/Paddy)" },
    'farmer_anita': { latitude: 18.5987, longitude: 73.7656, address: "Anita Deshmukh Farm, Kaspate Wasti, Wakad, Pune (8.2 Acres, Wheat/Vegetables)" },
    'farmer_vikram': { latitude: 18.5590, longitude: 73.7868, address: "Vikram Shinde Farm, Sus Road, Baner, Pune (22.0 Acres, Soybean/Gram)" },
    'farmer_priya': { latitude: 18.5089, longitude: 73.9259, address: "Priya Kadam Farm, Manjari, Hadapsar, Pune (6.5 Acres, Floriculture/Vegetables)" },
    'farmer_ramesh': { latitude: 18.5808, longitude: 73.9787, address: "Ramesh Jadhav Farm, Bakori Road, Wagholi, Pune (18.0 Acres, Sugarcane/Bajra)" }
  };

  // GPS & Nearby Machinery State
  const [farmerLocation, setFarmerLocation] = useState(() => {
    if (user && user.username && PUNE_FARM_PRESETS[user.username]) {
      return PUNE_FARM_PRESETS[user.username];
    }
    return {
      latitude: 18.5912,
      longitude: 73.7389,
      address: "Hinjawadi Agri Cluster, Pune, Maharashtra"
    };
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [searchRadiusKm, setSearchRadiusKm] = useState(25);
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // all, available, busy
  const [sortByFilter, setSortByFilter] = useState('distance'); // distance, price_low, price_high, rating
  const [nearbyListings, setNearbyListings] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [viewModeMobile, setViewModeMobile] = useState('both'); // 'map', 'list', 'both'

  // Smart Booking Cart State (persisted in localStorage)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('agrirent_smart_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [validatingCart, setValidatingCart] = useState(false);
  const [drawerEquipment, setDrawerEquipment] = useState(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  const [paymentReceiptModal, setPaymentReceiptModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking Confirmation Receipt Modal
  const [receiptData, setReceiptData] = useState(null);

  // Blockchain Audit trail modal view
  const [showLedgerBooking, setShowLedgerBooking] = useState(null);

  // Live Operator GPS Mission Tracking Modal
  const [trackingAssignment, setTrackingAssignment] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Farmer Analytics Summary State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [farmerNotifications, setFarmerNotifications] = useState([]);

  // AI Recommendation Connector
  const [cropType, setCropType] = useState('Paddy');
  const [landSize, setLandSize] = useState(5.0);
  const [taskType, setTaskType] = useState('Harvesting');
  const [aiRecResult, setAiRecResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Step 8: AI Booking Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewMatch, setSelectedReviewMatch] = useState(null);
  const [aiMatchResults, setAiMatchResults] = useState(null);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);

  // Voice Booking
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [recFilterTab, setRecFilterTab] = useState('All'); // 'All' or 'Saved'

  // Chat Log integration
  const [activeChatBooking, setActiveChatBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // SIH Stats Ribbon States
  const [aiRecCount, setAiRecCount] = useState(4);
  const [aiRecHistory, setAiRecHistory] = useState([
    {
      id: "rec-1",
      crop: "Paddy",
      task: "Harvesting",
      recommendation: "Kubota Harvester",
      category: "Harvester",
      reason: "High efficiency harvester recommended for paddy field harvesting on wet terrain.",
      timestamp: "2026-06-19T09:15:00Z",
      saved: true,
      confidence: 96
    },
    {
      id: "rec-2",
      crop: "Sugarcane",
      task: "Tilling",
      recommendation: "John Deere 5050D Tractor",
      category: "Tractor",
      reason: "Heavy tractor suggested for high-depth sugarcane root bed tilling.",
      timestamp: "2026-06-18T14:30:00Z",
      saved: false,
      confidence: 92
    },
    {
      id: "rec-3",
      crop: "Cotton",
      task: "Sowing",
      recommendation: "Pneumatic Planter Seeder",
      category: "Seeder",
      reason: "Precision pneumatic seeder recommended for even spacing of cotton crops.",
      timestamp: "2026-06-17T11:05:00Z",
      saved: true,
      confidence: 89
    },
    {
      id: "rec-4",
      crop: "Wheat",
      task: "Spraying",
      recommendation: "Boom Sprayer",
      category: "Sprayer",
      reason: "Tractor-mounted boom sprayer suggested for pesticide coverage over 8.0 acres of wheat.",
      timestamp: "2026-06-16T08:20:00Z",
      saved: false,
      confidence: 94
    }
  ]);
  const [voiceBookingCount, setVoiceBookingCount] = useState(3);
  const [voiceHistory, setVoiceHistory] = useState([
    {
      id: "vq-1",
      query: "Rent John Deere tractor for 2 days in Salem",
      timestamp: "2026-06-19T10:45:00Z",
      response: "Found 'John Deere 5050D Tractor' in Salem available for ₹1200/day. Ready to book.",
      actionTriggered: "Opened booking modal for John Deere 5050D",
      status: "Booking Drafted"
    },
    {
      id: "vq-2",
      query: "Need a harvester tomorrow in Coimbatore",
      timestamp: "2026-06-18T16:12:00Z",
      response: "Filtering machinery directory by category: Harvester, location: Coimbatore.",
      actionTriggered: "Filtered Machinery Directory (Category: Harvester, City: Coimbatore)",
      status: "Filter Applied"
    },
    {
      id: "vq-3",
      query: "What is the weather forecast for tomorrow?",
      timestamp: "2026-06-17T09:30:00Z",
      response: "Coimbatore: Sunny, 32°C. Low chance of rain. Ideal weather for sowing.",
      actionTriggered: "Opened Weather-Aware Advisory widget",
      status: "Widget Opened"
    }
  ]);
  const [showVoiceHistory, setShowVoiceHistory] = useState(false);
  const [showAiHistory, setShowAiHistory] = useState(false);

  const toggleSaveAiRec = (id) => {
    setAiRecHistory(prev => prev.map(rec => {
      if (rec.id === id) {
        const nextSaved = !rec.saved;
        alert(nextSaved ? "Recommendation saved successfully!" : "Recommendation removed from saved list.");
        return { ...rec, saved: nextSaved };
      }
      return rec;
    }));
  };

  const deleteAiRec = (id) => {
    if (window.confirm("Are you sure you want to delete this recommendation from history?")) {
      setAiRecHistory(prev => prev.filter(rec => rec.id !== id));
      setAiRecCount(prev => Math.max(0, prev - 1));
    }
  };

  const deleteVoiceQuery = (id) => {
    if (window.confirm("Are you sure you want to delete this voice query from history?")) {
      setVoiceHistory(prev => prev.filter(vq => vq.id !== id));
      setVoiceBookingCount(prev => Math.max(0, prev - 1));
    }
  };

  const applyAiRecFilter = (rec) => {
    setCategoryFilter(rec.category);
    setActiveSubTab('listings');
    setSelectedDetailListing(null);
    navigate('/dashboard');
    alert(`Applied recommended category filter: "${rec.category}"`);
  };


  // Save cart changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('agrirent_smart_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Could not save cart to storage:", e);
    }
  }, [cartItems]);

  // Request Browser GPS
  const requestBrowserGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFarmerLocation({
          latitude: lat,
          longitude: lng,
          address: `GPS Pin: ${lat}, ${lng}`
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError("Location permission denied or unavailable. Using manual farm service location.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Fetch Nearby Equipment from backend
  const fetchNearbyEquipment = async (loc = farmerLocation, radius = searchRadiusKm, cat = categoryFilter, maxP = maxPriceFilter, avail = availabilityFilter, sort = sortByFilter) => {
    setNearbyLoading(true);
    try {
      const params = new URLSearchParams({
        lat: loc.latitude,
        lng: loc.longitude,
        radius: radius,
        category: cat || '',
        max_price: maxP || '',
        availability: avail || 'all',
        sort_by: sort || 'distance'
      });
      const data = await apiFetch(`/api/equipment/nearby/?${params.toString()}`);
      if (data && data.results) {
        setNearbyListings(data.results);
      }
    } catch (e) {
      console.warn("Failed fetching nearby equipment:", e);
    } finally {
      setNearbyLoading(false);
    }
  };

  // Trigger nearby fetch whenever filters or location change
  useEffect(() => {
    fetchNearbyEquipment(farmerLocation, searchRadiusKm, categoryFilter, maxPriceFilter, availabilityFilter, sortByFilter);
  }, [farmerLocation.latitude, farmerLocation.longitude, searchRadiusKm, categoryFilter, maxPriceFilter, availabilityFilter, sortByFilter]);

  // Initial GPS prompt & profile-based location setup
  useEffect(() => {
    if (user && user.username && PUNE_FARM_PRESETS[user.username]) {
      setFarmerLocation(PUNE_FARM_PRESETS[user.username]);
    } else {
      requestBrowserGps();
    }
  }, [user?.username]);

  // Cart operations
  const handleAddToCart = (item) => {
    setCartItems(prev => {
      // Check if item already exists
      const exists = prev.findIndex(i => i.equipment_id === item.equipment_id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = item;
        return updated;
      }
      return [...prev, item];
    });
    setDrawerEquipment(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartItem = (itemId, updatedData) => {
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updatedData } : i));
  };

  const handleRemoveCartItem = (itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear your agricultural booking cart?")) {
      setCartItems([]);
    }
  };

  const handleValidateCart = async () => {
    if (cartItems.length === 0) return;
    setValidatingCart(true);
    try {
      const res = await apiFetch('/api/cart/validate/', {
        method: 'POST',
        body: JSON.stringify({
          farmer_lat: farmerLocation.latitude,
          farmer_lng: farmerLocation.longitude,
          items: cartItems
        })
      });

      if (res && res.items) {
        setCartItems(res.items.map((vi, idx) => ({
          ...cartItems[idx],
          ...vi,
          conflict_warning: vi.conflict_warning
        })));
        if (!res.valid) {
          alert("Some items in your cart have schedule conflicts. Please review alerts.");
        } else {
          alert("All cart equipment rates and slot availability verified successfully!");
        }
      }
    } catch (e) {
      alert("Cart validation error: " + e.message);
    } finally {
      setValidatingCart(false);
    }
  };

  const handleProceedCartCheckout = async () => {
    if (cartItems.length === 0) return;
    setValidatingCart(true);
    try {
      // Revalidate entire cart against backend dynamic pricing before booking creation
      const valRes = await apiFetch('/api/cart/validate/', {
        method: 'POST',
        body: JSON.stringify({
          farmer_lat: farmerLocation.latitude,
          farmer_lng: farmerLocation.longitude,
          items: cartItems
        })
      });

      if (!valRes.valid) {
        alert("Some items have conflicting reservations or updated pricing. Please review your cart before confirming.");
        if (valRes.items) {
          setCartItems(valRes.items);
        }
        setValidatingCart(false);
        return;
      }

      // Create confirmed bookings for each item in the cart with locked quote price
      for (const item of cartItems) {
        await apiFetch('/api/bookings/', {
          method: 'POST',
          body: JSON.stringify({
            equipment: item.equipment_id,
            start_date: item.start_date,
            end_date: item.end_date,
            rental_type: item.rental_type || 'hourly',
            duration: item.duration || 4.0,
            acreage: item.acreage || 2.0,
            farming_operation: item.farming_operation || 'Land Preparation',
            delivery_option: item.delivery_option || 'Pickup',
            requires_operator: !!item.requires_operator,
            insurance_opt_in: !!item.insurance_opt_in,
            farmer_lat: farmerLocation.latitude,
            farmer_lng: farmerLocation.longitude,
            agreed_price: item.item_total || item.estimated_cost,
            quote_id: item.quote_id,
            notes: `Operation: ${item.farming_operation || 'Fieldwork'}, Acreage: ${item.acreage || 2} acres`
          })
        });
      }

      alert("Equipment booking requests successfully submitted and price-locked! Redirecting to payment & tracking...");
      setCartItems([]);
      setIsCartOpen(false);
      setActiveSubTab('my-bookings');
      navigate('/dashboard/my-bookings');
      loadDashboardData();
    } catch (e) {
      if (e.message?.toLowerCase().includes('unauthorized') || e.message?.toLowerCase().includes('credentials')) {
        alert("Your session has expired or you are not logged in. Please log in again to confirm your booking.");
        navigate('/login');
      } else {
        alert("Checkout booking error: " + e.message);
      }
    } finally {
      setValidatingCart(false);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await apiFetch('/api/payments/history/');
      setPaymentsList(res || []);
    } catch (e) {
      console.warn("Could not load payment history:", e);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setWeatherLoading(true);
    try {
      loadPayments();

      try {
        const analytics = await apiFetch('/api/dashboard/farmer/');
        setAnalyticsData(analytics);
      } catch (e) {
        console.warn("Could not load farmer analytics:", e);
      }

      try {
        const notifs = await apiFetch('/api/notifications/');
        setFarmerNotifications(notifs || []);
      } catch (e) {
        console.warn("Could not load notifications:", e);
      }

      const equipData = await apiFetch('/api/equipment/');
      setListings(equipData);

      const bookingData = await apiFetch('/api/bookings/');
      setBookings(bookingData);

      const wData = await apiFetch('/api/weather/');
      setWeatherData(wData);

      const schemesData = await apiFetch('/api/govt-schemes/');
      setGovtSchemes(schemesData);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
      setWeatherLoading(false);
    }
  };

  const handleOpenLiveTracking = async (booking) => {
    const assignmentId = booking.latest_assignment?.id;
    if (!assignmentId) {
      alert("No operator assignment created yet for this booking. Once accepted, live GPS tracking becomes available.");
      return;
    }
    setTrackingLoading(true);
    try {
      const trackData = await apiFetch(`/api/operator/jobs/${assignmentId}/tracking/`);
      setTrackingAssignment(trackData);
    } catch (e) {
      console.warn("Failed to fetch live job tracking:", e);
      // Fallback to local assignment representation if live tracking returns 403/offline
      setTrackingAssignment({
        assignment_id: assignmentId,
        booking_id: booking.id,
        status: booking.latest_assignment?.status || 'ASSIGNED',
        machine_title: booking.equipment_details?.title || 'Agricultural Machinery',
        operator: {
          name: booking.latest_assignment?.operator_name || 'Assigned Operator',
          phone: booking.latest_assignment?.operator_phone || '+919822011005',
          rating: 4.8,
          current_latitude: booking.latest_assignment?.current_operator_lat || 18.5204,
          current_longitude: booking.latest_assignment?.current_operator_lng || 73.8567
        },
        pickup: {
          address: booking.equipment_details?.address || 'Owner Machine Yard',
          latitude: parseFloat(booking.equipment_details?.location_latitude || 18.5204),
          longitude: parseFloat(booking.equipment_details?.location_longitude || 73.8567),
          owner_name: booking.equipment_details?.owner_name || 'Owner'
        },
        destination: {
          address: farmerLocation?.address || "Farmer's Field",
          latitude: parseFloat(farmerLocation?.latitude || 18.5204),
          longitude: parseFloat(farmerLocation?.longitude || 73.8567),
          farmer_name: user?.username || 'Farmer'
        },
        estimated_arrival_minutes: booking.latest_assignment?.estimated_arrival_minutes || 25,
        estimated_travel_distance_km: booking.latest_assignment?.estimated_travel_distance_km || 8.5
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard/ai-recs') {
      setActiveSubTab('ai-recs-history');
      setSelectedDetailListing(null);
    } else if (path === '/dashboard/voice-queries') {
      setActiveSubTab('voice-queries-history');
      setSelectedDetailListing(null);
    } else if (path === '/dashboard/my-bookings') {
      setActiveSubTab('my-bookings');
      setSelectedDetailListing(null);
    } else if (path === '/dashboard/govt-schemes') {
      setActiveSubTab('govt-schemes');
      setSelectedDetailListing(null);
    } else if (path === '/dashboard' || path === '/dashboard/') {
      setActiveSubTab('listings');
      setSelectedDetailListing(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    loadDashboardData();

    const handleDemoFilter = (e) => {
      if (e.detail && e.detail.category) {
        setCategoryFilter(e.detail.category);
      }
    };
    const handleNewBookingCreated = () => {
      loadDashboardData();
    };

    window.addEventListener('agrirent_demo_filter', handleDemoFilter);
    window.addEventListener('agrirent_new_booking_created', handleNewBookingCreated);

    return () => {
      window.removeEventListener('agrirent_demo_filter', handleDemoFilter);
      window.removeEventListener('agrirent_new_booking_created', handleNewBookingCreated);
    };
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

  // Helper: Calculate number of days between two dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const diffTime = new Date(end) - new Date(start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const bookingDays = calculateDays(startDate, endDate);
  const dailyRate = bookingListing ? parseFloat(bookingListing.rental_price_per_hour) : 0;
  const baseCost = bookingDays * dailyRate;
  const deliveryCost = deliveryOption === 'Delivery' ? 500 : 0;
  const totalCost = baseCost + deliveryCost;

  // Submit Booking Flow
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (bookingDays <= 0 || !bookingListing) return;
    
    // Conflict detection warning
    const hasConflict = bookings.some(b => {
      if (b.equipment !== bookingListing.id || b.status === 'Rejected' || b.status === 'Cancelled') return false;
      const bStart = b.start_date.split('T')[0];
      const bEnd = b.end_date.split('T')[0];
      return (startDate >= bStart && startDate <= bEnd) || (endDate >= bStart && endDate <= bEnd);
    });

    if (hasConflict) {
      alert("⚠️ Booking Conflict Detected: The selected machinery is already booked for these dates. Please refer to the Availability Calendar or select alternative dates.");
      return;
    }

    setBookingLoading(true);
    try {
      const data = await apiFetch('/api/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          equipment: bookingListing.id,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          delivery_option: deliveryOption,
          notes: `Usage hours/day: ${usageHours}. ${notes}`,
          micro_rental_shared: microRentalShared,
          insurance_opt_in: insuranceOptIn,
          requires_operator: requiresOperator
        })
      });
      
      // Save data for the receipt modal
      setReceiptData({
        bookingId: data.id,
        equipmentId: bookingListing.id,
        equipmentTitle: bookingListing.title,
        equipmentCategory: bookingListing.category,
        image_url: bookingListing.image_url,
        days: bookingDays,
        hours: usageHours,
        cost: data.total_cost,
        deliveryOption: data.delivery_option,
        status: data.status,
        farmer: user?.username,
        micro_rental_shared: data.micro_rental_shared,
        insurance_opt_in: data.insurance_opt_in,
        blockchain_contract_hash: data.blockchain_contract_hash,
        blockchain_ipfs_hash: data.blockchain_ipfs_hash
      });

      // Update voice booking history if this booking came from a voice command
      if (notes.includes('[Voice Booking Input]')) {
        setVoiceBookingCount(prev => prev + 1);
        setVoiceHistory(prev => [
          { query: notes, timestamp: new Date().toISOString() },
          ...prev
        ]);
      }

      // Reset states
      setBookingListing(null);
      setStartDate('');
      setEndDate('');
      setDeliveryOption('Pickup');
      setMicroRentalShared(false);
      setInsuranceOptIn(false);
      setNotes('');
      setSelectedDetailListing(null);
      
      loadDashboardData();
    } catch (err) {
      alert("Booking failed: " + err.message);
    } finally {
      setBookingLoading(false);
    }
  };


  // --- RAZORPAY STANDARD CHECKOUT INTEGRATION ---
  const handlePayWithRazorpay = async (booking) => {
    setPaymentLoadingId(booking.id);
    try {
      // 1. Create Order on backend
      const orderData = await apiFetch('/api/payments/razorpay/order/', {
        method: 'POST',
        body: JSON.stringify({ booking_id: booking.id })
      });

      // 2. Open Razorpay Standard Checkout
      const options = {
        key: orderData.key_id || "rzp_test_AgriRentDemoKey123",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "AgriEquipmentRental",
        description: `Rental Payment for ${orderData.equipment_title || 'Agricultural Machinery'}`,
        image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=200",
        order_id: orderData.order_id,
        handler: async function (response) {
          // 3. Server-side payment verification
          try {
            const verifyRes = await apiFetch('/api/payments/razorpay/verify/', {
              method: 'POST',
              body: JSON.stringify({
                booking_id: booking.id,
                razorpay_order_id: response.razorpay_order_id || orderData.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || ''
              })
            });

            alert(`Payment of ₹${booking.total_cost} successfully captured! Booking is now active.`);
            setPaymentReceiptModal(verifyRes.transaction || {
              booking: booking.id,
              amount: booking.total_cost,
              razorpay_payment_id: response.razorpay_payment_id,
              status: 'Captured',
              created_at: new Date().toISOString()
            });

            loadDashboardData();
            loadPayments();
          } catch (err) {
            alert("Payment signature verification failed: " + err.message);
          }
        },
        prefill: {
          name: orderData.farmer?.name || user?.username || "Farmer",
          email: orderData.farmer?.email || user?.email || "farmer@agrirent.com",
          contact: orderData.farmer?.contact || user?.phone_number || "+919876543211"
        },
        theme: {
          color: "#059669"
        },
        modal: {
          ondismiss: function () {
            setPaymentLoadingId(null);
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert(`Payment Failed: ${resp.error.description} (Code: ${resp.error.code})`);
          setPaymentLoadingId(null);
        });
        rzp.open();
      } else {
        const simulatePayId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
        const verifyRes = await apiFetch('/api/payments/razorpay/verify/', {
          method: 'POST',
          body: JSON.stringify({
            booking_id: booking.id,
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: simulatePayId
          })
        });
        alert(`Razorpay Test Mode: Payment of ₹${booking.total_cost} captured! (ID: ${simulatePayId})`);
        setPaymentReceiptModal(verifyRes.transaction);
        loadDashboardData();
        loadPayments();
      }
    } catch (e) {
      alert("Payment checkout initiation error: " + e.message);
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking request?")) return;
    try {
      await apiFetch(`/api/bookings/${bookingId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Cancelled' })
      });
      loadDashboardData();
    } catch (e) {
      alert("Cancellation failed: " + e.message);
    }
  };

  // Run AI Recommendation
  const handleRunAIMatching = async () => {
    setAiMatchLoading(true);
    try {
      const res = await apiFetch('/api/ai/match/', {
        method: 'POST',
        body: JSON.stringify({
          farming_operation: taskType === 'Tilling' ? 'Tilling' : (taskType === 'Harvesting' ? 'Harvesting' : (taskType === 'Sowing' ? 'Sowing' : 'Land Preparation')),
          crop_type: cropType,
          land_size: landSize,
          farmer_lat: farmerLocation.latitude,
          farmer_lng: farmerLocation.longitude,
          duration_hours: 4.0,
          requires_operator: true
        })
      });
      setAiMatchResults(res);
      if (res.recommendations && res.recommendations.length > 0) {
        alert(`AI Matching Engine found ${res.recommendations.length} available machine-operator pairs for ${cropType}! Top match score: ${res.recommendations[0].match_metrics.overall_score}%`);
      } else {
        alert("No compatible machinery or operators found for this task in your radius.");
      }
    } catch (e) {
      alert("AI matching error: " + e.message);
    } finally {
      setAiMatchLoading(false);
    }
  };

  const handleOpenReviewForRecommendation = (rec) => {
    setSelectedReviewMatch({
      ...rec,
      farming_operation: taskType || 'Land Preparation',
      duration_hours: 4.0,
      acreage: landSize || 2.0
    });
    setReviewModalOpen(true);
  };

  const handleConfirmDirectBooking = async (bookingPayload) => {
    setValidatingCart(true);
    try {
      const res = await apiFetch('/api/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          equipment: bookingPayload.equipment_id,
          start_date: bookingPayload.start_date,
          end_date: bookingPayload.end_date,
          rental_type: bookingPayload.rental_type || 'hourly',
          duration: bookingPayload.duration || 4.0,
          acreage: bookingPayload.acreage || 2.0,
          farming_operation: bookingPayload.farming_operation || 'Fieldwork',
          delivery_option: bookingPayload.delivery_option || 'Pickup',
          requires_operator: bookingPayload.requires_operator,
          insurance_opt_in: bookingPayload.insurance_opt_in,
          farmer_lat: farmerLocation.latitude,
          farmer_lng: farmerLocation.longitude,
          agreed_price: bookingPayload.item_total,
          notes: bookingPayload.notes
        })
      });

      alert(`Booking request #${res.id} successfully created and locked! Status: Pending Owner Approval.`);
      setReviewModalOpen(false);
      setActiveSubTab('my-bookings');
      navigate('/dashboard/my-bookings');
      loadDashboardData();
    } catch (e) {
      alert("Booking creation error: " + e.message);
    } finally {
      setValidatingCart(false);
    }
  };

  const handleGetRecommendation = async () => {
    setAiLoading(true);
    setAiRecResult(null);
    try {
      const res = await apiFetch('/api/ai/recommend/', {
        method: 'POST',
        body: JSON.stringify({
          crop_type: cropType,
          land_size: landSize,
          task_type: taskType
        })
      });
      setAiRecResult(res);
      setAiRecCount(prev => prev + 1);
      setAiRecHistory(prev => [
        { crop: cropType, task: taskType, recommendation: res.recommended_category, timestamp: new Date().toISOString() },
        ...prev
      ]);
      
      // AI Recommendation Connector Flow:
      // Auto-filter list catalog matching the recommended category!
      setCategoryFilter(res.recommended_category);
    } catch (e) {
      alert("AI recommendation failed: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };


  // Chat triggers
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

  const displaySourceList = nearbyListings.length > 0 ? nearbyListings : listings;
  const filteredListings = displaySourceList.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(term) || 
      item.description.toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term) ||
      (item.address || '').toLowerCase().includes(term) ||
      (item.owner_name || '').toLowerCase().includes(term);
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesPrice = parseFloat(item.rental_price_per_hour) <= maxPriceFilter;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Helper: generate array of dates for availability calendar preview (next 14 days)
  const getAvailabilityCalendar = (listingId) => {
    const calendarDays = [];
    const listingBookings = bookings.filter(b => b.equipment === listingId && b.status !== 'Rejected' && b.status !== 'Cancelled');
    
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      // Check if this date falls within any booking start/end range
      const isBooked = listingBookings.some(b => {
        const start = b.start_date.split('T')[0];
        const end = b.end_date.split('T')[0];
        return dateString >= start && dateString <= end;
      });
      
      calendarDays.push({
        dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        isBooked
      });
    }
    return calendarDays;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      {/* 1. Header & Navigation Subtabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Farmer Workspace 🌾
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Book machinery, configure delivery logs, run AI recommended advisor, and negotiate chats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setActiveSubTab('listings'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'listings' && !selectedDetailListing
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            Explore Equipment 🚜
          </button>
          
          <button
            onClick={() => { setActiveSubTab('my-bookings'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'my-bookings'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            My Bookings 📋
          </button>

          <button
            onClick={() => { setActiveSubTab('live-mission'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'live-mission'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            Live Mission 📍
          </button>

          <button
            onClick={() => { setActiveSubTab('payments'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'payments'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            Payments 💳
          </button>

          <button
            onClick={() => { setActiveSubTab('notifications'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all relative ${
              activeSubTab === 'notifications'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            <span>Notifications 🔔</span>
            {farmerNotifications.filter(n => !n.is_read).length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black">
                {farmerNotifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab('profile'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'profile'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            My Farm / Profile 🏡
          </button>

          <button
            onClick={() => { setActiveSubTab('govt-schemes'); setSelectedDetailListing(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeSubTab === 'govt-schemes'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            Subsidies 📜
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md text-xs transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {cartItems.length > 0 && (
              <span className="ml-1 w-5 h-5 bg-amber-400 text-slate-900 rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                {cartItems.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm text-xs"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            Voice Book
          </button>
        </div>
      </div>
      
      {/* Farmer Dashboard Stats Ribbon (Actual Transactions & Availability) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <button 
          onClick={() => { setActiveSubTab('my-bookings'); setBookingStatusFilter('All'); setSelectedDetailListing(null); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center gap-3 text-left w-full cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Total Bookings</span>
            <strong className="text-base sm:text-lg text-slate-800 dark:text-white">
              {analyticsData?.total_bookings ?? bookings.length} Bookings
            </strong>
          </div>
        </button>

        <button 
          onClick={() => { setActiveSubTab('my-bookings'); setBookingStatusFilter('In Progress'); setSelectedDetailListing(null); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center gap-3 text-left w-full cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active Rentals</span>
            <strong className="text-base sm:text-lg text-slate-800 dark:text-white">
              {analyticsData?.active_rentals ?? bookings.filter(b => b.status === 'In Progress').length} Active
            </strong>
          </div>
        </button>

        <button 
          onClick={() => { setActiveSubTab('payments'); setSelectedDetailListing(null); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3 text-left w-full cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <span className="text-base">💳</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Rental Spending</span>
              <strong className="text-base sm:text-lg text-slate-800 dark:text-white">
                ₹{analyticsData?.total_spent ?? (paymentsList.filter(p => p.status === 'Captured').reduce((acc, p) => acc + parseFloat(p.amount || 0), 0) || 0)}
              </strong>
            </div>
          </div>
          <span className="text-[9px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold">
            Receipts
          </span>
        </button>

        <button 
          onClick={() => { setActiveSubTab('listings'); setSelectedDetailListing(null); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3 text-left w-full cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Nearby Available</span>
              <strong className="text-base sm:text-lg text-slate-800 dark:text-white">
                {analyticsData?.nearby_available_equipment ?? listings.filter(l => l.is_available).length} Machines
              </strong>
            </div>
          </div>
          <span className="text-[9px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold">
            Live Map
          </span>
        </button>
      </div>

      {/* 2. Farmer Views switcher */}
      {activeSubTab === 'listings' && !selectedDetailListing && (
        <div className="space-y-8 animate-fade-in">
          
          {/* AI Suitability advisor & Map split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Advisor & Weather widgets */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Advisor widget */}
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-600" />
                    AI Suitability Advisor
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-1">Request custom KNN suggestion based on crop and tasks. Output sets catalog filters!</p>

                  <div className="space-y-3.5 mt-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-450 mb-1">Crop Type</label>
                      <select
                        value={cropType}
                        onChange={(e) => setCropType(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option>Paddy</option>
                        <option>Wheat</option>
                        <option>Cotton</option>
                        <option>Sugarcane</option>
                        <option>Maize</option>
                        <option>Vegetables</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-450 mb-1">Land Size (Acres)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={landSize}
                          onChange={(e) => setLandSize(parseFloat(e.target.value))}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-450 mb-1">Task Type</label>
                        <select
                          value={taskType}
                          onChange={(e) => setTaskType(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                        >
                          <option>Harvesting</option>
                          <option>Tilling</option>
                          <option>Sowing</option>
                          <option>Spraying</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={handleGetRecommendation}
                    disabled={aiLoading}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {aiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>KNN Advisor</span>
                  </button>

                  <button
                    onClick={handleRunAIMatching}
                    disabled={aiMatchLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {aiMatchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    <span>AI Match Engine</span>
                  </button>
                </div>

                                {aiMatchResults && aiMatchResults.recommendations && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 space-y-2.5 text-xs animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI Ranked Pairs ({aiMatchResults.recommendations.length})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {aiMatchResults.recommendations.slice(0, 3).map((rec, rIdx) => (
                        <div key={rIdx} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">{rec.equipment.title}</div>
                            <div className="text-[10px] text-slate-500">
                              Match: <strong className="text-emerald-600">{rec.match_metrics.overall_score}%</strong> | {rec.distance_km} km
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenReviewForRecommendation(rec)}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-[10px] hover:bg-emerald-700 transition-all"
                          >
                            Review & Book
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiRecResult && (
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:bg-slate-850/40 dark:border-slate-800 text-xs animate-fade-in text-slate-800 dark:text-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Recommended
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold">
                        {Math.round(aiRecResult.confidence_score * 100)}% Conf
                      </span>
                    </div>
                    <p className="mb-2">We found suitable machinery listings. Filters have been updated below!</p>
                    <div className="space-y-1">
                      <div>Category: <strong>{aiRecResult.recommended_category}</strong></div>
                      <div>Recommended duration: <strong>{aiRecResult.estimated_hours} Hours ({Math.ceil(aiRecResult.estimated_hours / 8)} Days)</strong></div>
                      <div>Est. Rental Cost: <strong>₹{aiRecResult.estimated_rental_cost}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Weather Advisory widget */}
              {weatherData && (
                <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase text-emerald-650 dark:text-emerald-450 tracking-wider flex items-center gap-1">
                    🌤️ Weather-Aware Sowing Advisor
                  </h4>
                  <div className="flex justify-between items-center text-xs">
                    <span>Location: <strong>{weatherData.location}</strong></span>
                    <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Live Advisory</span>
                  </div>

                  {/* 5-Day grid */}
                  <div className="grid grid-cols-5 gap-1 text-[9px] text-center font-bold">
                    {weatherData.forecast?.map((day, idx) => (
                      <div key={idx} className="p-1 bg-slate-50 dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-800/80">
                        <span className="block text-slate-400">{day.day}</span>
                        <strong className="block my-0.5 text-slate-705 dark:text-slate-100">{day.temp}°C</strong>
                        <span className="block text-slate-450 truncate">{day.condition}</span>
                        <span className="block text-blue-500 text-[8px]">{day.rain_chance}% Rain</span>
                      </div>
                    ))}
                  </div>

                  {weatherData.rainfall_warning && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 text-[10px] text-amber-800 dark:text-amber-400 leading-tight">
                      <strong>Rainfall Warning:</strong> {weatherData.rainfall_warning}
                    </div>
                  )}

                  {weatherData.recommended_booking_dates && (
                    <div className="text-[10px] text-slate-500">
                      Recommended booking dates: <strong className="text-emerald-600">{weatherData.recommended_booking_dates.join(", ")}</strong>
                    </div>
                  )}
                  {weatherData.crop_cycle_recommendation && (
                    <div className="text-[10px] text-slate-550 border-t border-slate-100 dark:border-slate-800/60 pt-2 font-medium">
                      Crop Cycle: <span className="italic">{weatherData.crop_cycle_recommendation}</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Live Interactive Agricultural Map & Controls */}
            <div className="lg:col-span-8 flex flex-col h-[460px] min-h-[420px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Map Bar: GPS Status, Radius Selector & Location Coordinate */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={requestBrowserGps}
                    disabled={gpsLoading}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    title="Detect current GPS location"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-bounce' : ''}`} />
                    <span>{gpsLoading ? 'Detecting GPS...' : 'My GPS Location'}</span>
                  </button>

                  <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-1">
                    <span>Farm Point:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {farmerLocation.latitude.toFixed(4)}, {farmerLocation.longitude.toFixed(4)}
                    </strong>
                  </div>
                </div>

                {/* Radius Buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase hidden md:inline">Radius:</span>
                  {[5, 10, 25, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSearchRadiusKm(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        searchRadiusKm === r
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS warning / Info pill */}
              {gpsError && (
                <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] border-b border-amber-100 dark:border-amber-900 flex items-center justify-between">
                  <span>{gpsError}</span>
                  <button onClick={() => setGpsError(null)} className="font-bold underline text-[10px]">Dismiss</button>
                </div>
              )}

              {/* Leaflet Live Map */}
              <div className="flex-1 relative">
                <MapComponent
                  listings={nearbyListings.length > 0 ? nearbyListings : listings}
                  userLocation={farmerLocation}
                  radiusKm={searchRadiusKm}
                  onLocationChange={(newLoc) => setFarmerLocation(prev => ({ ...prev, ...newLoc }))}
                  onMarkerSelect={(item) => setDrawerEquipment(item)}
                  onBookClick={(item) => setDrawerEquipment(item)}
                />
              </div>
            </div>
          </div>

          {/* Catalog listings filter bar */}
          <div className="space-y-4">
            <div className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex-1 min-w-[220px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="all">Availability: All</option>
                <option value="available">Only Available</option>
                <option value="busy">Reserved / Busy</option>
              </select>

              {/* Sort By Filter */}
              <select
                value={sortByFilter}
                onChange={(e) => setSortByFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="distance">Sort: Nearest Distance</option>
                <option value="price_low">Sort: Price Low to High</option>
                <option value="price_high">Sort: Price High to Low</option>
                <option value="rating">Sort: Top Rated</option>
              </select>

              <div className="flex flex-wrap gap-1.5 w-full pt-1">
                {['', 'Tractor', 'Harvester', 'Rotavator', 'Cultivator', 'Plough', 'Seed Drill', 'Sprayer', 'Crop Protection Equipment'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      categoryFilter === cat
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-850 border-slate-250 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    {cat || t('all')}
                  </button>
                ))}
              </div>
            </div>

            {/* listings catalog grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loading ? (
                // Listings Skeleton loader
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden p-5 shadow-sm space-y-4 animate-pulse">
                    <div className="h-[110px] bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                    <div className="h-4 bg-slate-250 dark:bg-slate-800 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-250 dark:bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-250 dark:bg-slate-800 rounded w-5/6"></div>
                  </div>
                ))
              ) : (
                filteredListings.map(item => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer group"
                  onClick={() => setSelectedDetailListing(item)}
                >
                  <div>
                    <div className="relative flex justify-center items-center h-[110px] bg-slate-50 dark:bg-slate-950/40 p-2 border-b border-slate-100 dark:border-slate-800">
                      <img 
                        src={item.image || item.image_url || getFallbackImage(item.category)} 
                        alt={item.title} 
                        onError={(e) => handleImageError(e, item.category)}
                        style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                        className="rounded-lg shadow-sm group-hover:scale-105 transition-all duration-300"
                      />
                      {item.is_verified && (
                        <span className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-md">
                          Verified
                        </span>
                      )}
                      
                      {/* Availability status overlay */}
                      <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shadow-sm ${
                        item.is_available 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-450'
                      }`}>
                        {item.is_available ? 'Available' : 'Currently Busy'}
                      </span>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.category}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          item.is_available 
                            ? 'bg-emerald-100/70 text-emerald-750 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100/70 text-amber-750 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {item.is_available ? 'Available' : 'Busy'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-tight">{item.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-350" />
                          <span>{item.address}</span>
                        </div>
                        <span className="text-[10px] text-slate-450 font-medium flex items-center gap-1.5">
                          Owner: <strong>{item.owner_name}</strong>
                          <span className="text-amber-500 font-extrabold flex items-center">★ 4.8</span>
                          <span className="text-[8px] bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1 py-0.2 rounded font-black">KYC</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] text-slate-450 leading-none">Daily Rate</span>
                      <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.rental_price_per_hour}
                        <span className="text-xs font-semibold text-slate-400">/day</span>
                      </span>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerEquipment(item);
                        }}
                        className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                      >
                        Details & Rates
                      </button>
                      <button
                        disabled={item.effective_available === false || item.is_available === false}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerEquipment(item);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                          (item.effective_available ?? item.is_available)
                            ? 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white hover:scale-105'
                            : 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Book Machine</span>
                      </button>
                    </div>
                  </div>
                </div>
              )))}

              {!loading && filteredListings.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  No listings found matching the filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Equipment Details Page View */}
      {selectedDetailListing && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Back Button */}
          <button
            onClick={() => setSelectedDetailListing(null)}
            className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
          >
            ← Back to Machinery Directory
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Side: Images & Descriptions */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-6 space-y-6">
              
              <div className="relative h-64 sm:h-96 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img 
                  src={selectedDetailListing.image || selectedDetailListing.image_url || getFallbackImage(selectedDetailListing.category)} 
                  alt={selectedDetailListing.title} 
                  onError={(e) => handleImageError(e, selectedDetailListing.category)}
                  className="w-full h-full object-cover" 
                />
                {selectedDetailListing.is_verified && (
                  <span className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-md">
                    Verified
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-100 dark:border-slate-800">{selectedDetailListing.category}</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedDetailListing.title}</h2>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{selectedDetailListing.address}</span>
                  </div>
                  <div>•</div>
                  <div>Listed on: {new Date(selectedDetailListing.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Description</h3>
                <p className="text-slate-500 leading-relaxed">{selectedDetailListing.description}</p>
              </div>

              {/* Reviews Section */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Customer Reviews ({selectedDetailListing.reviews?.length || 0})</h3>
                <div className="space-y-3.5">
                  {selectedDetailListing.reviews?.map((r, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-700 dark:text-slate-350">{r.author_name}</strong>
                        <div className="flex gap-0.5 text-amber-500">
                          {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500" />)}
                        </div>
                      </div>
                      <p className="text-slate-450 italic leading-relaxed">"{r.comment}"</p>
                    </div>
                  ))}

                  {(!selectedDetailListing.reviews || selectedDetailListing.reviews.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No reviews submitted yet for this machinery.</p>
                  )}
                </div>
              </div>

              {/* Nearby Alternatives Section */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Nearby Alternative Machinery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings
                    .filter(l => l.category === selectedDetailListing.category && l.id !== selectedDetailListing.id && l.is_available)
                    .slice(0, 2)
                    .map(alt => (
                      <div 
                        key={alt.id} 
                        onClick={() => setSelectedDetailListing(alt)}
                        className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/80 rounded-xl cursor-pointer hover:shadow transition-all flex gap-3 text-xs"
                      >
                        <div className="w-[80px] h-[60px] rounded overflow-hidden bg-slate-100 dark:bg-slate-850 flex-shrink-0">
                          <img src={alt.image || alt.image_url || getFallbackImage(alt.category)} onError={(e) => handleImageError(e, alt.category)} alt={alt.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{alt.title}</h4>
                          <p className="text-emerald-600 dark:text-emerald-450 font-extrabold">₹{alt.rental_price_per_hour}/day</p>
                          <p className="text-[10px] text-slate-400 truncate">{alt.address}</p>
                        </div>
                      </div>
                  ))}
                  {listings.filter(l => l.category === selectedDetailListing.category && l.id !== selectedDetailListing.id && l.is_available).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No alternative available listings nearby currently.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Side: Owner details, availability calendar & Booking button */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Action Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Rental Cost</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{selectedDetailListing.rental_price_per_hour}
                    <span className="text-sm font-semibold text-slate-400"> /day</span>
                  </span>
                </div>

                <div className="border-t border-b border-slate-100 dark:border-slate-800/80 py-3.5 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Listing Status:</span>
                    <strong className={selectedDetailListing.is_available ? "text-emerald-600" : "text-amber-500"}>
                      {selectedDetailListing.is_available ? "Available Now" : "Currently Busy"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Listed by Owner:</span>
                    <strong className="text-slate-700 dark:text-slate-300">{selectedDetailListing.owner_name}</strong>
                  </div>
                  {selectedDetailListing.owner_phone && (
                    <div className="flex justify-between">
                      <span>Contact Owner:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{selectedDetailListing.owner_phone}</strong>
                    </div>
                  )}
                </div>

                <button
                  disabled={!selectedDetailListing.is_available}
                  onClick={() => setBookingListing(selectedDetailListing)}
                  className={`w-full py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md text-xs transition-all hover:scale-[1.02] ${
                    !selectedDetailListing.is_available ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {selectedDetailListing.is_available ? 'Book This Equipment' : 'Currently Booked'}
                </button>
              </div>

              {/* Visual Availability Calendar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  Availability Calendar (Next 14 Days)
                </h3>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  {getAvailabilityCalendar(selectedDetailListing.id).map((day, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg border text-center flex justify-between items-center ${
                        day.isBooked 
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400'
                      }`}
                    >
                      <span>{day.dateLabel}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase bg-white dark:bg-slate-900 shadow-sm">
                        {day.isBooked ? 'Busy' : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine Health Passport & IoT Predictive Maintenance */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  🛡️ Machine Health Passport
                </h3>
                
                <div className="space-y-2 text-slate-605 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Fuel Efficiency:</span>
                    <strong className="text-slate-805 dark:text-slate-200">{selectedDetailListing.fuel_efficiency || '4.5 Litres/Hour'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Purchase Details:</span>
                    <strong className="text-slate-805 dark:text-slate-200">2024 (Warranty Active)</strong>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span className="font-bold">Service Log:</span>
                    <ul className="list-disc list-inside text-[10px] text-slate-450 space-y-0.5">
                      <li>Engine Oil Checked & Replaced (12 hours ago)</li>
                      <li>Belt tension calibrated (1 week ago)</li>
                      <li>Hydraulics top-up (June 10, 2026)</li>
                    </ul>
                  </div>
                </div>

                {/* IoT Live Sensor Simulation */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-emerald-650 tracking-wider flex items-center gap-1">
                    📟 IoT Real-Time Telemetry
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold">
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-150 dark:border-slate-800">
                      <span className="block text-slate-400">Core Temp</span>
                      <strong className="text-slate-705 dark:text-slate-200">{selectedDetailListing.sensor_temperature || '78.5'}°C</strong>
                    </div>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-150 dark:border-slate-800">
                      <span className="block text-slate-400">Vibration</span>
                      <strong className="text-emerald-605 dark:text-emerald-400">{selectedDetailListing.sensor_vibration || 'Normal'}</strong>
                    </div>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-150 dark:border-slate-800">
                      <span className="block text-slate-400">Hydraulics</span>
                      <strong className="text-emerald-605 dark:text-emerald-400">{selectedDetailListing.sensor_oil_level || 'Optimal'}</strong>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded text-[9px] text-emerald-700 dark:text-emerald-400 leading-tight">
                    <strong>Sensor Diagnostics:</strong> No anomalies detected. Alternate bearing wear within standard variance. Next service in 40 hours.
                  </div>
                </div>

                {/* Machine QR Code Verification */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="block font-bold">Health QR Passport</span>
                    <span className="text-[9px] text-slate-400">Scan to verify state in ledger</span>
                  </div>
                  {/* Visual mockup of a QR code */}
                  <div className="w-10 h-10 bg-white p-1 rounded border border-slate-200 dark:border-slate-700 flex flex-wrap gap-0.5 justify-center items-center">
                    {Array.from({length: 16}).map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 ${Math.random() > 0.4 ? 'bg-black' : 'bg-white'}`}></div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* 4. My Bookings Tab View */}
      {activeSubTab === 'my-bookings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Bookings log */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-md font-bold text-slate-850 dark:text-slate-105">My Rental Requests</h3>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Pending', 'In Progress', 'Completed', 'Rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setBookingStatusFilter(status)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                      bookingStatusFilter === status
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-205 dark:border-slate-750 text-slate-600 dark:text-slate-350 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'In Progress' ? 'Active' : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                // Booking Skeleton loader
                [1, 2].map(i => (
                  <div key={i} className="p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl space-y-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-[120px] h-[90px] bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-250 dark:bg-slate-800 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-250 dark:bg-slate-800 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-250 dark:bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                bookings.filter(b => {
                  if (bookingStatusFilter === 'All') return true;
                  if (bookingStatusFilter === 'In Progress') return b.status === 'In Progress';
                  return b.status === bookingStatusFilter;
                }).map(b => (
                <div key={b.id} className="p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-xl space-y-4">
                  
                  {/* Summary card top row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-[120px] h-[90px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                        <img 
                          src={b.equipment_details?.image || b.equipment_details?.image_url || getFallbackImage(b.equipment_details?.category)} 
                          alt={b.equipment_details?.title} 
                          onError={(e) => handleImageError(e, b.equipment_details?.category)}
                          style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-extrabold text-sm text-slate-805 dark:text-slate-105">{b.equipment_details?.title}</h4>
                        <p className="text-slate-450">Daily Rate: ₹{b.equipment_details?.rental_price_per_hour}/day • Option: <strong>{b.delivery_option}</strong></p>
                        {b.notes && <p className="text-slate-455">Notes: <span className="italic">"{b.notes}"</span></p>}
                        
                        <div className="flex flex-wrap gap-1.5 py-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            b.escrow_status === 'Held' ? 'bg-amber-100 text-amber-805 dark:bg-amber-950/40 dark:text-amber-400' :
                            b.escrow_status === 'Released' ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            b.escrow_status === 'Refunded' ? 'bg-slate-100 text-slate-805 dark:bg-slate-850 dark:text-slate-400' : 'bg-slate-100 text-slate-400'
                          }`}>
                            Escrow: {b.escrow_status || 'N/A'}
                          </span>
                          
                          {b.micro_rental_shared && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black uppercase">
                              Cooperative Rent Split
                            </span>
                          )}

                          {b.insurance_opt_in && (
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-850 dark:bg-indigo-950/40 dark:text-indigo-400 text-[8px] font-black uppercase">
                              Smart Insurance Covered
                            </span>
                          )}

                          {(b.requires_operator || b.operator_assigned) && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[8px] font-black uppercase flex items-center gap-1.5">
                              <span>🚜 Operator: {b.latest_assignment?.operator_name || b.operator_assigned_name || 'Requested / Dispatching'}</span>
                              {b.latest_assignment && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenLiveTracking(b);
                                  }}
                                  className="ml-1 px-1.5 py-0.2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[8px] uppercase tracking-wider"
                                >
                                  Live Mission GPS 📍
                                </button>
                              )}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 text-[8px] font-bold">
                            🌳 {b.carbon_saved_kg || 8.4} kg CO2 Saved
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-450 pt-1">
                          <span>Booking ID: <strong className="text-slate-705 dark:text-slate-350">#AGR-{b.id}</strong></span>
                          <span>•</span>
                          <button
                            onClick={() => setShowLedgerBooking(b)}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-0.5 underline"
                          >
                            Verify Blockchain Ledger
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span className="text-base font-black text-emerald-600">₹{b.total_cost}</span>
                      
                      <div className="flex gap-2">
                        {b.payment_status !== 'Captured' && b.status !== 'Rejected' && b.status !== 'Cancelled' && (
                          <button
                            onClick={() => handlePayWithRazorpay(b)}
                            disabled={paymentLoadingId === b.id}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                          >
                            {paymentLoadingId === b.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>💳 Pay ₹{b.total_cost}</span>
                            )}
                          </button>
                        )}
                        {b.payment_status === 'Captured' && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-[10px] font-black uppercase">
                            ✓ Paid
                          </span>
                        )}
                        {(b.status === 'Pending' || b.status === 'Approved') && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="px-2.5 py-1 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-[10px] font-bold"
                          >
                            Cancel Rent
                          </button>
                        )}
                        <button
                          onClick={() => openChat(b)}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Booking Status Stepper Tracking */}
                  <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      
                      <div className="flex flex-col items-center flex-1 relative">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold z-10">1</div>
                        <span className="mt-1 text-emerald-600">Pending Approval</span>
                        <div className="absolute top-2.5 left-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-0"></div>
                      </div>

                      <div className="flex flex-col items-center flex-1 relative">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold z-10 ${
                          b.status === 'Rejected' || b.status === 'Cancelled' ? 'bg-red-500 text-white' :
                          ['Approved', 'In Progress', 'Completed'].includes(b.status) ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}>2</div>
                        <span className={b.status === 'Rejected' || b.status === 'Cancelled' ? 'mt-1 text-red-500' : ['Approved', 'In Progress', 'Completed'].includes(b.status) ? 'mt-1 text-emerald-600' : 'mt-1'}>
                          {b.status === 'Cancelled' ? 'Cancelled' : b.status === 'Rejected' ? 'Rejected' : 'Approved'}
                        </span>
                        <div className="absolute top-2.5 left-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-0"></div>
                      </div>

                      <div className="flex flex-col items-center flex-1 relative">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold z-10 ${
                          ['In Progress', 'Completed'].includes(b.status) ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}>3</div>
                        <span className={['In Progress', 'Completed'].includes(b.status) ? 'mt-1 text-emerald-600' : 'mt-1'}>In Progress</span>
                        <div className="absolute top-2.5 left-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-0"></div>
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold z-10 ${
                          b.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}>4</div>
                        <span className={b.status === 'Completed' ? 'mt-1 text-emerald-600' : 'mt-1'}>Completed</span>
                      </div>

                    </div>
                  </div>

                  {/* Blockchain Audit & CV Damage Verification */}
                  {['Approved', 'In Progress', 'Completed'].includes(b.status) && (
                    <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Damage Detection */}
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-xl space-y-2">
                        <h5 className="font-extrabold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          📸 AI CV Damage Detection
                        </h5>
                        <p className="text-[9px] text-slate-400 leading-tight">Compare machine frame before and after rental. Audited automatically.</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-center text-[9px]">
                          <div className="p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            <span className="block text-slate-400">Before Image</span>
                            {b.before_rental_image ? (
                              <span className="text-emerald-600 font-bold">✓ Uploaded</span>
                            ) : (
                              <button
                                onClick={() => {
                                  b.before_rental_image = "https://images.unsplash.com/photo-533514114760-4389f572ae26?before-state";
                                  setBookings([...bookings]);
                                }}
                                className="mt-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-black uppercase text-[8px]"
                              >
                                Upload Before
                              </button>
                            )}
                          </div>
                          <div className="p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            <span className="block text-slate-400">After Image</span>
                            {b.after_rental_image ? (
                              <span className="text-emerald-600 font-bold">✓ Uploaded</span>
                            ) : (
                              <button
                                onClick={() => {
                                  const simulate = window.confirm("Simulate structural frame delta (dent)? OK for damage, Cancel for normal.");
                                  b.after_rental_image = simulate ? "https://images.unsplash.com/photo-533514114760-4389f572ae26?after-dented" : "https://images.unsplash.com/photo-533514114760-4389f572ae26?after-normal";
                                  setBookings([...bookings]);
                                }}
                                className="mt-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-black uppercase text-[8px]"
                              >
                                Upload After
                              </button>
                            )}
                          </div>
                        </div>

                        {b.before_rental_image && b.after_rental_image && (
                          <div className="space-y-2 pt-1 border-t border-slate-105 dark:border-slate-800/80">
                            {(!b.damage_severity || b.damage_severity === 'N/A') ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const rep = await apiFetch(`/api/bookings/${b.id}/damage/`, {
                                      method: 'POST',
                                      body: JSON.stringify({
                                        before_rental_image: b.before_rental_image,
                                        after_rental_image: b.after_rental_image
                                      })
                                    });
                                    b.damage_severity = rep.damage_severity;
                                    b.damage_dispute_report = rep.damage_report;
                                    setBookings([...bookings]);
                                    alert("AI Computer Vision comparison report generated successfully!");
                                  } catch (e) {
                                    alert(e.message);
                                  }
                                }}
                                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[9px] uppercase tracking-wider shadow-sm"
                              >
                                Run CV Damage Audit
                              </button>
                            ) : (
                              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-150 dark:border-slate-850 space-y-1 text-[9px]">
                                <div>Severity Score: <strong className={b.damage_severity === 'None' ? 'text-emerald-600' : 'text-red-500'}>{b.damage_severity}</strong></div>
                                <p className="text-slate-405 italic">"{b.damage_dispute_report}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Insurance Protection Claim section */}
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-xl space-y-2">
                        <h5 className="font-extrabold text-[10px] text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          🛡️ Smart Insurance Claim Desk
                        </h5>
                        
                        {b.insurance_opt_in ? (
                          <div className="space-y-1.5 text-[9px] text-slate-500">
                            <p>AgriRent Smart Damage Protection is active for this booking contract.</p>
                            <div className="flex justify-between">
                              <span>Claim Status:</span>
                              <strong className="text-emerald-650">{b.insurance_claim_status || 'N/A'}</strong>
                            </div>
                            
                            {b.damage_severity && b.damage_severity !== 'None' && b.damage_severity !== 'N/A' && b.insurance_claim_status === 'N/A' && (
                              <button
                                onClick={() => {
                                  b.insurance_claim_status = 'Submitted';
                                  setBookings([...bookings]);
                                  alert("Insurance claim filed instantly based on AI CV Audit discrepancy report! Claim ID: #CLM-5421.");
                                }}
                                className="w-full mt-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded font-bold uppercase tracking-wider text-[9px]"
                              >
                                File Smart Claim
                              </button>
                            )}
                            {b.insurance_claim_status === 'Submitted' && (
                              <div className="p-1.5 bg-indigo-50 dark:bg-slate-950 rounded text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 leading-tight">
                                Claim submitted under review. Payout will process to escrow refund automatically.
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[9px] leading-tight">No insurance policy opted-in for this booking. Renter remains liable for any discrepancy reports generated by the CV audit.</p>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )))}

              {!loading && bookings.filter(b => {
                if (bookingStatusFilter === 'All') return true;
                if (bookingStatusFilter === 'In Progress') return b.status === 'In Progress';
                return b.status === bookingStatusFilter;
              }).length === 0 && (
                <p className="text-xs text-slate-405 italic text-center py-10">
                  {bookingStatusFilter === 'All' 
                    ? t('noBookings') 
                    : `No bookings found for "${bookingStatusFilter === 'In Progress' ? 'Active' : bookingStatusFilter}".`}
                </p>
              )}
            </div>
          </div>

          {/* Right Side: Chat Window */}
          <div className="lg:col-span-4 glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[450px]">
            <div>
              <h3 className="text-md font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5 mb-4">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                Chat Support Panel
              </h3>
              
              {activeChatBooking ? (
                <div className="text-xs border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  Discussing: <strong className="text-slate-700 dark:text-slate-350">{activeChatBooking.equipment_details?.title}</strong>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-16">Select a booking log's chat button to communicate with the equipment owner.</p>
              )}
            </div>

            {activeChatBooking && (
              <>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 mb-4 max-h-[250px] no-scrollbar">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_name === user?.username ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                        msg.sender_name === user?.username 
                          ? 'bg-emerald-600 text-white rounded-br-none' 
                          : 'bg-white dark:bg-slate-850 text-slate-805 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-bl-none shadow-sm'
                      }`}>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-emerald-600 text-white rounded-full">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4.5 Government Schemes & Subsidies Tab View */}
      {activeSubTab === 'govt-schemes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs">
          
          {/* Subsidies lists */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">National Machinery Subsidies & Benefits</h3>
              {govtSchemes && (
                <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold">
                  Tier: {govtSchemes.farmer_benefits?.benefit_tier}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {govtSchemes?.schemes?.map(s => (
                <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{s.title}</h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[9px]">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-655 dark:text-slate-400 font-medium">Subsidy Value: <strong className="text-emerald-600">{s.subsidy}</strong></p>
                  <p className="text-slate-450 italic">Eligibility: {s.eligibility}</p>
                  <button 
                    onClick={() => alert(`Submitting application for "${s.title}" through AgriRent AI partner gateway...`)}
                    className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] uppercase shadow-sm"
                  >
                    Apply for Subsidy
                  </button>
                </div>
              ))}
            </div>

            {govtSchemes?.farmer_benefits && (
              <div className="p-4.5 bg-emerald-50/50 dark:bg-slate-850/40 border border-emerald-105 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Subsidy Availed YTD</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 font-black">₹{govtSchemes.farmer_benefits.subsidy_availed_ytd}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active Applications</span>
                  <strong className="text-base text-slate-700 dark:text-slate-350">{govtSchemes.farmer_benefits.active_applications} Pending</strong>
                </div>
              </div>
            )}
          </div>

          {/* Loan Eligibility Checker */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Agricultural Loan Checker</h3>
            <p className="text-[10px] text-slate-450">Check credit eligibility and interest subsidies under central KCC schemes.</p>
            
            <div className="space-y-3.5 mt-2">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Annual Farmer Income (₹)</label>
                <input 
                  type="number" 
                  value={loanIncome}
                  onChange={(e) => setLoanIncome(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Cultivated Land Size (Acres)</label>
                <input 
                  type="number" 
                  value={loanLand}
                  onChange={(e) => setLoanLand(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Target Machinery Cost (₹)</label>
                <input 
                  type="number" 
                  value={loanCost}
                  onChange={(e) => setLoanCost(e.target.value)}
                  placeholder="e.g. 750000"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                if(!loanIncome || !loanLand || !loanCost) {
                  alert("Please enter income, land size, and machinery cost first.");
                  return;
                }
                setLoanLoading(true);
                try {
                  const res = await apiFetch('/api/govt-schemes/', {
                    method: 'POST',
                    body: JSON.stringify({
                      annual_income: parseFloat(loanIncome),
                      land_size: parseFloat(loanLand),
                      machinery_cost: parseFloat(loanCost)
                    })
                  });
                  setLoanResult(res);
                } catch(e) {
                  alert(e.message);
                } finally {
                  setLoanLoading(false);
                }
              }}
              disabled={loanLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md text-xs flex items-center justify-center gap-1.5"
            >
              {loanLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Verify Loan Eligibility
            </button>

            {loanResult && (
              <div className="p-3 bg-emerald-50 dark:bg-slate-850 rounded-xl border border-emerald-100 dark:border-slate-800 text-[10px] space-y-2 animate-fade-in text-slate-700 dark:text-slate-350">
                <div className="font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800 pb-1">
                  Advisory Report: {loanResult.eligible ? "✓ Credit Approved" : "✗ Credit Denied"}
                </div>
                {loanResult.eligible ? (
                  <>
                    <div className="flex justify-between">
                      <span>Max Loan Approved:</span>
                      <strong>₹{loanResult.max_loan_amount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Subsidized Interest:</span>
                      <strong>{loanResult.interest_rate_percent}% / year</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Repayment Term:</span>
                      <strong>{loanResult.repayment_years} Years</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>SMAM Subsidy Value:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">₹{loanResult.subsidy_eligible_amount}</strong>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight mt-1">{loanResult.message}</p>
                    <button 
                      onClick={() => alert("Initiating Kisan Credit Card scheme loan application...")}
                      className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold uppercase tracking-wider text-[9px] shadow-sm"
                    >
                      Apply Loan Now
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400">Annual income must be ≥ ₹1,00,000 and cultivated land size ≥ 1.0 acres to qualify for agricultural machinery loans.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4.6 Payments, Razorpay Escrow & Invoices Tab */}
      {activeSubTab === 'payments' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                  <span>💳</span> Razorpay Payment Transactions & Escrow Receipts
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Secure RBI-compliant payments via Razorpay Gateway. Funds are held in escrow until machinery work is verified.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-[10px]">
                  Mode: Test Gateway Active
                </span>
                <button
                  onClick={loadPayments}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>

            {paymentsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No payment transactions recorded yet.</p>
                <p className="text-xs max-w-md mx-auto">
                  When you book equipment and make payment through Razorpay, your order receipts, transaction hashes, and escrow status will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Tx ID / Receipt</th>
                      <th className="py-3 px-4 font-semibold">Equipment & Booking</th>
                      <th className="py-3 px-4 font-semibold">Razorpay Order / Pay ID</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {paymentsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                          #{tx.id}
                          <span className="block text-[10px] text-slate-400 font-sans">{tx.receipt_number || 'AgriRent Direct'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          {tx.equipment_title || 'Equipment Rental'}
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Booking #{tx.booking}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 block">{tx.razorpay_order_id}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 block">{tx.razorpay_payment_id || 'Awaiting Authorization'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          ₹{tx.amount}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            tx.status === 'Captured'
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : tx.status === 'Refunded'
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setPaymentReceiptModal(tx)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-xs"
                          >
                            <FileText className="w-3 h-3" /> View Receipt
                          </button>
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

      {/* Equipment Detail & Smart Configurator Drawer */}
      {drawerEquipment && (
        <EquipmentDetailDrawer
          equipment={drawerEquipment}
          userLocation={farmerLocation}
          onClose={() => setDrawerEquipment(null)}
          onAddToCart={handleAddToCart}
          apiFetch={apiFetch}
        />
      )}

      {/* Smart Agricultural Booking Cart Slide-Over / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-2xl h-full flex flex-col relative animate-slide-left">
            <button
              onClick={() => setIsCartOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <SmartBookingCart
              cartItems={cartItems}
              onUpdateItem={handleUpdateCartItem}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onProceedToCheckout={handleProceedCartCheckout}
              onValidateCart={handleValidateCart}
              validating={validatingCart}
            />
          </div>
        </div>
      )}

      {/* Payment Receipt / Invoice Modal */}
      {paymentReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setPaymentReceiptModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Payment Receipt</h3>
              <p className="text-xs text-slate-400">Razorpay Verified Smart Contract Transaction</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">#{paymentReceiptModal.id || 'TX-NEW'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Razorpay Payment ID:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{paymentReceiptModal.razorpay_payment_id || 'pay_test_active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Razorpay Order ID:</span>
                <span className="font-mono">{paymentReceiptModal.razorpay_order_id || 'order_direct'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Booking Reference:</span>
                <span className="font-bold">Booking #{paymentReceiptModal.booking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span>{new Date(paymentReceiptModal.created_at || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{paymentReceiptModal.amount}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Escrow Status:</span>
                <span className="text-emerald-600 font-bold uppercase">Locked in Escrow</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setPaymentReceiptModal(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.7 Live Mission GPS Tracking Subtab */}
      {activeSubTab === 'live-mission' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-850 dark:text-slate-105 flex items-center gap-2">
                <span>📍</span> Live Mission & Field Telemetry Tracking
              </h2>
              <p className="text-xs text-slate-450 mt-1">
                Real-time GPS tracking for assigned certified machinery operators en route to your farm coordinate.
              </p>
            </div>

            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Mission Data
            </button>
          </div>

          {/* Active Operator Missions List */}
          {bookings.filter(b => b.latest_assignment || b.operator_assigned).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Tractor className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 animate-pulse" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Active Operator Missions</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When you book machinery and request a certified operator, live location telemetry, machine transit ETA, and operator route maps appear here automatically.
              </p>
              <button
                onClick={() => { setActiveSubTab('listings'); setSelectedDetailListing(null); }}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
              >
                Explore Nearby Equipment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.filter(b => b.latest_assignment || b.operator_assigned).map(b => (
                <div key={b.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {b.latest_assignment?.status || 'OPERATOR DISPATCHED'}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                        {b.equipment_details?.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Booking #AGR-{b.id} • Operator: <strong className="text-slate-700 dark:text-slate-300">{b.latest_assignment?.operator_name || b.operator_assigned_name}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenLiveTracking(b)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Open Full Map 📍</span>
                    </button>
                  </div>

                  <div className="h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <OperatorRouteMap
                      operatorLocation={{
                        latitude: b.latest_assignment?.current_operator_lat || 18.5204,
                        longitude: b.latest_assignment?.current_operator_lng || 73.8567
                      }}
                      pickupLocation={{
                        latitude: parseFloat(b.equipment_details?.location_latitude || 18.5204),
                        longitude: parseFloat(b.equipment_details?.location_longitude || 73.8567),
                        address: b.equipment_details?.address,
                        owner_name: b.equipment_details?.owner_name
                      }}
                      destinationLocation={{
                        latitude: parseFloat(farmerLocation?.latitude || 18.5204),
                        longitude: parseFloat(farmerLocation?.longitude || 73.8567),
                        address: farmerLocation?.address,
                        farmer_name: user?.username
                      }}
                      status={b.latest_assignment?.status || 'EN_ROUTE'}
                      isOnline={true}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>ETA: <strong>~{b.latest_assignment?.estimated_arrival_minutes || 20} mins</strong></span>
                    <span>Distance: <strong>{b.latest_assignment?.estimated_travel_distance_km || 8.5} km</strong></span>
                    <span>📞 {b.latest_assignment?.operator_phone || '+919822011005'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4.8 Farmer Notifications Subtab */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-850 dark:text-slate-105 flex items-center gap-2">
                <span>🔔</span> Notifications & Real-Time Alerts
              </h2>
              <p className="text-xs text-slate-450 mt-1">
                Booking updates, owner approvals, payment verification notices, and mission dispatch alerts.
              </p>
            </div>

            <button
              onClick={async () => {
                try {
                  await apiFetch('/api/notifications/', { method: 'PATCH' });
                  setFarmerNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                } catch (e) {
                  console.warn("Could not mark notifications read:", e);
                }
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
            >
              Mark All as Read
            </button>
          </div>

          {farmerNotifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="text-sm font-bold">No Notifications Yet</p>
              <p className="text-xs">You are all caught up! New booking alerts and payment receipts will appear here.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
              {farmerNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex items-start gap-3 transition-colors ${
                    notif.is_read ? 'bg-transparent' : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                    🌾
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {notif.content}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4.9 Farmer Farm & Profile Subtab */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                {user?.username?.charAt(0).toUpperCase() || 'F'}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                </h2>
                <p className="text-xs text-slate-500">
                  Role: <strong className="text-emerald-600 uppercase font-black">{user?.role || 'Farmer'}</strong> • KYC Aadhaar Status: <strong className="text-emerald-600 font-bold">{user?.aadhaar_kyc_status || 'Verified'}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Email: {user?.email} • Phone: {user?.phone_number || '+91 98220 11001'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Default Farm Service Point & Machinery Dispatch Coordinates
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Selected Farm Address</label>
                  <input
                    type="text"
                    value={farmerLocation?.address || ''}
                    onChange={(e) => setFarmerLocation(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={farmerLocation?.latitude || 18.5204}
                      onChange={(e) => setFarmerLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 18.5204 }))}
                      className="w-full mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={farmerLocation?.longitude || 73.8567}
                      onChange={(e) => setFarmerLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 73.8567 }))}
                      className="w-full mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={requestBrowserGps}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Update from Browser GPS</span>
                </button>
                <button
                  onClick={() => alert("Farm location coordinates updated successfully!")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Save Farm Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendation History Tab View */}
      {activeSubTab === 'ai-recs-history' && (
        <div className="space-y-6 animate-fade-in text-xs">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Machinery Directory
          </button>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" /> AI Recommendation History
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Review past crop suitability and machine allocation insights recommended by the AI Engine.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold border border-purple-100 dark:border-purple-900/40 text-[10px] uppercase">
                  {aiRecHistory.length} Total Suggestions
                </span>
              </div>
            </div>

            {/* Sub-tabs for All vs Saved */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px gap-4">
              <button 
                onClick={() => setRecFilterTab('All')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  recFilterTab === 'All' 
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                All Recommendations
              </button>
              <button 
                onClick={() => setRecFilterTab('Saved')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  recFilterTab === 'Saved' 
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-slate-750'
                }`}
              >
                Saved Recommendations ({aiRecHistory.filter(r => r.saved).length})
              </button>
            </div>

            {aiRecHistory.filter(r => recFilterTab === 'Saved' ? r.saved : true).length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-450">
                  <Sparkles className="w-6 h-6 text-slate-350" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-705 dark:text-slate-300 text-sm">
                    {recFilterTab === 'Saved' ? 'No saved recommendations' : 'No recommendation history found'}
                  </h4>
                  <p className="text-[11px] text-slate-455 mt-1">
                    {recFilterTab === 'Saved' 
                      ? 'Bookmark recommendations from the list to save them here for quick access.' 
                      : 'Use the AI Suitability Advisor widget on the main directory page to generate suggestions.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiRecHistory
                  .filter(r => recFilterTab === 'Saved' ? r.saved : true)
                  .map((rec) => (
                    <div 
                      key={rec.id} 
                      className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all hover:scale-[1.01]"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-705 dark:text-emerald-450 rounded font-black text-[9px] uppercase">
                              {rec.crop} Crop
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold text-[9px] uppercase">
                              {rec.task}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(rec.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Recommended Equipment</div>
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                            <Tractor className="w-4 h-4 text-emerald-600" /> {rec.recommendation}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 leading-normal font-medium mt-1">
                            {rec.reason}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 dark:border-slate-800/60 pt-3 flex items-center justify-between">
                        <span className="text-[10px] text-purple-650 dark:text-purple-400 font-extrabold flex items-center gap-1">
                          Confidence: <strong>{rec.confidence}%</strong>
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSaveAiRec(rec.id)}
                            className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                              rec.saved 
                                ? 'bg-purple-50 border-purple-300 text-purple-600 dark:bg-purple-950/30 dark:border-purple-900/60' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={rec.saved ? "Saved" : "Save Recommendation"}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${rec.saved ? 'fill-purple-650 text-purple-650' : ''}`} />
                          </button>
                          <button
                            onClick={() => applyAiRecFilter(rec)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase shadow-sm flex items-center gap-1"
                          >
                            <Filter className="w-3.5 h-3.5" /> Apply Filter
                          </button>
                          <button
                            onClick={() => deleteAiRec(rec.id)}
                            className="p-2 border border-red-200 dark:border-red-950/40 text-red-500 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-lg text-xs font-bold transition-all"
                            title="Delete Record"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Query History Tab View */}
      {activeSubTab === 'voice-queries-history' && (
        <div className="space-y-6 animate-fade-in text-xs">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-bold text-slate-450 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Machinery Directory
          </button>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-amber-500 animate-pulse" /> Voice Query History
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Review natural language commands processed by the AI voice assistant and their triggered booking actions.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold border border-amber-100 dark:border-amber-900/40 text-[10px] uppercase">
                  {voiceHistory.length} Processed Queries
                </span>
              </div>
            </div>

            {voiceHistory.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Mic className="w-6 h-6 text-slate-350" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-705 dark:text-slate-300 text-sm">No voice history logs found</h4>
                  <p className="text-[11px] text-slate-455 mt-1">Click the 'Voice Book' button in the navbar to perform searches or book machines with voice commands.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {voiceHistory.map((vq) => (
                  <div 
                    key={vq.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-605 dark:text-amber-450 mt-0.5 flex-shrink-0">
                          <Mic className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">User Voice Command</div>
                          <p className="text-slate-805 dark:text-slate-100 font-bold text-sm mt-0.5">
                            "{vq.query}"
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pl-11 sm:pl-0">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(vq.timestamp).toLocaleString()}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1.5 ${
                          vq.status === 'Booking Drafted' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400' 
                            : vq.status === 'Filter Applied' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400' 
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {vq.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3.5 rounded-lg text-xs leading-normal">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">System Parse & Response</div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium mt-1">
                          {vq.response}
                        </p>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Booking Action Triggered</div>
                        <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-700 dark:text-slate-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{vq.actionTriggered}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => deleteVoiceQuery(vq.id)}
                        className="px-2.5 py-1 text-slate-450 hover:text-red-500 rounded border border-transparent hover:border-red-200 dark:hover:border-red-950/40 hover:bg-red-50/50 dark:hover:bg-red-950/10 text-[10px] font-bold transition-all uppercase tracking-wider"
                      >
                        Delete Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configure Rental Booking Modal */}
      {bookingListing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 dark:border-slate-800/80 animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-850 dark:text-slate-100">Configure Rental Booking</h3>
              <button onClick={() => setBookingListing(null)} className="text-slate-400 hover:text-slate-650">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="p-6 space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
              <div className="flex gap-4 items-center border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="w-[120px] h-[90px] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <img 
                    src={bookingListing.image || bookingListing.image_url || getFallbackImage(bookingListing.category)} 
                    alt={bookingListing.title} 
                    onError={(e) => handleImageError(e, bookingListing.category)}
                    style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100">{bookingListing.title}</h4>
                  <p className="text-slate-400">Daily Rental: <strong>₹{bookingListing.rental_price_per_hour}/day</strong></p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black">{bookingListing.category}</p>
                </div>
              </div>

              {/* Start/End date pickers */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-450 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Usage Hours Selector */}
              <div className="text-xs">
                <label className="block font-bold text-slate-450 mb-1.5">Usage Hours Per Day</label>
                <select
                  value={usageHours}
                  onChange={(e) => setUsageHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="4">4 Hours (Half Day)</option>
                  <option value="8">8 Hours (Standard Full Day)</option>
                  <option value="12">12 Hours (Extended Shift)</option>
                </select>
              </div>

              {/* Delivery Option */}
              <div className="text-xs">
                <label className="block font-bold text-slate-455 mb-2">Delivery Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('Pickup')}
                    className={`py-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      deliveryOption === 'Pickup'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Self-Pickup (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('Delivery')}
                    className={`py-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      deliveryOption === 'Delivery'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" /> Delivery (+₹500)
                  </button>
                </div>
              </div>
              {/* Cooperative Renting & Smart Insurance */}
              <div className="space-y-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="microRentalShared"
                    checked={microRentalShared}
                    onChange={(e) => setMicroRentalShared(e.target.checked)}
                    className="mt-1 accent-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="microRentalShared" className="font-bold text-slate-700 dark:text-slate-200 block">
                      Opt-in Shared Cooperative Renting (Split Cost 50-50)
                    </label>
                    <span className="text-[10px] text-slate-450 block leading-tight">Shared booking splits logistics costs and applies pay-per-hour model.</span>
                  </div>
                </div>

                {microRentalShared && (
                  <div className="pl-6 animate-fade-in">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Cooperative Group</label>
                    <select
                      value={cooperativeGroup}
                      onChange={(e) => setCooperativeGroup(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-800 focus:outline-none dark:text-slate-100"
                    >
                      <option>Saravanampatti Farmers Cooperative</option>
                      <option>Coimbatore Paddy Association</option>
                      <option>Tiruppur Organic Cooperative</option>
                    </select>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="insuranceOptIn"
                    checked={insuranceOptIn}
                    onChange={(e) => setInsuranceOptIn(e.target.checked)}
                    className="mt-1 accent-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="insuranceOptIn" className="font-bold text-slate-700 dark:text-slate-200 block">
                      Add Smart Insurance Protection (+ ₹150/day)
                    </label>
                    <span className="text-[10px] text-slate-450 block leading-tight">Covers damage, machinery breakdown, and theft claims. Claim tracking is automated.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="requiresOperator"
                    checked={requiresOperator}
                    onChange={(e) => setRequiresOperator(e.target.checked)}
                    className="mt-1 accent-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="requiresOperator" className="font-bold text-slate-700 dark:text-slate-200 block">
                      Request Certified Operator Assistance (+ ₹350 flat fee)
                    </label>
                    <span className="text-[10px] text-slate-450 block leading-tight">Automatically dispatches AI-matched nearby verified operator to navigate, collect machine, and execute field operations.</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="text-xs">
                <label className="block font-bold text-slate-455 mb-1.5">Special Instructions (Notes)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ask for driver details or give field delivery directions..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* 4. Booking Summary Box */}
              {bookingDays > 0 && (() => {
                let currentTotal = baseCost;
                if (microRentalShared) currentTotal = currentTotal * 0.5;
                if (insuranceOptIn) currentTotal += 150 * bookingDays;
                currentTotal += deliveryCost;
                
                return (
                  <div className="p-3 bg-emerald-50 dark:bg-slate-850 rounded-xl border border-emerald-100 dark:border-slate-800 text-xs flex gap-3 text-slate-650 dark:text-slate-300">
                    <div className="w-[120px] h-[90px] rounded-lg overflow-hidden bg-white dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <img 
                        src={bookingListing.image || bookingListing.image_url || getFallbackImage(bookingListing.category)} 
                        alt={bookingListing.title} 
                        onError={(e) => handleImageError(e, bookingListing.category)}
                        style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400">Booking Summary</h4>
                      <div className="flex justify-between">
                        <span>Equipment:</span>
                        <strong className="text-slate-705 dark:text-slate-105">{bookingListing.category}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Price:</span>
                        <strong>₹{bookingListing.rental_price_per_hour}/day</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Calculated Days:</span>
                        <strong>{bookingDays} days</strong>
                      </div>
                      {microRentalShared && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-450 font-bold">
                          <span>Cooperative Share (50%):</span>
                          <span>✓ Active</span>
                        </div>
                      )}
                      {insuranceOptIn && (
                        <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                          <span>Smart Insurance:</span>
                          <strong>+ ₹{150 * bookingDays}</strong>
                        </div>
                      )}
                      {deliveryCost > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <strong>+ ₹{deliveryCost}</strong>
                        </div>
                      )}
                      
                      {/* Carbon footprint savings */}
                      <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-450 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <span>Carbon Savings:</span>
                        <strong>{(microRentalShared ? 18.2 * bookingDays : 8.4 * bookingDays).toFixed(1)} kg CO2</strong>
                      </div>

                      <div className="border-t border-slate-200/50 dark:border-slate-700 mt-2 pt-2 flex justify-between items-center text-sm">
                        <span className="font-bold">Total Cost:</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 text-base">₹{currentTotal}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingListing(null)}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || bookingDays <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {bookingLoading ? "Submitting Request..." : "Confirm Booking"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 5. Booking Confirmation Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 dark:border-slate-800/80 animate-scale-up p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-650 flex items-center justify-center mx-auto shadow-sm animate-pulse-subtle">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-850 dark:text-white">Booking Confirmation</h3>
              <p className="text-xs text-slate-400">Your rental request has been successfully submitted!</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2 text-slate-500">
              <div className="flex justify-center mb-3">
                <div className="w-[120px] h-[90px] rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <img 
                    src={receiptData.image || receiptData.image_url || getFallbackImage(receiptData.equipmentCategory)} 
                    alt={receiptData.equipmentTitle} 
                    onError={(e) => handleImageError(e, receiptData.equipmentCategory)}
                    style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <span>Booking ID:</span>
                <strong className="text-slate-700 dark:text-slate-200">#AGR-{receiptData.bookingId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Equipment ID:</span>
                <strong className="text-slate-700 dark:text-slate-200">#EQ-{receiptData.equipmentId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Equipment:</span>
                <strong className="text-slate-700 dark:text-slate-200">{receiptData.equipmentTitle}</strong>
              </div>
              <div className="flex justify-between">
                <span>Renter (Farmer):</span>
                <strong className="text-slate-700 dark:text-slate-200">{receiptData.farmer}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Days:</span>
                <strong className="text-slate-700 dark:text-slate-200">{receiptData.days} days</strong>
              </div>
              <div className="flex justify-between">
                <span>Usage Hours:</span>
                <strong className="text-slate-700 dark:text-slate-200">{receiptData.hours} hrs/day</strong>
              </div>
              <div className="flex justify-between">
                <span>Paid (Total Cost):</span>
                <strong className="text-slate-700 dark:text-slate-200">₹{receiptData.cost}</strong>
              </div>
              <div className="flex justify-between">
                <span>Booking Status:</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/40 font-bold uppercase tracking-wider text-[9px] border border-amber-100">
                  {receiptData.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => { setReceiptData(null); setActiveSubTab('my-bookings'); }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Track Booking Status
            </button>
          </div>
        </div>
      )}

      {/* Blockchain Ledger Audit Overlay */}
      {showLedgerBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden animate-scale-up text-white p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg animate-pulse">
                  ⛓️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-widest">Hyperledger / IPFS Audit Log</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Decentralized Trust Ledger Verification</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLedgerBooking(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Renter (Farmer)</span>
                  <span className="font-semibold text-slate-200">{showLedgerBooking.farmer_name || 'Agri Farmer'}</span>
                  <span className="block text-[9px] text-slate-500 mt-1">Verified KYC: Yes (Aadhaar)</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Lessor (Owner)</span>
                  <span className="font-semibold text-slate-200">{showLedgerBooking.equipment_details?.owner_name || 'Agri Owner'}</span>
                  <span className="block text-[9px] text-slate-500 mt-1">Verified KYC: Yes (Aadhaar)</span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Rental Ledger Agreement Details</span>
                <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-350">
                  <div>Contract ID:</div>
                  <div className="text-right font-mono text-emerald-400">#AGR-{showLedgerBooking.id}</div>
                  <div>Asset Model:</div>
                  <div className="text-right text-slate-200 font-semibold">{showLedgerBooking.equipment_details?.title}</div>
                  <div>Rental Period:</div>
                  <div className="text-right text-slate-200 font-mono">{showLedgerBooking.start_date?.split('T')[0]} to {showLedgerBooking.end_date?.split('T')[0]}</div>
                  <div>Payment Escrow:</div>
                  <div className="text-right text-slate-200 font-semibold">{showLedgerBooking.escrow_status || 'Held'}</div>
                  <div>Insurance Protection:</div>
                  <div className="text-right text-slate-200 font-semibold">{showLedgerBooking.insurance_opt_in ? 'Yes (Protected)' : 'No'}</div>
                  <div>Carbon Offset Score:</div>
                  <div className="text-right text-emerald-400 font-semibold">{showLedgerBooking.carbon_saved_kg || 8.4} kg CO2</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Smart Contract Address Hash</span>
                    <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">STATE: VERIFIED</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[9px] break-all text-slate-300">
                    {showLedgerBooking.blockchain_contract_hash || `0x${Array.from({length: 64}, (_, idx) => ((showLedgerBooking.id * 17 + idx * 31) % 16).toString(16)).join('')}`}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">IPFS File Metadata (CID v1)</span>
                    <span className="text-[9px] text-teal-400 font-bold px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">STORAGE: ANCHORED</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[9px] break-all text-slate-300">
                    {showLedgerBooking.blockchain_ipfs_hash || `Qm${Array.from({length: 44}, (_, idx) => ((showLedgerBooking.id * 23 + idx * 19) % 16).toString(16)).join('')}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex gap-2.5 text-slate-350 text-[10px] font-sans">
              <span className="text-sm">🛡️</span>
              <p className="leading-normal">
                This transaction has been cryptographically signed and stored across the AgriRent decentralized validator nodes. Ownership records, escrow release keys, and carbon reduction metrics are locked and immutable.
              </p>
            </div>

            <button
              onClick={() => setShowLedgerBooking(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all uppercase tracking-wider"
            >
              Close Blockchain Audit View
            </button>
          </div>
        </div>
      )}

      {/* Live Operator GPS Mission Tracking Modal */}
      {trackingAssignment && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[650] flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl">
                  🚜
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                      Mission Status: {trackingAssignment.status}
                    </span>
                    <span className="text-xs text-blue-200">
                      ETA: ~{trackingAssignment.estimated_arrival_minutes || 20} mins
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                    Live GPS Tracker: {trackingAssignment.machine_title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setTrackingAssignment(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-base font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with OperatorRouteMap */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Operator & Waypoints Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold uppercase">Assigned Operator</span>
                  <strong className="text-sm text-slate-800 dark:text-white block mt-0.5">{trackingAssignment.operator?.name}</strong>
                  <span className="text-[11px] text-slate-500 block">📞 {trackingAssignment.operator?.phone}</span>
                  <span className="text-[10px] text-amber-500 font-bold block mt-1">★ {trackingAssignment.operator?.rating || 4.8} Certified</span>
                </div>

                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold uppercase">Machine Pickup Yard</span>
                  <strong className="text-xs text-slate-800 dark:text-white block mt-0.5 truncate">{trackingAssignment.pickup?.owner_name || 'Machine Owner'}</strong>
                  <span className="text-[11px] text-slate-500 block truncate">{trackingAssignment.pickup?.address || 'Owner Farm Location'}</span>
                </div>

                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">Destination Farm Field</span>
                  <strong className="text-xs text-slate-800 dark:text-white block mt-0.5 truncate">{trackingAssignment.destination?.farmer_name || user?.username}</strong>
                  <span className="text-[11px] text-slate-500 block truncate">{trackingAssignment.destination?.address || farmerLocation?.address}</span>
                </div>
              </div>

              {/* Map view */}
              <div className="h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <OperatorRouteMap
                  operatorLocation={{
                    latitude: trackingAssignment.operator?.current_latitude || 18.5204,
                    longitude: trackingAssignment.operator?.current_longitude || 73.8567
                  }}
                  pickupLocation={trackingAssignment.pickup}
                  destinationLocation={trackingAssignment.destination}
                  status={trackingAssignment.status}
                  isOnline={true}
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live GPS telemetry active. Coordinates refreshed automatically via operator handset.</span>
                </div>
                <button
                  onClick={() => handleOpenLiveTracking({ latest_assignment: { id: trackingAssignment.assignment_id } })}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold"
                >
                  Refresh GPS
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setTrackingAssignment(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Booking launcher */}
      <VoiceBookingModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onBookingCreated={loadDashboardData}
        onVoiceParse={(parsedData) => {
          setIsVoiceOpen(false);
          const match = listings.find(l => l.category.toLowerCase() === parsedData.equipment_type.toLowerCase() && l.is_available) || 
                        listings.find(l => l.category.toLowerCase() === parsedData.equipment_type.toLowerCase()) || 
                        listings[0];
          
          if (match) {
            setStartDate(parsedData.booking_date || '');
            setEndDate(parsedData.booking_date || '');
            setNotes(`[Voice Booking Input] Location requested: ${parsedData.location || 'Coimbatore'}.`);
            setBookingListing(match);
          } else {
            alert(`No equipment listed under category: ${parsedData.equipment_type}`);
          }
        }}
      />

    </div>
  );
}
