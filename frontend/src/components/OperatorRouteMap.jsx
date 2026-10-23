import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const createCustomIcon = (color, label = '') => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full animate-ping opacity-30" style="background-color: ${color}"></div>
        <div class="relative w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-black text-white" style="background-color: ${color}">
          ${label}
        </div>
      </div>
    `,
    className: 'custom-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10]
  });
};

export default function OperatorRouteMap({ 
  operatorLocation, 
  pickupLocation, 
  destinationLocation, 
  status = 'ACCEPTED' 
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current && containerRef.current) {
      const initialLat = operatorLocation?.latitude || 11.0168;
      const initialLng = operatorLocation?.longitude || 76.9558;

      const mapInstance = L.map(containerRef.current, {
        zoomControl: false
      }).setView([initialLat, initialLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      L.control.zoom({ position: 'topright' }).addTo(mapInstance);
      mapRef.current = mapInstance;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous layers
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    const boundsPoints = [];

    // 1. Operator Live Marker (Blue)
    if (operatorLocation?.latitude && operatorLocation?.longitude) {
      const opLat = parseFloat(operatorLocation.latitude);
      const opLng = parseFloat(operatorLocation.longitude);
      const opMarker = L.marker([opLat, opLng], {
        icon: createCustomIcon('#2563eb', '🚜')
      }).addTo(map);
      opMarker.bindPopup(`
        <div class="p-1.5 font-sans">
          <p class="font-bold text-xs text-blue-600">Operator Live Position</p>
          <p class="text-[10px] text-slate-500">Status: ${status}</p>
        </div>
      `);
      layersRef.current.push(opMarker);
      boundsPoints.push([opLat, opLng]);
    }

    // 2. Machine Pickup Marker (Amber)
    if (pickupLocation?.latitude && pickupLocation?.longitude) {
      const pLat = parseFloat(pickupLocation.latitude);
      const pLng = parseFloat(pickupLocation.longitude);
      const pMarker = L.marker([pLat, pLng], {
        icon: createCustomIcon('#f59e0b', '📍')
      }).addTo(map);
      pMarker.bindPopup(`
        <div class="p-1.5 font-sans">
          <p class="font-bold text-xs text-amber-600">Step 1: Machine Pickup</p>
          <p class="text-[10px] text-slate-600">${pickupLocation.address || 'Machine Owner Yard'}</p>
          <p class="text-[10px] text-slate-500">Owner: ${pickupLocation.owner_name || 'Owner'}</p>
        </div>
      `);
      layersRef.current.push(pMarker);
      boundsPoints.push([pLat, pLng]);
    }

    // 3. Farm Destination Marker (Emerald)
    if (destinationLocation?.latitude && destinationLocation?.longitude) {
      const dLat = parseFloat(destinationLocation.latitude);
      const dLng = parseFloat(destinationLocation.longitude);
      const dMarker = L.marker([dLat, dLng], {
        icon: createCustomIcon('#10b981', '🌾')
      }).addTo(map);
      dMarker.bindPopup(`
        <div class="p-1.5 font-sans">
          <p class="font-bold text-xs text-emerald-600">Step 2: Farm Destination</p>
          <p class="text-[10px] text-slate-600">${destinationLocation.address || "Farmer's Field"}</p>
          <p class="text-[10px] text-slate-500">Farmer: ${destinationLocation.farmer_name || 'Farmer'}</p>
        </div>
      `);
      layersRef.current.push(dMarker);
      boundsPoints.push([dLat, dLng]);
    }

    // 4. Draw route lines based on workflow step
    // Phase 1: Heading to pickup -> Operator to Pickup (Amber dashed line)
    const isHeadingToPickup = ['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(status);
    if (isHeadingToPickup && operatorLocation && pickupLocation) {
      const poly = L.polyline([
        [operatorLocation.latitude, operatorLocation.longitude],
        [pickupLocation.latitude, pickupLocation.longitude]
      ], {
        color: '#f59e0b',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85
      }).addTo(map);
      layersRef.current.push(poly);
    } 
    // Phase 2: Collected & heading to Farm -> Operator to Destination (Emerald solid line)
    else if (operatorLocation && destinationLocation) {
      const poly = L.polyline([
        [operatorLocation.latitude, operatorLocation.longitude],
        [destinationLocation.latitude, destinationLocation.longitude]
      ], {
        color: '#10b981',
        weight: 4,
        opacity: 0.85
      }).addTo(map);
      layersRef.current.push(poly);
    }

    // Fit map bounds to view all active points
    if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13);
    }
  }, [operatorLocation, pickupLocation, destinationLocation, status]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
      <div ref={containerRef} className="w-full h-full min-h-[380px]"></div>
      
      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold flex flex-wrap items-center gap-3.5 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
          <span>Operator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          <span>Pickup Yard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          <span>Farm Field</span>
        </div>
      </div>
    </div>
  );
}
