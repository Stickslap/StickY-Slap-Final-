
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Search, 
  Filter, 
  ArrowRight, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusColors: Record<OrderStatus, string> = {
  Draft: 'bg-slate-500',
  Submitted: 'bg-blue-500',
  Proofing: 'bg-amber-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-rose-600',
  'In Production': 'bg-purple-500',
  QC: 'bg-pink-500',
  Ready: 'bg-indigo-500',
  Shipped: 'bg-cyan-500',
  Delivered: 'bg-green-500',
  Closed: 'bg-slate-700',
  'On Hold': 'bg-orange-500',
  Cancelled: 'bg-rose-500',
  Refunded: 'bg-red-700',
  PendingPayment: 'bg-slate-400',
};

export default function MyOrdersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simplified query to avoid index requirements for combined where + orderBy
  const ordersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      limit(100)
    );
  }, [db, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    // Sort manually on client to avoid Firestore index complexity in prototype
    const sorted = [...orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sorted.filter(order => 
      order.status !== 'PendingPayment' &&
      (order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm]);

  if (!isMounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            My <span className="text-primary">Registry</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">A comprehensive log of your Society print projects</p>
        </div>
        <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 w-full md:w-auto" asChild>
          <Link href="/products">New Project —</Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by Order ID or Product Name..." 
              className="pl-10 h-12 rounded-xl bg-background border-2 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 rounded-xl border-2 px-6 font-bold uppercase tracking-widest text-[10px] w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" /> Refine
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Society Archive...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="border-2 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all group bg-card">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-center">
                    <div className="p-8 flex-1 space-y-6 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black uppercase tracking-tight italic">#{order.id.slice(0, 8)}</h3>
                            <Badge className={cn(statusColors[order.status], "text-[9px] font-black uppercase h-5 tracking-tighter px-2")}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                            LOGGED: {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-black font-headline italic tracking-tighter leading-none">${order.pricing.total.toFixed(2)}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">TOTAL TRANSACED</p>
                        </div>
                      </div>

                      <Separator className="bg-muted/50" />

                      <div className="flex flex-wrap gap-6">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted/10 border-2 flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-primary opacity-40" />
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase tracking-tight leading-none truncate max-w-[150px]">{item.productName}</p>
                              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">Units: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="flex items-center text-[10px] font-black uppercase text-muted-foreground bg-muted/20 px-3 rounded-full h-10">
                            + {order.items.length - 2} Items
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/5 md:border-l-2 p-8 md:w-48 flex items-center justify-center w-full">
                      <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] group-hover:bg-primary group-hover:text-white transition-all shadow-sm" asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          View Project <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed rounded-[3rem] bg-muted/5">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center border-2">
                <Package className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase font-headline">Registry Empty</h3>
                <p className="text-muted-foreground max-w-xs font-medium uppercase text-xs tracking-widest">Start your first custom project to begin your history.</p>
              </div>
              <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-sm shadow-lg w-full sm:w-auto" asChild>
                <Link href="/products">Browse Collections —</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
