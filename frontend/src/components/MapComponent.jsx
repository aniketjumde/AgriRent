import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const createCustomIcon = (color) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full animate-ping opacity-25" style="background-color: ${color}"></div>
        <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-md" style="background-color: ${color}"></div>
      </div>
    `,
    className: 'custom-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10]
  });
};

export default function MapComponent({ listings, userLocation, onBookClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);

  const defaultLat = userLocation?.latitude || 11.0168;
  const defaultLng = userLocation?.longitude || 76.9558;

  useEffect(() => {
    // 1. Initialize Map
    if (!mapRef.current && containerRef.current) {
      const mapInstance = L.map(containerRef.current, {
        zoomControl: false // Hide default zoom buttons to design a custom floating zoom control later
      }).setView([defaultLat, defaultLng], 12);

      // Light-weight custom tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      // Add a customized zoom controller at top-right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
    }

    return () => {
      // Clean up map instance on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // 2. Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // 3. Add User Marker
    const userMarker = L.marker([defaultLat, defaultLng], {
      icon: createCustomIcon('#3b82f6') // Blue marker for User
    }).addTo(map);
    userMarker.bindPopup('<div class="text-xs font-bold font-sans">Your Location (Coimbatore Center)</div>');
    markersRef.current.push(userMarker);

    // 4. Add Equipment Markers
    listings.forEach(listing => {
      const lat = parseFloat(listing.location_latitude);
      const lng = parseFloat(listing.location_longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      // Calculate distance using standard Haversine approximation in km
      const R = 6371; // Earth's radius in km
      const dLat = (lat - defaultLat) * Math.PI / 180;
      const dLng = (lng - defaultLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(defaultLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = (R * c).toFixed(1);

      const color = listing.is_available ? '#10b981' : '#f59e0b'; // Green if available, Gold if busy
      
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(color)
      }).addTo(map);

      // Bind detailed visual popup
      const popupDiv = document.createElement('div');
      popupDiv.className = "p-2 font-sans text-slate-800 dark:text-slate-100";
      popupDiv.innerHTML = `
        <h4 class="font-bold text-sm mb-1">${listing.title}</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">${listing.category} • ${distance} km away</p>
        <p class="text-sm font-extrabold text-emerald-600 mb-2">₹${listing.rental_price_per_hour}/hr</p>
        <div class="flex gap-2">
          ${listing.is_available 
            ? `<button id="btn-book-${listing.id}" class="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-all">Book Now</button>`
            : `<span class="text-xs text-amber-600 font-semibold">Currently Booked</span>`
          }
        </div>
      `;

      // Set up click listener in React scope for raw HTML popup buttons
      marker.bindPopup(popupDiv);
      
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-book-${listing.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onBookClick) onBookClick(listing);
          };
        }
      });

      markersRef.current.push(marker);
    });

    // Auto-fit bounds if we have listing markers
    if (markersRef.current.length > 1) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    } else {
      map.setView([defaultLat, defaultLng], 12);
    }

  }, [listings, defaultLat, defaultLng]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
      <div ref={containerRef} className="w-full h-full min-h-[350px]"></div>
      <div className="absolute bottom-3 left-3 z-[400] glass px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold flex items-center gap-4 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
          <span>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
          <span>Busy</span>
        </div>
      </div>
    </div>
  );
}
