'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  LayoutGrid, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Loader2, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  Download,
  AlertCircle,
  Database,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useAuth
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { VendorProduct } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function VendorDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localProducts, setLocalProducts] = useState<VendorProduct[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { 
    setIsMounted(true); 
  }, []);

  // Handle unauthorized access via Effect to prevent "setState while rendering" error
  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      router.push('/vendor/login');
    }
  }, [user, isUserLoading, router, isMounted]);

  const productsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'vendor_products'), where('vendorId', '==', user.uid));
  }, [db, user]);

  const { data: remoteProducts, isLoading: isDataLoading } = useCollection<VendorProduct>(productsQuery);

  useEffect(() => {
    if (remoteProducts) {
      setLocalProducts(remoteProducts);
    }
  }, [remoteProducts]);

  const filteredProducts = useMemo(() => {
    return localProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.size.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localProducts, searchTerm]);

  const stats = useMemo(() => {
    const total = localProducts.length;
    const qty = localProducts.reduce((acc, p) => acc + (Number(p.quantityAvailable) || 0), 0);
    const avgPrice = total > 0 
      ? localProducts.reduce((acc, p) => acc + (Number(p.pricePerRoll) || 0), 0) / total 
      : 0;
    return { total, qty, avgPrice };
  }, [localProducts]);

  const handleCellChange = (id: string, field: keyof VendorProduct, value: any) => {
    setLocalProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleAddRow = () => {
    if (!user) return;
    const newId = doc(collection(db, 'vendor_products')).id;
    const newProduct: VendorProduct = {
      id: newId,
      vendorId: user.uid,
      name: '',
      size: '24 inch',
      materialType: 'Vinyl',
      thickness: '3 mil',
      adhesiveType: 'Permanent',
      feetPerRoll: 50,
      pricePerRoll: 0,
      quantityAvailable: 0,
      updatedAt: new Date().toISOString()
    };
    setLocalProducts([newProduct, ...localProducts]);
  };

  const handleDuplicateRow = (product: VendorProduct) => {
    const newId = doc(collection(db, 'vendor_products')).id;
    const duplicated = { 
      ...product, 
      id: newId, 
      updatedAt: new Date().toISOString() 
    };
    setLocalProducts([duplicated, ...localProducts]);
    toast({ title: "Row Duplicated" });
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      for (const p of localProducts) {
        const productRef = doc(db, 'vendor_products', p.id);
        setDocumentNonBlocking(productRef, {
          ...p,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      toast({ title: "Registry Synchronized", description: "All changes saved to the Society vault." });
    } catch (e) {
      toast({ title: "Sync Failed", variant: "destructive" });
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleDeleteRow = (id: string) => {
    if (confirm("Permanently purge this item from your supply registry?")) {
      deleteDocumentNonBlocking(doc(db, 'vendor_products', id));
      setLocalProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: "Item Purged" });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/vendor/login');
  };

  // Render loading state if auth or mount is pending, or if user is missing
  if (!isMounted || isUserLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Syncing Vendor Registry...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-body flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-white border-b h-20 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <Link href="/vendor">
            <Image src={LOGO_URL} alt="Logo" width={160} height={40} className="h-9 w-auto object-contain" unoptimized />
          </Link>
          <div className="hidden md:flex items-center gap-3 pl-8 border-l">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Verified Supplier</p>
              <p className="text-sm font-black uppercase italic tracking-tight">{user.displayName || user.email?.split('@')[0]}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block mr-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Registry Pulse</p>
            <p className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" /> Last Sync: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl h-10 border-2 font-bold uppercase text-[10px] tracking-widest" onClick={handleSignOut}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Log Out
          </Button>
          <Button 
            className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-primary shadow-lg shadow-primary/20"
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Sync Registry —
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1800px] mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 rounded-[2rem] bg-white shadow-sm overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border shadow-inner group-hover:scale-110 transition-transform">
                <Database className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Registry Depth</p>
                <p className="text-3xl font-black font-headline italic tracking-tighter">{stats.total} Specs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-[2rem] bg-white shadow-sm overflow-hidden group hover:border-emerald-500/30 transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner group-hover:scale-110 transition-transform">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume Index</p>
                <p className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">{stats.qty} Units</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-[2rem] bg-white shadow-sm overflow-hidden group hover:border-amber-500/30 transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-inner group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Price Parity (Avg)</p>
                <p className="text-3xl font-black font-headline italic tracking-tighter text-amber-600">${stats.avgPrice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search registry by product name or width..." 
              className="h-12 pl-12 rounded-xl bg-white border-2 focus-visible:ring-primary shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-2 font-bold uppercase text-[10px] tracking-widest bg-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button className="flex-1 sm:flex-none h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest bg-foreground text-background hover:bg-zinc-800 shadow-xl" onClick={handleAddRow}>
              <Plus className="mr-2 h-4 w-4" /> Append Row —
            </Button>
          </div>
        </div>

        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-muted/30 backdrop-blur-md">
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="min-w-[250px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r">Product Specification</TableHead>
                  <TableHead className="min-w-[150px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r">Material Type</TableHead>
                  <TableHead className="min-w-[120px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r">Thickness</TableHead>
                  <TableHead className="min-w-[150px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r">Adhesive Type</TableHead>
                  <TableHead className="min-w-[150px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r">Width / Size</TableHead>
                  <TableHead className="min-w-[120px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r text-center">Feet/Roll</TableHead>
                  <TableHead className="min-w-[120px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r text-center">Price/Roll</TableHead>
                  <TableHead className="min-w-[120px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-r text-center">In Stock</TableHead>
                  <TableHead className="w-[120px] px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDataLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={9} className="h-16 bg-muted/5"></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p, idx) => (
                    <TableRow key={p.id} className={cn("group transition-colors border-b", idx % 2 === 0 ? "bg-white" : "bg-muted/10")}>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          value={p.name} 
                          onChange={e => handleCellChange(p.id, 'name', e.target.value)}
                          placeholder="Enter product name..."
                          className="w-full h-16 px-8 bg-transparent border-none outline-none font-bold text-sm placeholder:italic focus:ring-2 focus:ring-primary/20"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <select 
                          value={p.materialType || 'Vinyl'}
                          onChange={e => handleCellChange(p.id, 'materialType', e.target.value)}
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                          <option value="Vinyl">Vinyl</option>
                          <option value="Banner">Banner</option>
                          <option value="Cast">Cast</option>
                          <option value="Lamination">Lamination</option>
                          <option value="Other">Other</option>
                        </select>
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          value={p.thickness || ''} 
                          onChange={e => handleCellChange(p.id, 'thickness', e.target.value)}
                          placeholder="3 mil"
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-sm font-medium focus:ring-2 focus:ring-primary/20 text-center"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          value={p.adhesiveType || ''} 
                          onChange={e => handleCellChange(p.id, 'adhesiveType', e.target.value)}
                          placeholder="Permanent"
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          value={p.size} 
                          onChange={e => handleCellChange(p.id, 'size', e.target.value)}
                          placeholder="e.g. 24 inch"
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-sm font-medium focus:ring-2 focus:ring-primary/20 text-center uppercase tracking-tighter"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          type="number"
                          value={p.feetPerRoll || ''} 
                          onChange={e => handleCellChange(p.id, 'feetPerRoll', Number(e.target.value))}
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-sm font-mono focus:ring-2 focus:ring-primary/20 text-center"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <div className="relative h-16 flex items-center justify-center">
                          <span className="absolute left-6 text-muted-foreground text-xs">$</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={p.pricePerRoll || ''} 
                            onChange={e => handleCellChange(p.id, 'pricePerRoll', Number(e.target.value))}
                            className="w-full h-full px-8 pl-10 bg-transparent border-none outline-none text-sm font-black text-emerald-600 focus:ring-2 focus:ring-primary/20 text-center italic"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-0 border-r focus-within:bg-primary/5">
                        <input 
                          type="number"
                          value={p.quantityAvailable || ''} 
                          onChange={e => handleCellChange(p.id, 'quantityAvailable', Number(e.target.value))}
                          className="w-full h-16 px-8 bg-transparent border-none outline-none text-sm font-black focus:ring-2 focus:ring-primary/20 text-center"
                        />
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => handleDuplicateRow(p)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteRow(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                        <Database className="h-12 w-12" />
                        <p className="text-sm font-black uppercase italic">Registry Clear</p>
                        <Button variant="outline" size="sm" className="rounded-xl border-2" onClick={handleAddRow}>
                          <Plus className="mr-2 h-3.5 w-3.5" /> Initialize First Entry —
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <footer className="py-12 px-8 border-t bg-white text-center flex flex-col items-center gap-4">
        <Image src={LOGO_URL} alt="Logo" width={140} height={35} className="h-8 w-auto object-contain opacity-40 grayscale" unoptimized />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Print Society .co — Supply Side Infrastructure</p>
      </footer>
    </div>
  );
}
