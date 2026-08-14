import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const BACKEND_BASE = "http://127.0.0.1:8000";

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
  try {
    const dbStr = localStorage.getItem('agrirent_mock_db');
    if (dbStr) {
      return JSON.parse(dbStr);
    }
  } catch (e) {
    console.error("Failed to read mock db:", e);
  }

  // Generate 20 Farmers
  const mockUsers = [
    { id: 1, username: 'farmer', role: 'Farmer', email: 'farmer@agrirent.com', phone_number: '+919876543211', is_verified: true, otp_code: '123456', password: 'password123' },
    { id: 2, username: 'owner', role: 'Owner', email: 'owner@agrirent.com', phone_number: '+919876543212', is_verified: true, otp_code: '123456', password: 'password123' },
    { id: 3, username: 'admin', role: 'Admin', email: 'admin@agrirent.com', phone_number: '+919876543210', is_verified: true, otp_code: '123456', password: 'password123' },
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
      password: 'password123'
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
      password: 'password123'
    });
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

  const defaultDB = {
    users: mockUsers,
    equipment: mockEquipment,
    bookings: mockBookings,
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
    const { username, password } = body;
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && password === 'password123') {
      const mockToken = `mock-token-${user.id}`;
      return {
        token: { access: mockToken, refresh: `mock-refresh-${user.id}` },
        user: { id: user.id, username: user.username, email: user.email, role: user.role, phone_number: user.phone_number, is_verified: user.is_verified }
      };
    }
    throw new Error("Invalid credentials.");
  }

  // 2. Register
  if (cleanEndpoint === '/api/auth/register/' && method === 'POST') {
    const { username, email, password, role, phone_number } = body;
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already exists.");
    }
    const newUser = {
      id: db.users.length + 1,
      username,
      email,
      role: role || 'Farmer',
      phone_number: phone_number || '',
      is_verified: false,
      otp_code: '123456',
      password: password || 'password123'
    };
    db.users.push(newUser);
    saveMockDB(db);
    return {
      message: "User registered successfully. Please verify your OTP.",
      username: newUser.username,
      otp_sent_to: newUser.phone_number || newUser.email
    };
  }

  // 3. Verify OTP
  if (cleanEndpoint === '/api/auth/verify-otp/' && method === 'POST') {
    const { username, otp_code } = body;
    const user = db.users.find(u => u.username === username);
    if (user && otp_code === '123456') {
      user.is_verified = true;
      saveMockDB(db);
      const mockToken = `mock-token-${user.id}`;
      return {
        message: "OTP verified successfully. User is now active.",
        token: { access: mockToken, refresh: `mock-refresh-${user.id}` },
        user: { id: user.id, username: user.username, email: user.email, role: user.role, phone_number: user.phone_number, is_verified: user.is_verified }
      };
    }
    throw new Error("Invalid OTP code.");
  }

  // 4. Forgot password
  if (cleanEndpoint === '/api/auth/forgot-password/' && method === 'POST') {
    return { message: "Password reset OTP sent to registered number." };
  }

  // 5. Reset password
  if (cleanEndpoint === '/api/auth/reset-password/' && method === 'POST') {
    const { username, otp_code, new_password } = body;
    const user = db.users.find(u => u.username === username);
    if (user && otp_code === '123456') {
      user.password = new_password;
      user.is_verified = true;
      saveMockDB(db);
      return { message: "Password reset successfully. You can now login." };
    }
    throw new Error("Invalid OTP code.");
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

  throw new Error(`Endpoint mock handler not found for: ${method} ${endpoint}`);
};

// --- API FETCH INTERCEPTOR HOOKS ---

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getSafeStorageItem('accessToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiFetch = async (endpoint, options = {}) => {
    const localToken = getSafeStorageItem('accessToken');
    if (localToken && localToken.startsWith('mock-')) {
      return await mockApiRouter(endpoint, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          errData = { error: 'Network response was not OK' };
        }
        throw new Error(errData.error || errData.detail || JSON.stringify(errData));
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (e) {
      console.warn(`apiFetch falling back to Mock Database for ${endpoint} due to error:`, e.message);
      return await mockApiRouter(endpoint, options);
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (token) {
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
  }, [token]);

  const login = async (username, password) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setSafeStorageItem('accessToken', data.token.access);
      setSafeStorageItem('refreshToken', data.token.refresh);
      setToken(data.token.access);
      setUser(data.user);
      return data;
    } catch (e) {
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
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const verifyOtp = async (username, otp_code) => {
    setError(null);
    try {
      const data = await apiFetch('/api/auth/verify-otp/', {
        method: 'POST',
        body: JSON.stringify({ username, otp_code })
      });
      setSafeStorageItem('accessToken', data.token.access);
      setSafeStorageItem('refreshToken', data.token.refresh);
      setToken(data.token.access);
      setUser(data.user);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const logout = () => {
    removeSafeStorageItem('accessToken');
    removeSafeStorageItem('refreshToken');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const forgotPassword = async (username) => {
    return apiFetch('/api/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  };

  const resetPassword = async (username, otp_code, new_password) => {
    return apiFetch('/api/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify({ username, otp_code, new_password })
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      verifyOtp,
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
