'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Discovery Live Globe
 * High-fidelity 3D visualization using hex-binning for landmasses.
 * Configured with rich blue ocean palettes for both themes.
 */
/*
const Globe = dynamic(() => import('react-globe.gl'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#f9fafb]">
      <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
    </div>
  )
});
*/

interface LiveViewGlobeProps {
  theme?: 'light' | 'dark';
}

export default function LiveViewGlobe({ theme = 'light' }: LiveViewGlobeProps) {
  return (
    <div className={cn(
      "w-full h-full min-h-[600px] flex items-center justify-center relative transition-colors duration-700",
      theme === 'light' ? "bg-slate-50 text-slate-400" : "bg-[#000814] text-slate-600"
    )}>
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest">Live Telemetry Visualization</p>
        <p className="text-xs font-medium opacity-50">3D Globe currently disabled for performance optimization</p>
      </div>
    </div>
  );
}
