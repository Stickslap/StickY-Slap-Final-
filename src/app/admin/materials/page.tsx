
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Download,
  Loader2,
  AlertCircle,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  Save,
  Tag,
  Warehouse,
  ArrowRight,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Material } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MaterialsInventoryPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const materialsQuery = useMemoFirebase(() => query(collection(db, 'materials'), orderBy('name')), [db]);
  const { data: materials, isLoading } = useCollection<Material>(materialsQuery);

  const filteredMaterials = materials?.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEditor = (material: Material | null = null) => {
    setEditingMaterial(material || {
      name: '',
      sku: '',
      category: 'Vinyl',
      supplier: '',
      unitType: 'roll',
      quantityOnHand: 0,
      costPerUnit: 0,
      sellingPricePerUnit: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      reorderLevel: 5,
      location: 'A1',
      notes: ''
    });
    setIsEditorOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial?.name || !editingMaterial?.sku) {
      toast({ title: "Validation Error", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const data = {
      ...editingMaterial,
      updatedAt: new Date().toISOString()
    };

    if (editingMaterial.id) {
      updateDocumentNonBlocking(doc(db, 'materials', editingMaterial.id), data);
      toast({ title: "Registry Updated" });
    } else {
      await addDocumentNonBlocking(collection(db, 'materials'), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Material Ingested" });
    }

    setIsProcessing(false);
    setIsEditorOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Purge "${name}" from registry?`)) {
      deleteDocumentNonBlocking(doc(db, 'materials', id));
      toast({ title: "Material Purged", variant: "destructive" });
    }
  };

  const metrics = {
    totalCost: materials?.reduce((acc, m) => acc + (m.quantityOnHand * m.costPerUnit), 0) || 0,
    totalRetail: materials?.reduce((acc, m) => acc + (m.quantityOnHand * (m.sellingPricePerUnit || m.costPerUnit * 2.5)), 0) || 0,
    lowStock: materials?.filter(m => m.quantityOnHand <= m.reorderLevel).length || 0
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Materials <span className="text-primary">Inventory</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Track production stock and financial valuation</p>
        </div>
        <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl" onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" /> Ingest Material —
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 rounded-3xl bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Cost Assets</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-foreground">${metrics.totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Projected Retail</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">${metrics.totalRetail.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl bg-card shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Critical Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-black font-headline italic tracking-tighter", metrics.lowStock > 0 ? "text-rose-500 animate-pulse" : "text-foreground")}>{metrics.lowStock}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10">
          <div className="relative group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search registry..." className="pl-12 h-14 rounded-2xl bg-background border-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-10 py-5 font-black uppercase text-[10px]">Material Profile</TableHead>
                  <TableHead className="px-10 py-5 font-black uppercase text-[10px]">On Hand</TableHead>
                  <TableHead className="px-10 py-5 font-black uppercase text-[10px]">Unit Cost</TableHead>
                  <TableHead className="px-10 py-5 font-black uppercase text-[10px]">Total Value</TableHead>
                  <TableHead className="px-10 py-5 text-right font-black uppercase text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials?.map((m) => (
                  <TableRow key={m.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="px-10 py-6">
                      <span className="font-black text-sm block uppercase tracking-tight italic">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-60 uppercase">{m.sku}</span>
                    </TableCell>
                    <TableCell className="px-10 font-bold">{m.quantityOnHand} {m.unitType}s</TableCell>
                    <TableCell className="px-10 font-mono text-xs">${m.costPerUnit.toFixed(2)}</TableCell>
                    <TableCell className="px-10 font-black text-sm italic">${(m.quantityOnHand * m.costPerUnit).toLocaleString()}</TableCell>
                    <TableCell className="px-10 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                          <DropdownMenuItem onClick={() => handleOpenEditor(m)}>Modify Record</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(m.id, m.name)}>Purge Registry</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-2">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Material Specification</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Material Label</Label><Input value={editingMaterial?.name ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, name: e.target.value})} className="h-12 border-2" /></div>
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Stock SKU</Label><Input value={editingMaterial?.sku ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, sku: e.target.value.toUpperCase()})} className="h-12 border-2 font-mono uppercase" /></div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Unit Cost ($)</Label><Input type="number" step="0.01" value={editingMaterial?.costPerUnit ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, costPerUnit: parseFloat(e.target.value) || 0})} className="h-12 border-2" /></div>
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Sale Value ($)</Label><Input type="number" step="0.01" value={editingMaterial?.sellingPricePerUnit ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, sellingPricePerUnit: parseFloat(e.target.value) || 0})} className="h-12 border-2 font-bold text-emerald-600" /></div>
              <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-60">Quantity</Label><Input type="number" value={editingMaterial?.quantityOnHand ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, quantityOnHand: parseFloat(e.target.value) || 0})} className="h-12 border-2" /></div>
            </div>
            <div className="grid gap-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Storage Location</Label><Input value={editingMaterial?.location ?? ''} onChange={e => setEditingMaterial({...editingMaterial!, location: e.target.value.toUpperCase()})} className="h-12 border-2" /></div>
          </div>
          <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary" onClick={handleSaveMaterial} disabled={isProcessing}>Commit to Registry —</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
