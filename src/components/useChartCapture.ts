// components/useChartCapture.ts
'use client';

import { useRef } from 'react';
import html2canvas from 'html2canvas';

export function useChartCapture() {
  const ref = useRef<HTMLDivElement | null>(null);

  async function capturePng(): Promise<string | null> {
    if (!ref.current) return null;
    const canvas = await html2canvas(ref.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  }

  return { ref, capturePng };
}