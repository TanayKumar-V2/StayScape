'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Shield } from 'lucide-react';

interface PropertyLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  city: string;
  state: string;
  country: string;
  className?: string;
}

export function PropertyLocationMap({
  latitude,
  longitude,
  city,
  state,
  country,
  className = 'h-80 w-full rounded-3xl overflow-hidden border border-[var(--border)]',
}: PropertyLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  const hasValidCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;
    if (!hasValidCoords) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
        }).setView([latitude, longitude], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        // Approximate privacy radius circle (800m)
        L.circle([latitude, longitude], {
          color: 'var(--accent-primary)',
          fillColor: 'var(--accent-primary)',
          fillOpacity: 0.18,
          radius: 800,
          weight: 2,
        }).addTo(map);

        // Subtle center pin
        const centerIcon = L.divIcon({
          className: 'stayscape-approx-pin',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background-color: var(--accent-primary);
              border: 3px solid var(--card-bg);
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([latitude, longitude], { icon: centerIcon }).addTo(map);

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setView([latitude, longitude], 13);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [hasValidCoords, latitude, longitude]);

  if (!hasValidCoords) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border)] text-center">
        <MapPin className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text-secondary)]">
          Location details for {city}, {state}, {country} available upon reservation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Shield className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
        <span>
          Exact address and directions are provided after booking confirmation. Approximate
          neighborhood shown for privacy.
        </span>
      </div>
    </div>
  );
}
