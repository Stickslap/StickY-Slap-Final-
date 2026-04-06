
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Printer, 
  DollarSign, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  BarChart3,
  Search,
  FileText,
  Activity,
  History,
  Info,
  ShieldCheck,
  CreditCard,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  useUser 
} from '@/firebase';
import { collection, query, orderBy, where, limit } from 'firebase/firestore';
import { Order, LinkedProductCosting, Material, MaterialUsage } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ProfitLossPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [period, setPeriod] = useState('Month');

  const ordersQuery = useMemoFirebase(() => query(collection(db, 'orders'), orderBy('createdAt', 'desc')), [db]);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const linkedQuery = useMemoFirebase(() => query(collection(db, 'linked_product_costing')), [db]);
  const { data: linkedRegistry, isLoading: isCostingLoading } = useCollection<LinkedProductCosting>(linkedQuery);

  const usageQuery = useMemoFirebase(() => query(collection(db, 'material_usage')), [db]);
  const { data: usageRegistry } = useCollection<MaterialUsage>(usageQuery);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials')), [db]);
  const { data: materials } = useCollection<Material>(materialsQuery);

  const statement = useMemo(() => {
    if (!orders) return null;
    const filteredOrders = orders.filter(o => !['Cancelled', 'Refunded', 'Draft'].includes(o.status));
    const revenue = filteredOrders.reduce((acc, o) => acc + (o.pricing?.total || 0), 0);
    const shippingIncome = filteredOrders.reduce((acc, o) => acc + (o.pricing?.shipping || 0), 0);
    let materialCost = 0;
    let laborCost = 0;
    let packagingCost = 0;
    let shippingExpense = 0;
    let processingFees = 0;
    let overheadAllocation = 0;
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const costing = linkedRegistry?.find(l => l.productId === item.productId);
        const usages = usageRegistry?.filter(u => u.productId === item.productId) || [];
        let itemMaterialCost = 0;
        usages.forEach(usage => {
          const material = materials?.find(m => m.id === usage.materialId);
          if (material) {
            const base = (usage.quantityRequired ?? 0) * (material.costPerUnit ?? 0) * (item.quantity ?? 0);
            itemMaterialCost += (base * (1 + (usage.wastePercent ?? 5) / 100));
          }
        });
        materialCost += itemMaterialCost;
        if (costing) {
          const labor = costing.laborHours && costing.hourlyRate ? (costing.laborHours * costing.hourlyRate) : (costing.laborCost || 0);
          const totalLabor = labor * item.quantity;
          const totalPkg = (costing.packagingCost || 0) * item.quantity;
          const totalShip = (costing.shippingCost || 0) * item.quantity;
          laborCost += totalLabor;
          packagingCost += totalPkg;
          shippingExpense += totalShip;
          const directCosts = itemMaterialCost + totalLabor + totalPkg + totalShip;
          processingFees += (order.pricing.total * ((costing.paymentFee || 3) + (costing.platformFee || 0)) / 100);
          overheadAllocation += directCosts * ((costing.overheadAllocationRate || 0) / 100);
        }
      });
    });
    const cogs = materialCost + laborCost + packagingCost;
    const grossProfit = revenue - cogs;
    const totalExpenses = shippingExpense + processingFees + overheadAllocation;
    const netProfit = grossProfit - totalExpenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const cashIn = revenue;
    const cashOut = shippingExpense + processingFees + laborCost + packagingCost;
    const inventoryCashTied = materials?.reduce((acc, m) => acc + ((m.quantityOnHand ?? 0) * (m.costPerUnit ?? 0)), 0) || 0;
    return { revenue, cogs, materialCost, laborCost, packagingCost, shippingIncome, shippingExpense, processingFees, overheadAllocation, grossProfit, netProfit, margin, cashIn, cashOut, inventoryCashTied, orderCount: filteredOrders.length };
  }, [orders, linkedRegistry, usageRegistry, materials]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  if (isOrdersLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Aggregating Society Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">Profit & <span className="text-primary">Loss</span></h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Dynamic income statement generated from actual project intake</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-12 w-40 rounded-xl font-bold uppercase text-[10px] tracking-widest border-2"><Calendar className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Month">Last 30 Days</SelectItem>
              <SelectItem value="Quarter">Last Quarter</SelectItem>
              <SelectItem value="Year">Fiscal Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px] border-2" onClick={handlePrint}><Printer className="mr-2 h-3.5 w-3.5" /> Print Statement —</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 rounded-[2rem] bg-foreground text-background shadow-xl">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Gross Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-primary">${statement?.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1.5 mt-2"><div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center"><ArrowUpRight className="h-2.5 w-2.5 text-white" /></div><span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Registry Sync Active</span></div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Operating Profit</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">${statement?.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Net after all burn</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Society Margin</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-primary">{statement?.margin.toFixed(1)}%</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Efficiency index</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Order Volume</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-foreground">{statement?.orderCount}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Settled projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-10"><CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /> Society Income Statement</CardTitle></CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Operating Income</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold"><span className="uppercase tracking-tight">Project Sales Revenue</span><span className="italic">${statement?.revenue.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center text-sm opacity-60"><span className="uppercase tracking-tight">Shipping Additives Collected</span><span className="italic">${statement?.shippingIncome.toFixed(2)}</span></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Production Consumption (COGS)</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">BOM Material Usage</span><span className="font-black italic text-rose-500">(${statement?.materialCost.toFixed(2)})</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">Labor & Craft Assembly</span><span className="font-black italic text-rose-500">(${statement?.laborCost.toFixed(2)})</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">Packaging Inventory</span><span className="font-black italic text-rose-500">(${statement?.packagingCost.toFixed(2)})</span></div>
                  <div className="pt-2 flex justify-between items-center text-sm border-t border-dashed">
                    <span className="font-black uppercase tracking-widest text-[10px]">Gross Realized Margin</span>
                    <div className="flex items-center gap-4">
                      <Progress value={statement?.margin || 0} className="h-1.5 w-24" />
                      <span className="font-black italic text-emerald-600">${statement?.grossProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Operational Overhead</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">Outgoing Logistics (Shipping)</span><span className="font-black italic text-rose-500">(${statement?.shippingExpense.toFixed(2)})</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">Merchant & Platform Fees</span><span className="font-black italic text-rose-500">(${statement?.processingFees.toFixed(2)})</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold uppercase tracking-tight">Overhead Allocation</span><span className="font-black italic text-rose-500">(${statement?.overheadAllocation.toFixed(2)})</span></div>
                </div>
              </div>
              <div className="pt-10"><div className="p-8 bg-primary/5 rounded-[2.5rem] border-4 border-primary/10 flex justify-between items-center shadow-inner"><div className="space-y-1"><h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Net Society Profit</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">After all production & overhead</p></div><div className="text-right"><p className="text-4xl font-black font-headline italic tracking-tighter text-primary">${statement?.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></div></div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8 no-print">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-10"><CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3"><CreditCard className="h-5 w-5 text-primary" /> Cash Flow Intelligence</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4"><div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 space-y-1"><p className="text-[8px] font-black uppercase text-emerald-700">Cash In (Realized)</p><p className="text-lg font-black italic tracking-tighter text-emerald-600">+${statement?.cashIn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div><div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-100 space-y-1"><p className="text-[8px] font-black uppercase text-rose-700">Cash Out (Ops)</p><p className="text-lg font-black italic tracking-tighter text-rose-600">-${statement?.cashOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></div>
              <div className="p-6 bg-muted/5 rounded-[2rem] border-2 border-dashed space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground"><span>Inventory Cash Lock</span><span className="text-foreground">${statement?.inventoryCashTied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <Progress value={(statement?.inventoryCashTied || 0) / (statement?.revenue || 1) * 100} className="h-1.5" />
                <p className="text-[8px] font-bold text-muted-foreground uppercase text-center italic">Capital tied in raw stock vs realized revenue</p>
              </div>
            </CardContent>
          </Card>
          <div className="p-8 bg-foreground text-background rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10"><Target className="h-6 w-6 text-primary" /></div><div className="space-y-1"><h4 className="text-lg font-black uppercase italic tracking-tight leading-none">Product Performance</h4><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">DNA Analysis Registry</p></div></div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed italic opacity-80">Audit individual project margins and rank your catalog by actual realized net profit.</p>
            <div className="grid gap-2"><Button variant="outline" className="w-full h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all" asChild><Link href="/admin/performance">Audit Performance —</Link></Button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
