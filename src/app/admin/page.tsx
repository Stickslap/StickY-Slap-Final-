
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { subDays } from 'date-fns';
import { 
  Printer, 
  Clock, 
  AlertCircle,
  DollarSign,
  Users,
  Loader2,
  ShieldAlert,
  Database,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, limit, orderBy, doc } from 'firebase/firestore';
import { Order, UserProfile, Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAdmin } from './layout';
import { toast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [isSeeding, setIsSeeding] = useState(false);
  const [timeframe, setTimeframe] = useState('Lifetime');

  const roleRef = useMemoFirebase(() => (user ? doc(db, 'roles', user.uid) : null), [db, user]);
  const { data: roleData } = useDoc<Role>(roleRef);

  const allOrdersQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing || !roleData) return null;
    return collection(db, 'orders');
  }, [db, user, isStaff, isSyncing, roleData]);

  const allUsersQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing || !roleData) return null;
    return collection(db, 'users');
  }, [db, user, isStaff, isSyncing, roleData]);

  const { data: allOrders, isLoading: isOrdersLoading, error: ordersError } = useCollection<Order>(allOrdersQuery);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(allUsersQuery);
  
  const ticketsQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing || !roleData) return null;
    return collection(db, 'support_tickets');
  }, [db, user, isStaff, isSyncing, roleData]);
  const { data: allTickets, isLoading: isTicketsLoading } = useCollection<SupportTicket>(ticketsQuery);

  const metrics = useMemo(() => {
    if (!allOrders || !allUsers) return null;

    const now = new Date();
    
    // Total Orders (Lifetime)
    const totalOrders = allOrders.length;

    // Active Orders (Not shipped)
    const activeOrders = allOrders.filter(o => 
      !['Shipped', 'Delivered', 'Closed', 'Cancelled', 'Refunded', 'Draft'].includes(o.status)
    );

    // New Customers (Signed up or placed an order in last 30 days)
    const thirtyDaysAgo = subDays(now, 30);
    const newCustomers = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;

    // Late Shipments (Based on delivery date)
    const lateShipments = allOrders.filter(o => 
      o.estimate && 
      !['Delivered', 'Closed', 'Cancelled', 'Refunded', 'Draft'].includes(o.status) &&
      new Date(o.estimate.estimatedDeliveryDateMax) < now
    );

    // Production Queue (Awaiting proof confirmation or approved)
    const productionQueue = allOrders.filter(o => ['Proofing', 'Approved', 'In Production'].includes(o.status));

    // Attention Needed (Proof denied)
    const attentionNeeded = allOrders.filter(o => o.status === 'Rejected');

    return { 
      totalOrders, 
      activeOrdersCount: activeOrders.length, 
      newCustomers, 
      lateShipmentsCount: lateShipments.length,
      productionQueue,
      attentionNeeded
    };
  }, [allOrders, allUsers]);

  const stats = [
    { 
      title: 'Total Orders', 
      value: metrics ? metrics.totalOrders.toString() : '0', 
      change: 'Lifetime', 
      icon: Package, 
      color: 'text-slate-500' 
    },
    { 
      title: 'Active Orders', 
      value: metrics ? metrics.activeOrdersCount.toString() : '0', 
      change: 'Not yet shipped', 
      icon: Printer, 
      color: 'text-blue-500' 
    },
    { 
      title: 'New Customers', 
      value: metrics ? `+${metrics.newCustomers}` : '+0', 
      change: 'Last 30 days', 
      icon: Users, 
      color: 'text-purple-500' 
    },
    { 
      title: 'Late Shipments', 
      value: metrics ? metrics.lateShipmentsCount.toString() : '0', 
      change: 'Past delivery date', 
      icon: AlertCircle, 
      color: metrics?.lateShipmentsCount && metrics.lateShipmentsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-muted-foreground' 
    },
  ];


  if (ordersError && !isSyncing) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Administrative Access Error</AlertTitle>
          <AlertDescription>
            Firestore is unable to verify your administrative permissions. Please ensure your account is whitelisted or refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back. Here is what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest border-2">
              <Calendar className="mr-2 h-3.5 w-3.5 opacity-40" />
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Lifetime" className="text-[10px] font-bold uppercase">Lifetime Snapshot</SelectItem>
              <SelectItem value="Monthly" className="text-[10px] font-bold uppercase">Last 30 Days</SelectItem>
              <SelectItem value="Weekly" className="text-[10px] font-bold uppercase">Last 7 Days</SelectItem>
              <SelectItem value="Daily" className="text-[10px] font-bold uppercase">Last 24 Hours</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest">
            <Link href="/admin/orders/new">
              <Printer className="h-3.5 w-3.5 mr-2" />
              Manual Order
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-4 p-4 bg-yellow-100 text-yellow-900 rounded-xl text-xs font-mono">
          DEBUG: isStaff: {String(isStaff)}, isSyncing: {String(isSyncing)}, roleData: {JSON.stringify(roleData)}, allOrdersCount: {allOrders?.length || 0}, allUsersCount: {allUsers?.length || 0}
        </div>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-2 rounded-[1.5rem] shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent className="pt-4">
                {isOrdersLoading || isUsersLoading || isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <div className="text-2xl font-black font-headline italic tracking-tighter">{stat.value}</div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">{stat.change}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-2 rounded-[2rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg font-black uppercase italic tracking-tight">Production Queue</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Orders awaiting proof or in production.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y-2">
              {!metrics || metrics.productionQueue.length === 0 ? (
                <div className="text-center py-12 space-y-4 opacity-30">
                  <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest italic">No orders in production queue.</p>
                </div>
              ) : (
                metrics.productionQueue.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-6 hover:bg-muted/10 transition-colors group">
                    <div className="space-y-1">
                      <p className="text-sm font-black font-mono">#{order.id.slice(0, 8)}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Status: {order.status}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl font-bold uppercase text-[9px]">
                      <Link href={`/admin/orders/${order.id}`}>Manage —</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-2 rounded-[2rem] overflow-hidden shadow-sm bg-rose-50 border-rose-100">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-tight text-rose-900">Attention Needed</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Orders with denied proofs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!metrics || metrics.attentionNeeded.length === 0 ? (
              <div className="text-center py-8 opacity-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest mt-2">All good!</p>
              </div>
            ) : (
              metrics.attentionNeeded.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-rose-200">
                  <p className="text-xs font-black font-mono">#{order.id.slice(0, 8)}</p>
                  <Button variant="outline" size="sm" asChild className="rounded-xl font-bold uppercase text-[9px] border-rose-200 text-rose-700">
                    <Link href={`/admin/orders/${order.id}`}>Review —</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
