
'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Link as LinkIcon, 
  Unlink, 
  Loader2,
  Package,
  Zap,
  CheckCircle2,
  Settings2,
  ArrowRight,
  Target,
  ShieldCheck,
  Save,
  Tag,
  Edit,
  Clock,
  Layers,
  Percent,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ProductTemplate, LinkedProductCosting, Material, MaterialUsage } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function LinkedProductCostingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCosting, setEditingCosting] = useState<Partial<LinkedProductCosting> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const productsQuery = useMemoFirebase(() => query(collection(db, 'products')), [db]);
  const { data: products, isLoading: isProductsLoading } = useCollection<ProductTemplate>(productsQuery);

  const costingQuery = useMemoFirebase(() => query(collection(db, 'linked_product_costing')), [db]);
  const { data: costingRegistry, isLoading: isCostingLoading } = useCollection<LinkedProductCosting>(costingQuery);

  const usageQuery = useMemoFirebase(() => query(collection(db, 'material_usage')), [db]);
  const { data: usageRegistry } = useCollection<MaterialUsage>(usageQuery);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials')), [db]);
  const { data: materials } = useCollection<Material>(materialsQuery);

  const costingMap = useMemo(() => {
    const map: Record<string, LinkedProductCosting> = {};
    costingRegistry?.forEach(c => { map[c.productId] = c; });
    return map;
  }, [costingRegistry]);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLinkProduct = (product: ProductTemplate) => {
    const existing = costingMap[product.id];
    setEditingCosting(existing || {
      productId: product.id,
      isLinked: true,
      laborCost: 0,
      hourlyRate: 25,
      laborHours: 0.1,
      packagingCost: 0,
      shippingCost: 10,
      platformFee: 0,
      paymentFee: 3,
      otherFees: 0,
      overheadAllocationRate: 10,
      targetProfitMargin: 40
    });
    setIsEditorOpen(true);
  };

  const handleSaveCosting = async () => {
    if (!editingCosting?.productId) return;
    setIsProcessing(true);
    const docId = editingCosting.id || editingCosting.productId;
    const data = { ...editingCosting, id: docId, updatedAt: new Date().toISOString() };
    await setDocumentNonBlocking(doc(db, 'linked_product_costing', docId), data, { merge: true });
    toast({ title: "Costing Registry Synchronized" });
    setIsProcessing(false);
    setIsEditorOpen(false);
  };

  const calculateProductTotals = (productId: string) => {
    const costing = costingMap[productId];
    if (!costing) return null;
    const usages = usageRegistry?.filter(u => u.productId === productId) || [];
    const materialCost = usages.reduce((acc, usage) => {
      const material = materials?.find(m => m.id === usage.materialId);
      if (!material) return acc;
      const baseCost = (usage.quantityRequired ?? 0) * (material.costPerUnit ?? 0);
      return acc + (baseCost * (1 + (usage.wastePercent ?? 5) / 100));
    }, 0);
    const labor = costing.laborHours && costing.hourlyRate ? (costing.laborHours * costing.hourlyRate) : (costing.laborCost || 0);
    const directCosts = materialCost + labor + (costing.packagingCost || 0) + (costing.shippingCost || 0) + (costing.otherFees || 0);
    const fees = directCosts * (((costing.platformFee || 0) + (costing.paymentFee || 0)) / 100);
    const overhead = directCosts * ((costing.overheadAllocationRate || 0) / 100);
    const totalCost = directCosts + fees + overhead;
    return { materialCost, labor, totalCost, directCosts };
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">Linked Product <span className="text-primary">Costing</span></h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Bridge your catalog with advanced production and overhead logic</p>
        </div>
      </div>

      <div className="relative group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input placeholder="Search catalog..." className="pl-12 h-14 rounded-2xl bg-background border-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isProductsLoading || isCostingLoading ? (
            <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-muted/30"><TableHead className="px-10 py-5 font-black uppercase tracking-widest text-[10px]">Product Profile</TableHead><TableHead className="px-10 py-5 font-black uppercase tracking-widest text-[10px]">Registry Status</TableHead><TableHead className="px-10 py-5 font-black uppercase tracking-widest text-[10px]">Production Burn</TableHead><TableHead className="px-10 py-5 font-black uppercase tracking-widest text-[10px]">Net Profit Index</TableHead><TableHead className="px-10 py-5 text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredProducts?.map((p) => {
                  const costing = costingMap[p.id];
                  const totals = calculateProductTotals(p.id);
                  const sellingPrice = p.pricingModel?.basePrice || 0;
                  const profit = totals ? sellingPrice - totals.totalCost : 0;
                  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
                  const isBelowTarget = totals && costing && margin < (costing.targetProfitMargin || 0);
                  return (
                    <TableRow key={p.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="px-10 py-6"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-muted border overflow-hidden shrink-0 relative">{p.thumbnail ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground/30 absolute inset-0 m-auto" />}</div><div><span className="font-bold text-sm block uppercase italic">{p.name}</span></div></div></TableCell>
                      <TableCell className="px-10">{costing ? <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase h-5 px-2"><ShieldCheck className="h-3 w-3 mr-1" /> Financial Secure</Badge> : <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-2 opacity-40">No Bridge</Badge>}</TableCell>
                      <TableCell className="px-10">{totals ? <div className="space-y-0.5"><p className="text-sm font-black italic">${totals.totalCost.toFixed(2)}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Direct: ${totals.directCosts.toFixed(2)}</p></div> : <span className="text-xs text-muted-foreground italic">Pending BOM...</span>}</TableCell>
                      <TableCell className="px-10"><div className="space-y-0.5"><p className={cn("text-sm font-black italic", profit > 0 ? "text-emerald-600" : "text-rose-500")}>${profit.toFixed(2)}</p><p className={cn("text-[8px] font-black uppercase flex items-center gap-1", isBelowTarget ? "text-rose-500" : "text-emerald-600")}>{isBelowTarget && <AlertCircle className="h-2 w-2" />}Index: {margin.toFixed(1)}%</p></div></TableCell>
                      <TableCell className="px-10 text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10" onClick={() => handleLinkProduct(p)}>{costing ? <><Edit className="mr-2 h-3.5 w-3.5" /> Modify Logic</> : <><LinkIcon className="mr-2 h-3.5 w-3.5" /> Bridge Project</>}</Button></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] border-2 overflow-hidden p-0">
          <DialogHeader className="bg-primary/5 p-10 border-b border-primary/10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tight flex items-center gap-3"><Target className="h-8 w-8 text-primary" /> Costing Architecture</DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-10 overflow-y-auto max-h-[70vh]">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Staff Hourly Rate ($/hr)</Label>
                  <Input type="number" step="0.01" value={editingCosting?.hourlyRate ?? 0} onChange={e => setEditingCosting({...editingCosting!, hourlyRate: parseFloat(e.target.value) || 0})} className="h-12 border-2" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Hours Per Unit</Label>
                  <Input type="number" step="0.01" value={editingCosting?.laborHours ?? 0} onChange={e => setEditingCosting({...editingCosting!, laborHours: parseFloat(e.target.value) || 0})} className="h-12 border-2" />
                </div>
              </div>
              <div className="space-y-8">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Packaging Cost / Unit</Label>
                  <Input type="number" step="0.01" value={editingCosting?.packagingCost ?? 0} onChange={e => setEditingCosting({...editingCosting!, packagingCost: parseFloat(e.target.value) || 0})} className="h-12 border-2" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Shipping Cost / Unit</Label>
                  <Input type="number" step="0.01" value={editingCosting?.shippingCost ?? 0} onChange={e => setEditingCosting({...editingCosting!, shippingCost: parseFloat(e.target.value) || 0})} className="h-12 border-2" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="p-6 bg-muted/5 border-2 border-dashed rounded-[2rem] space-y-4 text-center">
              <Calculator className="h-8 w-8 text-muted-foreground opacity-20 mx-auto" />
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold tracking-widest">
                Real-time material costs from the <code>BOM Registry</code> are automatically factored into the burn calculation.
              </p>
            </div>
          </div>
          <DialogFooter className="p-10 bg-muted/10 border-t">
            <Button variant="outline" className="rounded-xl h-12" onClick={() => setIsEditorOpen(false)}>Abort Sync</Button>
            <Button className="rounded-xl h-12 bg-primary font-black uppercase tracking-widest text-[10px]" onClick={handleSaveCosting} disabled={isProcessing}>Authorize Financial Bridge —</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
