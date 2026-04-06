'use client';

import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Plus, 
  Search, 
  Trash, 
  Loader2,
  Package,
  Zap,
  CheckCircle2,
  Settings2,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Save,
  Boxes,
  Percent,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ProductTemplate, LinkedProductCosting, Material, MaterialUsage } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MaterialUsagePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedProductId, setSelectedOrderId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data Queries
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products')), [db]);
  const { data: products } = useCollection<ProductTemplate>(productsQuery);

  const linkedQuery = useMemoFirebase(() => query(collection(db, 'linked_product_costing')), [db]);
  const { data: linkedRegistry } = useCollection<LinkedProductCosting>(linkedQuery);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials')), [db]);
  const { data: materials } = useCollection<Material>(materialsQuery);

  const usageQuery = useMemoFirebase(() => query(collection(db, 'material_usage')), [db]);
  const { data: usageRegistry } = useCollection<MaterialUsage>(usageQuery);

  // Derived State
  const linkedProducts = useMemo(() => {
    if (!products || !linkedRegistry) return [];
    return products.filter(p => linkedRegistry.some(l => l.productId === p.id));
  }, [products, linkedRegistry]);

  const selectedProduct = useMemo(() => 
    linkedProducts.find(p => p.id === selectedProductId),
  [linkedProducts, selectedProductId]);

  const activeUsage = useMemo(() => 
    usageRegistry?.filter(u => u.productId === selectedProductId) || [],
  [usageRegistry, selectedProductId]);

  const handleAddMaterial = async (materialId: string) => {
    if (!selectedProductId || !materialId) return;
    setIsProcessing(true);

    const exists = activeUsage.some(u => u.materialId === materialId);
    if (exists) {
      toast({ title: "Material Already Linked", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    const payload: Partial<MaterialUsage> = {
      productId: selectedProductId,
      materialId,
      quantityRequired: 1,
      wastePercent: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await addDocumentNonBlocking(collection(db, 'material_usage'), payload);
    toast({ title: "Material Usage Ingested" });
    setIsProcessing(false);
  };

  const handleUpdateUsage = (id: string, updates: Partial<MaterialUsage>) => {
    updateDocumentNonBlocking(doc(db, 'material_usage', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteUsage = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'material_usage', id));
    toast({ title: "Usage Component Removed", variant: "destructive" });
  };

  const currentBOMTotal = useMemo(() => {
    return activeUsage.reduce((acc, usage) => {
      const material = materials?.find(m => m.id === usage.materialId);
      if (!material) return acc;
      const baseCost = usage.quantityRequired * material.costPerUnit;
      return acc + (baseCost * (1 + usage.wastePercent / 100));
    }, 0);
  }, [activeUsage, materials]);

  return (
    <div className="space-y-10 pb-20">
      <div className="space-y-1">
        <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
          Material <span className="text-primary">Usage (BOM)</span>
        </h2>
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Architect the Bill of Materials for linked products</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Product Selection */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Target Project
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Select Linked Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Search registry..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {linkedProducts.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-bold uppercase">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center overflow-hidden">
                        {selectedProduct.thumbnail ? <img src={selectedProduct.thumbnail} alt="Product" /> : <Package className="h-6 w-6 opacity-20" />}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase italic leading-none">{selectedProduct.name}</p>
                        <p className="text-[10px] font-bold text-primary mt-1">${selectedProduct.pricingModel?.basePrice?.toFixed(2)} Base</p>
                      </div>
                    </div>
                    <Separator className="bg-primary/10" />
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-60 text-muted-foreground">BOM Components</span>
                      <span className="text-primary">{activeUsage.length} Items</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-60 text-muted-foreground">Total Stock Cost</span>
                      <span className="text-xl italic tracking-tighter text-primary">${currentBOMTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedProduct && (
            <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-card">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Add Ingredient
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Search Stock Materials</Label>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {materials?.map(m => (
                      <div key={m.id} className="p-3 bg-muted/5 border-2 rounded-xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer" onClick={() => handleAddMaterial(m.id)}>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">{m.name}</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{m.sku} • ${m.costPerUnit}/{m.unitType}</p>
                        </div>
                        <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Usage Registry */}
        <div className="lg:col-span-8">
          {!selectedProduct ? (
            <div className="h-[400px] border-4 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <Calculator className="h-12 w-12 text-muted-foreground opacity-20" />
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Architecture Selection Pending</h3>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground max-w-xs mx-auto">Select a linked product from the registry to manage its material components.</p>
              </div>
            </div>
          ) : (
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card animate-in fade-in duration-700">
              <CardHeader className="bg-muted/30 border-b py-6 px-10">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Bill of Materials Registry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="px-8 font-black uppercase tracking-[0.2em] text-[9px]">Ingredient</TableHead>
                      <TableHead className="px-8 font-black uppercase tracking-[0.2em] text-[9px]">Qty Needed</TableHead>
                      <TableHead className="px-8 font-black uppercase tracking-[0.2em] text-[9px]">Waste %</TableHead>
                      <TableHead className="px-8 font-black uppercase tracking-[0.2em] text-[9px]">Comp Cost</TableHead>
                      <TableHead className="px-8 font-black uppercase tracking-[0.2em] text-[9px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeUsage.map((usage) => {
                      const material = materials?.find(m => m.id === usage.materialId);
                      if (!material) return null;
                      const baseCost = usage.quantityRequired * material.costPerUnit;
                      const finalCost = baseCost * (1 + usage.wastePercent / 100);

                      return (
                        <TableRow key={usage.id} className="group hover:bg-muted/10 transition-colors">
                          <TableCell className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted border flex items-center justify-center text-muted-foreground">
                                <Boxes className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase italic tracking-tight">{material.name}</p>
                                <p className="text-[9px] font-mono text-muted-foreground opacity-60">${material.costPerUnit}/{material.unitType}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-8">
                            <div className="flex items-center gap-2 max-w-[100px]">
                              <Input 
                                type="number" 
                                step="0.01" 
                                className="h-8 rounded-lg bg-background border-2 font-bold text-xs" 
                                value={usage.quantityRequired ?? ''}
                                onChange={e => handleUpdateUsage(usage.id, { quantityRequired: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-40">{material.unitType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-8">
                            <div className="flex items-center gap-2 max-w-[100px]">
                              <Input 
                                type="number" 
                                step="0.01" 
                                className="h-8 rounded-lg bg-background border-2 font-bold text-xs" 
                                value={usage.wastePercent ?? ''}
                                onChange={e => handleUpdateUsage(usage.id, { wastePercent: parseFloat(e.target.value) || 0 })}
                              />
                              <Percent className="h-3 w-3 opacity-20" />
                            </div>
                          </TableCell>
                          <TableCell className="px-8">
                            <span className="text-sm font-black italic text-primary">${finalCost.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="px-8 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 rounded-lg" onClick={() => handleDeleteUsage(usage.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {activeUsage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">
                          No ingredients assigned to this project yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {activeUsage.length > 0 && (
                <CardFooter className="p-8 bg-muted/30 border-t flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 border flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Registry Validated</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aggregate Component Cost</p>
                    <p className="text-3xl font-black font-headline italic tracking-tighter text-primary">${currentBOMTotal.toFixed(2)}</p>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
