'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Star,
  Package,
  Clock,
  ArrowUpRight,
  Loader2,
  Database,
  LifeBuoy,
  BellRing,
  Trophy,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { UserProfile, Order, SupportTicket } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function CustomerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc<UserProfile>(profileRef);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  const showDevTools = appearance?.showSeedData ?? false;

  const recentOrdersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      limit(15) 
    );
  }, [db, user]);

  const recentTicketsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid),
      limit(5)
    );
  }, [db, user]);

  const { data: allUserOrders, isLoading: isOrdersLoading } = useCollection<Order>(recentOrdersQuery);
  const { data: recentTickets, isLoading: isTicketsLoading } = useCollection<SupportTicket>(recentTicketsQuery);

  const currentTier = useMemo(() => {
    if (profile?.accountTier) return profile.accountTier;
    const orderCount = allUserOrders?.length || 0;
    return orderCount > 10 ? 'Gold' : 'Standard';
  }, [profile, allUserOrders]);

  const handleSeedSampleData = async () => {
    if (!user) return;
    setIsSeeding(true);

    try {
      const now = new Date().toISOString();
      
      const testOrder: Partial<Order> = {
        userId: user.uid,
        customerEmail: user.email || 'member@printsociety.co',
        status: 'Submitted',
        createdAt: now,
        updatedAt: now,
        items: [
          {
            productId: 'test-stickers',
            productName: 'Society Sample Pack (Test)',
            quantity: 50,
            options: { 'Finish': 'Matte', 'Cut': 'Die Cut' },
            artworkUrl: 'https://picsum.photos/seed/test-art/400/400',
            productThumbnail: 'https://picsum.photos/seed/test-art/400/400',
          }
        ],
        pricing: {
          subtotal: 45.00,
          discount: 0,
          tax: 3.60,
          shipping: 0,
          total: 48.60
        },
        shippingDetails: {
          address: '123 Society Ave, Print City, CA 90210',
          method: 'Standard Member Shipping'
        }
      };

      const testTicket: Partial<SupportTicket> = {
        userId: user.uid,
        customerEmail: user.email || '',
        subject: 'Diagnostic: Artwork Verification Test',
        message: 'This is a system-generated test ticket to verify the resolution desk and security rules.',
        category: 'General Inquiry',
        status: 'open',
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            id: 'msg-1',
            senderId: 'system',
            senderName: 'Society Bot',
            text: 'Diagnostic thread initiated. Your security rules are being verified.',
            isAdmin: true,
            timestamp: now
          }
        ]
      };

      await addDocumentNonBlocking(collection(db, 'orders'), testOrder);
      await addDocumentNonBlocking(collection(db, 'support_tickets'), testTicket);

      toast({
        title: "Sample Data Injected",
        description: "A test order and support ticket have been added to your account.",
      });
    } catch (e: any) {
      toast({
        title: "Seeding Failed",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Member <span className="text-primary">Overview</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">
            Welcome back, {profile?.firstName || user?.displayName?.split(' ')[0] || 'Society Member'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {showDevTools && (
            <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-2" onClick={handleSeedSampleData} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Database className="mr-2 h-3.5 w-3.5 text-primary" />}
              Seed Test Data —
            </Button>
          )}
          <Button className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" asChild>
            <Link href="/products"><ShoppingBag className="mr-2 h-3.5 w-3.5" /> Start New Project —</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Membership Status</CardTitle>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black italic font-headline">Verified</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">Society Member since {profile ? new Date(profile.createdAt).getFullYear() : '2024'}</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Projects</CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black italic font-headline">{allUserOrders?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">Total registry items</p>
          </CardContent>
        </Card>

        <Card className={cn("border-2 rounded-[2rem] overflow-hidden shadow-sm transition-all", profile?.storeCredit && profile.storeCredit > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Available Credit</CardTitle>
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", profile?.storeCredit && profile.storeCredit > 0 ? "bg-emerald-500 text-white shadow-lg" : "bg-emerald-50")}>
              <DollarSign className={cn("h-4 w-4", profile?.storeCredit && profile.storeCredit > 0 ? "text-white" : "text-emerald-500")} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-black italic font-headline", profile?.storeCredit && profile.storeCredit > 0 ? "text-emerald-600" : "")}>
              ${(profile?.storeCredit || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">Society Registry Balance</p>
          </CardContent>
        </Card>

        <Card className={cn("border-2 rounded-[2rem] overflow-hidden shadow-sm transition-all", currentTier === 'Gold' ? "bg-amber-500/5 border-amber-500/20" : "")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Account Tier</CardTitle>
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", currentTier === 'Gold' ? "bg-amber-500 text-white shadow-lg" : "bg-amber-50")}>
              {currentTier === 'Gold' ? <Trophy className="h-4 w-4" /> : <Star className="h-4 w-4 text-amber-500" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-black italic font-headline", currentTier === 'Gold' ? "text-amber-600" : "")}>{currentTier}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
              {currentTier === 'Gold' ? 'Society Gold Status Activated' : 'Excellence in every print'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Recent Registry
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Your latest production activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest h-8" asChild>
                <Link href="/dashboard/orders">See All <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isOrdersLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
              ) : allUserOrders && allUserOrders.length > 0 ? (
                <div className="divide-y-2">
                  {allUserOrders.slice(0, 5).map((order) => (
                    <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="block group">
                      <div className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-muted/10 border-2 flex items-center justify-center shrink-0">
                            <Clock className="h-5 w-5 text-muted-foreground opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight">#{order.id.slice(0, 8)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter">
                          {order.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No active projects found</p>
                  {showDevTools && (
                    <Button variant="outline" className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest" onClick={handleSeedSampleData}>
                      Seed Sample Data —
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-primary" /> Active Threads
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest h-8" asChild>
                <Link href="/dashboard/support">Resolution Desk <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isTicketsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </div>
              ) : recentTickets && recentTickets.length > 0 ? (
                <div className="divide-y-2">
                  {recentTickets.map((ticket) => {
                    const hasNewResponse = ticket.messages && ticket.messages.length > 0 && ticket.messages[ticket.messages.length - 1].isAdmin;
                    
                    return (
                      <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block group">
                        <div className="p-6 space-y-3 hover:bg-muted/5 transition-colors relative">
                          {hasNewResponse && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 text-primary animate-pulse">
                              <BellRing className="h-3 w-3" />
                              <span className="text-[8px] font-black uppercase tracking-widest">New Response</span>
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-black uppercase tracking-tight line-clamp-1 pr-16">{ticket.subject}</p>
                            <Badge variant="outline" className="text-[7px] h-4 font-black uppercase px-1 border-primary/20 text-primary">{ticket.status}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{ticket.message}"</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest">No active inquiries</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2.5rem] bg-foreground text-background overflow-hidden shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Society Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all group px-6" asChild>
                <Link href="/dashboard/account">
                  <span className="text-[10px] font-black uppercase tracking-widest">Global Profile Sync</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all group px-6" asChild>
                <Link href="/dashboard/support">
                  <span className="text-[10px] font-black uppercase tracking-widest">Resolution Desk</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all group px-6" asChild>
                <Link href="/products">
                  <span className="text-[10px] font-black uppercase tracking-widest">Collections Lab</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
