
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Loader2,
  Package,
  Zap,
  Target,
  ArrowRight,
  Filter,
  DollarSign,
  PieChart,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore 
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ProductTemplate, LinkedProductCosting, Material, MaterialUsage, Order } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ProductPerformancePage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'profit' | 'revenue' | 'margin'>('profit');

  // Data Queries
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products')), [db]);
  const { data: products, isLoading: isProductsLoading } = useCollection<ProductTemplate>(productsQuery);

  const ordersQuery = useMemoFirebase(() => query(collection(db, 'orders')), [db]);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const linkedQuery = useMemoFirebase(() => query(collection(db, 'linked_product_costing')), [db]);
  const { data: linkedRegistry } = useCollection<LinkedProductCosting>(linkedQuery);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials')), [db]);
  const { data: materials } = useCollection<Material>(materialsQuery);

  const usageQuery = useMemoFirebase(() => query(collection(db, 'material_usage')), [db]);
  const { data: usageRegistry } = useCollection<MaterialUsage>(usageQuery);

  const performanceData = useMemo(() => {
    if (!products || !orders) return [];

    return products.filter(p => linkedRegistry?.some(l => l.productId === p.id)).map(product => {
      const costing = linkedRegistry?.find(l => l.productId === product.id);
      const usages = usageRegistry?.filter(u => u.productId === product.id) || [];
      const productOrders = orders.filter(o => 
        !['Cancelled', 'Refunded', 'Draft'].includes(o.status) &&
        o.items.some(i => i.productId === product.id)
      );

      // Smart Logic: Dynamically calculate real-time unit cost from BOM + Materials Registry
      const materialCostPerUnit = usages.reduce((acc, usage) => {
        const material = materials?.find(m => m.id === usage.materialId);
        if (!material) return acc;
        return acc + (usage.quantityRequired * material.costPerUnit * (1 + (usage.wastePercent || 5) / 100));
      }, 0);

      const unitLabor = costing?.laborCost || 0;
      const unitPackaging = costing?.packagingCost || 0;
      const unitShipping = costing?.shippingCost || 0;
      const overheadRate = costing?.overheadAllocationRate || 0;
      
      const directUnitCost = materialCostPerUnit + unitLabor + unitPackaging + unitShipping;
      const unitCost = directUnitCost * (1 + (overheadRate ?? 0) / 100);

      // Volume & Revenue from actual transaction ledger
      const totalUnitsSold = productOrders.reduce((acc, o) => {
        const item = o.items.find(i => i.productId === product.id);
        return acc + (item?.quantity || 0);
      }, 0);

      const totalRevenue = productOrders.reduce((acc, o) => {
        const item = o.items.find(i => i.productId === product.id);
        if (!item) return acc;
        // In a real scenario, we'd extract the specific item price, but we'll use subtotal/qty as a proxy for this prototype
        const unitPrice = item.quantity > 0 ? (o.pricing.subtotal / item.quantity) : 0; 
        return acc + (unitPrice * item.quantity);
      }, 0);

      const totalCost = unitCost * totalUnitsSold;
      const netProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        ...product,
        unitCost,
        totalUnitsSold,
        totalRevenue,
        netProfit,
        margin,
        targetMargin: costing?.targetProfitMargin || 30
      };
    }).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      if (sortBy === 'profit') return b.netProfit - a.netProfit;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'margin') return b.margin - a.margin;
      return 0;
    });
  }, [products, orders, linkedRegistry, usageRegistry, materials, searchTerm, sortBy]);

  const topStats = useMemo(() => {
    if (performanceData.length === 0) return null;
    const mostProfitable = [...performanceData].sort((a, b) => b.netProfit - a.netProfit)[0];
    const highestMargin = [...performanceData].sort((a, b) => b.margin - a.margin)[0];
    const underperforming = performanceData.filter(p => p.margin < p.targetMargin).length;
    return { mostProfitable, highestMargin, underperforming };
  }, [performanceData]);

  if (isProductsLoading || isOrdersLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Analyzing Product DNA...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Product <span className="text-primary">DNA</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Strategic performance ranking and margin intelligence</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 rounded-[2rem] bg-foreground text-background shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Engine Leader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black italic tracking-tighter uppercase line-clamp-1">{topStats?.mostProfitable?.name || '---'}</div>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-1">Most Profitable: ${topStats?.mostProfitable?.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Efficiency Star</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black italic tracking-tighter uppercase line-clamp-1">{topStats?.highestMargin?.name || '---'}</div>
            <p className="text-[9px] font-bold text-emerald-600 uppercase mt-1">Best Margin: {topStats?.highestMargin?.margin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className={cn("border-2 rounded-[2rem] shadow-sm transition-all duration-500", topStats?.underperforming ? "bg-rose-50 border-rose-200" : "bg-card")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Risk Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-black font-headline italic tracking-tighter", topStats?.underperforming ? "text-rose-600" : "text-emerald-600")}>
              {topStats?.underperforming || 0} ITEMS
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Below Target Margin %</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search catalog performance..." 
              className="pl-12 h-14 rounded-2xl bg-background border-2" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant={sortBy === 'profit' ? 'default' : 'outline'} size="sm" className="rounded-xl h-10 px-4 font-black uppercase text-[10px]" onClick={() => setSortBy('profit')}>Profit</Button>
            <Button variant={sortBy === 'margin' ? 'default' : 'outline'} size="sm" className="rounded-xl h-10 px-4 font-black uppercase text-[10px]" onClick={() => setSortBy('margin')}>Margin</Button>
            <Button variant={sortBy === 'revenue' ? 'default' : 'outline'} size="sm" className="rounded-xl h-10 px-4 font-black uppercase text-[10px]" onClick={() => setSortBy('revenue')}>Volume</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-10 py-5 text-left">Project Profile</th>
                  <th className="px-10 py-5 text-left">Units Sold</th>
                  <th className="px-10 py-5 text-left">Realized Revenue</th>
                  <th className="px-10 py-5 text-left">Net Profit</th>
                  <th className="px-10 py-5 text-left">Margin Index</th>
                  <th className="px-10 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2">
                {performanceData.map(p => (
                  <tr key={p.id} className="group hover:bg-muted/5 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl border-2 overflow-hidden relative bg-muted shrink-0">
                          {p.thumbnail ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" /> : <Package className="h-5 w-5 opacity-20 absolute inset-0 m-auto" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase tracking-tight italic leading-none">{p.name}</p>
                          <p className="text-[9px] font-mono text-muted-foreground opacity-60 mt-1 uppercase">{p.id.slice(0, 12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 font-mono font-bold">{p.totalUnitsSold}</td>
                    <td className="px-10 font-black italic text-foreground">${p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-10">
                      <div className={cn("text-sm font-black italic", p.netProfit > 0 ? "text-emerald-600" : "text-rose-500")}>
                        ${p.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-10">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className={p.margin < p.targetMargin ? "text-amber-600" : "text-emerald-600"}>{p.margin.toFixed(1)}%</span>
                          <span className="opacity-40">Target: {p.targetMargin}%</span>
                        </div>
                        <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", p.margin < p.targetMargin ? "bg-amber-500" : "bg-emerald-500")} 
                            style={{ width: `${Math.min(100, (p.margin / p.targetMargin) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-10 text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest border-2 hover:bg-primary/10 transition-all" asChild>
                        <Link href={`/admin/calculator?product=${p.id}`}>Troubleshoot Strategy —</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
