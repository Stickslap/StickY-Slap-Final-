
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Warehouse, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  Download, 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  FileDown,
  Loader2,
  ChevronRight,
  TrendingUp,
  Package,
  Building2,
  UserCheck,
  Database
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
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { UserProfile, VendorProduct } from '@/lib/types';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function VendorManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const vendorsQuery = useMemoFirebase(() => 
    query(collection(db, 'users'), where('role', '==', 'Vendor')), 
  [db]);
  const { data: vendors, isLoading: isVendorsLoading } = useCollection<UserProfile>(vendorsQuery);

  const allVendorProductsQuery = useMemoFirebase(() => collection(db, 'vendor_products'), [db]);
  const { data: allProducts, isLoading: isProductsLoading } = useCollection<VendorProduct>(allVendorProductsQuery);

  const vendorStats = useMemo(() => {
    if (!vendors || !allProducts) return [];

    return vendors.map(vendor => {
      const vendorProducts = allProducts.filter(p => p.vendorId === vendor.id);
      const productCount = vendorProducts.length;
      const totalQuantity = vendorProducts.reduce((acc, p) => acc + (Number(p.quantityAvailable) || 0), 0);
      return { ...vendor, productCount, totalQuantity };
    }).filter(v => 
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.printShopDetails?.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, allProducts, searchTerm]);

  if (!isMounted) return null;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
            <Warehouse className="h-3 w-3" /> Supply Chain
          </div>
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic text-foreground leading-none">
            Vendor <span className="text-primary">Registry</span>
          </h2>
        </div>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
        <CardHeader className="bg-muted/30 border-b py-6 px-10">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vendors..." className="pl-12 h-14 rounded-2xl bg-background border-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isVendorsLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Syncing Registry...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-8 py-5 font-black uppercase text-[10px]">Supplier</TableHead>
                  <TableHead className="px-8 py-5 font-black uppercase text-[10px]">Status</TableHead>
                  <TableHead className="px-8 py-5 font-black uppercase text-[10px]">Specs</TableHead>
                  <TableHead className="px-8 py-5 font-black uppercase text-[10px]">Stock</TableHead>
                  <TableHead className="px-8 py-5 text-right font-black uppercase text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorStats.map((v) => (
                  <TableRow key={v.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="px-8 py-6 font-bold uppercase italic text-sm">{v.printShopDetails?.businessName || v.name || v.email}</TableCell>
                    <TableCell className="px-8"><Badge className={cn("text-[8px] font-black uppercase", v.verificationStatus === 'verified' ? "bg-emerald-500" : "bg-amber-500")}>{v.verificationStatus || 'pending'}</Badge></TableCell>
                    <TableCell className="px-8 font-mono text-xs">{v.productCount}</TableCell>
                    <TableCell className="px-8 font-black italic text-xs">{v.totalQuantity.toLocaleString()}</TableCell>
                    <TableCell className="px-8 text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2" asChild>
                        <Link href={`/admin/vendors/${v.id}`}>Manage —</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
