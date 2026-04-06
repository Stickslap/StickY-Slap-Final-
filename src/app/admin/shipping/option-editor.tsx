
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShippingOption, ProductTemplate } from '@/lib/types';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Package, Truck, DollarSign, Clock, ShieldAlert, Plus, Trash, Target, Check, Loader2 } from 'lucide-react';

interface OptionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ShippingOption | null;
}

const DEFAULT_OPTION: Partial<ShippingOption> = {
  name: '',
  code: '',
  active: true,
  isDefault: false,
  description: '',
  pricing: { strategy: 'Flat', baseRate: 0, freeThreshold: 0, tiers: [] },
  transit: { minDays: 3, maxDays: 5, carrier: 'UPS', service: 'Ground' },
  processing: { minDays: 2, maxDays: 4, rushEnabled: false, startRule: 'Immediate' },
  rules: { allowedTypes: ['Ship'], domesticOnly: true, allowedProductIds: [], allowedCategories: [] },
  cutoffTime: '14:00'
};

export function OptionEditor({ open, onOpenChange, initialData }: OptionEditorProps) {
  const db = useFirestore();
  const [data, setData] = useState<Partial<ShippingOption>>({
    ...DEFAULT_OPTION,
    processing: { ...DEFAULT_OPTION.processing! },
    transit: { ...DEFAULT_OPTION.transit! },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products for filtering selection
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products'), orderBy('name')), [db]);
  const { data: products } = useCollection<ProductTemplate>(productsQuery);

  const categories = Array.from(new Set(products?.map(p => p.category) || []));

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData({
          ...initialData,
          processing: { ...DEFAULT_OPTION.processing!, ...initialData.processing },
          transit: { ...DEFAULT_OPTION.transit!, ...initialData.transit },
          rules: {
            ...DEFAULT_OPTION.rules!,
            ...(initialData.rules || {})
          }
        });
      } else {
        setData({
          ...DEFAULT_OPTION,
          processing: { ...DEFAULT_OPTION.processing! },
          transit: { ...DEFAULT_OPTION.transit! },
        });
      }
    }
  }, [initialData?.id, open]);

  const handleSave = () => {
    setIsSubmitting(true);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
      code: data.code || data.name?.toUpperCase().replace(/\s/g, '_')
    };

    if (initialData?.id) {
      updateDocumentNonBlocking(doc(db, 'shipping_options', initialData.id), updatedData);
      toast({ title: "Method Updated" });
    } else {
      addDocumentNonBlocking(collection(db, 'shipping_options'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Method Created" });
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  const toggleProductRestriction = (productId: string) => {
    const current = data.rules?.allowedProductIds || [];
    const updated = current.includes(productId) 
      ? current.filter(id => id !== productId)
      : [...current, productId];
    setData({ ...data, rules: { ...data.rules!, allowedProductIds: updated } });
  };

  const toggleCategoryRestriction = (category: string) => {
    const current = data.rules?.allowedCategories || [];
    const updated = current.includes(category) 
      ? current.filter(c => c !== category)
      : [...current, category];
    setData({ ...data, rules: { ...data.rules!, allowedCategories: updated } });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto p-0 rounded-l-[2rem]">
        <SheetHeader className="p-8 border-b bg-muted/30">
          <SheetTitle className="flex items-center gap-2 text-2xl font-black uppercase italic tracking-tighter">
            <Truck className="h-6 w-6 text-primary" />
            {initialData ? 'Edit Shipping' : 'New Smart Method'}
          </SheetTitle>
          <SheetDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Architect delivery logic and restrictions.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basics" className="w-full">
          <div className="px-8 border-b bg-muted/10">
            <TabsList className="bg-transparent h-14 w-full justify-start gap-8 p-0">
              <TabsTrigger value="basics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest">Basics</TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest">Pricing Rules</TabsTrigger>
              <TabsTrigger value="timing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest">Timing</TabsTrigger>
              <TabsTrigger value="eligibility" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-[10px] font-black uppercase tracking-widest">Restrictions</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 pb-32 space-y-8 h-[calc(100vh-200px)] overflow-y-auto">
            <TabsContent value="basics" className="space-y-6 m-0">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Method Identity (Public)</Label>
                  <Input placeholder="e.g. Standard Tracked Ground" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">System Registry Code</Label>
                  <Input placeholder="e.g. STANDARD_UPS" value={data.code} onChange={e => setData({...data, code: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2 font-mono uppercase text-xs" />
                </div>
                <div className="flex items-center gap-8 pt-4 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10">
                  <div className="flex items-center gap-3">
                    <Switch checked={data.active} onCheckedChange={v => setData({...data, active: v})} />
                    <Label className="text-[10px] font-black uppercase tracking-widest">Active</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={data.isDefault} onCheckedChange={v => setData({...data, isDefault: v})} />
                    <Label className="text-[10px] font-black uppercase tracking-widest">Default Method</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-8 m-0">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Pricing Strategy</Label>
                    <Select 
                      value={data.pricing?.strategy} 
                      onValueChange={v => setData({...data, pricing: {...data.pricing!, strategy: v as any}})}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Flat" className="text-[10px] font-bold uppercase">Flat Rate</SelectItem>
                        <SelectItem value="Subtotal" className="text-[10px] font-bold uppercase">Subtotal Based</SelectItem>
                        <SelectItem value="Weight" className="text-[10px] font-bold uppercase">Weight Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Base Logic Rate ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                      <Input type="number" step="0.01" className="pl-10 h-12 rounded-xl bg-muted/5 border-2 font-black text-primary" value={data.pricing?.baseRate} onChange={e => setData({...data, pricing: {...data.pricing!, baseRate: parseFloat(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timing" className="space-y-10 m-0">
              <div className="bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] p-8 space-y-4 shadow-inner">
                <div className="flex items-center gap-3 text-amber-800">
                  <Clock className="h-6 w-6" />
                  <h4 className="text-xl font-black uppercase italic tracking-tight">Registry Cutoff</h4>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-amber-700">Daily Submission Cutoff (Local)</Label>
                  <Input type="time" className="bg-white border-2 border-amber-200 h-14 rounded-2xl text-lg font-black" value={data.cutoffTime} onChange={e => setData({...data, cutoffTime: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-tight">Production Time (Days)</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Min Days</Label>
                    <Input type="number" className="h-12 rounded-xl bg-muted/5 border-2" value={data.processing?.minDays} onChange={e => setData({...data, processing: {...data.processing!, minDays: parseInt(e.target.value) || 0}})} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Max Days</Label>
                    <Input type="number" className="h-12 rounded-xl bg-muted/5 border-2" value={data.processing?.maxDays} onChange={e => setData({...data, processing: {...data.processing!, maxDays: parseInt(e.target.value) || 0}})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-tight">Transit Time (Days)</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Min Days</Label>
                    <Input type="number" className="h-12 rounded-xl bg-muted/5 border-2" value={data.transit?.minDays} onChange={e => setData({...data, transit: {...data.transit!, minDays: parseInt(e.target.value) || 0}})} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Max Days</Label>
                    <Input type="number" className="h-12 rounded-xl bg-muted/5 border-2" value={data.transit?.maxDays} onChange={e => setData({...data, transit: {...data.transit!, maxDays: parseInt(e.target.value) || 0}})} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eligibility" className="space-y-10 m-0">
              <div className="space-y-8">
                <div className="p-8 bg-muted/5 border-2 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase tracking-tight">Regional Confinement</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Only show for domestic addresses.</p>
                    </div>
                    <Switch checked={data.rules?.domesticOnly} onCheckedChange={v => setData({...data, rules: {...data.rules!, domesticOnly: v}})} />
                  </div>
                  <Separator />
                  <div className="grid gap-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Fulfillment Archetype</Label>
                    <div className="flex gap-3">
                      {['Ship', 'Pickup'].map((type) => (
                        <div 
                          key={type} 
                          onClick={() => {
                            const types = data.rules?.allowedTypes || [];
                            const updated = types.includes(type as any) ? types.filter(t => t !== type) : [...types, type as any];
                            setData({...data, rules: {...data.rules!, allowedTypes: updated}});
                          }}
                          className={cn(
                            "flex-1 p-4 rounded-2xl border-2 text-center cursor-pointer transition-all font-black uppercase tracking-widest text-[10px]",
                            data.rules?.allowedTypes.includes(type as any) ? "bg-primary text-white border-primary shadow-lg" : "bg-background border-muted hover:border-primary/30"
                          )}
                        >
                          {type} Mode
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 py-6 px-8 flex flex-row items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Eligibility Registry</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Restrict by Category</Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <Badge 
                            key={cat} 
                            variant={data.rules?.allowedCategories?.includes(cat) ? 'default' : 'outline'}
                            className="cursor-pointer font-black text-[10px] uppercase h-8 px-4 rounded-xl border-2"
                            onClick={() => toggleCategoryRestriction(cat)}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Restrict to Specific Products</Label>
                      <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {products?.map(p => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all",
                              data.rules?.allowedProductIds?.includes(p.id) ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-muted/5"
                            )}
                            onClick={() => toggleProductRestriction(p.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted border flex items-center justify-center shrink-0 overflow-hidden">
                                {p.thumbnail ? <img src={p.thumbnail} alt="" className="object-cover" /> : <Package className="h-4 w-4 opacity-20" />}
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase italic leading-none">{p.name}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">ID: {p.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                              data.rules?.allowedProductIds?.includes(p.id) ? "bg-primary border-primary text-white" : "border-muted"
                            )}>
                              {data.rules?.allowedProductIds?.includes(p.id) && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-8 bg-background border-t-4 border-muted/30 flex gap-4">
          <Button variant="outline" className="flex-1 h-16 rounded-[1.25rem] font-black uppercase tracking-widest text-xs border-2" onClick={() => onOpenChange(false)}>Abort</Button>
          <Button className="flex-1 h-16 rounded-[1.25rem] font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sync Method —'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
