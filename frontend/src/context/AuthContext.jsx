import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabaseBackend } from '../lib/supabaseBackend';

const AuthContext = createContext();

// Dynamically resolve API URL with Vercel / environment variable support
// When VITE_API_BASE_URL is provided, use it (stripped of trailing slash).
// In development, default to relative '/api' proxy or localhost:8000.
const BACKEND_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const getSafeStorageItem = (key, fallback = null) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    console.warn("Storage access restricted:", e);
    return fallback;
  }
};

const setSafeStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Storage writing restricted:", e);
  }
};

const removeSafeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Storage deletion restricted:", e);
  }
};

// --- CLIENT-SIDE MOCK DATABASE FAILOVER ---

const getMockDB = () => {
  let db = null;
  try {
    const dbStr = localStorage.getItem('agrirent_mock_db');
    if (dbStr) {
      db = JSON.parse(dbStr);
    }
  } catch (e) {
    console.error("Failed to read mock db:", e);
  }

  // Generate default mock users if not present
  const mockUsers = [
    { id: 1, username: 'farmer', role: 'Farmer', email: 'farmer@agrirent.com', phone_number: '+919876543211', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 2, username: 'owner', role: 'Owner', email: 'owner@agrirent.com', phone_number: '+919876543212', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 3, username: 'admin', role: 'Admin', email: 'admin@agrirent.com', phone_number: '+919876543210', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 4, username: 'operator', role: 'Operator', email: 'operator@agrirent.com', phone_number: '+919876543213', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
  ];

  for (let i = 1; i <= 20; i++) {
    mockUsers.push({
      id: 10 + i,
      username: `farmer${i}`,
      role: 'Farmer',
      email: `farmer${i}@agrirent.com`,
      phone_number: `+9198765432${10 + i}`,
      is_verified: true,
      otp_code: '123456',
      password: 'Demo@AgriRent2026'
    });
  }

  // Generate 10 Owners
  for (let i = 1; i <= 10; i++) {
    mockUsers.push({
      id: 30 + i,
      username: `owner${i}`,
      role: 'Owner',
      email: `owner${i}@agrirent.com`,
      phone_number: `+9198765433${10 + i}`,
      is_verified: true,
      otp_code: '123456',
      password: 'Demo@AgriRent2026'
    });
  }

  // 15 Pune Demo Accounts (5 Farmers, 5 Operators, 5 Owners)
  const puneDemoAccounts = [
    // Farmers
    { id: 11, username: 'farmer_suresh', role: 'Farmer', email: 'farmer.suresh@agrirent.demo', phone_number: '+919822011001', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 12, username: 'farmer_anita', role: 'Farmer', email: 'farmer.anita@agrirent.demo', phone_number: '+919822011002', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 13, username: 'farmer_vikram', role: 'Farmer', email: 'farmer.vikram@agrirent.demo', phone_number: '+919822011003', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 14, username: 'farmer_priya', role: 'Farmer', email: 'farmer.priya@agrirent.demo', phone_number: '+919822011004', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 15, username: 'farmer_ramesh', role: 'Farmer', email: 'farmer.ramesh@agrirent.demo', phone_number: '+919822011005', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    // Operators
    { id: 21, username: 'operator_rajesh', role: 'Operator', email: 'operator.rajesh@agrirent.demo', phone_number: '+919822022001', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 22, username: 'operator_sunil', role: 'Operator', email: 'operator.sunil@agrirent.demo', phone_number: '+919822022002', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 23, username: 'operator_amit', role: 'Operator', email: 'operator.amit@agrirent.demo', phone_number: '+919822022003', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 24, username: 'operator_ganesh', role: 'Operator', email: 'operator.ganesh@agrirent.demo', phone_number: '+919822022004', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 25, username: 'operator_sachin', role: 'Operator', email: 'operator.sachin@agrirent.demo', phone_number: '+919822022005', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    // Owners
    { id: 31, username: 'owner_balasaheb', role: 'Owner', email: 'owner.balasaheb@agrirent.demo', phone_number: '+919822033001', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 32, username: 'owner_kavita', role: 'Owner', email: 'owner.kavita@agrirent.demo', phone_number: '+919822033002', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 33, username: 'owner_dattatray', role: 'Owner', email: 'owner.dattatray@agrirent.demo', phone_number: '+919822033003', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 34, username: 'owner_meena', role: 'Owner', email: 'owner.meena@agrirent.demo', phone_number: '+919822033004', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' },
    { id: 35, username: 'owner_sanjay', role: 'Owner', email: 'owner.sanjay@agrirent.demo', phone_number: '+919822033005', is_verified: true, otp_code: '123456', password: 'Demo@AgriRent2026' }
  ];

  puneDemoAccounts.forEach(acc => {
    if (!mockUsers.find(u => u.username === acc.username)) {
      mockUsers.push(acc);
    }
  });

  if (db && db.users && Array.isArray(db.users)) {
    // Synchronize passwords and demo accounts in existing localStorage DB
    puneDemoAccounts.forEach(acc => {
      const existing = db.users.find(u => (u.email && u.email.toLowerCase() === acc.email.toLowerCase()) || u.username === acc.username);
      if (existing) {
        existing.password = acc.password;
        existing.is_verified = true;
        existing.is_email_verified = true;
      } else {
        db.users.push(acc);
      }
    });

    ['farmer@agrirent.com', 'owner@agrirent.com', 'admin@agrirent.com', 'operator@agrirent.com'].forEach(email => {
      const existing = db.users.find(u => u.email === email);
      if (existing) {
        existing.password = 'Demo@AgriRent2026';
        existing.is_verified = true;
      }
    });

    try {
      localStorage.setItem('agrirent_mock_db', JSON.stringify(db));
    } catch (e) {
      console.warn("Storage writing restricted:", e);
    }
    return db;
  }

  const categories = ['Tractor', 'Harvester', 'Rotavator', 'Seeder', 'Sprayer', 'Crop Protection Equipment'];
  const titles = {
    Tractor: ["John Deere 5050D", "Mahindra Arjun 555", "Sonalika Tiger DI 60", "New Holland 3630", "Kubota MU5501", "Massey Ferguson 241", "Eicher 380", "Swaraj 744 XT", "Powertrac Euro 50", "John Deere 5310"],
    Harvester: ["Kubota Harvester DC-68G", "Kartar Combine 4000", "Preet Combine 982", "Class Crop Tiger 30", "John Deere W70", "Dasmesh 9100 Harvester", "Kubota Harvester DC-93", "Swaraj Combine Harvester"],
    Rotavator: ["Sonalika Rotavator 6 Feet", "Maschio Gaspardo Rotavator", "Fieldking Gold Rotavator", "Mahindra Gyrovator", "Shaktiman Challenger", "Lancer Rotavator", "Garud Rotavator"],
    Seeder: ["Mahindra Seeder Machine", "Sonalika Multi Crop Planter", "Fieldking Seed Drill", "Khedut Seed Drill", "Landforce Happy Seeder"],
    Sprayer: ["Stihl Power Sprayer SG-20", "Aspee Hitech Sprayer", "Neptune Knapsack Sprayer", "Stihl SG-80", "Balwaan Battery Sprayer"],
    "Crop Protection Equipment": ["Falcon Crop Protection Mesh", "Kisankraft Weed Cutter", "Aspee Fogging Machine", "Stihl Weed Sprayer"]
  };

  const images = {
    Tractor: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    Harvester: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    Rotavator: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    Seeder: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    Sprayer: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    "Crop Protection Equipment": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    "Other Agricultural Machinery": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600"
  };

  const locations = [
    { address: "Coimbatore, Tamil Nadu", lat: 11.0168, lng: 76.9558 },
    { address: "Saravanampatti, Coimbatore", lat: 11.03, lng: 76.97 },
    { address: "Sundarapuram, Coimbatore", lat: 10.97, lng: 76.93 },
    { address: "Tiruppur, Tamil Nadu", lat: 11.1271, lng: 77.3418 },
    { address: "Salem, Tamil Nadu", lat: 11.6643, lng: 78.146 },
    { address: "Pollachi, Coimbatore", lat: 10.6588, lng: 77.0102 },
    { address: "Peelamedu, Coimbatore", lat: 11.02, lng: 77.00 },
    { address: "Thudiyalur, Coimbatore", lat: 11.0792, lng: 76.9405 },
    { address: "Mettupalayam, Coimbatore", lat: 11.3008, lng: 76.9367 },
  ];

  // Generate 50 Equipment Listings
  const mockEquipment = [];
  
  // Pune Specific Machine Owner Listings
  const puneEquipmentListings = [
    {
      id: 131,
      title: "John Deere 5310 PowerTech 55HP Tractor",
      category: "Tractor",
      description: "High-torque 55 HP utility tractor with 4WD, power steering, and heavy hydraulic lift for deep soil inversion and tilling.",
      rental_price_per_hour: 850.00,
      latitude: 18.5912,
      longitude: 73.7389,
      address: "Phase 1 Agro Hub, Hinjawadi, Pune, Maharashtra 411057",
      owner_username: "owner_balasaheb",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 132,
      title: "Shaktiman Semi-Champion Rotavator 7 Feet",
      category: "Rotavator",
      description: "Boron steel blades, multi-speed gearbox, excellent soil pulverized seedbed preparation in a single pass.",
      rental_price_per_hour: 450.00,
      latitude: 18.5925,
      longitude: 73.7350,
      address: "Maan Village Road, Hinjawadi, Pune, Maharashtra 411057",
      owner_username: "owner_balasaheb",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 133,
      title: "Kubota DC-68G Multi-Crop Combine Harvester",
      category: "Harvester",
      description: "Paddy and soybean combine harvester with high ground clearance, grain tank capacity of 1200L, and rapid straw separation.",
      rental_price_per_hour: 2200.00,
      latitude: 18.5987,
      longitude: 73.7656,
      address: "Datta Mandir Road, Wakad, Pune, Maharashtra 411057",
      owner_username: "owner_kavita",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 134,
      title: "Lemken Opal 090 3-Furrow Hydraulic Reversible Plough",
      category: "Plough",
      description: "Heavy duty reversible disc plough for breaking hardpan soil layers up to 14 inches deep.",
      rental_price_per_hour: 500.00,
      latitude: 18.6010,
      longitude: 73.7620,
      address: "Kaspate Vasti, Wakad, Pune, Maharashtra 411057",
      owner_username: "owner_kavita",
      image_url: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 135,
      title: "National Agro Multi-Crop Precision Seed Drill",
      category: "Seed Drill",
      description: "11-tyne automated seed and fertilizer drill with adjustable depth wheels and seed metering mechanisms.",
      rental_price_per_hour: 480.00,
      latitude: 18.5590,
      longitude: 73.7868,
      address: "Baner Hill Road, Baner, Pune, Maharashtra 411045",
      owner_username: "owner_dattatray",
      image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 136,
      title: "Mahindra Spring Loaded 9-Tyne Cultivator",
      category: "Cultivator",
      description: "Durable carbon spring tynes designed for aerating soil, weed uprooting, and seedbed levelling.",
      rental_price_per_hour: 400.00,
      latitude: 18.5550,
      longitude: 73.7910,
      address: "Pan Card Club Road, Baner, Pune, Maharashtra 411045",
      owner_username: "owner_dattatray",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 137,
      title: "Mahindra Arjun Novo 605 DI-i 60HP Tractor",
      category: "Tractor",
      description: "Heavy-duty 60 HP tractor fitted with front ballast weights and high lift capacity for sugar cane transport.",
      rental_price_per_hour: 950.00,
      latitude: 18.5089,
      longitude: 73.9259,
      address: "Saswad Road Farm Gate, Hadapsar, Pune, Maharashtra 411028",
      owner_username: "owner_meena",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 138,
      title: "Aspee Tractor-Mounted Boom Sprayer 600L",
      category: "Sprayer",
      description: "High pressure mist sprayer with 12m folding boom and stainless steel chemical resistant nozzles.",
      rental_price_per_hour: 600.00,
      latitude: 18.5120,
      longitude: 73.9300,
      address: "Manjari Farm Road, Hadapsar, Pune, Maharashtra 411028",
      owner_username: "owner_meena",
      image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 139,
      title: "Kartar 4000 Self-Propelled Combine Harvester",
      category: "Harvester",
      description: "Heavy duty combine harvester suitable for wheat, soybean, gram, and mustard harvesting with air-conditioned cabin.",
      rental_price_per_hour: 2400.00,
      latitude: 18.5808,
      longitude: 73.9787,
      address: "Nagar Road Agricultural Yard, Wagholi, Pune, Maharashtra 412207",
      owner_username: "owner_sanjay",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 140,
      title: "Fieldking Heavy-Duty Rotary Tiller 6 Feet",
      category: "Rotavator",
      description: "Multi-speed side gear drive rotary tiller for heavy black clay soils of eastern Pune.",
      rental_price_per_hour: 460.00,
      latitude: 18.5830,
      longitude: 73.9750,
      address: "Bakori Road, Wagholi, Pune, Maharashtra 412207",
      owner_username: "owner_sanjay",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    }
  ];

  puneEquipmentListings.forEach(item => {
    const owner = mockUsers.find(u => u.username === item.owner_username) || mockUsers[1];
    mockEquipment.push({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      rental_price_per_hour: item.rental_price_per_hour,
      location_latitude: item.latitude,
      location_longitude: item.longitude,
      address: item.address,
      owner: owner.id,
      owner_name: owner.username,
      owner_phone: owner.phone_number,
      image_url: item.image_url,
      is_available: true,
      is_verified: true,
      reviews: [
        { id: 1, author_name: "Suresh Patil", rating: 5, comment: "Top quality machinery in Pune area.", created_at: "2026-06-14T10:00:00.000Z" }
      ],
      created_at: new Date(2026, 5, 1).toISOString()
    });
  });

  const baseListings = [
    // Tractor (8)
    {
      id: 1,
      title: "John Deere 5050D Tractor",
      category: "Tractor",
      description: "50 HP heavy-duty tractor, ideal for tilling, ploughing, and heavy carting.",
      rental_price_per_hour: 1500.00,
      latitude: 11.0168,
      longitude: 76.9558,
      address: "Coimbatore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 2,
      title: "Mahindra Arjun Novo 605 Tractor",
      category: "Tractor",
      description: "57 HP advanced tractor with precision hydraulics. Ideal for heavy load cultivation.",
      rental_price_per_hour: 1600.00,
      latitude: 11.3410,
      longitude: 77.7172,
      address: "Erode, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 3,
      title: "Kubota MU4501 Tractor",
      category: "Tractor",
      description: "45 HP Japanese technology engine, environment friendly, low noise level and highly durable.",
      rental_price_per_hour: 1400.00,
      latitude: 11.6643,
      longitude: 78.1460,
      address: "Salem, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 4,
      title: "Sonalika Tiger 50 Tractor",
      category: "Tractor",
      description: "52 HP European-designed tractor with spacious operator platform and high torque.",
      rental_price_per_hour: 1450.00,
      latitude: 11.2189,
      longitude: 78.1672,
      address: "Namakkal, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 5,
      title: "Swaraj 744 XT Tractor",
      category: "Tractor",
      description: "48 HP robust tractor, legendary Swaraj design, extremely durable for multi-crop utility.",
      rental_price_per_hour: 1350.00,
      latitude: 11.1085,
      longitude: 77.3411,
      address: "Tiruppur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 6,
      title: "New Holland 3630 TX Tractor",
      category: "Tractor",
      description: "55 HP powerful tractor with double clutch, perfect for deep ploughing and harvesting auxiliary.",
      rental_price_per_hour: 1550.00,
      latitude: 10.9601,
      longitude: 78.0766,
      address: "Karur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 7,
      title: "TAFE 5900 DI Tractor",
      category: "Tractor",
      description: "56 HP tractor, built for long-duration operation and heavy trailer haulage in rural farms.",
      rental_price_per_hour: 1500.00,
      latitude: 11.7480,
      longitude: 79.7714,
      address: "Cuddalore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 8,
      title: "VST Shakti MT270 Tractor",
      category: "Tractor",
      description: "27 HP compact mini tractor, ideal for orchards, vineyard inter-cultivation, and small fields.",
      rental_price_per_hour: 950.00,
      latitude: 11.9398,
      longitude: 79.4897,
      address: "Villupuram, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
    },
    // Harvester (5)
    {
      id: 9,
      title: "Kubota Harvester DC-68G",
      category: "Harvester",
      description: "Premium combine harvester, Japanese engineered for smooth rice and grain cutting.",
      rental_price_per_hour: 2200.00,
      latitude: 11.0168,
      longitude: 76.9558,
      address: "Coimbatore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 10,
      title: "John Deere W70 Harvester",
      category: "Harvester",
      description: "Multi-crop combine harvester with self-propelled drive, high grain purity, and minimal losses.",
      rental_price_per_hour: 2400.00,
      latitude: 11.3410,
      longitude: 77.7172,
      address: "Erode, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 11,
      title: "Mahindra Arjun Combine Harvester",
      category: "Harvester",
      description: "Highly durable field harvester for wheat, paddy, and soy crops, low operating costs.",
      rental_price_per_hour: 2300.00,
      latitude: 11.6643,
      longitude: 78.1460,
      address: "Salem, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 12,
      title: "Sonalika Challenger Harvester",
      category: "Harvester",
      description: "Engineered for high moisture crops, equipped with large straw walkers for grain separation.",
      rental_price_per_hour: 2150.00,
      latitude: 11.2189,
      longitude: 78.1672,
      address: "Namakkal, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 13,
      title: "New Holland TC5.30 Harvester",
      category: "Harvester",
      description: "5-walker combine harvester with rotary separator technology, maximum harvest efficiency.",
      rental_price_per_hour: 2500.00,
      latitude: 11.1085,
      longitude: 77.3411,
      address: "Tiruppur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
    },
    // Rotavator (4)
    {
      id: 14,
      title: "Sonalika Rotavator 6 Feet",
      category: "Rotavator",
      description: "Heavy duty tilling rotavator, prepares seedbeds in a single pass with multi-speed gearboxes.",
      rental_price_per_hour: 900.00,
      latitude: 11.0168,
      longitude: 76.9558,
      address: "Coimbatore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 15,
      title: "Mahindra Gyrovator ZXX",
      category: "Rotavator",
      description: "Sturdy rotary tiller for secondary soil tillage, breaks up tough soil clods efficiently.",
      rental_price_per_hour: 850.00,
      latitude: 11.3410,
      longitude: 77.7172,
      address: "Erode, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 16,
      title: "Swaraj Gyrovator SLX",
      category: "Rotavator",
      description: "Specially designed for wet puddling and dry land operations in medium to heavy soils.",
      rental_price_per_hour: 880.00,
      latitude: 11.6643,
      longitude: 78.1460,
      address: "Salem, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 17,
      title: "Kubota Rotary Tiller",
      category: "Rotavator",
      description: "Japanese standard tiller, operates smoothly behind 40-55 HP tractors, long-lasting blades.",
      rental_price_per_hour: 950.00,
      latitude: 11.2189,
      longitude: 78.1672,
      address: "Namakkal, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
    },
    // Seeder (4)
    {
      id: 18,
      title: "Mahindra Seeder Machine",
      category: "Seeder",
      description: "Automatic seed drilling machine. Ensures uniform sowing depth and optimal crop yield.",
      rental_price_per_hour: 750.00,
      latitude: 11.1085,
      longitude: 77.3411,
      address: "Tiruppur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 19,
      title: "John Deere Seed Drill",
      category: "Seeder",
      description: "Precision mechanical seed drill, handles multiple grain sizes with automatic soil covers.",
      rental_price_per_hour: 800.00,
      latitude: 10.9601,
      longitude: 78.0766,
      address: "Karur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 20,
      title: "Sonalika Super Seeder",
      category: "Seeder",
      description: "Super seeder for paddy residue management and direct wheat sowing in one single operation.",
      rental_price_per_hour: 850.00,
      latitude: 11.7480,
      longitude: 79.7714,
      address: "Cuddalore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 21,
      title: "Swaraj Pneumatic Planter",
      category: "Seeder",
      description: "Vacuum-based precision planter for maize, cotton, and oilseeds, guarantees seed spacing.",
      rental_price_per_hour: 900.00,
      latitude: 11.9398,
      longitude: 79.4897,
      address: "Villupuram, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
    },
    // Sprayer (4)
    {
      id: 22,
      title: "Stihl Power Sprayer SG-20",
      category: "Sprayer",
      description: "Backpack motor sprayer for quick pesticide and liquid fertilizer spraying.",
      rental_price_per_hour: 350.00,
      latitude: 11.6643,
      longitude: 78.1460,
      address: "Salem, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 23,
      title: "Mahindra Tractor Mounted Sprayer",
      category: "Sprayer",
      description: "Tractor PTO-driven sprayer with 400-litre tank capacity, ideal for cotton and sugarcane.",
      rental_price_per_hour: 550.00,
      latitude: 11.0168,
      longitude: 76.9558,
      address: "Coimbatore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 24,
      title: "VST Shakti Orchard Sprayer",
      category: "Sprayer",
      description: "Compact crop sprayer, designed for narrow orchards, vineyards, and plantations.",
      rental_price_per_hour: 450.00,
      latitude: 11.3410,
      longitude: 77.7172,
      address: "Erode, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 25,
      title: "Escorts Power Sprayer",
      category: "Sprayer",
      description: "2-stroke engine high-pressure sprayer, adjustable nozzle and extended spray range.",
      rental_price_per_hour: 380.00,
      latitude: 11.6643,
      longitude: 78.1460,
      address: "Salem, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
    },
    // Crop Protection Equipment (5)
    {
      id: 26,
      title: "Sonalika Crop Shield Boom Sprayer",
      category: "Crop Protection Equipment",
      description: "Hydraulic boom sprayer with drift-free nozzles for wide coverage chemical application.",
      rental_price_per_hour: 600.00,
      latitude: 11.2189,
      longitude: 78.1672,
      address: "Namakkal, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 27,
      title: "Mahindra Crop Protection Blower",
      category: "Crop Protection Equipment",
      description: "High velocity dusting blower for powder fungicides, designed for vineyards and tall crops.",
      rental_price_per_hour: 580.00,
      latitude: 11.1085,
      longitude: 77.3411,
      address: "Tiruppur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 28,
      title: "Kubota Insecticide Sprayer",
      category: "Crop Protection Equipment",
      description: "Quiet motor sprayer, ultra-low volume nozzle technology for pest eradication.",
      rental_price_per_hour: 550.00,
      latitude: 10.9601,
      longitude: 78.0766,
      address: "Karur, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 29,
      title: "New Holland Crop Protection Shield",
      category: "Crop Protection Equipment",
      description: "Semi-automatic duster, optimized for biological pest control distributions.",
      rental_price_per_hour: 650.00,
      latitude: 11.7480,
      longitude: 79.7714,
      address: "Cuddalore, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: 30,
      title: "TAFE Crop Safeguard Duster",
      category: "Crop Protection Equipment",
      description: "High output mist blower with ergonomic backpack straps, ideal for hilly turmeric farms.",
      rental_price_per_hour: 480.00,
      latitude: 11.9398,
      longitude: 79.4897,
      address: "Villupuram, Tamil Nadu",
      image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    }
  ];

  baseListings.forEach((item, index) => {
    // Map to owner users from mockUsers list
    const ownerIndex = index % 10 === 0 ? 1 : 3 + (index % 10);
    const owner = mockUsers[ownerIndex] || mockUsers[1];
    
    mockEquipment.push({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      rental_price_per_hour: item.rental_price_per_hour,
      location_latitude: item.latitude,
      location_longitude: item.longitude,
      address: item.address,
      owner: owner.id,
      owner_name: owner.username,
      owner_phone: owner.phone_number,
      image_url: item.image_url,
      is_available: index % 6 !== 0,
      is_verified: true,
      reviews: [
        { id: 1, author_name: "Raju M.", rating: 4 + (index % 2), comment: "Decent performance, very helpful owner.", created_at: "2026-06-14T10:00:00.000Z" }
      ],
      created_at: new Date(2026, 5, 5 + (index % 10)).toISOString()
    });
  });

  // Generate 100 Booking Records
  const mockBookings = [
    {
      id: 1,
      equipment: 1,
      equipment_details: {
        id: 1,
        title: "John Deere 5050D Tractor",
        category: "Tractor",
        rental_price_per_hour: 1500.00,
        owner: 2,
        owner_name: "owner"
      },
      farmer: 1,
      farmer_name: "farmer",
      start_date: "2026-06-20T09:00:00.000Z",
      end_date: "2026-06-23T18:00:00.000Z",
      status: "Pending",
      total_cost: 4500.00,
      delivery_option: "Pickup",
      notes: "Need tractor early in the morning for paddy field preparation.",
      created_at: "2026-06-18T10:00:00.000Z"
    }
  ];

  const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Approved', 'In Progress', 'Rejected', 'Completed'];
  for (let i = 2; i <= 100; i++) {
    const equip = mockEquipment[i % mockEquipment.length];
    
    const farmerIndex = 3 + 10 + (i % 20);
    const farmer = mockUsers[farmerIndex];
    
    const days = 1 + (i % 5);
    const start_date = new Date(2026, 5, 1 + (i % 15));
    const end_date = new Date(start_date);
    end_date.setDate(start_date.getDate() + days);
    
    const cost = parseFloat(equip.rental_price_per_hour) * days;
    const status = statuses[i % statuses.length];

    mockBookings.push({
      id: i,
      equipment: equip.id,
      equipment_details: {
        id: equip.id,
        title: equip.title,
        category: equip.category,
        rental_price_per_hour: equip.rental_price_per_hour,
        owner: equip.owner,
        owner_name: equip.owner_name,
        image_url: equip.image_url
      },
      farmer: farmer.id,
      farmer_name: farmer.username,
      start_date: start_date.toISOString(),
      end_date: end_date.toISOString(),
      status,
      total_cost: cost,
      delivery_option: i % 2 === 0 ? 'Pickup' : 'Delivery',
      notes: "Seeded presentation record.",
      created_at: new Date(start_date.getTime() - 24 * 3600000).toISOString()
    });
  }

  const defaultOperatorProfile = {
    id: 1,
    user_id: 4,
    username: 'operator',
    full_name: 'Ramesh Kumar',
    phone: '+919876543213',
    experience_years: 6,
    skills: ['Tractor Operation', 'Harvester Operation', 'Rotary Tillage', 'Paddy Puddling'],
    supported_machinery: ['Tractor', 'Harvester', 'Rotavator', 'Seeder', 'Sprayer'],
    service_area: 'Coimbatore & Tiruppur Rural',
    service_radius_km: 35.0,
    current_latitude: 11.0250,
    current_longitude: 76.9620,
    working_hours: '06:00 AM - 07:30 PM',
    is_available: true,
    current_work_status: 'Available',
    verification_status: 'Verified',
    verification_notes: 'All licenses and KYC verified by admin.',
    license_number: 'DL-TN-38-20180092',
    document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
    hourly_compensation_rate: 280.00,
    total_jobs_completed: 14,
    reliability_score: 4.9,
    aadhaar_kyc_status: 'Verified'
  };

  const defaultAssignments = [
    {
      id: 1,
      booking: 1,
      booking_id: 1,
      operator: 1,
      operator_name: 'Ramesh Kumar',
      operator_username: 'operator',
      operator_phone: '+919876543213',
      operator_rating: 4.9,
      status: 'REQUESTED',
      compensation_amount: 850.00,
      pickup_latitude: 11.0168,
      pickup_longitude: 76.9558,
      pickup_address: 'Coimbatore, Tamil Nadu',
      destination_latitude: 10.9850,
      destination_longitude: 76.9750,
      destination_address: 'Farmer Field, Pollachi Road, Coimbatore',
      current_operator_lat: 11.0250,
      current_operator_lng: 76.9620,
      estimated_travel_distance_km: 8.5,
      estimated_arrival_minutes: 20,
      farmer_name: 'farmer',
      farmer_phone: '+919876543211',
      owner_name: 'owner',
      owner_phone: '+919876543212',
      machine_title: 'John Deere 5050D Tractor',
      machine_category: 'Tractor',
      machine_image: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600',
      start_date: '2026-06-20T09:00:00.000Z',
      end_date: '2026-06-23T18:00:00.000Z',
      requested_at: new Date().toISOString(),
      accepted_at: null,
      status_notes: 'AI Matched with score 94.2/100',
      status_history: [
        { id: 1, from_status: '', to_status: 'REQUESTED', recorded_at: new Date().toISOString(), note: 'Matched by AI Engine' }
      ]
    }
  ];

  const puneOperatorProfiles = [
    {
      id: 21,
      user_id: 21,
      username: 'operator_rajesh',
      full_name: 'Rajesh Pawar',
      phone: '+919822022001',
      experience_years: 8,
      skills: ['Tractor Operation', 'Deep Ploughing', 'Paddy Puddling', 'Laser Levelling'],
      supported_machinery: ['Tractor', 'Plough', 'Rotavator'],
      service_area: 'Hinjawadi, Maan & Marunji Rural, Pune',
      service_radius_km: 30.0,
      current_latitude: 18.5912,
      current_longitude: 73.7389,
      working_hours: '06:00 AM - 07:00 PM',
      is_available: true,
      is_online: true,
      current_work_status: 'Available',
      verification_status: 'Verified',
      verification_notes: 'All licenses and KYC verified by admin.',
      license_number: 'MH-12-OP-2018-001',
      document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      hourly_compensation_rate: 300.00,
      total_jobs_completed: 48,
      reliability_score: 4.9,
      aadhaar_kyc_status: 'Verified'
    },
    {
      id: 22,
      user_id: 22,
      username: 'operator_sunil',
      full_name: 'Sunil Gaikwad',
      phone: '+919822022002',
      experience_years: 6,
      skills: ['Multi-Crop Combine Harvester', 'Crop Threshing', 'Straw Management'],
      supported_machinery: ['Harvester', 'Tractor', 'Rotavator'],
      service_area: 'Wakad, Thergaon & Punawale, Pune',
      service_radius_km: 35.0,
      current_latitude: 18.5987,
      current_longitude: 73.7656,
      working_hours: '06:30 AM - 07:30 PM',
      is_available: true,
      is_online: true,
      current_work_status: 'Available',
      verification_status: 'Verified',
      verification_notes: 'Combine harvester specialist verified.',
      license_number: 'MH-12-OP-2019-002',
      document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      hourly_compensation_rate: 350.00,
      total_jobs_completed: 36,
      reliability_score: 4.8,
      aadhaar_kyc_status: 'Verified'
    },
    {
      id: 23,
      user_id: 23,
      username: 'operator_amit',
      full_name: 'Amit Bhosale',
      phone: '+919822022003',
      experience_years: 5,
      skills: ['Precision Seed Drilling', 'Rotavator Tillage', 'Bed Making'],
      supported_machinery: ['Rotavator', 'Seed Drill', 'Cultivator'],
      service_area: 'Baner, Balewadi & Sus, Pune',
      service_radius_km: 25.0,
      current_latitude: 18.5590,
      current_longitude: 73.7868,
      working_hours: '07:00 AM - 06:30 PM',
      is_available: true,
      is_online: true,
      current_work_status: 'Available',
      verification_status: 'Verified',
      verification_notes: 'Tillage and seeding certified.',
      license_number: 'MH-12-OP-2020-003',
      document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      hourly_compensation_rate: 280.00,
      total_jobs_completed: 29,
      reliability_score: 4.7,
      aadhaar_kyc_status: 'Verified'
    },
    {
      id: 24,
      user_id: 24,
      username: 'operator_ganesh',
      full_name: 'Ganesh More',
      phone: '+919822022004',
      experience_years: 9,
      skills: ['Sugarcane Heavy Harvester', 'Subsoiler', 'Heavy Tractor Cultivation'],
      supported_machinery: ['Harvester', 'Tractor', 'Cultivator', 'Rotavator'],
      service_area: 'Hadapsar, Manjari & Phursungi, Pune',
      service_radius_km: 40.0,
      current_latitude: 18.5089,
      current_longitude: 73.9259,
      working_hours: '06:00 AM - 06:00 PM',
      is_available: false,
      is_online: true,
      current_work_status: 'Busy',
      verification_status: 'Verified',
      verification_notes: 'Heavy machinery operator license verified.',
      license_number: 'MH-12-OP-2017-004',
      document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      hourly_compensation_rate: 320.00,
      total_jobs_completed: 62,
      reliability_score: 4.95,
      aadhaar_kyc_status: 'Verified'
    },
    {
      id: 25,
      user_id: 25,
      username: 'operator_sachin',
      full_name: 'Sachin Chavan',
      phone: '+919822022005',
      experience_years: 4,
      skills: ['Orchard Boom Sprayer', 'Knapsack Power Sprayer', 'Pest Control'],
      supported_machinery: ['Sprayer', 'Tractor', 'Cultivator'],
      service_area: 'Wagholi, Lonikand & Bakori, Pune',
      service_radius_km: 25.0,
      current_latitude: 18.5808,
      current_longitude: 73.9787,
      working_hours: '07:00 AM - 05:30 PM',
      is_available: false,
      is_online: false,
      current_work_status: 'Offline',
      verification_status: 'Verified',
      verification_notes: 'Spraying specialist verified.',
      license_number: 'MH-12-OP-2021-005',
      document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      hourly_compensation_rate: 250.00,
      total_jobs_completed: 18,
      reliability_score: 4.6,
      aadhaar_kyc_status: 'Verified'
    }
  ];

  const defaultDB = {
    users: mockUsers,
    equipment: mockEquipment,
    bookings: mockBookings,
    operator_profiles: [defaultOperatorProfile, ...puneOperatorProfiles],
    operator_assignments: defaultAssignments,
    messages: [
      { id: 1, booking: 1, sender: 1, sender_name: "farmer", content: "Hi! Is the tractor service ready?", timestamp: "2026-06-18T10:05:00.000Z" },
    ],
    notifications: [
      { id: 1, user: 2, content: "New booking request from farmer for your John Deere 5050D Tractor.", is_read: false, created_at: "2026-06-18T10:00:05.000Z" }
    ],
    tickets: [
      { id: 1, user: 1, username: "farmer", subject: "Issue with Booking Payment", message: "My payment went through but booking is pending.", status: "Open", priority: "High", created_at: "2026-06-18T10:10:00.000Z" }
    ]
  };

  try {
    localStorage.setItem('agrirent_mock_db', JSON.stringify(defaultDB));
  } catch (e) {
    console.warn("Storage writing restricted:", e);
  }
  return defaultDB;
};

const saveMockDB = (db) => {
  try {
    localStorage.setItem('agrirent_mock_db', JSON.stringify(db));
  } catch (e) {
    console.warn("Storage writing restricted:", e);
  }
};

const mockApiRouter = async (endpoint, options = {}) => {
  const db = getMockDB();
  const token = localStorage.getItem('accessToken');
  let currentUser = null;
  if (token && token.startsWith('mock-')) {
    const userId = parseInt(token.replace('mock-token-', ''));
    currentUser = db.users.find(u => u.id === userId);
  }

  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  console.log(`[Mock API Intercept] ${method} ${endpoint}`, body);

  const getQueryParams = (url) => {
    const params = {};
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const qString = url.substring(qIndex + 1);
      qString.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        params[k] = decodeURIComponent(v || '');
      });
    }
    return params;
  };
  const queryParams = getQueryParams(endpoint);
  const cleanEndpoint = endpoint.split('?')[0];

  // 1. Login
  if (cleanEndpoint === '/api/auth/login/' && method === 'POST') {
    const { email, username, password } = body;
    const identifier = (email || username || '').toLowerCase().trim();
    const user = db.users.find(u => 
      (u.email && u.email.toLowerCase() === identifier) || 
      (u.username && u.username.toLowerCase() === identifier)
    );
    if (user && user.password === password) {
      const mockToken = `mock-token-${user.id}`;
      return {
        token: { access: mockToken, refresh: `mock-refresh-${user.id}` },
        user: { id: user.id, username: user.username, email: user.email, role: user.role, phone_number: user.phone_number, is_verified: user.is_verified, is_email_verified: true }
      };
    }
    throw new Error("Invalid email or password.");
  }

  // 2. Register
  if (cleanEndpoint === '/api/auth/register/' && method === 'POST') {
    const { username, email, password, role, phone_number } = body;
    if (!email) throw new Error("Email is required.");
    if (password && password.length < 12) throw new Error("Password must be at least 12 characters long.");
    if (db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email address already exists.");
    }
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already exists.");
    }
    const newUser = {
      id: db.users.length + 1,
      username,
      email: email.toLowerCase(),
      role: role || 'Farmer',
      phone_number: phone_number || '',
      is_verified: false,
      is_email_verified: false,
      verification_token: 'demo-token-12345',
      password: password
    };
    db.users.push(newUser);
    saveMockDB(db);
    return {
      message: "User registered successfully. A 6-digit verification code has been dispatched to your email address.",
      username: newUser.username,
      email: newUser.email,
      is_email_verified: false
    };
  }

  // 2.5 Resend Verification Code
  if (cleanEndpoint === '/api/auth/resend-code/' && method === 'POST') {
    return {
      message: "A fresh 6-digit verification code has been sent to your email address.",
      email: body.email || body.username
    };
  }

  // 3. Verify Email / OTP
  if ((cleanEndpoint === '/api/auth/verify-email/' || cleanEndpoint === '/api/auth/verify-otp/') && method === 'POST') {
    const { email, username, token, otp_code } = body;
    const identifier = (email || username || '').toLowerCase().trim();
    const tokenVal = (token || otp_code || '').trim();

    if (tokenVal === '123456') {
      throw new Error("Invalid or expired verification token.");
    }

    const user = db.users.find(u => 
      (u.email && u.email.toLowerCase() === identifier) || 
      (u.username && u.username.toLowerCase() === identifier)
    );
    if (user) {
      user.is_verified = true;
      user.is_email_verified = true;
      saveMockDB(db);
      const mockToken = `mock-token-${user.id}`;
      return {
        message: "Email verified successfully. Welcome to AgriRent!",
        token: { access: mockToken, refresh: `mock-refresh-${user.id}` },
        user: { id: user.id, username: user.username, email: user.email, role: user.role, phone_number: user.phone_number, is_verified: user.is_verified, is_email_verified: true }
      };
    }
    throw new Error("Invalid or expired verification token.");
  }

  // 4. Forgot password
  if (cleanEndpoint === '/api/auth/forgot-password/' && method === 'POST') {
    return { message: "If an account with that email exists, password reset instructions have been sent." };
  }

  // 5. Reset password
  if (cleanEndpoint === '/api/auth/reset-password/' && method === 'POST') {
    const { email, username, token, otp_code, new_password } = body;
    const identifier = (email || username || '').toLowerCase().trim();
    const tokenVal = (token || otp_code || '').trim();

    if (tokenVal === '123456') {
      throw new Error("Invalid or expired reset token.");
    }
    if (new_password && new_password.length < 12) {
      throw new Error("Password must be at least 12 characters long.");
    }

    const user = db.users.find(u => 
      (u.email && u.email.toLowerCase() === identifier) || 
      (u.username && u.username.toLowerCase() === identifier)
    );
    if (user) {
      user.password = new_password;
      saveMockDB(db);
      return { message: "Password reset successfully. You can now login with your new password." };
    }
    throw new Error("Invalid or expired reset token.");
  }

  // 6. Token refresh
  if (cleanEndpoint === '/api/auth/refresh/' && method === 'POST') {
    const { refresh } = body;
    if (refresh && refresh.startsWith('mock-refresh-')) {
      const id = refresh.replace('mock-refresh-', '');
      return { access: `mock-token-${id}`, refresh: `mock-refresh-${id}` };
    }
    throw new Error("Invalid refresh token.");
  }

  // 7. Logout
  if (cleanEndpoint === '/api/auth/logout/' && method === 'POST') {
    return { message: "Successfully logged out." };
  }

  // 6. Profile fetch
  if (cleanEndpoint === '/api/auth/me/' && method === 'GET') {
    if (currentUser) {
      return { id: currentUser.id, username: currentUser.username, email: currentUser.email, role: currentUser.role, phone_number: currentUser.phone_number, is_verified: currentUser.is_verified };
    }
    throw new Error("Authentication credentials were not provided.");
  }

  // 7. Equipment list & creation
  if (cleanEndpoint === '/api/equipment/' && method === 'GET') {
    let list = [...db.equipment];
    if (queryParams.category) {
      list = list.filter(e => e.category === queryParams.category);
    }
    if (queryParams.search) {
      list = list.filter(e => e.title.toLowerCase().includes(queryParams.search.toLowerCase()));
    }
    return list;
  }

  if (cleanEndpoint === '/api/equipment/' && method === 'POST') {
    if (!currentUser || (currentUser.role !== 'Owner' && currentUser.role !== 'Admin')) {
      throw new Error("Only equipment owners or admins can list equipment.");
    }
    const newEquip = {
      id: db.equipment.length + 1,
      title: body.title,
      category: body.category,
      description: body.description,
      rental_price_per_hour: parseFloat(body.rental_price_per_hour || 600),
      location_latitude: 11.0168 + (Math.random() - 0.5) * 0.05,
      location_longitude: 76.9558 + (Math.random() - 0.5) * 0.05,
      address: body.address || "Coimbatore, Tamil Nadu",
      owner: currentUser.id,
      owner_name: currentUser.username,
      owner_phone: currentUser.phone_number || "+919876543212",
      image_url: body.image_url || images[body.category] || images.Tractor,
      is_available: true,
      is_verified: true,
      reviews: [],
      created_at: new Date().toISOString()
    };
    db.equipment.push(newEquip);
    saveMockDB(db);
    return newEquip;
  }

  // 8. Equipment Detail / Update / Delete
  if (cleanEndpoint.startsWith('/api/equipment/') && !cleanEndpoint.endsWith('/verify/') && !cleanEndpoint.endsWith('/reviews/') && method === 'GET') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    const item = db.equipment.find(e => e.id === id);
    if (item) return item;
    throw new Error("Equipment not found.");
  }

  if (cleanEndpoint.startsWith('/api/equipment/') && !cleanEndpoint.endsWith('/verify/') && !cleanEndpoint.endsWith('/reviews/') && method === 'PUT') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    const itemIndex = db.equipment.findIndex(e => e.id === id);
    if (itemIndex !== -1) {
      db.equipment[itemIndex] = { ...db.equipment[itemIndex], ...body };
      saveMockDB(db);
      return db.equipment[itemIndex];
    }
    throw new Error("Equipment not found.");
  }

  if (cleanEndpoint.startsWith('/api/equipment/') && !cleanEndpoint.endsWith('/verify/') && !cleanEndpoint.endsWith('/reviews/') && method === 'DELETE') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    db.equipment = db.equipment.filter(e => e.id !== id);
    saveMockDB(db);
    return null;
  }

  // 9. Equipment reviews
  if (cleanEndpoint.startsWith('/api/equipment/') && cleanEndpoint.endsWith('/reviews/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    const item = db.equipment.find(e => e.id === id);
    if (item) {
      const newReview = {
        id: (item.reviews?.length || 0) + 1,
        author_name: currentUser?.username || 'farmer',
        rating: parseInt(body.rating || 5),
        comment: body.comment || '',
        created_at: new Date().toISOString()
      };
      if (!item.reviews) item.reviews = [];
      item.reviews.push(newReview);
      saveMockDB(db);
      return newReview;
    }
    throw new Error("Equipment not found.");
  }

  // 10. Bookings list & creation
  if (cleanEndpoint === '/api/bookings/' && method === 'GET') {
    if (!currentUser) throw new Error("Unauthorized.");
    let list = [...db.bookings];
    if (currentUser.role === 'Owner') {
      list = list.filter(b => b.equipment_details?.owner === currentUser.id);
    } else if (currentUser.role === 'Farmer') {
      list = list.filter(b => b.farmer === currentUser.id);
    }
    return list;
  }

  if (cleanEndpoint === '/api/bookings/' && method === 'POST') {
    if (!currentUser) throw new Error("Unauthorized.");
    const equip = db.equipment.find(e => e.id === parseInt(body.equipment));
    if (!equip) throw new Error("Equipment not found.");
    if (!equip.is_available) throw new Error("Equipment is not available currently.");

    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays > 0 ? diffDays : 1;
    
    // Cost calculation (micro-rental shared cooperative rental splits the cost, insurance adds a fee)
    let base_rate = parseFloat(equip.rental_price_per_hour);
    let calculated_cost = base_rate * days;
    if (body.micro_rental_shared) {
      calculated_cost = calculated_cost * 0.5; // split 50-50 for cooperative renting
    }
    if (body.insurance_opt_in) {
      calculated_cost += 150 * days; // 150 INR per day flat insurance rate
    }
    const total_cost = calculated_cost + (body.delivery_option === 'Delivery' ? 500 : 0);

    const randomHash = () => Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const randomIpfs = () => Array.from({length: 44}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const newBooking = {
      id: db.bookings.length + 1,
      equipment: equip.id,
      equipment_details: {
        id: equip.id,
        title: equip.title,
        category: equip.category,
        rental_price_per_hour: equip.rental_price_per_hour,
        owner: equip.owner,
        owner_name: equip.owner_name,
        image_url: equip.image_url
      },
      farmer: currentUser.id,
      farmer_name: currentUser.username,
      start_date: body.start_date,
      end_date: body.end_date,
      status: 'Pending',
      total_cost,
      delivery_option: body.delivery_option || 'Pickup',
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      
      // Extended fields
      escrow_status: 'Held', // Held when created
      micro_rental_shared: body.micro_rental_shared || false,
      insurance_opt_in: body.insurance_opt_in || false,
      insurance_claim_status: body.insurance_opt_in ? 'N/A' : 'N/A',
      carbon_saved_kg: parseFloat((body.micro_rental_shared ? 18.2 * days : 8.4 * days).toFixed(1)),
      blockchain_contract_hash: `0x${randomHash()}`,
      blockchain_ipfs_hash: `Qm${randomIpfs()}`
    };

    db.bookings.push(newBooking);

    db.notifications.push({
      id: db.notifications.length + 1,
      user: equip.owner,
      content: `New booking request from ${currentUser.username} for your ${equip.title}.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveMockDB(db);
    return newBooking;
  }

  // 11. Booking status patch
  if (cleanEndpoint.startsWith('/api/bookings/') && cleanEndpoint.endsWith('/status/') && method === 'PATCH') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    const booking = db.bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found.");

    const newStatus = body.status;
    booking.status = newStatus;
    
    // Update escrow payout status
    if (newStatus === 'Completed') {
      booking.escrow_status = 'Released';
    } else if (newStatus === 'Rejected') {
      booking.escrow_status = 'Refunded';
    }

    const equipIndex = db.equipment.findIndex(e => e.id === booking.equipment);
    if (equipIndex !== -1) {
      if (newStatus === 'Completed' || newStatus === 'Rejected') {
        db.equipment[equipIndex].is_available = true;
      } else if (newStatus === 'Approved') {
        db.equipment[equipIndex].is_available = false;
      }
    }

    const notifiedUserId = (currentUser && currentUser.id === booking.farmer) ? booking.equipment_details.owner : booking.farmer;
    db.notifications.push({
      id: db.notifications.length + 1,
      user: notifiedUserId,
      content: `Booking #${booking.id} status updated to: ${newStatus}.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveMockDB(db);
    return booking;
  }

  // 12. Booking chat messages
  if (cleanEndpoint.startsWith('/api/bookings/') && cleanEndpoint.endsWith('/messages/')) {
    const bookingId = parseInt(cleanEndpoint.split('/')[3]);
    
    if (method === 'GET') {
      return db.messages.filter(m => m.booking === bookingId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    if (method === 'POST') {
      if (!currentUser) throw new Error("Unauthorized.");
      const booking = db.bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error("Booking not found.");

      const newMsg = {
        id: db.messages.length + 1,
        booking: bookingId,
        sender: currentUser.id,
        sender_name: currentUser.username,
        content: body.content,
        timestamp: new Date().toISOString()
      };
      db.messages.push(newMsg);

      // Trigger automatic chatbot reply simulator
      setTimeout(() => {
        const currentDb = getMockDB();
        let replyContent = "";
        
        if (currentUser.role === 'Farmer') {
          const ownerResponses = [
            "Hi! Thanks for the message. I will check and arrange the tractor delivery shortly.",
            "Yes, the equipment is fully serviced and the driver details will be shared once approved.",
            "The pricing is set via AgriRent's optimal recommendation, but I can offer field logistics assistance.",
            "Sure, let's connect over call to finalize the route instructions."
          ];
          replyContent = ownerResponses[Math.floor(Math.random() * ownerResponses.length)];
        } else {
          const farmerResponses = [
            "Great, thanks! I am preparing the field bounds for the harvester.",
            "Perfect. Please let me know once the driver starts.",
            "Thank you for approving the request, looking forward to it.",
            "Understood, I will do self-pickup as configured."
          ];
          replyContent = farmerResponses[Math.floor(Math.random() * farmerResponses.length)];
        }

        const autoMsg = {
          id: currentDb.messages.length + 1,
          booking: bookingId,
          sender: (currentUser.role === 'Farmer' ? booking.equipment_details.owner : booking.farmer),
          sender_name: (currentUser.role === 'Farmer' ? booking.equipment_details.owner_name || 'owner' : booking.farmer_name || 'farmer'),
          content: replyContent,
          timestamp: new Date().toISOString()
        };
        currentDb.messages.push(autoMsg);

        const recId = (currentUser.role === 'Farmer' ? booking.equipment_details.owner : booking.farmer);
        currentDb.notifications.push({
          id: currentDb.notifications.length + 1,
          user: recId,
          content: `New chat message regarding booking #${bookingId}.`,
          is_read: false,
          created_at: new Date().toISOString()
        });

        saveMockDB(currentDb);
        window.dispatchEvent(new CustomEvent('agrirent_new_message', { detail: { bookingId } }));
      }, 1500);

      saveMockDB(db);
      return newMsg;
    }
  }

  // 13. Notifications
  if (cleanEndpoint === '/api/notifications/' && method === 'GET') {
    if (!currentUser) throw new Error("Unauthorized.");
    return db.notifications.filter(n => n.user === currentUser.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (cleanEndpoint === '/api/notifications/' && method === 'PATCH') {
    if (!currentUser) throw new Error("Unauthorized.");
    db.notifications.forEach(n => {
      if (n.user === currentUser.id) n.is_read = true;
    });
    saveMockDB(db);
    return { message: "All notifications marked as read." };
  }

  // 14. Support Tickets
  if (cleanEndpoint === '/api/support/tickets/') {
    if (!currentUser) throw new Error("Unauthorized.");
    if (method === 'GET') {
      if (currentUser.role === 'Admin') {
        return db.tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      return db.tickets.filter(t => t.user === currentUser.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (method === 'POST') {
      const newTicket = {
        id: db.tickets.length + 1,
        user: currentUser.id,
        username: currentUser.username,
        subject: body.subject,
        message: body.message,
        status: 'Open',
        priority: body.priority || 'Medium',
        created_at: new Date().toISOString()
      };
      db.tickets.push(newTicket);
      saveMockDB(db);
      return newTicket;
    }
  }

  if (cleanEndpoint.startsWith('/api/support/tickets/') && method === 'PATCH') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) throw new Error("Ticket not found.");
    ticket.status = body.status;
    saveMockDB(db);
    return ticket;
  }

  // 15. Dashboards Analytics
  if (cleanEndpoint === '/api/dashboard/farmer/' && method === 'GET') {
    const bookings = db.bookings.filter(b => b.farmer === currentUser?.id);
    const total_spent = bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + parseFloat(b.total_cost), 0.0);
    return {
      total_bookings: bookings.length,
      active_rentals: bookings.filter(b => b.status === 'In Progress').length,
      pending_bookings: bookings.filter(b => b.status === 'Pending').length,
      completed_rentals: bookings.filter(b => b.status === 'Completed').length,
      total_spent
    };
  }

  if (cleanEndpoint === '/api/dashboard/owner/' && method === 'GET') {
    const listings = db.equipment.filter(e => e.owner === currentUser?.id);
    const bookings = db.bookings.filter(b => b.equipment_details?.owner === currentUser?.id);
    const total_earnings = bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + parseFloat(b.total_cost), 0.0);
    return {
      total_listings: listings.length,
      active_rentals: bookings.filter(b => b.status === 'In Progress').length,
      pending_bookings: bookings.filter(b => b.status === 'Pending').length,
      completed_rentals: bookings.filter(b => b.status === 'Completed').length,
      total_earnings
    };
  }

  if (cleanEndpoint === '/api/dashboard/admin/' && method === 'GET') {
    const total_listings = db.equipment.length;
    const utilized_bookings = new Set(db.bookings.filter(b => ['In Progress', 'Completed'].includes(b.status)).map(b => b.equipment)).size;
    const utilization_rate = total_listings > 0 ? Math.round((utilized_bookings / total_listings * 100) * 10) / 10 : 0.0;
    const total_revenue = db.bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + parseFloat(b.total_cost), 0.0);
    return {
      total_farmers: db.users.filter(u => u.role === 'Farmer').length,
      total_owners: db.users.filter(u => u.role === 'Owner').length,
      total_equipment: total_listings,
      active_rentals: db.bookings.filter(b => b.status === 'In Progress').length,
      completed_rentals: db.bookings.filter(b => b.status === 'Completed').length,
      total_revenue,
      equipment_utilization_rate: utilization_rate,
      pending_verifications: db.equipment.filter(e => !e.is_verified).length,
      open_tickets: db.tickets.filter(t => t.status === 'Open').length
    };
  }

  // 16. AI Suitability recommendation local calculation
  if (cleanEndpoint === '/api/ai/recommend/' && method === 'POST') {
    const baseRates = {
      Paddy: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 2000, hours: 1.5 },
      Wheat: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 1800, hours: 1.2 },
      Sugarcane: { Harvesting: "Other Agricultural Machinery", Sowing: "Seeder", Tilling: "Tractor", Spraying: "Sprayer", price: 2500, hours: 2.5 },
      Cotton: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 2200, hours: 1.8 },
      Maize: { Harvesting: "Harvester", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 1750, hours: 1.5 },
      Vegetables: { Harvesting: "Other Agricultural Machinery", Sowing: "Seeder", Tilling: "Rotavator", Spraying: "Sprayer", price: 950, hours: 1.0 }
    };
    const mapping = baseRates[body.crop_type] || baseRates["Paddy"];
    const equipment = mapping[body.task_type] || "Tractor";
    const hours = Math.max(1, (mapping.hours || 1.5) * parseFloat(body.land_size || 5));
    const cost = Math.round(hours * (mapping.price || 800));

    return {
      recommended_category: equipment,
      confidence_score: 0.92,
      estimated_hours: hours,
      estimated_rental_cost: cost
    };
  }

  // 17. AI price prediction
  if (cleanEndpoint === '/api/ai/predict-price/' && method === 'POST') {
    const baseRates = {
      Tractor: 1500,
      Harvester: 2200,
      Rotavator: 900,
      Seeder: 750,
      Sprayer: 350,
      "Crop Protection Equipment": 450,
      "Other Agricultural Machinery": 1200
    };
    const base = baseRates[body.equipment_type] || 800;
    const demandMult = body.demand === 'High' ? 1.25 : body.demand === 'Low' ? 0.85 : 1.0;
    const seasonMult = body.season === 'Harvesting' ? 1.25 : body.season === 'Sowing' ? 1.15 : 0.85;
    const recommended = base * demandMult * seasonMult;
    return {
      min_price: Math.round(recommended * 0.85 / 10) * 10,
      recommended_price: Math.round(recommended / 10) * 10,
      max_price: Math.round(recommended * 1.20 / 10) * 10
    };
  }

  // 18. AI Voice parameters parsing (supporting Tamil, Hindi, Telugu, Malayalam, Kannada)
  if (cleanEndpoint === '/api/ai/voice-booking/' && method === 'POST') {
    const text = body.text.toLowerCase();
    let equipment_type = "Tractor";
    if (text.includes("harvester") || text.includes("aruvada") || text.includes("harvest") || text.includes("कटाई") || text.includes("కోత") || text.includes("കൊയ്ത്ത്") || text.includes("ಕೋಯ್ಲು")) equipment_type = "Harvester";
    else if (text.includes("rotavator") || text.includes("rotavater") || text.includes("uzhuvu") || text.includes("रोटावेटर") || text.includes("రోటవేటర్") || text.includes("റോട്ടവേറ്റർ") || text.includes("ರೋಟಾವೇಟರ್")) equipment_type = "Rotavator";
    else if (text.includes("seeder") || text.includes("seed") || text.includes("vithai") || text.includes("सीडर") || text.includes("బువై") || text.includes("बुवाई") || text.includes("സീഡർ") || text.includes("സೀಡರ್")) equipment_type = "Seeder";
    else if (text.includes("sprayer") || text.includes("spray") || text.includes("marundhu") || text.includes("छिड़काव") || text.includes("స్ప్రే") || text.includes("തളിക്കാൻ") || text.includes("ಸಿಂಪಡಣೆ")) equipment_type = "Sprayer";

    let location = "Coimbatore";
    if (text.includes("salem")) location = "Salem";
    else if (text.includes("tiruppur") || text.includes("tirupur")) location = "Tiruppur";
    else if (text.includes("pollachi")) location = "Pollachi";
    else if (text.includes("delhi")) location = "Delhi";
    else if (text.includes("bengaluru")) location = "Bengaluru";

    let booking_date = new Date().toISOString().split('T')[0];
    if (text.includes("naalai") || text.includes("tomorrow") || text.includes("कल") || text.includes("ரேపు") || text.includes("നാളെ") || text.includes("ನಾಳೆ")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      booking_date = tomorrow.toISOString().split('T')[0];
    } else if (text.includes("matra naal") || text.includes("day after") || text.includes("परसों") || text.includes("ఎల్లుండి") || text.includes("മറ്റന്നാൾ") || text.includes("ನಾಡಿದ್ದು")) {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      booking_date = dayAfter.toISOString().split('T')[0];
    }

    const rates = { Tractor: 1500, Harvester: 2200, Rotavator: 900, Seeder: 750, Sprayer: 350 };
    const rate = rates[equipment_type] || 600;

    return {
      equipment_type,
      location,
      booking_date,
      estimated_price_per_hour: rate
    };
  }

  // 19. AI Assistant chat
  if (cleanEndpoint === '/api/ai/chat/' && method === 'POST') {
    const text = body.message.toLowerCase();
    let reply = "Hello! I am AgriRent's AI assistant. I can help you find suitable farm machinery, predict optimal rent prices, or help you with your booking issues. How can I help you today?";
    if (text.includes("tractor") || text.includes("harvester") || text.includes("rotavator") || text.includes("machine") || text.includes("rent")) {
      reply = "We have high-quality machinery listed in Coimbatore, Salem, and Tiruppur, including John Deere Tractors (₹1500/day) and Kubota Harvesters (₹2200/day). You can search them in our Machinery Directory and book directly!";
    } else if (text.includes("price") || text.includes("predict") || text.includes("cost")) {
      reply = "Our Price Predictor uses market demand, crop seasons, and machine types to recommend the most optimal rent rate to owners and farmers. This ensures fair pricing for everyone!";
    } else if (text.includes("support") || text.includes("help") || text.includes("issue")) {
      reply = "If you are facing any payment or verification issues, please head to the Support Center from the top bar to raise a complaint ticket. Our Admin team will resolve it instantly.";
    }
    return { reply };
  }

  // 20. Weather Advisory Forecast
  if (cleanEndpoint === '/api/weather/' && method === 'GET') {
    return {
      location: "Coimbatore, Tamil Nadu",
      forecast: [
        { day: "Today", temp: 31, condition: "Sunny", rain_chance: 10 },
        { day: "Tomorrow", temp: 32, condition: "Partly Cloudy", rain_chance: 20 },
        { day: "June 21", temp: 29, condition: "Scattered Showers", rain_chance: 60 },
        { day: "June 22", temp: 28, condition: "Heavy Rain", rain_chance: 90 },
        { day: "June 23", temp: 30, condition: "Overcast", rain_chance: 40 }
      ],
      rainfall_warning: "Heavy Rain Alert on June 22: High soil moisture, postpone seeder/sowing bookings to June 23.",
      recommended_booking_dates: ["June 20", "June 23", "June 24"],
      crop_cycle_recommendation: "Paddy fields are currently at the harvesting stage; combine harvesters are recommended for booking immediately."
    };
  }

  // 21. Government Subsidies & Schemes
  if (cleanEndpoint === '/api/govt-schemes/') {
    if (method === 'GET') {
      return {
        schemes: [
          {
            id: 1,
            title: "Sub-Mission on Agricultural Mechanization (SMAM)",
            subsidy: "40% - 50% subsidy for purchasing tractors, power tillers, and seed drills",
            eligibility: "Small and marginal farmers holding valid land records",
            status: "Active"
          },
          {
            id: 2,
            title: "PM-KUSUM Scheme (Solar Pump Subsidy)",
            subsidy: "Up to 60% financial assistance for solar agriculture pump installations",
            eligibility: "Individual farmers, cooperatives, and village councils",
            status: "Active"
          },
          {
            id: 3,
            title: "Tractor & Rotavator Subsidy (Tamil Nadu Govt)",
            subsidy: "₹35,000 to ₹85,000 flat subsidy based on machinery HP capacity",
            eligibility: "Registered farmers in Tamil Nadu state portal",
            status: "Active"
          }
        ],
        farmer_benefits: {
          subsidy_availed_ytd: 42000.00,
          active_applications: 1,
          benefit_tier: "Gold Category Farmer"
        }
      };
    }
    if (method === 'POST') {
      const annual_income = parseFloat(body.annual_income || 0.0);
      const land_size = parseFloat(body.land_size || 0.0);
      const machinery_cost = parseFloat(body.machinery_cost || 0.0);
      
      const eligible = annual_income >= 100000.0 && land_size >= 1.0;
      const max_loan_amount = eligible ? Math.min(machinery_cost * 0.85, annual_income * 2.5) : 0.0;
      
      return {
        eligible,
        max_loan_amount: Math.round(max_loan_amount),
        interest_rate_percent: 7.4,
        repayment_years: 5,
        subsidy_eligible_amount: eligible ? Math.round(machinery_cost * 0.4) : 0.0,
        message: "Loan eligibility checked successfully via AgriRent AI integration module."
      };
    }
  }

  // 22. AI Computer Vision Damage Detection
  if (cleanEndpoint.startsWith('/api/bookings/') && cleanEndpoint.endsWith('/damage/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[3]);
    const booking = db.bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found.");
    
    const before_image = body.before_rental_image;
    const after_image = body.after_rental_image;
    
    // Simulate computer vision comparison
    let severity = "None";
    if (after_image.toLowerCase().includes("damage") || after_image.toLowerCase().includes("broken")) {
      severity = "Severe";
    } else if (after_image.toLowerCase().includes("dent") || after_image.toLowerCase().includes("bend")) {
      severity = "Medium";
    } else if (after_image.toLowerCase().includes("scratch") || after_image.toLowerCase().includes("dusty")) {
      severity = "Light";
    }
    
    booking.before_rental_image = before_image;
    booking.after_rental_image = after_image;
    booking.damage_severity = severity;
    
    let dispute_report = "AgriRent AI CV Audit verified: No structural discrepancies detected between before and after rental states.";
    if (severity !== "None") {
      dispute_report = `AgriRent AI CV Audit detected discrepancies in machine frame. Severity: ${severity}. Alternator / guard shield dented. Estimated penalty amount: ₹2500.`;
      booking.damage_dispute_report = dispute_report;
    } else {
      booking.damage_dispute_report = dispute_report;
    }
    
    saveMockDB(db);
    return {
      booking_id: booking.id,
      damage_severity: severity,
      damage_report: dispute_report,
      repair_cost_estimate: severity !== "None" ? 2500.00 : 0.0,
      dispute_status: severity !== "None" ? "Raised" : "None"
    };
  }

  // Ensure mock db arrays exist
  if (!db.operator_profiles) db.operator_profiles = [];
  if (!db.operator_assignments) db.operator_assignments = [];

  // --- OPERATOR MOCK ENDPOINTS ---

  // Operator Profile GET / PUT
  if (cleanEndpoint === '/api/operator/profile/' && method === 'GET') {
    let profile = db.operator_profiles.find(p => p.user_id === (currentUser?.id || 4));
    if (!profile) {
      profile = {
        id: db.operator_profiles.length + 1,
        user_id: currentUser ? currentUser.id : 4,
        username: currentUser ? currentUser.username : 'operator',
        full_name: currentUser ? currentUser.username.toUpperCase() : 'Operator',
        phone: currentUser ? currentUser.phone_number : '+919876543213',
        experience_years: 5,
        skills: ['Tractor Operation', 'Harvester Operation'],
        supported_machinery: ['Tractor', 'Harvester'],
        service_area: 'Coimbatore Rural',
        service_radius_km: 30.0,
        current_latitude: 11.0250,
        current_longitude: 76.9620,
        working_hours: '06:00 AM - 07:30 PM',
        is_available: true,
        current_work_status: 'Available',
        verification_status: 'Verified',
        verification_notes: 'All licenses verified.',
        license_number: 'DL-TN-38-20180092',
        document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
        hourly_compensation_rate: 280.00,
        total_jobs_completed: 12,
        reliability_score: 4.9,
        aadhaar_kyc_status: 'Verified'
      };
      db.operator_profiles.push(profile);
      saveMockDB(db);
    }
    return profile;
  }

  if (cleanEndpoint === '/api/operator/profile/' && method === 'PUT') {
    let profile = db.operator_profiles.find(p => p.user_id === (currentUser?.id || 4));
    if (!profile) {
      profile = { id: db.operator_profiles.length + 1, user_id: currentUser?.id || 4, ...body };
      db.operator_profiles.push(profile);
    } else {
      Object.assign(profile, body);
    }
    saveMockDB(db);
    return profile;
  }

  // Operator Availability and Online toggle
  if (cleanEndpoint === '/api/operator/availability/' && (method === 'PATCH' || method === 'POST')) {
    let profile = db.operator_profiles.find(p => p.user_id === (currentUser?.id || 4));
    if (profile) {
      if (body.is_online !== undefined) {
        profile.is_online = body.is_online;
        if (body.is_online) {
          profile.is_available = true;
          if (profile.current_work_status === 'Offline') profile.current_work_status = 'Available';
        } else {
          profile.is_available = false;
          profile.current_work_status = 'Offline';
        }
      }
      if (body.is_available !== undefined) {
        profile.is_available = body.is_available;
        profile.current_work_status = body.is_available ? 'Available' : 'Offline';
      }
      if (body.current_work_status) profile.current_work_status = body.current_work_status;
      if (body.current_latitude && body.current_longitude) {
        profile.current_latitude = parseFloat(body.current_latitude);
        profile.current_longitude = parseFloat(body.current_longitude);
      }
      profile.last_seen_at = new Date().toISOString();
      saveMockDB(db);
      return profile;
    }
    throw new Error("Operator profile not found.");
  }

  // Nearby online operators list
  if (cleanEndpoint === '/api/operator/nearby/' && method === 'GET') {
    return (db.operator_profiles || []).filter(p => p.is_online).map(p => ({
      id: p.id,
      user_id: p.user_id,
      name: p.full_name || p.username,
      phone: p.phone,
      rating: p.reliability_score || 4.9,
      latitude: p.current_latitude,
      longitude: p.current_longitude,
      is_online: p.is_online,
      is_available: p.is_available,
      work_status: p.current_work_status,
      distance_km: 4.8,
      service_radius_km: p.service_radius_km,
      supported_machinery: p.supported_machinery,
      hourly_rate: p.hourly_compensation_rate
    }));
  }

  // Machine Owner request operator for booking
  if (cleanEndpoint.startsWith('/api/operator/request/') && method === 'POST') {
    const bId = parseInt(cleanEndpoint.split('/')[4]);
    const booking = db.bookings.find(b => b.id === bId);
    if (!booking) throw new Error("Booking not found.");
    booking.requires_operator = true;

    let opProfile = db.operator_profiles.find(p => p.is_online && p.verification_status === 'Verified') || db.operator_profiles[0];
    const newAssign = {
      id: (db.operator_assignments?.length || 0) + 1,
      booking: booking.id,
      booking_id: booking.id,
      operator: opProfile.id,
      operator_name: opProfile.full_name,
      operator_username: opProfile.username,
      operator_phone: opProfile.phone,
      operator_rating: opProfile.reliability_score,
      status: 'REQUESTED',
      compensation_amount: 650.00,
      pickup_latitude: booking.equipment_details?.location_latitude || 11.0168,
      pickup_longitude: booking.equipment_details?.location_longitude || 76.9558,
      pickup_address: booking.equipment_details?.address || "Coimbatore, Tamil Nadu",
      destination_latitude: 10.9850,
      destination_longitude: 76.9750,
      destination_address: "Farmer Field, Coimbatore Rural",
      current_operator_lat: opProfile.current_latitude,
      current_operator_lng: opProfile.current_longitude,
      estimated_travel_distance_km: 7.2,
      estimated_arrival_minutes: 18,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      farmer_name: booking.farmer_name,
      owner_name: booking.equipment_details?.owner_name || "owner",
      machine_title: booking.equipment_details?.title,
      machine_category: booking.equipment_details?.category,
      machine_image: booking.equipment_details?.image_url,
      start_date: booking.start_date,
      end_date: booking.end_date,
      requested_at: new Date().toISOString()
    };
    db.operator_assignments.push(newAssign);
    saveMockDB(db);
    return newAssign;
  }

  // Operator Dashboard
  if (cleanEndpoint === '/api/operator/dashboard/' && method === 'GET') {
    let profile = db.operator_profiles.find(p => p.user_id === (currentUser?.id || 4));
    if (!profile) {
      profile = {
        id: 1, user_id: currentUser?.id || 4, username: currentUser?.username || 'operator',
        full_name: 'Ramesh Kumar', phone: '+919876543213', experience_years: 6,
        skills: ['Tractor Operation', 'Harvester Operation'],
        supported_machinery: ['Tractor', 'Harvester'],
        service_area: 'Coimbatore & Tiruppur Rural',
        service_radius_km: 35.0,
        current_latitude: 11.0250, current_longitude: 76.9620,
        working_hours: '06:00 AM - 07:30 PM',
        is_available: true, current_work_status: 'Available',
        verification_status: 'Verified',
        license_number: 'DL-TN-38-20180092',
        hourly_compensation_rate: 280.00,
        total_jobs_completed: 14,
        reliability_score: 4.9,
        aadhaar_kyc_status: 'Verified'
      };
      db.operator_profiles.push(profile);
    }

    const allJobs = db.operator_assignments.filter(j => j.operator === profile.id || j.operator_username === (currentUser?.username || 'operator'));
    const newRequests = allJobs.filter(j => j.status === 'REQUESTED');
    const activeJobs = allJobs.filter(j => ['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS'].includes(j.status));
    const upcomingJobs = allJobs.filter(j => j.status === 'ACCEPTED');
    const completedJobs = allJobs.filter(j => j.status === 'COMPLETED');
    const historyJobs = allJobs.filter(j => ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(j.status));

    const totalEarnings = completedJobs.reduce((acc, curr) => acc + (parseFloat(curr.compensation_amount) || 0), 0);
    const pendingEarnings = activeJobs.reduce((acc, curr) => acc + (parseFloat(curr.compensation_amount) || 0), 0);

    const userNotifs = (db.notifications || []).filter(n => n.user === (currentUser?.id || 4));

    return {
      profile,
      summary: {
        total_jobs_completed: completedJobs.length + (profile.total_jobs_completed || 14),
        active_jobs_count: activeJobs.length,
        upcoming_jobs_count: upcomingJobs.length,
        pending_requests_count: newRequests.length,
        total_earnings: totalEarnings > 0 ? totalEarnings : 3920.00,
        pending_earnings: pendingEarnings,
        acceptance_rate: 96.5,
        completion_rate: 100.0,
        total_hours_worked: 78.0,
        total_distance_covered: 142.5,
        rating: profile.reliability_score || 4.9,
        verification_status: profile.verification_status,
        is_available: profile.is_available,
        current_work_status: profile.current_work_status
      },
      new_requests: newRequests,
      active_jobs: activeJobs,
      upcoming_jobs: upcomingJobs,
      completed_jobs: completedJobs,
      history_jobs: historyJobs,
      notifications: userNotifs,
      nearby_available_jobs: [
        {
          booking_id: 101,
          machine_title: "Mahindra 575 DI Tractor",
          category: "Tractor",
          machine_image: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600",
          farmer_name: "farmer3",
          owner_name: "owner",
          pickup_address: "Annur, Coimbatore",
          distance_km: 7.2,
          estimated_payout: 650.00,
          start_date: new Date(Date.now() + 86400000).toISOString(),
          end_date: new Date(Date.now() + 172800000).toISOString()
        }
      ]
    };
  }

  // Operator Accept Job
  if (cleanEndpoint.startsWith('/api/operator/jobs/') && cleanEndpoint.endsWith('/accept/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const job = db.operator_assignments.find(j => j.id === id);
    if (!job) throw new Error("Job assignment not found.");

    job.status = 'ACCEPTED';
    job.accepted_at = new Date().toISOString();
    job.estimated_arrival_minutes = job.estimated_arrival_minutes || 20;

    // Link booking
    const booking = db.bookings.find(b => b.id === job.booking || b.id === job.booking_id);
    if (booking) {
      booking.operator_assigned = currentUser?.id || 4;
      booking.requires_operator = true;
    }

    db.notifications.push({
      id: db.notifications.length + 1,
      user: job.owner_id || 2,
      content: `Operator ${currentUser?.username || 'operator'} accepted booking #${job.booking_id}. Arriving to collect machine in ~${job.estimated_arrival_minutes} mins.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    db.notifications.push({
      id: db.notifications.length + 1,
      user: job.farmer_id || 1,
      content: `Operator ${currentUser?.username || 'operator'} is assigned to your booking #${job.booking_id}.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveMockDB(db);
    return job;
  }

  // Operator Reject Job
  if (cleanEndpoint.startsWith('/api/operator/jobs/') && cleanEndpoint.endsWith('/reject/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const job = db.operator_assignments.find(j => j.id === id);
    if (job) {
      job.status = 'REJECTED';
      job.rejected_at = new Date().toISOString();
      job.rejection_reason = body.reason || 'Declined by operator';
      saveMockDB(db);
      return { message: "Job rejected successfully.", assignment_id: job.id, status: 'REJECTED' };
    }
    throw new Error("Job assignment not found.");
  }

  // Operator Status Transition
  if (cleanEndpoint.startsWith('/api/operator/jobs/') && cleanEndpoint.endsWith('/status/') && (method === 'PATCH' || method === 'POST')) {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const job = db.operator_assignments.find(j => j.id === id);
    if (!job) throw new Error("Job assignment not found.");

    const oldStatus = job.status;
    const targetStatus = body.status;
    job.status = targetStatus;
    if (body.note) job.status_notes = body.note;

    if (body.latitude && body.longitude) {
      job.current_operator_lat = parseFloat(body.latitude);
      job.current_operator_lng = parseFloat(body.longitude);
    }

    if (!job.status_history) job.status_history = [];
    job.status_history.push({
      id: job.status_history.length + 1,
      from_status: oldStatus,
      to_status: targetStatus,
      recorded_at: new Date().toISOString(),
      note: body.note || ''
    });

    if (targetStatus === 'MACHINE_COLLECTED') {
      job.machine_collected_at = new Date().toISOString();
    } else if (targetStatus === 'ARRIVED_AT_FARM') {
      job.farm_arrival_at = new Date().toISOString();
    } else if (targetStatus === 'IN_PROGRESS') {
      job.work_started_at = new Date().toISOString();
      const booking = db.bookings.find(b => b.id === (job.booking || job.booking_id));
      if (booking) booking.status = 'In Progress';
    } else if (targetStatus === 'COMPLETED') {
      job.completed_at = new Date().toISOString();
      const booking = db.bookings.find(b => b.id === (job.booking || job.booking_id));
      if (booking) {
        booking.status = 'Completed';
        booking.escrow_status = 'Released';
      }
    }

    saveMockDB(db);
    return job;
  }

  // Operator GPS location update
  if (cleanEndpoint.startsWith('/api/operator/jobs/') && cleanEndpoint.endsWith('/location/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const job = db.operator_assignments.find(j => j.id === id);
    if (job) {
      job.current_operator_lat = parseFloat(body.latitude);
      job.current_operator_lng = parseFloat(body.longitude);
      job.estimated_arrival_minutes = Math.max(1, (job.estimated_arrival_minutes || 10) - 1);
      saveMockDB(db);
      return {
        assignment_id: job.id,
        status: job.status,
        current_lat: job.current_operator_lat,
        current_lng: job.current_operator_lng,
        estimated_arrival_minutes: job.estimated_arrival_minutes
      };
    }
    throw new Error("Job not found.");
  }

  // Operator Tracking endpoint
  if (cleanEndpoint.startsWith('/api/operator/jobs/') && cleanEndpoint.endsWith('/tracking/') && method === 'GET') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const job = db.operator_assignments.find(j => j.id === id);
    if (job) {
      return {
        assignment_id: job.id,
        booking_id: job.booking_id || job.booking,
        status: job.status,
        machine_title: job.machine_title || "John Deere Tractor",
        operator: {
          name: job.operator_name || "Ramesh Kumar",
          phone: job.operator_phone || "+919876543213",
          rating: 4.9,
          current_latitude: job.current_operator_lat || 11.0250,
          current_longitude: job.current_operator_lng || 76.9620
        },
        pickup: {
          address: job.pickup_address || "Coimbatore, Tamil Nadu",
          latitude: job.pickup_latitude || 11.0168,
          longitude: job.pickup_longitude || 76.9558,
          owner_name: job.owner_name || "owner",
          owner_phone: job.owner_phone || "+919876543212"
        },
        destination: {
          address: job.destination_address || "Farmer Field, Pollachi Road, Coimbatore",
          latitude: job.destination_latitude || 10.9850,
          longitude: job.destination_longitude || 76.9750,
          farmer_name: job.farmer_name || "farmer",
          farmer_phone: job.farmer_phone || "+919876543211"
        },
        eta: {
          distance_km: job.estimated_travel_distance_km || 6.4,
          minutes: job.estimated_arrival_minutes || 15,
          timestamp: new Date(Date.now() + 15 * 60000).toISOString()
        },
        milestones: {
          requested_at: job.requested_at,
          accepted_at: job.accepted_at,
          pickup_arrival_at: job.pickup_arrival_at,
          machine_collected_at: job.machine_collected_at,
          farm_arrival_at: job.farm_arrival_at,
          work_started_at: job.work_started_at,
          completed_at: job.completed_at
        }
      };
    }
    throw new Error("Job not found.");
  }

  // Admin Operator Verifications list & update
  if (cleanEndpoint === '/api/operator/verifications/' && method === 'GET') {
    return db.operator_profiles || [];
  }

  if (cleanEndpoint.startsWith('/api/operator/verifications/') && method === 'POST') {
    const id = parseInt(cleanEndpoint.split('/')[4]);
    const op = db.operator_profiles.find(p => p.id === id);
    if (op) {
      op.verification_status = body.verification_status || 'Verified';
      op.verification_notes = body.verification_notes || 'Approved by Admin';
      saveMockDB(db);
      return op;
    }
    throw new Error("Operator profile not found.");
  }


  // Ensure payments mock array
  if (!db.payment_transactions) db.payment_transactions = [];

  // 23. Razorpay Create Order Mock
  if (cleanEndpoint === '/api/payments/razorpay/order/' && method === 'POST') {
    const booking = db.bookings.find(b => b.id === parseInt(body.booking_id));
    if (!booking) throw new Error("Booking not found.");

    const orderId = `order_test_${Math.random().toString(36).substring(2, 12)}`;
    booking.razorpay_order_id = orderId;

    const tx = {
      id: db.payment_transactions.length + 1,
      booking: booking.id,
      farmer: currentUser?.id || 1,
      farmer_name: currentUser?.username || 'farmer',
      equipment_title: booking.equipment_details?.title,
      razorpay_order_id: orderId,
      amount: parseFloat(booking.total_cost),
      currency: 'INR',
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    db.payment_transactions.push(tx);
    saveMockDB(db);

    return {
      order_id: orderId,
      key_id: "rzp_test_AgriRentDemoKey123",
      amount: Math.round(parseFloat(booking.total_cost) * 100),
      amount_in_rupees: parseFloat(booking.total_cost),
      currency: "INR",
      receipt: `rcpt_mock_${booking.id}`,
      booking_id: booking.id,
      equipment_title: booking.equipment_details?.title,
      farmer: {
        name: currentUser?.username || "farmer",
        email: currentUser?.email || "farmer@agrirent.com",
        contact: currentUser?.phone_number || "+919876543211"
      }
    };
  }

  // 24. Razorpay Verify Payment Mock
  if (cleanEndpoint === '/api/payments/razorpay/verify/' && method === 'POST') {
    const booking = db.bookings.find(b => b.id === parseInt(body.booking_id) || b.razorpay_order_id === body.razorpay_order_id);
    if (!booking) throw new Error("Booking not found.");

    booking.payment_status = 'Captured';
    booking.razorpay_payment_id = body.razorpay_payment_id || `pay_test_${Math.random().toString(36).substring(2, 12)}`;
    booking.paid_at = new Date().toISOString();
    booking.escrow_status = 'Held';

    let tx = db.payment_transactions.find(t => t.razorpay_order_id === body.razorpay_order_id);
    if (tx) {
      tx.status = 'Captured';
      tx.razorpay_payment_id = booking.razorpay_payment_id;
      tx.updated_at = new Date().toISOString();
    } else {
      tx = {
        id: db.payment_transactions.length + 1,
        booking: booking.id,
        farmer: currentUser?.id || 1,
        farmer_name: currentUser?.username || 'farmer',
        equipment_title: booking.equipment_details?.title,
        razorpay_order_id: body.razorpay_order_id,
        razorpay_payment_id: booking.razorpay_payment_id,
        amount: parseFloat(booking.total_cost),
        currency: 'INR',
        status: 'Captured',
        created_at: new Date().toISOString()
      };
      db.payment_transactions.push(tx);
    }

    db.notifications.push({
      id: db.notifications.length + 1,
      user: currentUser?.id || 1,
      content: `Payment of ₹${booking.total_cost} verified for Booking #${booking.id}. Razorpay ID: ${booking.razorpay_payment_id}.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveMockDB(db);
    return {
      status: "success",
      message: "Payment verified and recorded successfully.",
      booking,
      transaction: tx
    };
  }

  // 25. Farmer Payment History Mock
  if (cleanEndpoint === '/api/payments/history/' && method === 'GET') {
    return (db.payment_transactions || []).filter(t => !currentUser || t.farmer === currentUser.id);
  }

  // 26. Razorpay Refund Request Mock
  if (cleanEndpoint.startsWith('/api/payments/refund/') && method === 'POST') {
    const bId = parseInt(cleanEndpoint.split('/')[4]);
    const booking = db.bookings.find(b => b.id === bId);
    if (!booking) throw new Error("Booking not found.");

    booking.payment_status = 'Refunded';
    booking.escrow_status = 'Refunded';
    booking.status = 'Rejected';

    const refundId = `rfnd_mock_${Math.random().toString(36).substring(2, 12)}`;
    const tx = db.payment_transactions.find(t => t.booking === bId);
    if (tx) {
      tx.status = 'Refunded';
      tx.refund_id = refundId;
      tx.refund_amount = parseFloat(booking.total_cost);
    }

    saveMockDB(db);
    return {
      status: "success",
      message: "Refund processed successfully.",
      refund_id: refundId,
      refund_amount: parseFloat(booking.total_cost)
    };
  }


  // 27. Nearby Equipment Mock Handler
  if (cleanEndpoint.startsWith('/api/equipment/nearby/') && method === 'GET') {
    const urlObj = new URL('http://localhost' + endpoint);
    const lat = parseFloat(urlObj.searchParams.get('lat') || 11.0168);
    const lng = parseFloat(urlObj.searchParams.get('lng') || 76.9558);
    const radius = parseFloat(urlObj.searchParams.get('radius') || 50);
    const category = (urlObj.searchParams.get('category') || '').toLowerCase();
    const search = (urlObj.searchParams.get('search') || '').toLowerCase();
    const maxPrice = parseFloat(urlObj.searchParams.get('max_price') || 999999);
    const avail = urlObj.searchParams.get('availability') || 'all';

    let list = (db.equipment || []).map(eq => {
      const eqLat = parseFloat(eq.location_latitude || 11.0168);
      const eqLng = parseFloat(eq.location_longitude || 76.9558);
      const dLat = (eqLat - lat) * Math.PI / 180;
      const dLng = (eqLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(eqLat*Math.PI/180) * Math.sin(dLng/2)**2;
      const dist = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
      return {
        ...eq,
        distance_km: dist,
        rental_price_per_day: Math.round(parseFloat(eq.rental_price_per_hour || 1200) * 8),
        effective_available: eq.is_available !== false,
        delivery_charge_estimate: Math.max(150, Math.round(dist * 18))
      };
    });

    if (radius) list = list.filter(e => e.distance_km <= radius);
    if (category && category !== 'all') list = list.filter(e => (e.category || '').toLowerCase() === category);
    if (search) list = list.filter(e => (e.title || '').toLowerCase().includes(search) || (e.description || '').toLowerCase().includes(search));
    if (maxPrice) list = list.filter(e => parseFloat(e.rental_price_per_hour || 0) <= maxPrice);
    if (avail === 'available') list = list.filter(e => e.effective_available);
    if (avail === 'busy') list = list.filter(e => !e.effective_available);

    return {
      farmer_location: { latitude: lat, longitude: lng, radius_km: radius },
      total_found: list.length,
      results: list
    };
  }

  // 28. Validate Cart Booking Mock Handler
  if (cleanEndpoint === '/api/cart/validate/' && method === 'POST') {
    const items = body.items || (body.equipment_id ? [body] : []);
    let totalCart = 0;
    const validated = items.map(item => {
      const eq = (db.equipment || []).find(e => e.id === (item.equipment_id || item.equipment)) || {};
      const hourly = parseFloat(eq.rental_price_per_hour || item.hourly_rate || 1200);
      const daily = hourly * 8;
      const isDaily = item.rental_type === 'daily';
      const dur = parseFloat(item.duration || 4);
      const rentalBase = isDaily ? (daily * dur) : (hourly * dur);
      const opCharge = item.requires_operator ? (350 * Math.max(1, Math.ceil(dur / (isDaily ? 1 : 8)))) : 0;
      const delCharge = item.delivery_option === 'Delivery' ? (item.delivery_charge || 500) : 0;
      const insCharge = item.insurance_opt_in ? (150 * Math.max(1, Math.ceil(dur / (isDaily ? 1 : 24)))) : 0;
      const gst = Math.round((rentalBase + opCharge + delCharge + insCharge) * 0.05);
      const itemTot = rentalBase + opCharge + delCharge + insCharge + gst;
      totalCart += itemTot;

      return {
        ...item,
        equipment_title: eq.title || item.equipment_title,
        equipment_category: eq.category || item.equipment_category,
        rental_base_amount: rentalBase,
        operator_charge: opCharge,
        delivery_charge: delCharge,
        insurance_charge: insCharge,
        gst_tax: gst,
        item_total: itemTot,
        is_available: true
      };
    });

    return {
      valid: true,
      items: validated,
      total_cart_amount: totalCart,
      currency: "INR",
      has_conflicts: false
    };
  }

  throw new Error(`Endpoint mock handler not found for: ${method} ${endpoint}`);
};

// --- API FETCH INTERCEPTOR HOOKS ---

// --- API FETCH INTERCEPTOR HOOKS ---

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getSafeStorageItem('accessToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh token rotation handler to prevent infinite loops and handle expiration
  const refreshAuthToken = async () => {
    const refreshToken = getSafeStorageItem('refreshToken');
    if (!refreshToken || refreshToken.startsWith('mock-')) return null;

    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const data = await response.json();
      if (data.access) {
        setSafeStorageItem('accessToken', data.access);
        setToken(data.access);
        if (data.refresh) {
          setSafeStorageItem('refreshToken', data.refresh);
        }
        return data.access;
      }
    } catch (e) {
      console.warn("Token refresh attempt failed:", e.message);
      logout();
      return null;
    }
    return null;
  };

  const apiFetch = async (endpoint, options = {}) => {
    const isMockExplicit = localStorage.getItem('agrirent_use_mock_mode') === 'true';
    const localToken = getSafeStorageItem('accessToken');

    if (isMockExplicit || (localToken && localToken.startsWith('mock-'))) {
      return await mockApiRouter(endpoint, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let activeToken = token || getSafeStorageItem('accessToken');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    try {
      let response = await fetch(`${BACKEND_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 token expiration by attempting refresh once
      if (response.status === 401 && activeToken && !endpoint.includes('/api/auth/')) {
        const newAccess = await refreshAuthToken();
        if (newAccess) {
          headers['Authorization'] = `Bearer ${newAccess}`;
          response = await fetch(`${BACKEND_BASE}${endpoint}`, {
            ...options,
            headers,
          });
        }
      }

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          errData = { error: `Server returned HTTP ${response.status}: ${response.statusText || 'Error'}` };
        }
        const errorMsg = errData.error || errData.detail || (typeof errData === 'object' ? Object.values(errData).flat().join(' ') : JSON.stringify(errData));
        throw new Error(errorMsg);
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (e) {
      // Security & Production requirement:
      // Real authentication workflows (register, verify, login, password reset) must NEVER silently failover to mock router.
      // If the real backend is unreachable or down, throw a clear service-unavailable error.
      const isAuthEndpoint = endpoint.startsWith('/api/auth/');
      const isNetworkFailure = e.name === 'TypeError' || e.message?.toLowerCase().includes('failed to fetch') || e.message?.toLowerCase().includes('network');

      if (isAuthEndpoint && !isMockExplicit && !(localToken && localToken.startsWith('mock-'))) {
        if (isNetworkFailure) {
          // If the WSGI host is offline, we forward to supabaseBackend in login/register/verify
          throw new Error("AgriRent WSGI Server unreachable. Falling over to direct Supabase Database...");
        }
        throw e;
      }

      // For non-critical non-auth dashboard browse endpoints (e.g. equipment explore), fallback to local mock engine if remote server is unreachable
      if (isNetworkFailure) {
        console.warn(`[AgriRent API] Remote backend unreachable (${e.message}). Failing over to local mock engine for ${endpoint}`);
        return await mockApiRouter(endpoint, options);
      }

      // If the backend actually responded with an HTTP error (400, 401, 403, 404, etc.), rethrow that error so real validation errors surface
      throw e;
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const activeToken = getSafeStorageItem('accessToken');
      if (activeToken) {
        try {
          const profile = await apiFetch('/api/auth/me/');
          setUser(profile);
        } catch (e) {
          console.error("Failed to restore profile session:", e.message);
          logout();
        }
      }
      setLoading(false);
    };
    bootstrapAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({
          email: emailOrUsername,
          username: emailOrUsername,
          password
        })
      });
      setSafeStorageItem('accessToken', data.token.access);
      setSafeStorageItem('refreshToken', data.token.refresh);
      setToken(data.token.access);
      setUser(data.user);
      return data;
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        // Automatically query live Supabase PostgreSQL database directly!
        console.info("[AgriRent] Remote WSGI backend unavailable; executing direct authentication via Supabase database...");
        try {
          const sbRes = await supabaseBackend.login(emailOrUsername, password);
          setSafeStorageItem('accessToken', sbRes.token.access);
          setSafeStorageItem('refreshToken', sbRes.token.refresh);
          setToken(sbRes.token.access);
          setUser(sbRes.user);
          return sbRes;
        } catch (sbErr) {
          setError(sbErr.message);
          throw sbErr;
        }
      }
      setError(e.message);
      throw e;
    }
  };

  const register = async (username, email, password, role, phone_number) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role, phone_number })
      });
      if (data.token) {
        setSafeStorageItem('accessToken', data.token.access);
        setSafeStorageItem('refreshToken', data.token.refresh);
        setToken(data.token.access);
        setUser(data.user);
      }
      return data;
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        console.info("[AgriRent] Remote WSGI backend unavailable; registering user directly in Supabase PostgreSQL database...");
        try {
          const sbRes = await supabaseBackend.register(username, email, password, role, phone_number);
          if (sbRes.token) {
            setSafeStorageItem('accessToken', sbRes.token.access);
            setSafeStorageItem('refreshToken', sbRes.token.refresh);
            setToken(sbRes.token.access);
            setUser(sbRes.user);
          }
          return sbRes;
        } catch (sbErr) {
          setError(sbErr.message);
          throw sbErr;
        }
      }
      setError(e.message);
      throw e;
    }
  };

  const verifyEmail = async (email, tokenOrCode) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/verify-email/', {
        method: 'POST',
        body: JSON.stringify({
          email,
          token: tokenOrCode,
          otp_code: tokenOrCode
        })
      });
      if (data.token) {
        setSafeStorageItem('accessToken', data.token.access);
        setSafeStorageItem('refreshToken', data.token.refresh);
        setToken(data.token.access);
        setUser(data.user);
      }
      return data;
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        console.info("[AgriRent] Remote WSGI backend unavailable; verifying email directly in Supabase PostgreSQL database...");
        try {
          const sbRes = await supabaseBackend.verifyEmail(email, tokenOrCode);
          if (sbRes.token) {
            setSafeStorageItem('accessToken', sbRes.token.access);
            setSafeStorageItem('refreshToken', sbRes.token.refresh);
            setToken(sbRes.token.access);
            setUser(sbRes.user);
          }
          return sbRes;
        } catch (sbErr) {
          setError(sbErr.message);
          throw sbErr;
        }
      }
      setError(e.message);
      throw e;
    }
  };

  const resendVerificationCode = async (emailOrUsername) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/resend-code/', {
        method: 'POST',
        body: JSON.stringify({
          email: emailOrUsername,
          username: emailOrUsername
        })
      });
      return data;
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        console.info("[AgriRent] Remote WSGI backend unavailable; generating new code directly in Supabase PostgreSQL database...");
        try {
          return await supabaseBackend.resendCode(emailOrUsername);
        } catch (sbErr) {
          setError(sbErr.message);
          throw sbErr;
        }
      }
      setError(e.message);
      throw e;
    }
  };

  const verifyOtp = verifyEmail;

  const logout = async () => {
    const refreshToken = getSafeStorageItem('refreshToken');
    if (refreshToken && !refreshToken.startsWith('mock-') && !refreshToken.startsWith('sb-')) {
      try {
        await apiFetch('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken })
        });
      } catch (e) {
        console.warn("Logout server revocation skipped:", e.message);
      }
    }
    removeSafeStorageItem('accessToken');
    removeSafeStorageItem('refreshToken');
    removeSafeStorageItem('agrirent_use_mock_mode');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const forgotPassword = async (emailOrUsername) => {
    try {
      return await apiFetch('/api/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({
          email: emailOrUsername,
          username: emailOrUsername
        })
      });
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        console.info("[AgriRent] Remote WSGI backend unavailable; creating password reset code directly in Supabase...");
        return await supabaseBackend.forgotPassword(emailOrUsername);
      }
      throw e;
    }
  };

  const resetPassword = async (emailOrUsername, tokenOrCode, new_password) => {
    try {
      return await apiFetch('/api/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({
          email: emailOrUsername,
          username: emailOrUsername,
          token: tokenOrCode,
          otp_code: tokenOrCode,
          new_password
        })
      });
    } catch (e) {
      const isNetworkError = e.message?.includes('unreachable') || e.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        console.info("[AgriRent] Remote WSGI backend unavailable; resetting password directly in Supabase...");
        return await supabaseBackend.resetPassword(emailOrUsername, tokenOrCode, new_password);
      }
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      verifyEmail,
      verifyOtp,
      resendVerificationCode,
      logout,
      forgotPassword,
      resetPassword,
      apiFetch,
      backendUrl: BACKEND_BASE
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
