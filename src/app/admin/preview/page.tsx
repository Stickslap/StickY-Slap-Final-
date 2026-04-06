'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw, 
  ExternalLink,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VIEWPORTS = [
  { id: 'mobile', name: 'Mobile (iPhone)', width: 375, height: 'auto', icon: Smartphone },
  { id: 'tablet', name: 'Tablet (iPad)', width: 768, height: 'auto', icon: Tablet },
  { id: 'desktop', name: 'Desktop Full', width: '100%', height: 'auto', icon: Monitor },
];

export default function DevicePreviewPage() {
  const [activeViewport, setActiveViewport] = useState(VIEWPORTS[0]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Society <span className="text-primary">Viewport</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Simulate device experiences with full-length audit capabilities.</p>
        </div>
        <div className="flex gap-2 bg-muted/20 p-1 rounded-2xl border-2">
          {VIEWPORTS.map((v) => (
            <Button
              key={v.id}
              variant={activeViewport.id === v.id ? 'default' : 'ghost'}
              className={cn(
                "rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px]",
                activeViewport.id === v.id ? "shadow-lg bg-primary text-white" : ""
              )}
              onClick={() => setActiveViewport(v)}
            >
              <v.icon className="mr-2 h-3.5 w-3.5" />
              {v.name}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-2 rounded-[3rem] overflow-hidden bg-zinc-950 shadow-2xl relative">
        <CardHeader className="bg-zinc-900 border-b border-white/5 py-3 px-8 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-2">
              Simulation Mode: {activeViewport.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={handleRefresh}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" asChild>
              <a href="/" target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex justify-center bg-zinc-900/50 items-start overflow-y-auto pt-8">
          <div 
            className="transition-all duration-500 ease-in-out shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x-8 border-t-8 border-zinc-800 rounded-t-[3rem] bg-background relative overflow-hidden h-[2000px]"
            style={{ 
              width: activeViewport.width, 
              maxWidth: '100%'
            }}
          >
            {activeViewport.id === 'mobile' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                <div className="h-1.5 w-8 bg-zinc-700 rounded-full" />
              </div>
            )}
            <iframe 
              key={`${activeViewport.id}-${refreshKey}`}
              src="/" 
              className="w-full h-full border-none"
              title="Society Viewport"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
