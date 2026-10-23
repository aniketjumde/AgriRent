import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Category-specific high-contrast SVG marker icons
const getCategoryIconSvg = (category, color) => {
  const cat = (category || '').toLowerCase();
  let emoji = '🚜';
  if (cat.includes('harvester')) emoji = '🌾';
  else if (cat.includes('rotavator') || cat.includes('plough') || cat.includes('cultivator')) emoji = '⚙️';
  else if (cat.includes('sprayer') || cat.includes('protection')) emoji = '💧';
  else if (cat.includes('seed') || cat.includes('planter')) emoji = '🌱';

  return `
    <div class="relative flex items-center justify-center w-10 h-10 group cursor-pointer transition-transform duration-200 hover:scale-110">
      <div class="absolute w-9 h-9 rounded-2xl shadow-lg border-2 border-white flex items-center justify-center font-bold text-base" style="background-color: ${color}; color: white;">
        <span>${emoji}</span>
      </div>
      <div class="absolute -bottom-1 w-2.5 h-2.5 rotate-45 border-r-2 border-b-2 border-white" style="background-color: ${color};"></div>
    </div>
  `;
};

const createFarmerIcon = () => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute w-12 h-12 rounded-full animate-ping opacity-35 bg-blue-500"></div>
        <div class="relative w-8 h-8 rounded-full bg-blue-600 border-3 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
          📍
        </div>
      </div>
    `,
    className: 'farmer-gps-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -16]
  });
};

const createEquipmentMarker = (category, isAvailable) => {
  const color = isAvailable ? '#059669' : '#d97706'; // Emerald for available, Amber for busy
  return L.divIcon({
    html: getCategoryIconSvg(category, color),
    className: 'equipment-cat-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32]
  });
};

export default function MapComponent({
  listings = [],
  userLocation,
  radiusKm = 25,
  onLocationChange,
  onBookClick,
  onMarkerSelect,
  isDraggableFarm = true
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  const farmerMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const lat = userLocation?.latitude || 11.0168;
  const lng = userLocation?.longitude || 76.9558;

  // 1. Initialize Map instance
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const mapInstance = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance);

      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstance);

      // Handle map clicks to relocate farm if editable
      mapInstance.on('click', (e) => {
        if (onLocationChange) {
          onLocationChange({
            latitude: parseFloat(e.latlng.lat.toFixed(6)),
            longitude: parseFloat(e.latlng.lng.toFixed(6))
          });
        }
      });

      mapRef.current = mapInstance;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Update Farmer Location Marker & Search Radius Circle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (farmerMarkerRef.current) {
      map.removeLayer(farmerMarkerRef.current);
    }
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    // Add draggable farmer location pin
    const farmerMarker = L.marker([lat, lng], {
      icon: createFarmerIcon(),
      draggable: isDraggableFarm,
      title: "Your Farm / Current Location"
    }).addTo(map);

    farmerMarker.bindPopup(`
      <div class="p-2 font-sans text-xs">
        <strong class="text-blue-600 block text-sm">📍 Your Farm Service Point</strong>
        <p class="text-slate-500 mt-1">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
        <span class="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
          ${isDraggableFarm ? 'Drag pin or click map to change' : 'Fixed Point'}
        </span>
      </div>
    `);

    farmerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      if (onLocationChange) {
        onLocationChange({
          latitude: parseFloat(pos.lat.toFixed(6)),
          longitude: parseFloat(pos.lng.toFixed(6))
        });
      }
    });

    farmerMarkerRef.current = farmerMarker;

    // Radius visual circle overlay (coverage perimeter)
    const circle = L.circle([lat, lng], {
      radius: (radiusKm || 25) * 1000,
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 6'
    }).addTo(map);
    radiusCircleRef.current = circle;

  }, [lat, lng, radiusKm, isDraggableFarm, onLocationChange]);

  // 3. Update Equipment Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old equipment markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    listings.forEach(listing => {
      const eqLat = parseFloat(listing.location_latitude);
      const eqLng = parseFloat(listing.location_longitude);
      if (isNaN(eqLat) || isNaN(eqLng)) return;

      const isAvail = listing.effective_available ?? listing.is_available;
      const marker = L.marker([eqLat, eqLng], {
        icon: createEquipmentMarker(listing.category, isAvail),
        title: listing.title
      }).addTo(map);

      // Distance calculation
      const dist = listing.distance_km !== undefined ? listing.distance_km : (
        (6371 * 2 * Math.atan2(
          Math.sqrt(Math.sin(((eqLat - lat)*Math.PI/180)/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(eqLat*Math.PI/180)*Math.sin(((eqLng - lng)*Math.PI/180)/2)**2),
          Math.sqrt(1 - (Math.sin(((eqLat - lat)*Math.PI/180)/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(eqLat*Math.PI/180)*Math.sin(((eqLng - lng)*Math.PI/180)/2)**2))
        )).toFixed(1)
      );

      const popupDiv = document.createElement('div');
      popupDiv.className = "p-3 font-sans max-w-[240px] text-slate-800 dark:text-slate-100";
      popupDiv.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
            isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }">
            ${isAvail ? '● Available' : '● In Use / Reserved'}
          </span>
          <span class="text-[11px] font-bold text-blue-600">${dist} km away</span>
        </div>
        <h4 class="font-bold text-sm leading-tight text-slate-900 dark:text-white mb-1">${listing.title}</h4>
        <p class="text-xs text-slate-500 mb-2">${listing.category} • ${listing.address || 'Local Hub'}</p>
        <div class="flex items-baseline justify-between mb-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
          <div>
            <span class="text-xs text-slate-400 block">Rate / Hour</span>
            <span class="text-sm font-extrabold text-emerald-600">₹${listing.rental_price_per_hour}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Rate / Day</span>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">₹${listing.rental_price_per_day || (listing.rental_price_per_hour * 8)}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <button id="btn-view-${listing.id}" class="py-1.5 px-2 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-200">
            Details
          </button>
          <button id="btn-book-${listing.id}" class="py-1.5 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs">
            Rent Now
          </button>
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on('popupopen', () => {
        const viewBtn = document.getElementById(`btn-view-${listing.id}`);
        if (viewBtn) {
          viewBtn.onclick = () => {
            if (onMarkerSelect) onMarkerSelect(listing);
          };
        }
        const bookBtn = document.getElementById(`btn-book-${listing.id}`);
        if (bookBtn) {
          bookBtn.onclick = () => {
            if (onBookClick) onBookClick(listing);
          };
        }
      });

      marker.on('click', () => {
        if (onMarkerSelect) onMarkerSelect(listing);
      });

      markersRef.current.push(marker);
    });

  }, [listings, lat, lng, onMarkerSelect, onBookClick]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
      <div ref={containerRef} className="w-full h-full min-h-[420px]"></div>

      {/* Floating Interactive Controls (Recenter, Zoom, Farm Point) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          title="Recenter on My Farm Location"
          className="w-9 h-9 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-sm"
        >
          🎯
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-9 h-9 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-base"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-9 h-9 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-base"
        >
          −
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-semibold flex flex-wrap items-center gap-3 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block animate-pulse"></span>
          <span>Your Farm Point</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span>
          <span>Reserved / Busy</span>
        </div>
        <span className="text-[10px] text-slate-400 font-normal">
          Perimeter: {radiusKm} km radius
        </span>
      </div>
    </div>
  );
}
