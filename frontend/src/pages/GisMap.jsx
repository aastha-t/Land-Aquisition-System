import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Filter, MapPin, Info, Compass } from 'lucide-react';

// Custom Pin Icon Generator using L.divIcon
const createCustomIcon = (status) => {
  let bgColor = '#10b981'; // Available: Emerald green
  if (status === 'In_Acquisition') bgColor = '#f59e0b'; // Amber / Orange
  if (status === 'Acquired') bgColor = '#0284c7'; // Blue
  if (status === 'Disputed') bgColor = '#ef4444'; // Red

  return L.divIcon({
    className: 'custom-gis-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Component to re-center map dynamically when filter changes
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 6);
    }
  }, [center, map]);
  return null;
};

export const GisMap = () => {
  const [parcels, setParcels] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeParcelInfo, setActiveParcelInfo] = useState(null);

  const fetchDistricts = async () => {
    try {
      const res = await api.get('/land/districts/');
      setDistricts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMapParcels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/land/parcels/gis-map/');
      setParcels(res.data);
    } catch (e) {
      console.error('Error fetching GIS map parcels', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
    fetchMapParcels();
  }, []);

  // Filter parcels locally for instant map reactivity
  const filteredParcels = parcels.filter((p) => {
    if (selectedDistrict && String(p.district__name) !== String(selectedDistrict)) return false;
    if (selectedStatus && p.acquisition_status !== selectedStatus) return false;
    return true;
  });

  // Center coordinate of India: ~20.5937, 78.9629
  const defaultCenter = [20.5937, 78.9629];

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Interactive GIS Cadastral Map
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geographical spatial visualization of registered land parcels, project corridors & acquisition stages
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
            <span>In Acquisition</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white"></span>
            <span>Acquired</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-full bg-rose-500 border border-white"></span>
            <span>Disputed</span>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Spatial Filters:
          </span>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">All Indian Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name} ({d.state_name})</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">All Acquisition Stages</option>
            <option value="Available">Available / Registered</option>
            <option value="In_Acquisition">Under Acquisition</option>
            <option value="Acquired">Fully Acquired</option>
            <option value="Disputed">Disputed / In Litigation</option>
          </select>
        </div>

        <div className="font-semibold text-slate-600">
          Showing <span className="font-bold text-gov-navy">{filteredParcels.length}</span> of {parcels.length} Cadastral Markers
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[620px] w-full">
        {loading ? (
          <LoadingSpinner label="Loading spatial GIS coordinates & cadastral boundaries..." />
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={5}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            <MapRecenter center={defaultCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredParcels.map((p) => {
              const lat = parseFloat(p.latitude);
              const lng = parseFloat(p.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker
                  key={p.id}
                  position={[lat, lng]}
                  icon={createCustomIcon(p.acquisition_status)}
                  eventHandlers={{
                    click: () => setActiveParcelInfo(p),
                  }}
                >
                  <Popup className="custom-gis-popup">
                    <div className="p-1 text-xs text-slate-800 space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-gov-navy text-sm font-mono">
                          Survey #{p.survey_number}
                        </span>
                        <StatusBadge status={p.acquisition_status} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Location</div>
                        <div className="font-medium">{p.village}, {p.district__name} ({p.state__name})</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Owner</span>
                          <span className="font-semibold">{p.owner_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Area</span>
                          <span className="font-semibold">{p.area_acres} Acres</span>
                        </div>
                      </div>
                      <div className="pt-1 text-[10px] text-slate-500 font-mono">
                        GPS: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* Floating Quick Legend & Stats Badge on Bottom Left */}
        <div className="absolute bottom-5 left-5 z-10 bg-white/95 backdrop-blur p-3.5 rounded-xl border border-slate-200 shadow-xl max-w-xs text-xs space-y-1.5 hidden sm:block">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-gov-navy" />
            <span>National Spatial Cadastre</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Interactive map powered by Leaflet & OpenStreetMap. Real-time Indian coordinates for multi-corridor alignment verification.
          </p>
        </div>

      </div>

    </div>
  );
};

export default GisMap;
