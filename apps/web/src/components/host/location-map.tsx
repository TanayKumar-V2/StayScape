'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function LocationMap({
  latitude,
  longitude,
  onChange,
  className = 'h-72 w-full rounded-2xl overflow-hidden border border-[var(--border)]',
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Default to central India (e.g. New Delhi / central hub) if not set
  const defaultLat = latitude ?? 28.6139;
  const defaultLng = longitude ?? 77.209;

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;

    let isMounted = true;

    // Dynamically import Leaflet on client side
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Don't re-initialize if map already exists
      if (mapInstanceRef.current) {
        return;
      }

      const map = L.map(mapContainerRef.current).setView(
        [defaultLat, defaultLng],
        latitude && longitude ? 13 : 5,
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom styled StayScape brand marker
      const customPinIcon = L.divIcon({
        className: 'stayscape-map-pin',
        html: `
          <div style="
            background-color: var(--accent-primary);
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid var(--card-bg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: var(--card-bg);
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: customPinIcon,
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChangeRef.current(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
      });

      map.on('click', (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChangeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [defaultLat, defaultLng, latitude, longitude]);

  // Sync marker position if props change externally
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current && latitude && longitude) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.0001 ||
        Math.abs(currentPos.lng - longitude) > 0.0001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 13);
      }
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <div ref={mapContainerRef} className={className} />
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
        <span>Click on the map or drag the pin to set your exact location</span>
        {latitude && longitude ? (
          <span className="font-mono bg-[var(--bg-secondary)] px-2 py-0.5 rounded text-[var(--text-primary)]">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        ) : (
          <span>No coordinates selected</span>
        )}
      </div>
    </div>
  );
}
