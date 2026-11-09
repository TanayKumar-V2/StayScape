'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicPropertySummary, formatPropertyType, paiseToRupees } from '@/types/property';
import { formatINR } from '@/lib/utils';

/**
 * Escapes the five HTML-significant characters for safe interpolation into
 * Leaflet's dynamically-built popup/DOM strings. Property title, cover image
 * URL, city and slug originate from user/host submissions, so an unescaped
 * interpolation here is script-injectable through the `img src`, `alt` and
 * `href` template slots.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function optimizePopupImageUrl(source: string): string {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:') return source;

    if (url.hostname === 'res.cloudinary.com') {
      const uploadMarker = '/upload/';
      const uploadIndex = url.pathname.indexOf(uploadMarker);
      if (uploadIndex >= 0) {
        const transformation = 'c_fill,w_440,h_220,q_auto,f_auto/';
        const afterUpload = url.pathname.slice(uploadIndex + uploadMarker.length);
        if (!/^(?:c_|w_\d|h_\d|q_)/.test(afterUpload)) {
          url.pathname = `${url.pathname.slice(0, uploadIndex + uploadMarker.length)}${transformation}${afterUpload}`;
        }
      }
    } else if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', '440');
      url.searchParams.set('q', '75');
    }

    return url.toString();
  } catch {
    return source;
  }
}

interface DiscoveryMapProps {
  properties: PublicPropertySummary[];
  className?: string;
  selectedSlug?: string | null;
  onSelectProperty?: (slug: string) => void;
}

export function DiscoveryMap({
  properties,
  className = 'h-[600px] w-full rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm',
  selectedSlug,
  onSelectProperty,
}: DiscoveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<{ [slug: string]: LeafletMarker }>({});

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map once
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([20.5937, 78.9629], 5); // India center

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker: LeafletMarker) => {
        marker.remove();
      });
      markersRef.current = {};

      const validProperties = properties.filter((p) => p.latitude !== null && p.longitude !== null);

      if (validProperties.length === 0) return;

      const bounds = L.latLngBounds([]);

      validProperties.forEach((property) => {
        const lat = property.latitude!;
        const lng = property.longitude!;
        const price = paiseToRupees(property.pricePerNightPaise);
        const formattedPrice = formatINR(price);
        const isSelected = selectedSlug === property.slug;

        bounds.extend([lat, lng]);

        // Clean price pill icon
        const pricePillIcon = L.divIcon({
          className: 'stayscape-discovery-pin',
          html: `
            <div style="
              background-color: ${isSelected ? 'var(--text-primary)' : 'var(--card-bg)'};
              color: ${isSelected ? 'var(--card-bg)' : 'var(--text-primary)'};
              border: 1.5px solid ${isSelected ? 'var(--text-primary)' : 'var(--border)'};
              border-radius: 9999px;
              padding: 4px 10px;
              font-family: inherit;
              font-size: 11px;
              font-weight: 700;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
              white-space: nowrap;
              cursor: pointer;
              transition: transform 0.15s ease, background-color 0.15s ease;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            ">
              ${escapeHtml(formattedPrice)}
            </div>
          `,
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const marker = L.marker([lat, lng], { icon: pricePillIcon }).addTo(map);

        // Click popup with thumbnail and link
        const coverUrl =
          property.coverImage?.url ||
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';

        const safeCoverUrl = escapeHtml(optimizePopupImageUrl(coverUrl));
        const safeTitle = escapeHtml(property.title);
        const safeCity = escapeHtml(property.city);
        const safeType = escapeHtml(formatPropertyType(property.propertyType));
        const safeSlug = escapeHtml(property.slug);
        const safePrice = escapeHtml(formattedPrice);

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; max-width: 220px; padding: 2px;">
            <div style="position: relative; width: 100%; height: 110px; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
              <img src="${safeCoverUrl}" alt="${safeTitle}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary); font-weight: 700;">
              ${safeType} • ${safeCity}
            </div>
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 3px 0 6px; line-height: 1.3;">
              ${safeTitle}
            </h4>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${safePrice} <span style="font-size: 10px; font-weight: normal; color: var(--text-secondary);">/ night</span></span>
              <a href="/stays/${safeSlug}" style="font-size: 11px; font-weight: 600; color: var(--accent-primary); text-decoration: underline;">View</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 240,
          className: 'stayscape-map-popup',
        });

        marker.on('click', () => {
          onSelectProperty?.(property.slug);
        });

        markersRef.current[property.slug] = marker;
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [properties, selectedSlug, onSelectProperty]);

  return (
    <div className={className}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
