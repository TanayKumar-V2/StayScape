'use client';

import type { ReactNode } from 'react';
import { ReactLenis } from 'lenis/react';

export function LandingScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        anchors: true,
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        respectReducedMotion: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
