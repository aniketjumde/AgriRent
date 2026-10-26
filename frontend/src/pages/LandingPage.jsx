import React, { useState, useEffect } from 'react';
import { Tractor, Sprout, Bot, ShieldCheck, ArrowRight, Star, Sparkles, Mic, MapPin, Search, Compass, RefreshCw, CheckCircle2, Clock, PhoneCall, HelpCircle, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import VoiceBookingModal from '../components/VoiceBookingModal';

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

// Resilient guest fallback data
const GUEST_FALLBACK_LISTINGS = [
  {
    id: 1,
    title: "John Deere 5050D Tractor",
    category: "Tractor",
    description: "50 HP heavy-duty tractor, ideal for tilling, ploughing, and heavy carting.",
    rental_price_per_hour: 1500.00,
    location_latitude: 11.0168,
    location_longitude: 76.9558,
    address: "Coimbatore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 2,
    title: "Mahindra Arjun Novo 605 Tractor",
    category: "Tractor",
    description: "57 HP advanced tractor with precision hydraulics. Ideal for heavy load cultivation.",
    rental_price_per_hour: 1600.00,
    location_latitude: 11.3410,
    location_longitude: 77.7172,
    address: "Erode, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 3,
    title: "Kubota MU4501 Tractor",
    category: "Tractor",
    description: "45 HP Japanese technology engine, environment friendly, low noise level and highly durable.",
    rental_price_per_hour: 1400.00,
    location_latitude: 11.6643,
    location_longitude: 78.1460,
    address: "Salem, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 4,
    title: "Sonalika Tiger 50 Tractor",
    category: "Tractor",
    description: "52 HP European-designed tractor with spacious operator platform and high torque.",
    rental_price_per_hour: 1450.00,
    location_latitude: 11.2189,
    location_longitude: 78.1672,
    address: "Namakkal, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 5,
    title: "Swaraj 744 XT Tractor",
    category: "Tractor",
    description: "48 HP robust tractor, legendary Swaraj design, extremely durable for multi-crop utility.",
    rental_price_per_hour: 1350.00,
    location_latitude: 11.1085,
    location_longitude: 77.3411,
    address: "Tiruppur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 6,
    title: "New Holland 3630 TX Tractor",
    category: "Tractor",
    description: "55 HP powerful tractor with double clutch, perfect for deep ploughing and harvesting auxiliary.",
    rental_price_per_hour: 1550.00,
    location_latitude: 10.9601,
    location_longitude: 78.0766,
    address: "Karur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 7,
    title: "TAFE 5900 DI Tractor",
    category: "Tractor",
    description: "56 HP tractor, built for long-duration operation and heavy trailer haulage in rural farms.",
    rental_price_per_hour: 1500.00,
    location_latitude: 11.7480,
    location_longitude: 79.7714,
    address: "Cuddalore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 8,
    title: "VST Shakti MT270 Tractor",
    category: "Tractor",
    description: "27 HP compact mini tractor, ideal for orchards, vineyard inter-cultivation, and small fields.",
    rental_price_per_hour: 950.00,
    location_latitude: 11.9398,
    location_longitude: 79.4897,
    address: "Villupuram, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 9,
    title: "Kubota Harvester DC-68G",
    category: "Harvester",
    description: "Premium combine harvester, Japanese engineered for smooth rice and grain cutting.",
    rental_price_per_hour: 2200.00,
    location_latitude: 11.0168,
    location_longitude: 76.9558,
    address: "Coimbatore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 10,
    title: "John Deere W70 Harvester",
    category: "Harvester",
    description: "Multi-crop combine harvester with self-propelled drive, high grain purity, and minimal losses.",
    rental_price_per_hour: 2400.00,
    location_latitude: 11.3410,
    location_longitude: 77.7172,
    address: "Erode, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 11,
    title: "Mahindra Arjun Combine Harvester",
    category: "Harvester",
    description: "Highly durable field harvester for wheat, paddy, and soy crops, low operating costs.",
    rental_price_per_hour: 2300.00,
    location_latitude: 11.6643,
    location_longitude: 78.1460,
    address: "Salem, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 12,
    title: "Sonalika Challenger Harvester",
    category: "Harvester",
    description: "Engineered for high moisture crops, equipped with large straw walkers for grain separation.",
    rental_price_per_hour: 2150.00,
    location_latitude: 11.2189,
    location_longitude: 78.1672,
    address: "Namakkal, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 13,
    title: "New Holland TC5.30 Harvester",
    category: "Harvester",
    description: "5-walker combine harvester with rotary separator technology, maximum harvest efficiency.",
    rental_price_per_hour: 2500.00,
    location_latitude: 11.1085,
    location_longitude: 77.3411,
    address: "Tiruppur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 14,
    title: "Sonalika Rotavator 6 Feet",
    category: "Rotavator",
    description: "Heavy duty tilling rotavator, prepares seedbeds in a single pass with multi-speed gearboxes.",
    rental_price_per_hour: 900.00,
    location_latitude: 11.0168,
    location_longitude: 76.9558,
    address: "Coimbatore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 15,
    title: "Mahindra Gyrovator ZXX",
    category: "Rotavator",
    description: "Sturdy rotary tiller for secondary soil tillage, breaks up tough soil clods efficiently.",
    rental_price_per_hour: 850.00,
    location_latitude: 11.3410,
    location_longitude: 77.7172,
    address: "Erode, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 16,
    title: "Swaraj Gyrovator SLX",
    category: "Rotavator",
    description: "Specially designed for wet puddling and dry land operations in medium to heavy soils.",
    rental_price_per_hour: 880.00,
    location_latitude: 11.6643,
    location_longitude: 78.1460,
    address: "Salem, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 17,
    title: "Kubota Rotary Tiller",
    category: "Rotavator",
    description: "Japanese standard tiller, operates smoothly behind 40-55 HP tractors, long-lasting blades.",
    rental_price_per_hour: 950.00,
    location_latitude: 11.2189,
    location_longitude: 78.1672,
    address: "Namakkal, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 18,
    title: "Mahindra Seeder Machine",
    category: "Seeder",
    description: "Automatic seed drilling machine. Ensures uniform sowing depth and optimal crop yield.",
    rental_price_per_hour: 750.00,
    location_latitude: 11.1085,
    location_longitude: 77.3411,
    address: "Tiruppur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 19,
    title: "John Deere Seed Drill",
    category: "Seeder",
    description: "Precision mechanical seed drill, handles multiple grain sizes with automatic soil covers.",
    rental_price_per_hour: 800.00,
    location_latitude: 10.9601,
    location_longitude: 78.0766,
    address: "Karur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 20,
    title: "Sonalika Super Seeder",
    category: "Seeder",
    description: "Super seeder for paddy residue management and direct wheat sowing in one single operation.",
    rental_price_per_hour: 850.00,
    location_latitude: 11.7480,
    location_longitude: 79.7714,
    address: "Cuddalore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 21,
    title: "Swaraj Pneumatic Planter",
    category: "Seeder",
    description: "Vacuum-based precision planter for maize, cotton, and oilseeds, guarantees seed spacing.",
    rental_price_per_hour: 900.00,
    location_latitude: 11.9398,
    location_longitude: 79.4897,
    address: "Villupuram, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 22,
    title: "Stihl Power Sprayer SG-20",
    category: "Sprayer",
    description: "Backpack motor sprayer for quick pesticide and liquid fertilizer spraying.",
    rental_price_per_hour: 350.00,
    location_latitude: 11.6643,
    location_longitude: 78.1460,
    address: "Salem, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 23,
    title: "Mahindra Tractor Mounted Sprayer",
    category: "Sprayer",
    description: "Tractor PTO-driven sprayer with 400-litre tank capacity, ideal for cotton and sugarcane.",
    rental_price_per_hour: 550.00,
    location_latitude: 11.0168,
    location_longitude: 76.9558,
    address: "Coimbatore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 24,
    title: "VST Shakti Orchard Sprayer",
    category: "Sprayer",
    description: "Compact crop sprayer, designed for narrow orchards, vineyards, and plantations.",
    rental_price_per_hour: 450.00,
    location_latitude: 11.3410,
    location_longitude: 77.7172,
    address: "Erode, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 25,
    title: "Escorts Power Sprayer",
    category: "Sprayer",
    description: "2-stroke engine high-pressure sprayer, adjustable nozzle and extended spray range.",
    rental_price_per_hour: 380.00,
    location_latitude: 11.6643,
    location_longitude: 78.1460,
    address: "Salem, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 26,
    title: "Sonalika Crop Shield Boom Sprayer",
    category: "Crop Protection Equipment",
    description: "Hydraulic boom sprayer with drift-free nozzles for wide coverage chemical application.",
    rental_price_per_hour: 600.00,
    location_latitude: 11.2189,
    location_longitude: 78.1672,
    address: "Namakkal, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 27,
    title: "Mahindra Crop Protection Blower",
    category: "Crop Protection Equipment",
    description: "High velocity dusting blower for powder fungicides, designed for vineyards and tall crops.",
    rental_price_per_hour: 580.00,
    location_latitude: 11.1085,
    location_longitude: 77.3411,
    address: "Tiruppur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 28,
    title: "Kubota Insecticide Sprayer",
    category: "Crop Protection Equipment",
    description: "Quiet motor sprayer, ultra-low volume nozzle technology for pest eradication.",
    rental_price_per_hour: 550.00,
    location_latitude: 10.9601,
    location_longitude: 78.0766,
    address: "Karur, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 29,
    title: "New Holland Crop Protection Shield",
    category: "Crop Protection Equipment",
    description: "Semi-automatic duster, optimized for biological pest control distributions.",
    rental_price_per_hour: 650.00,
    location_latitude: 11.7480,
    location_longitude: 79.7714,
    address: "Cuddalore, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  },
  {
    id: 30,
    title: "TAFE Crop Safeguard Duster",
    category: "Crop Protection Equipment",
    description: "High output mist blower with ergonomic backpack straps, ideal for hilly turmeric farms.",
    rental_price_per_hour: 480.00,
    location_latitude: 11.9398,
    location_longitude: 79.4897,
    address: "Villupuram, Tamil Nadu",
    image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    is_available: true,
    is_verified: true
  }
];

export default function LandingPage({ onNavigate }) {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const { apiFetch, token } = useAuth();

  const [listings, setListings] = useState(GUEST_FALLBACK_LISTINGS);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Voice Modal launcher
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // AI Recommendation Engine
  const [crop, setCrop] = useState('Paddy');
  const [size, setSize] = useState(5.0);
  const [task, setTask] = useState('Harvesting');
  const [recResult, setRecResult] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // AI Price Predictor
  const [priceCategory, setPriceCategory] = useState('Tractor');
  const [priceDemand, setPriceDemand] = useState('Medium');
  const [priceSeason, setPriceSeason] = useState('Harvesting');
  const [priceResult, setPriceResult] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Dynamic Landing Page Farm Pin / Geo Location
  const [previewLocation, setPreviewLocation] = useState({
    latitude: 18.5204,
    longitude: 73.8567,
    address: "Pune Agricultural Market Hub, Maharashtra"
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPreviewLocation({
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
            address: "Your Detected Field Location"
          });
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch active listings on page load
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await apiFetch('/api/equipment/');
        if (data && data.length > 0) {
          setListings(data);
        }
      } catch (err) {
        console.warn("Could not fetch active listings, utilizing high-fidelity guest fallbacks:", err.message);
        setListings(GUEST_FALLBACK_LISTINGS);
      }
    };
    fetchListings();
  }, []);

  // Filter listings by category
  const filteredListings = listings.filter(item => {
    return selectedCategory ? item.category === selectedCategory : true;
  });

  // Client-Side AI Suitability Fallback
  const calculateLocalRecommendation = (cropType, landSize, taskType) => {
    const database = {
      Paddy: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 2000, hours: 1.5 },
      Wheat: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 1800, hours: 1.2 },
      Sugarcane: { Harvesting: "Other Agricultural Machinery", Sowing: "Seeder", Tilling: "Tractor", Spraying: "Sprayer", price: 2500, hours: 2.5 },
      Cotton: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 2200, hours: 1.8 },
      Maize: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 1750, hours: 1.5 },
      Vegetables: { Harvesting: "Other Agricultural Machinery", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 950, hours: 1.0 }
    };

    const mapping = database[cropType] || database["Paddy"];
    const equipment = mapping[taskType] || "Tractor";
    const baseHours = mapping.hours || 1.5;
    const basePrice = mapping.price || 800;

    const totalHours = Math.max(1, baseHours * landSize);
    const cost = Math.round(totalHours * basePrice);

    return {
      recommended_category: equipment,
      confidence_score: 0.92,
      estimated_hours: totalHours,
      estimated_rental_cost: cost
    };
  };

  const handleRecommendationSubmit = async (e) => {
    e.preventDefault();
    setRecLoading(true);
    setRecResult(null);

    // Call API, fallback to client-side math if server is offline
    try {
      if (token) {
        const res = await apiFetch('/api/ai/recommend/', {
          method: 'POST',
          body: JSON.stringify({ crop_type: crop, land_size: size, task_type: task })
        });
        setRecResult(res);
      } else {
        // Run client-side calculation directly for guest preview
        setTimeout(() => {
          const res = calculateLocalRecommendation(crop, size, task);
          setRecResult(res);
          setRecLoading(false);
        }, 800);
        return;
      }
    } catch (err) {
      console.warn("API recommended query failed, running client-side predictor:", err.message);
      const res = calculateLocalRecommendation(crop, size, task);
      setRecResult(res);
    } finally {
      setRecLoading(false);
    }
  };

  // Client-Side AI Price Predictor Fallback
  const calculateLocalPricePrediction = (category, demand, season) => {
    const baseRates = {
      Tractor: 600,
      Harvester: 2000,
      Rotavator: 1000,
      Seeder: 800,
      Sprayer: 400,
      "Crop Protection Equipment": 450,
      "Other Agricultural Machinery": 1200
    };

    const base = baseRates[category] || 700;
    const demandMult = demand === 'High' ? 1.25 : demand === 'Low' ? 0.85 : 1.0;
    const seasonMult = season === 'Harvesting' ? 1.25 : season === 'Sowing' ? 1.15 : 0.85;

    const recommended = base * demandMult * seasonMult;
    return {
      min_price: Math.round(recommended * 0.85 / 10) * 10,
      recommended_price: Math.round(recommended / 10) * 10,
      max_price: Math.round(recommended * 1.20 / 10) * 10
    };
  };

  const handlePricePredictionSubmit = async (e) => {
    e.preventDefault();
    setPriceLoading(true);
    setPriceResult(null);

    try {
      if (token) {
        const res = await apiFetch('/api/ai/predict-price/', {
          method: 'POST',
          body: JSON.stringify({ equipment_type: priceCategory, demand: priceDemand, season: priceSeason })
        });
        setPriceResult(res);
      } else {
        setTimeout(() => {
          const res = calculateLocalPricePrediction(priceCategory, priceDemand, priceSeason);
          setPriceResult(res);
          setPriceLoading(false);
        }, 800);
        return;
      }
    } catch (err) {
      console.warn("API price prediction failed, running client-side price predictor:", err.message);
      const res = calculateLocalPricePrediction(priceCategory, priceDemand, priceSeason);
      setPriceResult(res);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleGuestBook = () => {
    alert("Welcome to AgriRent AI! Please Log In or Sign Up to book equipment.");
    onNavigate('login');
  };

  return (
    <div className="relative min-h-screen pb-16 font-sans">
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] -z-10 animate-pulse-subtle"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-amber-500/10 blur-[150px] -z-10"></div>

      {/* Brand Header Bar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Tractor className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-850 dark:text-white leading-none">AgriRent AI</h1>
            <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">Farm Equipment Rental</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => onNavigate('login')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs shadow-sm transition-all"
          >
            Log in
          </button>
          <button
            onClick={() => onNavigate('signup')}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all"
          >
            Create account
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-12 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200/50 dark:border-slate-800/80 bg-emerald-50/50 dark:bg-slate-900/40 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <Bot className="w-4 h-4 text-emerald-600" />
          Modern machinery sharing for farmers and tractor owners
        </div>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto text-slate-900 dark:text-white">
          Rent farm machinery near your field by the hour or day
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-350 max-w-2xl mx-auto leading-relaxed">
          Search available tractors, harvesters, and rotavators from verified owners nearby. Book on your schedule with transparent rates and optional certified operators.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="#interactive-demo"
            className="px-6 py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Search className="w-4 h-4" />
            Find equipment near you
          </a>
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="px-6 py-3 border border-slate-250 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-all"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
            Book with voice assistant
          </button>
        </div>

        {/* 3 Step Simple Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-8 text-left">
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs mb-2">1</div>
            <h3 className="font-bold text-xs text-slate-850 dark:text-white mb-1">Pick what you need</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Choose tractors, rotavators, or sprayers matching your crop acreage.</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs mb-2">2</div>
            <h3 className="font-bold text-xs text-slate-850 dark:text-white mb-1">Check live availability</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">View real machines nearby on the map with clear hourly rates and zero hidden charges.</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs mb-2">3</div>
            <h3 className="font-bold text-xs text-slate-850 dark:text-white mb-1">Delivered to field</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Get equipment delivered to your boundary or pick up directly with protected escrow payments.</p>
          </div>
        </div>
      </section>

      {/* Equipment Category Filter */}
      <section className="max-w-7xl mx-auto px-6 py-6 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Filter by machine type</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a category to narrow down available options</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredListings.length} {selectedCategory ? `${selectedCategory.toLowerCase()}s` : 'total machines'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All machines', value: '' },
            { label: 'Tractors', value: 'Tractor' },
            { label: 'Harvesters', value: 'Harvester' },
            { label: 'Rotavators', value: 'Rotavator' },
            { label: 'Seeders', value: 'Seeder' },
            { label: 'Sprayers', value: 'Sprayer' },
            { label: 'Crop protection', value: 'Crop Protection Equipment' }
          ].map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedCategory === cat.value
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Interactive Equipment Map Section */}
      <section id="interactive-demo" className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-600" />
              Available equipment near your farm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag your farm marker on the map to see equipment distance and live rates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified owner listings
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-[380px] min-h-[350px]">
            <MapComponent 
              listings={filteredListings}
              userLocation={previewLocation}
              onLocationChange={(newLoc) => setPreviewLocation(prev => ({ ...prev, ...newLoc }))}
              onBookClick={handleGuestBook}
              isDraggableFarm={true}
            />
          </div>

          <div className="lg:col-span-4 space-y-3.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
            {filteredListings.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs text-slate-500">No machinery found in this category.</p>
                <button 
                  onClick={() => setSelectedCategory('')}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                >
                  View all machines
                </button>
              </div>
            ) : (
              filteredListings.map(item => (
                <div key={item.id} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex gap-3 shadow-sm hover:shadow-md transition-all">
                  <div className="w-[110px] h-[85px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={item.image || item.image_url || getFallbackImage(item.category)} 
                      alt={item.title} 
                      onError={(e) => handleImageError(e, item.category)}
                      style={{ width: '110px', height: '85px', objectFit: 'cover' }}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1 flex-1 text-xs">
                    <h4 className="font-bold text-slate-850 dark:text-slate-100 leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.address || item.category}</p>
                    <div className="flex justify-between items-center pt-1.5">
                      <strong className="text-emerald-700 dark:text-emerald-400 text-xs">₹{item.rental_price_per_hour}/hr</strong>
                      <button 
                        onClick={handleGuestBook}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                      >
                        Book now
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* AI Assistant Tools Section */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Smart farming tools
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use these calculators to estimate which machine you need and what rental price to expect.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Tool 1: AI Equipment Recommendation */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                Find the right machine for your crop
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tell us your crop and field acreage, and we will suggest the most suitable machinery.
              </p>

              <form onSubmit={handleRecommendationSubmit} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Crop type</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
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
                    <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Field size (Acres)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={size}
                      onChange={(e) => setSize(parseFloat(e.target.value) || 1)}
                      className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Field task</label>
                    <select
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option>Harvesting</option>
                      <option>Tilling</option>
                      <option>Sowing</option>
                      <option>Spraying</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                >
                  {recLoading ? "Analyzing crop requirements..." : "Calculate recommendation"}
                </button>
              </form>
            </div>

            {recResult && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-slate-850/60 dark:border-slate-800 text-xs animate-fade-in text-slate-800 dark:text-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Recommended machinery
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold text-[11px]">
                    {Math.round(recResult.confidence_score * 100)}% match
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Recommended machine:</span>
                    <strong className="text-emerald-800 dark:text-emerald-400">{recResult.recommended_category}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Estimated field time:</span>
                    <strong>{recResult.estimated_hours} hours</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Estimated rental cost:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">₹{recResult.estimated_rental_cost}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tool 2: Rental Rate Estimator */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Estimate rental market rates
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Check prevailing hourly rental rates based on current season and village demand.
              </p>

              <form onSubmit={handlePricePredictionSubmit} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Equipment type</label>
                  <select
                    value={priceCategory}
                    onChange={(e) => setPriceCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
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
                    <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Local demand</label>
                    <select
                      value={priceDemand}
                      onChange={(e) => setPriceDemand(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-350 mb-1">Season</label>
                    <select
                      value={priceSeason}
                      onChange={(e) => setPriceSeason(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option>Sowing</option>
                      <option>Harvesting</option>
                      <option>Off-season</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={priceLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                >
                  {priceLoading ? "Calculating rate..." : "Check market rates"}
                </button>
              </form>
            </div>

            {priceResult && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-slate-850/60 dark:border-slate-800 text-xs animate-fade-in text-slate-800 dark:text-slate-200">
                <span className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Estimated rate per hour</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-400 mb-1">Lowest</span>
                    <strong className="text-slate-700 dark:text-slate-300">₹{priceResult.min_price}</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg shadow-sm border border-emerald-200 dark:border-slate-800">
                    <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mb-1">Average</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-black">₹{priceResult.recommended_price}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-400 mb-1">Peak</span>
                    <strong className="text-slate-700 dark:text-slate-300">₹{priceResult.max_price}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Trust & Guarantees Section */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-850 dark:text-white mb-1">Protected payments</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Rental money stays in secure escrow until field operation is verified and complete.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-850 dark:text-white mb-1">On-time delivery</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Track machine transit to your farm gate with live GPS coordinates and driver status.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-850 dark:text-white mb-1">Local support</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Assistance available in English, Tamil, and Hindi for booking and operator requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Booking Modal Launcher Frame */}
      <VoiceBookingModal 
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onBookingCreated={handleGuestBook}
      />

    </div>
  );
}
