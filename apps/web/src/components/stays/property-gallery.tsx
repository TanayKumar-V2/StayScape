'use client';

import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Image from 'next/image';
import { Grid, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80';

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Filter out any empty, whitespace-only, or invalid image URLs
  const validImages = (images || []).filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0,
  );
  const displayImages = validImages.length > 0 ? validImages : [FALLBACK_IMAGE];

  const primaryImage = displayImages[0];
  const sideImages = displayImages.slice(1, 5);

  const openLightbox = (index: number) => {
    setCurrentIdx(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* 5-Photo Hero Grid */}
      <div className="relative rounded-[28px] overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[340px] sm:h-[420px] md:h-[480px]">
          {/* Main Large Image */}
          <div
            onClick={() => openLightbox(0)}
            className={`${
              sideImages.length > 0 ? 'md:col-span-2' : 'col-span-full md:col-span-4'
            } relative h-full cursor-pointer overflow-hidden group`}
          >
            <Image
              src={primaryImage}
              alt={`${title} main exterior`}
              fill
              priority
              sizes={sideImages.length > 0 ? '(max-width: 768px) 100vw, 50vw' : '100vw'}
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>

          {/* 4 Smaller Images (Desktop 2x2) */}
          {sideImages.length > 0 && (
            <div className="hidden md:grid col-span-2 grid-cols-2 gap-2 h-full">
              {sideImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => openLightbox(idx + 1)}
                  className="relative h-full cursor-pointer overflow-hidden group"
                >
                  <Image
                    src={img}
                    alt={`${title} detail ${idx + 1}`}
                    fill
                    sizes="25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View All Photos Button */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 z-10 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-md text-[var(--text-primary)] text-xs font-semibold shadow-md border border-[var(--border)] hover:bg-white flex items-center gap-1.5 transition-all"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Show all {displayImages.length} photos</span>
        </button>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <AccessibleDialog
          ariaLabel="Property photo gallery"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200"
          onClose={() => setLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full pb-4">
            <span className="text-sm font-medium">
              Photo {currentIdx + 1} of {displayImages.length}
            </span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Lightbox Image */}
          <div className="relative flex-1 max-w-5xl mx-auto w-full flex items-center justify-center my-4">
            <div className="relative w-full h-[65vh] sm:h-[75vh]">
              <Image
                src={displayImages[currentIdx] || primaryImage}
                alt={`${title} enlarged view ${currentIdx + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Prev Button */}
            <button
              onClick={() => setCurrentIdx((i) => (i === 0 ? displayImages.length - 1 : i - 1))}
              className="absolute left-2 sm:left-4 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              onClick={() => setCurrentIdx((i) => (i === displayImages.length - 1 ? 0 : i + 1))}
              className="absolute right-2 sm:right-4 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Thumbnails strip */}
          <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto overflow-x-auto py-2">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  currentIdx === idx ? 'border-white scale-105' : 'border-transparent opacity-60'
                }`}
              >
                <Image src={img} alt="thumbnail" fill className="object-cover" />
              </button>
            ))}
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
