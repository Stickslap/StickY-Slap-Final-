
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calculator, 
  ArrowRight, 
  Package, 
  Settings2, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Truck, 
  Boxes, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ArrowLeft,
  User,
  AlertCircle,
  TrendingDown,
  Target,
  BarChart3,
  Search,
  Loader2,
  Coins,
  Save,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { ProductTemplate, LinkedProductCosting, Material, MaterialUsage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from 'recharts';
import { toast } from '@/hooks/use-toast';

export default function ProfitCalculatorPage() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product') || '';
  const db = useFirestore();
  const { user } = useUser();
  
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [qty, setQty] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  
  // CORE ECONOMIC DRIVERS (What-If Simulation)
  const [simPrice, setSimPrice] = useState<number>(45.00);
  const [simBuyCost, setSimBuyCost] = useState<number>(15.00);
  const [simShipping, setSimShipping] = useState<number>(12.00);
  const [simLabor, setSimLabor] = useState<number>(0);
  const [simWaste, setSimWaste] = useState<number>(5);
  const [simOverhead, setSimOverhead] = useState<number>(10);
  
  // Custom Additives
  const [shippingCharged, setShippingCharged] = useState(0);
  const [discounts, setDiscounts] = useState(0);

  // Data Queries
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products')), [db]);
  const { data: products, isLoading: isProductsLoading } = useCollection<ProductTemplate>(productsQuery);

  const linkedQuery = useMemoFirebase(() => query(collection(db, 'linked_product_costing')), [db]);
  const { data: linkedRegistry } = useCollection<LinkedProductCosting>(linkedQuery);

  const usageQuery = useMemoFirebase(() => query(collection(db, 'material_usage')), [db]);
  const { data: usageRegistry } = useCollection<MaterialUsage>(usageQuery);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials')), [db]);
  const { data: materials } = useCollection<Material>(materialsQuery);

  const selectedProduct = useMemo(() => products?.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const linkedCosting = useMemo(() => linkedRegistry?.find(l => l.productId === selectedProductId), [linkedRegistry, selectedProductId]);
  const productUsage = useMemo(() => usageRegistry?.filter(u => u.productId === selectedProductId) || [], [usageRegistry, selectedProductId]);

  // Sync simulation with existing registry data when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setSimPrice(selectedProduct.pricingModel?.basePrice || 45);
      
      // Smart Logic: Auto-calculate "Buy Price" from BOM
      if (productUsage.length > 0 && materials) {
        const materialCost = productUsage.reduce((acc, usage) => {
          const material = materials.find(m => m.id === usage.materialId);
          if (!material) return acc;
          const base = usage.quantityRequired * material.costPerUnit;
          return acc + (base * (1 + (usage.wastePercent || 5) / 100));
        }, 0);
        setSimBuyCost(materialCost);
      } else {
        setSimBuyCost(15); // Fallback to a standard baseline
      }

      if (linkedCosting) {
        setSimShipping(linkedCosting.shippingCost || 0);
        const labor = linkedCosting.laborHours && linkedCosting.hourlyRate 
          ? (linkedCosting.laborHours * linkedCosting.hourlyRate) 
          : (linkedCosting.laborCost || 0);
        setSimLabor(labor);
        setSimOverhead(linkedCosting.overheadAllocationRate || 10);
      }
    }
  }, [selectedProductId, products, linkedRegistry, usageRegistry, materials]);

  const simulation = useMemo(() => {
    // FORMULA: Profit = Total Revenue - Total Cost
    const unitDirectCost = simBuyCost + simLabor + simShipping;
    const unitOverhead = unitDirectCost * (simOverhead / 100);
    const unitTotalCost = unitDirectCost + unitOverhead;
    
    const profitPerUnit = simPrice - unitTotalCost;
    const totalRevenue = (simPrice * qty) + shippingCharged - discounts;
    const totalCost = (unitTotalCost * qty);
    const netProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      totalCost: totalCost,
      unitBuyPrice: simBuyCost,
      unitSalePrice: simPrice,
      unitShippingCost: simShipping,
      unitLabor: simLabor,
      unitOverhead: unitOverhead,
      netProfit,
      margin,
      profitPerUnit,
      costPerUnit: unitTotalCost,
      isHealthy: margin >= (linkedCosting?.targetProfitMargin || 30),
      isAtRisk: margin < 10
    };
  }, [simPrice, simBuyCost, simLabor, simShipping, simOverhead, qty, shippingCharged, discounts, linkedCosting]);

  const handleSaveToRegistry = async () => {
    if (!selectedProductId || !selectedProduct) {
      toast({ title: "Product Required", description: "Select a catalog item to link this simulation.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();

    try {
      // 1. Update Linked Costing (The bridge to Product DNA)
      const costingRef = doc(db, 'linked_product_costing', selectedProductId);
      const costingData: Partial<LinkedProductCosting> = {
        productId: selectedProductId,
        isLinked: true,
        laborCost: simLabor,
        shippingCost: simShipping,
        overheadAllocationRate: simOverhead,
        updatedAt: now
      };
      await setDocumentNonBlocking(costingRef, costingData, { merge: true });

      // 2. Sync Base Price back to Product Catalog
      const productRef = doc(db, 'products', selectedProductId);
      updateDocumentNonBlocking(productRef, {
        'pricingModel.basePrice': simPrice,
        updatedAt: now
      });

      // 3. Log Strategic Move
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user?.uid || 'unknown',
        action: 'Profit Strategy Committed',
        entityType: 'Product',
        entityId: selectedProductId,
        details: `Simulated and committed unit economics for ${selectedProduct.name}. Margin Target: ${simulation.margin.toFixed(1)}%`,
        timestamp: now
      });

      toast({ 
        title: "Strategy Synchronized", 
        description: "The product's financial DNA and catalog price have been updated." 
      });
    } catch (e) {
      toast({ title: "Registry Error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Chart Data
  const chartData = useMemo(() => {
    const steps = 10;
    const maxQty = Math.max(qty * 2, 200);
    const interval = Math.floor(maxQty / steps);
    
    return Array.from({ length: steps + 1 }).map((_, i) => {
      const q = i * interval;
      const rev = (simPrice * q);
      const cost = simulation.costPerUnit * q;
      return { qty: q, revenue: rev, cost: cost, profit: rev - cost };
    });
  }, [simPrice, simulation.costPerUnit, qty]);

  if (isProductsLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Sandbox...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Profit <span className="text-primary">Sandbox</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Simulate unit economics: (Sale - Buy - Ship - Labor - Overhead) * Quantity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase text-[10px] tracking-widest" onClick={() => {
            setSimPrice(45); setSimBuyCost(15); setSimLabor(0); setSimShipping(12); setSimOverhead(10);
            setShippingCharged(0); setDiscounts(0);
          }}>
            Reset Simulation —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl shadow-primary/20"
            onClick={handleSaveToRegistry}
            disabled={isSaving || !selectedProductId}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Authorize Registry Bridge —
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-10">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" /> Scenario Definition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Target Linked Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold">
                      <SelectValue placeholder="Sync from Catalog" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {products?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-primary">Batch Quantity</Label>
                  <Input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} className="h-14 rounded-2xl bg-muted/5 border-2 font-black text-xl text-primary" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-600">Revenue Additives (Shipping Charged)</Label>
                  <Input type="number" step="0.01" value={shippingCharged} onChange={e => setShippingCharged(parseFloat(e.target.value) || 0)} className="h-14 rounded-2xl bg-muted/5 border-2 font-bold" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-rose-600">Promotional Discounts ($)</Label>
                  <Input type="number" step="0.01" value={discounts} onChange={e => setDiscounts(parseFloat(e.target.value) || 0)} className="h-14 rounded-2xl bg-muted/5 border-2 font-bold" />
                </div>
              </div>

              <Separator />

              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <Zap className="h-4 w-4" /> "What-If" Unit Economics
                </h4>
                
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-primary">Sale Price per Unit ($)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={simPrice} 
                        onChange={e => setSimPrice(parseFloat(e.target.value) || 0)} 
                        className="h-14 rounded-2xl bg-muted/5 border-2 font-black text-primary text-lg" 
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-rose-600">Unit Shipping Cost ($)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={simShipping} 
                        onChange={e => setSimShipping(parseFloat(e.target.value) || 0)} 
                        className="h-14 rounded-2xl bg-muted/5 border-2 font-bold text-rose-600" 
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-zinc-500">Buy Price / Material Cost ($)</Label>
                        {productUsage.length > 0 && (
                          <Badge variant="secondary" className="text-[7px] font-black uppercase bg-emerald-50 text-emerald-600">Sync from BOM</Badge>
                        )}
                      </div>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={simBuyCost} 
                        onChange={e => setSimBuyCost(parseFloat(e.target.value) || 0)} 
                        className="h-14 rounded-2xl bg-muted/5 border-2 font-bold" 
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Labor & Overhead</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Labor $/ea" value={simLabor} onChange={e => setSimLabor(parseFloat(e.target.value) || 0)} className="h-10 rounded-xl" />
                        <Input type="number" placeholder="Overhead %" value={simOverhead} onChange={e => setSimOverhead(parseFloat(e.target.value) || 0)} className="h-10 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card h-[400px]">
            <CardHeader className="bg-muted/30 border-b py-4 px-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Trend Visualization</CardTitle>
            </CardHeader>
            <CardContent className="p-8 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="qty" label={{ value: 'Quantity', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val: number) => [`$${val.toFixed(2)}`]} />
                  <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary))" fillOpacity={0.1} stroke="hsl(var(--primary))" strokeWidth={3} />
                  <Line type="monotone" dataKey="cost" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', textTransform: 'uppercase', fontSize: '10px', fontWeight: '900' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <Card className={cn(
              "border-none rounded-[3rem] overflow-hidden shadow-2xl transition-colors duration-500",
              simulation.netProfit > 0 ? "bg-foreground text-background" : "bg-rose-600 text-white"
            )}>
              <CardHeader className="p-10 border-b border-white/10 bg-white/5 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Aggregate Project Net Profit</p>
                <h3 className="text-6xl font-black font-headline italic tracking-tighter">
                  ${simulation.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className="flex justify-center gap-2 mt-4">
                  <Badge className="bg-white/20 text-white font-black italic border-none text-xs">{simulation.margin.toFixed(1)}% Margin</Badge>
                  <Badge className="bg-white/20 text-white font-black italic border-none text-xs">Qty: {qty}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Unit Buy Price</p>
                    <p className="text-2xl font-black italic tracking-tight">${simulation.unitBuyPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Unit Sale Price</p>
                    <p className="text-2xl font-black italic tracking-tight">${simulation.unitSalePrice.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-8 bg-black/20 rounded-[2.5rem] border border-white/10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Net Left Per Unit</p>
                  <p className="text-4xl font-black font-headline italic text-primary">${simulation.profitPerUnit.toFixed(2)}</p>
                  <p className="text-[8px] font-bold opacity-40 uppercase mt-2">Sale Price - (Direct + Indirect Burn)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
              <CardHeader className="bg-muted/30 py-4 px-10 border-b">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Burn Anatomy per Unit</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  { label: 'Raw Stock (Buy Cost)', val: simulation.unitBuyPrice, icon: Boxes },
                  { label: 'Logistics (Ship Cost)', val: simulation.unitShippingCost, icon: Truck },
                  { label: 'Labor (Production)', val: simulation.unitLabor, icon: Zap },
                  { label: 'Overhead Allocation', val: simulation.unitOverhead, icon: Activity },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-muted/10 border flex items-center justify-center">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:text-primary transition-all" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs font-black italic">${item.val.toFixed(2)} / unit</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 flex items-center gap-6 group hover:bg-primary/10 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase italic">Product DNA Link</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-medium">
                  Commit this simulation to verify and rank this project in the <Link href="/admin/performance" className="text-primary hover:underline">Performance Hub</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
