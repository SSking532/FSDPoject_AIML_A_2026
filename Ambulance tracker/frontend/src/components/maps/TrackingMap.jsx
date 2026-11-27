import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2 } from 'lucide-react';
import { formatTimeOnly } from '../../utils/geo';

/**
 * Live map built on Leaflet with OpenStreetMap data (no API key needed).
 * Props are provider-neutral, so swapping to Google Maps later only touches this file.
 */

/**
 * Keyless tile providers, tried in order. If one keeps failing (offline server,
 * blocked network, provider now asking for a key) the map switches to the next.
 * Set VITE_MAP_TILE_URL in .env to force your own provider.
 */
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_PROVIDERS = [
  ...(import.meta.env.VITE_MAP_TILE_URL
    ? [{ url: import.meta.env.VITE_MAP_TILE_URL, attribution: OSM_ATTRIBUTION, maxZoom: 19 }]
    : []),
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxZoom: 19
  }
];

/** Add the first provider and fall back to the next one if tiles keep failing. */
function addTilesWithFallback(map, index = 0) {
  const provider = TILE_PROVIDERS[index];
  if (!provider) return;
  const layer = L.tileLayer(provider.url, {
    attribution: provider.attribution,
    maxZoom: provider.maxZoom
  });
  let errors = 0;
  let loaded = 0;
  layer.on('tileload', () => {
    loaded += 1;
  });
  layer.on('tileerror', () => {
    errors += 1;
    if (loaded === 0 && errors >= 4 && TILE_PROVIDERS[index + 1]) {
      map.removeLayer(layer);
      addTilesWithFallback(map, index + 1);
    }
  });
  layer.addTo(map);
}

const DEFAULT_CENTER = [28.6139, 77.209];

export const AMBULANCE_STATUS_COLORS = {
  AVAILABLE: '#0b8f83',
  ASSIGNED: '#d98a00',
  EN_ROUTE: '#2563eb',
  ON_TRIP: '#6d3fd6',
  OUT_OF_SERVICE: '#8796ad'
};

const AMB_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6M8 8v4"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

function ambulanceIcon(amb, selected) {
  const moving = ['EN_ROUTE', 'ON_TRIP'].includes(amb.status);
  return L.divIcon({
    className: '',
    html: `<div class="amb-marker ${selected ? 'selected' : ''} ${moving ? 'moving' : ''}" style="--marker-color:${
      AMBULANCE_STATUS_COLORS[amb.status] || '#18294a'
    }">${AMB_SVG}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

const pickupIcon = L.divIcon({
  className: '',
  html: '<div class="pickup-marker"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const hospitalIcon = L.divIcon({
  className: '',
  html: '<div class="hospital-marker">+</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const valid = (p) => typeof p?.lat === 'number' && typeof p?.lng === 'number';

/** Glide a marker to its new position instead of jumping. */
function animateTo(marker, target, duration = 900) {
  const start = marker.getLatLng();
  if (start.lat === target[0] && start.lng === target[1]) return;
  const t0 = performance.now();
  cancelAnimationFrame(marker._glide);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    const e = 1 - (1 - k) ** 3;
    marker.setLatLng([start.lat + (target[0] - start.lat) * e, start.lng + (target[1] - start.lng) * e]);
    if (k < 1) marker._glide = requestAnimationFrame(step);
  };
  marker._glide = requestAnimationFrame(step);
}

export function TrackingMap({
  ambulances = [],
  pickups = [],
  hospitals = [],
  routes = [],
  selectedAmbulanceId = null,
  onSelectAmbulance,
  followAmbulanceId = null,
  height = 380,
  title = 'Live map'
}) {
  const el = useRef(null);
  const map = useRef(null);
  const layers = useRef({});
  const ambMarkers = useRef(new Map());
  const fittedKey = useRef('');
  const onSelect = useRef(onSelectAmbulance);
  onSelect.current = onSelectAmbulance;

  const allPoints = useMemo(
    () => [...ambulances, ...pickups, ...hospitals].filter(valid).map((p) => [p.lat, p.lng]),
    [ambulances, pickups, hospitals]
  );
  const idsKey = useMemo(
    () => [...ambulances, ...pickups, ...hospitals].map((p) => p.id).join('|'),
    [ambulances, pickups, hospitals]
  );

  const fitAll = () => {
    if (!map.current || !allPoints.length) return;
    if (allPoints.length === 1) map.current.setView(allPoints[0], 15);
    else map.current.fitBounds(allPoints, { padding: [44, 44], maxZoom: 15 });
  };

  // ---- init
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(DEFAULT_CENTER, 12);
    addTilesWithFallback(m);
    m.zoomControl.setPosition('bottomright');
    layers.current = {
      routes: L.layerGroup().addTo(m),
      static: L.layerGroup().addTo(m),
      ambulances: L.layerGroup().addTo(m)
    };
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      ambMarkers.current.clear();
    };
  }, []);

  // ---- pickups, hospitals, routes
  useEffect(() => {
    const { static: group, routes: routeGroup } = layers.current;
    if (!group) return;
    group.clearLayers();
    routeGroup.clearLayers();
    hospitals.filter(valid).forEach((h) => {
      L.marker([h.lat, h.lng], { icon: hospitalIcon, zIndexOffset: 100 })
        .bindTooltip(escapeHtml(h.shortName || h.name), { direction: 'right', offset: [14, 0], className: 'map-label' })
        .bindPopup(
          `<div class="map-popup"><strong>${escapeHtml(h.name)}</strong><span>${escapeHtml(h.address || '')}</span></div>`
        )
        .addTo(group);
    });
    pickups.filter(valid).forEach((p) => {
      L.marker([p.lat, p.lng], { icon: pickupIcon, zIndexOffset: 200 })
        .bindTooltip(escapeHtml(p.label || p.id), { permanent: true, direction: 'right', offset: [12, 0], className: 'map-label' })
        .addTo(group);
    });
    routes.forEach((r) => {
      const pts = (r.points || []).filter(valid).map((p) => [p.lat, p.lng]);
      if (pts.length < 2) return;
      L.polyline(pts, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(routeGroup);
      L.polyline(pts, {
        color: r.color || '#2563eb',
        weight: 4,
        opacity: 0.95,
        dashArray: r.dashed ? '2 10' : null,
        lineCap: 'round'
      }).addTo(routeGroup);
    });
  }, [pickups, hospitals, routes]);

  // ---- ambulances (kept as persistent markers so they can glide)
  useEffect(() => {
    const group = layers.current.ambulances;
    if (!group) return;
    const seen = new Set();
    ambulances.filter(valid).forEach((amb) => {
      seen.add(amb.id);
      const selected = amb.id === selectedAmbulanceId;
      const popup = `<div class="map-popup"><strong>${escapeHtml(amb.registrationNumber)}</strong><span>${escapeHtml(
        amb.category
      )}</span><br/><span>${escapeHtml(amb.driverName || '')}${amb.lastUpdated ? ` · updated ${formatTimeOnly(amb.lastUpdated)}` : ''}</span></div>`;
      let marker = ambMarkers.current.get(amb.id);
      if (!marker) {
        marker = L.marker([amb.lat, amb.lng], { icon: ambulanceIcon(amb, selected), zIndexOffset: 400 })
          .bindTooltip(escapeHtml(amb.registrationNumber), { direction: 'top', offset: [0, -18], className: 'map-label' })
          .bindPopup(popup)
          .on('click', () => onSelect.current?.(amb))
          .addTo(group);
        ambMarkers.current.set(amb.id, marker);
      } else {
        animateTo(marker, [amb.lat, amb.lng]);
        marker.setIcon(ambulanceIcon(amb, selected));
        marker.setPopupContent(popup);
        marker.off('click').on('click', () => onSelect.current?.(amb));
      }
      marker.setZIndexOffset(selected ? 1000 : 400);
    });
    ambMarkers.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        group.removeLayer(marker);
        ambMarkers.current.delete(id);
      }
    });
  }, [ambulances, selectedAmbulanceId]);

  // ---- framing: fit when the set of things on the map changes
  useEffect(() => {
    if (idsKey && idsKey !== fittedKey.current) {
      fittedKey.current = idsKey;
      fitAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, allPoints.length]);

  useEffect(() => {
    if (!selectedAmbulanceId || !map.current) return;
    const amb = ambulances.find((a) => a.id === selectedAmbulanceId);
    if (amb && valid(amb) && onSelectAmbulance) map.current.panTo([amb.lat, amb.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAmbulanceId]);

  const followed = ambulances.find((a) => a.id === followAmbulanceId);
  useEffect(() => {
    if (followed && valid(followed) && map.current) {
      map.current.panTo([followed.lat, followed.lng], { animate: true, duration: 0.8 });
    }
  }, [followed?.lat, followed?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusesShown = [...new Set(ambulances.map((a) => a.status))];

  return (
    <div className="map-card">
      <div className="map-card-header">
        <div className="card-title">{title}</div>
        <div className="map-legend">
          {statusesShown.map((s) => (
            <span key={s}>
              <i className="legend-swatch" style={{ background: AMBULANCE_STATUS_COLORS[s] || '#18294a' }} />
              {s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </span>
          ))}
          {pickups.length > 0 && (
            <span>
              <i className="legend-swatch" style={{ background: 'var(--siren)', borderRadius: '50%' }} />
              Pickup
            </span>
          )}
          {hospitals.length > 0 && (
            <span>
              <i className="legend-swatch" style={{ background: 'var(--teal)' }} />
              Hospital
            </span>
          )}
        </div>
      </div>
      <div className="map-canvas" style={{ height }}>
        <div ref={el} style={{ position: 'absolute', inset: 0 }} />
        <button type="button" className="btn btn-secondary btn-sm map-fit-btn" onClick={fitAll} title="Show everything">
          <Maximize2 size={14} />
          Fit all
        </button>
      </div>
    </div>
  );
}

export default TrackingMap;