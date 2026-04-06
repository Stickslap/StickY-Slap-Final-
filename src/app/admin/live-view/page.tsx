
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import LiveViewGlobe from '@/components/live-view-globe';
import Link from 'next/link';
import { 
  Users,
  Clock,
  ExternalLink,
  MapPin,
  Loader2,
  ArrowUpRight,
  Plus,
  Minus,
  Maximize2,
  Eye,
  Globe as GlobeIcon,
  Sun,
  Moon,
  TrendingUp,
  Package,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { startOfDay, isAfter, parseISO } from 'date-fns';

/**
 * Discovery Live Workstation
 * Precision real-time telemetry dashboard inspired by the Shopify Live View.
 */
export default function AdminLiveViewPage() {
  const db = useFirestore();
  const [currentTime, setCurrentTime] = useState('');
  const [globeTheme, setGlobeTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric', 
        second: 'numeric',
        hour12: true,
        timeZoneName: 'short'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Sync real-time visitor registry
  const visitorsQuery = useMemoFirebase(() => 
    query(collection(db, 'live_visitors'), orderBy('timestamp', 'desc'), limit(100))
  , [db]);
  const { data: visitors, isLoading: isVisitorsLoading } = useCollection<any>(visitorsQuery);

  // Sync project registry for high-level metrics
  const ordersQuery = useMemoFirebase(() => collection(db, 'orders'), [db]);
  const { data: orders } = useCollection<any>(ordersQuery);

  const stats = useMemo(() => {
    // 1. Calculate Real-time Active Sessions (Unique IPs in last 15 mins)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const activeSessions = new Set(
      visitors?.filter((v: any) => v.timestamp >= fifteenMinsAgo).map((v: any) => v.ipAddress)
    ).size;

    // 2. Calculate Lifetime Financial Value
    const totalSales = orders?.reduce((acc: number, o: any) => {
      if (['Cancelled', 'Refunded'].includes(o.status)) return acc;
      return acc + (o.pricing?.total || 0);
    }, 0) || 0;
    
    // 3. Today's Specific Procurement Volume
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders?.filter((o: any) => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      return orderDate >= today;
    }).length || 0;

    return {
      activeVisitors: activeSessions,
      totalSales,
      totalVisits: visitors?.length || 0,
      totalOrders: orders?.length || 0,
      todayOrders
    };
  }, [visitors, orders]);

  // Aggregate Top Locations from real visitor data
  const topLocations = useMemo(() => {
    if (!visitors || visitors.length === 0) return [];
    const counts: Record<string, number> = {};
    visitors.forEach((v: any) => {
      const locKey = v.city ? `${v.city}, USA` : 'Global Hub';
      counts[locKey] = (counts[locKey] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count: count.toString(),
        percentage: (count / visitors.length) * 100
      }))
      .sort((a, b) => parseFloat(b.count) - parseFloat(a.count))
      .slice(0, 3);
  }, [visitors]);

  // Aggregate Product Resonance from real order history
  const productResonance = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const resonance: Record<string, number> = {};
    orders.forEach((o: any) => {
      if (['Cancelled', 'Refunded'].includes(o.status)) return;
      o.items?.forEach((item: any) => {
        const name = item.productName || 'Custom Print';
        resonance[name] = (resonance[name] || 0) + (o.pricing?.total || 0);
      });
    });

    const entries = Object.entries(resonance);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    return entries
      .map(([label, total]) => ({
        label,
        price: `$${total > 1000 ? (total/1000).toFixed(1) + 'k' : total.toFixed(0)}`,
        percentage: (total / maxVal) * 100
      }))
      .sort((a, b) => parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', '')))
      .slice(0, 3);
  }, [orders]);

  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-[#f9fafb] font-body overflow-hidden -m-4 md:-m-8 lg:-m-12">
      
      {/* Main Strategic Map Canvas */}
      <div className="flex-1 relative bg-white">
        
        {/* Registry Legend & Pulse */}
        <div className="absolute top-10 left-10 z-20 space-y-6 pointer-events-none">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">
              Discovery <span className="font-medium text-slate-400 not-italic">live view</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {currentTime}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Project Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visitor Pulse</span>
            </div>
          </div>
        </div>

        {/* 3D WebGL Visualization Layer */}
        <div className="w-full h-full relative">
          <LiveViewGlobe theme={globeTheme} />
        </div>

        {/* Map Control Protocol */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-white shadow-2xl rounded-2xl border border-slate-100">
          <div className="flex items-center border-r pr-2 mr-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary">
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all"
            onClick={() => setGlobeTheme(prev => prev === 'light' ? 'dark' : 'light')}
          >
            {globeTheme === 'light' ? (
              <span className="flex items-center gap-2">Standard <Sun className="h-3.5 w-3.5" /></span>
            ) : (
              <span className="flex items-center gap-2 text-primary">Tactical <Moon className="h-3.5 w-3.5" /></span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Strategic Intelligence Sidebar */}
      <aside className="w-full lg:w-[400px] bg-white border-l shadow-2xl z-30 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-8 space-y-12">
            
            {/* Real-time Pulse Section */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Metrics at a glance</h3>
                <Link href="/admin" className="text-[10px] font-bold text-primary underline underline-offset-4 flex items-center gap-1">
                  Performance Hub <ArrowUpRight className="h-2 w-2" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-white p-6 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <Users className="h-2.5 w-2.5" /> Active sessions
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-800">
                    {isVisitorsLoading ? '...' : stats.activeVisitors.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-6 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="h-2.5 w-2.5" /> Project Value
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-800">${stats.totalSales > 1000 ? (stats.totalSales/1000).toFixed(1) + 'k' : stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-6 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <GlobeIcon className="h-2.5 w-2.5" /> Total Visits
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-800">{stats.totalVisits.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <Package className="h-2.5 w-2.5" /> Intake Count
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-800">{stats.totalOrders.toLocaleString()}</p>
                </div>
              </div>
            </section>

            {/* Geographic Distribution */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Strategic Locations</h3>
              <div className="space-y-6">
                {topLocations.length > 0 ? topLocations.map((loc, i) => (
                  <div key={i} className="space-y-2 group">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                      <span className="group-hover:text-primary transition-colors">{loc.label}</span>
                      <span className="font-mono">{loc.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border shadow-inner">
                      <div 
                        className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${loc.percentage}%` }} 
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                    Analyzing incoming pulse...
                  </div>
                )}
              </div>
            </section>

            {/* Catalog Engagement */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Product Resonance</h3>
              <div className="space-y-6">
                {productResonance.length > 0 ? productResonance.map((prod, i) => (
                  <div key={i} className="space-y-2 group">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                      <span className="group-hover:text-primary transition-colors truncate pr-4">{prod.label}</span>
                      <span className="text-emerald-600 font-mono">{prod.price}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border shadow-inner">
                      <div 
                        className="h-full bg-primary/40 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${prod.percentage}%` }} 
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                    Waiting for project intake...
                  </div>
                )}
              </div>
            </section>

            {/* Behavioral Pulse (Action Funnel) */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Action Funnel</h3>
              <div className="flex justify-between items-center px-4">
                {[
                  { color: '#3b82f6', label: 'Visitors', value: stats.activeVisitors },
                  { color: '#8b5cf6', label: 'Checking Out', value: Math.round(stats.activeVisitors * 0.4) },
                  { color: '#ec4899', label: 'Daily Sales', value: stats.todayOrders },
                ].map((b, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-4 border-slate-50 flex items-center justify-center relative shadow-sm group">
                      <div 
                        className="h-8 w-8 rounded-full shadow-inner animate-pulse transition-opacity duration-1000" 
                        style={{ backgroundColor: b.color, opacity: b.value > 0 ? 0.2 : 0.05 }} 
                      />
                      <div 
                        className={cn("h-3 w-3 rounded-full absolute transition-all duration-500", b.value === 0 && "scale-50 opacity-20")} 
                        style={{ backgroundColor: b.color }} 
                      />
                      <div className="absolute -top-2 -right-2 bg-white border px-1.5 rounded-full shadow-sm text-[8px] font-black">
                        {b.value}
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{b.label}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
