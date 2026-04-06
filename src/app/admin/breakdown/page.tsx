
'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Boxes, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Loader2,
  PieChart as PieIcon,
  Tag,
  Warehouse,
  ChevronDown,
  ArrowRight,
  Clock3,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore 
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Material } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

export default function StockBreakdownPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials'), orderBy('name')), [db]);
  const { data: materials, isLoading } = useCollection<Material>(materialsQuery);

  const filteredMaterials = materials?.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    if (!materials) return { totalValue: 0, potentialProfit: 0, avgMargin: 0 };
    const cost = materials.reduce((acc, m) => acc + (m.quantityOnHand * m.costPerUnit), 0);
    const retail = materials.reduce((acc, m) => acc + (m.quantityOnHand * (m.sellingPricePerUnit || m.costPerUnit * 2.5)), 0);
    const profit = retail - cost;
    const margin = retail > 0 ? (profit / retail) * 100 : 0;
    return { totalValue: cost, potentialProfit: profit, avgMargin: margin };
  }, [materials]);

  const categoryStats = useMemo(() => {
    if (!materials) return [];
    const stats: Record<string, { name: string, value: number, count: number }> = {};
    
    materials.forEach(m => {
      if (!stats[m.category]) stats[m.category] = { name: m.category, value: 0, count: 0 };
      stats[m.category].value += (m.quantityOnHand * m.costPerUnit);
      stats[m.category].count += m.quantityOnHand;
    });

    return Object.values(stats);
  }, [materials]);

  const topValueItems = useMemo(() => {
    if (!materials) return [];
    return [...materials]
      .map(m => ({ ...m, totalValue: m.quantityOnHand * m.costPerUnit }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [materials]);

  const COLORS = ['hsl(var(--primary))', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Generating Visual Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Stock <span className="text-primary">Breakdown</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Visual intelligence for raw material distribution</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 rounded-[2rem] bg-foreground text-background shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Inventory Cost Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-primary">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1.5 mt-2"><div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center"><ShieldCheck className="h-2.5 w-2.5 text-white" /></div><span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Vault Verified</span></div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Locked Potential Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">${stats.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Based on {stats.avgMargin.toFixed(1)}% Avg Margin</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Component Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-foreground">{materials?.length || 0} SPECS</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Individual Registry Items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Category Pie Chart */}
        <div className="lg:col-span-5">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card h-full">
            <CardHeader className="bg-muted/30 border-b py-6 px-10">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <PieIcon className="h-5 w-5 text-primary" /> Asset Allocation
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">Inventory valuation by material category.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`, 'Valuation']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Assets */}
        <div className="lg:col-span-7">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card h-full">
            <CardHeader className="bg-muted/30 border-b py-6 px-10">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" /> Most Valuable Stock
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">High-value registry components currently in the vault.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y-2">
                {topValueItems.map((item, idx) => (
                  <div key={item.id} className="p-8 flex items-center justify-between hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 border-2 flex items-center justify-center font-black italic text-primary shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black uppercase italic tracking-tight leading-none">{item.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.sku} • {item.quantityOnHand} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black font-headline italic tracking-tighter text-primary">${item.totalValue.toLocaleString()}</p>
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Registry Value</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Breakdown Search */}
      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Search className="h-5 w-5 text-primary" /> Search Registry
            </CardTitle>
          </div>
          <Input 
            placeholder="Filter by name, SKU or location..." 
            className="max-w-md h-12 rounded-xl bg-background border-2" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-10 py-5 text-left">Component</th>
                  <th className="px-10 py-5 text-left">Classification</th>
                  <th className="px-10 py-5 text-left">Quantity</th>
                  <th className="px-10 py-5 text-left">Cost Val</th>
                  <th className="px-10 py-5 text-left">Profit Est</th>
                  <th className="px-10 py-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y-2">
                {filteredMaterials?.map(m => {
                  const costVal = m.quantityOnHand * m.costPerUnit;
                  const retailVal = m.quantityOnHand * (m.sellingPricePerUnit || m.costPerUnit * 2.5);
                  const profitEst = retailVal - costVal;

                  return (
                    <tr key={m.id} className="group hover:bg-muted/5 transition-colors">
                      <td className="px-10 py-6 font-bold uppercase tracking-tight italic">{m.name}</td>
                      <td className="px-10"><Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary">{m.category}</Badge></td>
                      <td className="px-10 font-mono text-xs">{m.quantityOnHand}</td>
                      <td className="px-10 font-black text-xs">${costVal.toLocaleString()}</td>
                      <td className="px-10 font-black text-emerald-600 text-xs">+${profitEst.toLocaleString()}</td>
                      <td className="px-10 text-right"><span className="text-[10px] font-black uppercase tracking-tighter opacity-40">{m.location}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
