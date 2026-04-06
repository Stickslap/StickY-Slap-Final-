
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock3, 
  Search, 
  AlertCircle, 
  TrendingDown, 
  DollarSign, 
  Loader2,
  Zap,
  ArrowRight,
  ShieldAlert,
  Percent,
  Plus,
  RefreshCw,
  Edit,
  Trash,
  Database,
  Save,
  Boxes,
  X,
  MoreHorizontal,
  Warehouse,
  User,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser
} from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { Material, VendorProduct, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, subDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function InventoryAgingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials'), orderBy('purchaseDate', 'asc')), [db]);
  const { data: materials, isLoading } = useCollection<Material>(materialsQuery);

  const agedStock = useMemo(() => {
    if (!materials) return [];
    return materials.map(m => {
      const days = differenceInDays(new Date(), parseISO(m.purchaseDate || new Date().toISOString()));
      let urgency: 'Fresh' | 'Watch' | 'Aging' | 'Old' | 'Critical' = 'Fresh';
      let color = 'bg-emerald-50 text-emerald-600';
      
      if (days > 180) { urgency = 'Critical'; color = 'bg-rose-600 text-white'; }
      else if (days > 90) { urgency = 'Old'; color = 'bg-orange-600 text-white'; }
      else if (days > 30) { urgency = 'Watch'; color = 'bg-blue-500 text-white'; }
      
      return { ...m, daysInStock: days, urgency, color };
    }).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [materials, searchTerm]);

  const valueAtRisk = useMemo(() => {
    return agedStock
      .filter(m => m.urgency === 'Critical' || m.urgency === 'Old')
      .reduce((acc, m) => acc + (m.quantityOnHand * m.costPerUnit), 0);
  }, [agedStock]);

  const handleOpenEditor = (material: Material | null = null) => {
    setEditingMaterial(material || {
      name: '',
      sku: '',
      category: 'Vinyl',
      supplier: '',
      quantityOnHand: 0,
      costPerUnit: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      location: 'A1'
    });
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (!editingMaterial?.name || !editingMaterial?.sku) return;
    setIsProcessing(true);
    const now = new Date().toISOString();
    if (editingMaterial.id) {
      updateDocumentNonBlocking(doc(db, 'materials', editingMaterial.id), { ...editingMaterial, updatedAt: now });
      toast({ title: "Aging Updated" });
    } else {
      addDocumentNonBlocking(collection(db, 'materials'), { ...editingMaterial, createdAt: now, updatedAt: now });
      toast({ title: "Material Logged" });
    }
    setIsProcessing(false);
    setIsEditorOpen(false);
  };

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Auditing Lifecycle Records...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">Inventory <span className="text-primary">Aging</span></h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Lifecycle monitoring and cash-at-risk auditing</p>
        </div>
        <Button className="rounded-xl h-12 px-8 font-black uppercase text-[10px] bg-primary shadow-xl" onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" /> Ingest material —
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 rounded-[2rem] bg-rose-600 text-white shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Capital at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter">${valueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-1">Assets older than 90 days</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Critical Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-rose-600">
              {agedStock.filter(m => m.urgency === 'Critical').length} SPECS
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">&gt; 180 Days in Stock</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Turnover Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">
              {Math.round((agedStock.filter(m => m.urgency === 'Fresh').length / (agedStock.length || 1)) * 100)}%
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Fresh Stock Ratio</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
        <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search lifecycle..." className="pl-12 h-14 rounded-2xl bg-background border-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-600" /><span className="text-[8px] font-black uppercase opacity-60">Critical</span></div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-600" /><span className="text-[8px] font-black uppercase opacity-60">Old</span></div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[8px] font-black uppercase opacity-60">Watch</span></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-10 py-5 text-left">Component</th>
                  <th className="px-10 py-5 text-left">Urgency</th>
                  <th className="px-10 py-5 text-left">Days in Stock</th>
                  <th className="px-10 py-5 text-left">Cost Basis</th>
                  <th className="px-10 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2">
                {agedStock.map(m => (
                  <tr key={m.id} className="group hover:bg-muted/5 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted/10 border-2 flex items-center justify-center text-muted-foreground">
                          <Boxes className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase tracking-tight italic leading-none">{m.name}</p>
                          <p className="text-[9px] font-mono text-muted-foreground opacity-60 mt-1 uppercase">{m.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10">
                      <Badge className={cn("text-[8px] font-black uppercase px-3 h-6 border-none shadow-sm", m.color)}>
                        {m.urgency}
                      </Badge>
                    </td>
                    <td className="px-10">
                      <div className="flex items-center gap-2">
                        <span className="font-black italic text-lg">{m.daysInStock}</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Days</span>
                      </div>
                    </td>
                    <td className="px-10 font-mono text-xs font-bold">
                      ${(m.quantityOnHand * m.costPerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-10 text-right">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all" onClick={() => handleOpenEditor(m as Material)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-2">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Modify Inventory Log</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Label</Label><Input value={editingMaterial?.name ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, name: e.target.value})} className="h-12 border-2" /></div>
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Purchase Date</Label><Input type="date" value={editingMaterial?.purchaseDate?.split('T')[0] ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, purchaseDate: e.target.value})} className="h-12 border-2" /></div>
            </div>
          </div>
          <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl" onClick={handleSave} disabled={isProcessing}>Sync Registry —</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
