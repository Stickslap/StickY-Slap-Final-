
'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Search, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileText,
  MapPin,
  Calendar,
  Zap,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Eye,
  Mail,
  ArrowRight,
  Lock,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

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
};

const timelineSteps = [
  { status: 'Submitted', icon: Clock, label: 'Order Logged' },
  { status: 'Proofing', icon: Eye, label: 'Design Review' },
  { status: 'In Production', icon: Zap, label: 'Manufacturing' },
  { status: 'Shipped', icon: Truck, label: 'Dispatch' },
  { status: 'Delivered', icon: CheckCircle2, label: 'Arrival' }
];

export default function PublicTrackingPage() {
  const db = useFirestore();
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);

  const [orderId, setOrderId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setIsSearching(true);
    setError(null);
    setOrder(null);

    try {
      const cleanId = orderId.trim().replace('#', '');
      let foundOrder: Order | null = null;

      if (cleanId.length >= 15) {
        const orderRef = doc(db, 'orders', cleanId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          foundOrder = { ...snap.data() as Order, id: snap.id };
        }
      } 
      
      if (!foundOrder) {
        const q = query(
          collection(db, 'orders'),
          where('__name__', '>=', cleanId),
          where('__name__', '<', cleanId + '\uf8ff'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundOrder = { ...snap.docs[0].data() as Order, id: snap.docs[0].id };
        }
      }

      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError("Order Number not found. Please check your confirmation email for the correct ID.");
      }
    } catch (err) {
      setError("Synchronization Failed: Unable to reach the order registry.");
    } finally {
      setIsSearching(false);
    }
  };

  const getStepIndex = (status: OrderStatus) => {
    if (['Submitted'].includes(status)) return 0;
    if (['Proofing', 'Approved', 'Rejected'].includes(status)) return 1;
    if (['In Production', 'QC', 'Ready'].includes(status)) return 2;
    if (['Shipped'].includes(status)) return 3;
    if (['Delivered', 'Closed'].includes(status)) return 4;
    return 0;
  };

  const isImage = (url?: string) => {
    if (!url) return false;
    const path = url.split('?')[0];
    return path.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || url.startsWith('data:image');
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col font-body" suppressHydrationWarning>
      <Header />
      <main className="flex-1 container max-w-7xl mx-auto py-12 px-4 md:py-24">
        {appearance?.orderStatusAlert && (
          <div className="mb-12 p-6 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center gap-4 text-primary">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="font-bold text-sm uppercase tracking-tight">{appearance.orderStatusAlert}</p>
          </div>
        )}
        
        {!order ? (
          <div className="max-w-xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                <ShieldCheck className="h-3 w-3" /> Stick Slap Order Lookup
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
                Track <span className="text-primary">Status</span>
              </h1>
              <p className="text-muted-foreground font-medium text-lg italic">
                Enter your order number to locate your order.
              </p>
            </div>

            <Card className="border-2 rounded-[2.5rem] shadow-2xl overflow-hidden bg-card">
              <CardContent className="p-10 space-y-8">
                <form onSubmit={handleTrack} className="space-y-6">
                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Order Number</Label>
                    <Input 
                      placeholder="e.g. QX-8382" 
                      className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold px-6 focus-visible:ring-primary"
                      value={orderId}
                      onChange={e => setOrderId(e.target.value)}
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className="flex items-start gap-3 p-5 text-xs font-bold uppercase tracking-tight text-destructive bg-destructive/5 rounded-2xl border-2 border-destructive/10 animate-in shake-in">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="pt-0.5 leading-relaxed">{error}</p>
                    </div>
                  )}

                  <Button className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" type="submit" disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Locate Order —</>}
                  </Button>
                </form>

                <Separator />
                
                <div className="text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Are you a member?</p>
                  <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-2" asChild>
                    <Link href="/login">Log In to Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-6 flex justify-center border-t">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3 w-3" /> Encrypted Session • Society Verified
                </p>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-[1.25rem] bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-xl">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none">
                      Project <span className="text-primary">#{order.id.slice(0, 8)}</span>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">
                      REGISTRY INTAKE: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <Badge className={cn(statusColors[order.status], "text-xl px-8 py-3 h-auto font-black uppercase italic tracking-tighter shadow-xl rounded-2xl")}>
                {order.status}
              </Badge>
            </div>

            <div className="grid gap-10 lg:grid-cols-12 items-start">
              
              <div className="lg:col-span-7 space-y-10">
                <Card className="border-2 rounded-[3rem] overflow-hidden shadow-sm bg-card relative">
                  <CardHeader className="bg-muted/30 border-b py-6 px-10">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-70 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Fulfillment Lifecycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-12 relative">
                    <div className="absolute top-[72px] left-[15%] right-[15%] h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                        style={{ width: `${(getStepIndex(order.status) / 4) * 100}%` }}
                      />
                    </div>
                    
                    <div className="relative flex justify-between items-start">
                      {timelineSteps.map((step, idx) => {
                        const isPast = getStepIndex(order.status) > idx;
                        const isCurrent = getStepIndex(order.status) === idx;
                        const StepIcon = step.icon;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center gap-4 z-10 w-20">
                            <div className={cn(
                              "h-14 w-14 rounded-full flex items-center justify-center border-4 transition-all duration-700",
                              isPast ? "bg-primary border-primary text-white scale-90" : 
                              isCurrent ? "bg-background border-primary text-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] scale-125" : 
                              "bg-background border-muted text-muted-foreground opacity-40"
                            )}>
                              {isPast ? <CheckCircle2 className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                            </div>
                            <div className="text-center space-y-1">
                              <p className={cn("text-[10px] font-black uppercase tracking-widest", isCurrent ? "text-primary" : "text-muted-foreground")}>
                                {step.status}
                              </p>
                              {isCurrent && (
                                <p className="text-[8px] font-bold text-muted-foreground animate-pulse">ACTIVE</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-16 p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 flex flex-col md:flex-row items-center gap-8">
                      <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 space-y-2 text-center md:text-left">
                        <h4 className="text-xl font-black uppercase italic tracking-tight">Phase Insight</h4>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                          {order.status === 'Proofing' ? "Our design collective is drafting your production mockup. Expect a verification alert in your registry shortly." :
                           order.status === 'Rejected' ? "Mockup revisions are currently being processed based on your feedback. We will issue a new proof for your review shortly." :
                           order.status === 'In Production' ? "High-precision cutting and UV-lamination are currently active. Your project is on the production bed." :
                           order.status === 'Shipped' ? "Registry Finalized. Your items have been dispatched and are in carrier transit." :
                           order.status === 'Submitted' ? "Intake Successful. We are currently analyzing your artwork for resolution and bleed compatibility." :
                           "Order cycle complete. Thank you for choosing the Society."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/30 py-4 px-8 border-b">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Artwork Manifest</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="space-y-4">
                          <div className="relative aspect-square w-full rounded-2xl border-2 bg-muted/5 overflow-hidden shadow-inner group flex items-center justify-center">
                            {isImage(item.artworkUrl) ? (
                              <Image 
                                src={item.artworkUrl || "https://picsum.photos/seed/art/800/800"} 
                                alt={item.productName} 
                                fill 
                                className="object-contain p-6 transition-transform duration-700 group-hover:scale-110" 
                                unoptimized
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3 opacity-40">
                                <FileText className="h-16 w-16" />
                                <span className="text-xs font-black uppercase">File Attached</span>
                              </div>
                            )}
                            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest text-primary">
                              Order Registry File
                            </div>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black uppercase tracking-tight">{item.productName}</span>
                            <Badge variant="outline" className="text-[9px] font-bold">QTY: {item.quantity}</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="space-y-8">
                    <Card className="border-2 rounded-[2.5rem] bg-foreground text-background overflow-hidden shadow-xl">
                      <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Logistics IQ</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Estimated Arrival</p>
                              <p className="text-lg font-black uppercase italic tracking-tight">
                                {order.estimate ? new Date(order.estimate.estimatedDeliveryDateMax).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pending Production Schedule'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                              <Truck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Carrier Method</p>
                              <p className="text-lg font-black uppercase italic tracking-tight">{order.shippingDetails?.method || 'Standard Ground'}</p>
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-1" />
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Destination Registry</p>
                              <p className="text-xs font-bold leading-relaxed">{order.shippingDetails?.address || 'Loading destination...'}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden shadow-xl">
                  <CardHeader className="bg-muted/30 py-6 px-10 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" /> Resolution Desk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-xl font-black uppercase italic tracking-tight leading-none">Need assistance with this order?</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                        Our technicians are standing by to help with artwork revisions or logistics queries at the processing center.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <Button className="w-full h-14 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg" asChild>
                        <Link href={`/contact?order=${order.id}`}>Open Resolution Thread —</Link>
                      </Button>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> 2hr Reply</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Society Staff</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="p-6 bg-muted/10 rounded-[2rem] border-2 border-dashed space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Direct Support</span>
                      </div>
                      <p className="text-xs font-bold truncate">support@printsocietyco.com</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
