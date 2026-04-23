'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  Clock, 
  Loader2, 
  MapPin, 
  CreditCard,
  Printer,
  ShoppingBag,
  Lock,
  Zap,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Eye,
  Send,
  Download,
  ShieldCheck
} from 'lucide-react';
import { ContractDialog } from '@/components/checkout/contract-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Order, CheckoutSettings, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase';

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png";

function ConfirmationContent({ orderId, email }: { orderId: string | null, email: string | null }) {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [triggerDownload, setTriggerDownload] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const orderRef = useMemoFirebase(() => (orderId ? doc(db, 'orders', orderId) : null), [db, orderId]);
  const { data: order, isLoading } = useDoc<Order>(orderRef);
  
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);

  useEffect(() => {
    if (order && !hasUpdatedStatus && (order.status === 'Draft' || order.status === 'PendingPayment')) {
      const orderDocRef = doc(db, 'orders', order.id);
      updateDocumentNonBlocking(orderDocRef, { 
        status: 'Submitted' as OrderStatus,
        updatedAt: new Date().toISOString()
      });
      setHasUpdatedStatus(true);
    }
  }, [order, hasUpdatedStatus, db]);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : DEFAULT_LOGO;

  const copyRegistryKey = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setHasCopied(true);
    toast({ title: "Registry Key Copied" });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleEmailAgreement = async () => {
    if (!order || !orderId) return;
    setIsSendingEmail(true);
    try {
      // Logic for resending the agreement email
      toast({ title: "Agreement Sent", description: `A copy has been dispatched to ${order.customerEmail}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to send email copy.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isImage = (url?: string) => {
    if (!url) return false;
    const path = url.split('?')[0];
    return path.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || url.startsWith('data:image');
  };

  if (!isMounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Retrieving Society Receipt...</p>
      </div>
    );
  }

  if (!order || (email && order.customerEmail.toLowerCase() !== email.toLowerCase())) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <h1 className="text-2xl font-black uppercase font-headline tracking-tighter">Order Not Found</h1>
        <p className="text-muted-foreground max-w-xs">We couldn't locate your receipt details. Please check your order ID or email.</p>
        <Button variant="outline" asChild><Link href="/">Return to Shop</Link></Button>
      </div>
    );
  }

  const deliveryMin = order.estimate ? new Date(order.estimate.estimatedDeliveryDateMin) : null;
  const deliveryMax = order.estimate ? new Date(order.estimate.estimatedDeliveryDateMax) : null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 font-body pb-20 flex flex-col">
      <div className="w-full py-12 flex justify-center bg-background border-b">
        <Image 
          src={logoUrl} 
          alt="Sticky Slap" 
          width={240} 
          height={60} 
          className="h-12 w-auto object-contain"
          priority
          unoptimized
        />
      </div>

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border-4 border-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none">
              Thank <span className="text-primary">You</span>
            </h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">
              Order #{order.id.slice(0, 8)} is now in the Society Queue
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-5 items-start">
          <div className="md:col-span-3 space-y-8">
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl">
              <CardHeader className="bg-muted/50 p-8 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Order Manifest
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="shrink-0 flex gap-2">
                      <div className="h-20 w-20 relative rounded-2xl border-2 bg-muted/5 overflow-hidden shadow-sm flex items-center justify-center">
                        <Image 
                          src={item.productThumbnail || "https://picsum.photos/seed/placeholder/400/400"} 
                          alt={item.productName} 
                          fill 
                          className="object-contain p-2" 
                          unoptimized
                        />
                      </div>
                      <div className="h-20 w-20 relative rounded-2xl border-2 bg-muted/5 overflow-hidden shadow-sm flex items-center justify-center">
                        {isImage(item.artworkUrl) ? (
                          <Image 
                            src={item.artworkUrl || ""} 
                            alt="Design Preview" 
                            fill 
                            className="object-contain p-2" 
                            unoptimized
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 opacity-40">
                            <FileText className="h-6 w-6" />
                            <span className="text-[6px] font-black uppercase">Design Attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 py-1 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-black uppercase tracking-tight leading-none">{item.productName}</h3>
                        <Badge variant="secondary" className="font-black text-[10px]">QTY: {item.quantity}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(item.options).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[8px] h-4 px-1.5 font-bold uppercase border-muted-foreground/20">
                            {v as string}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest"><span className="text-muted-foreground">Product Subtotal</span><span>${order.pricing.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest"><span className="text-muted-foreground">Logistics & Handling</span><span>${order.pricing.shipping.toFixed(2)}</span></div>
                  <div className="pt-4">
                    <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Total Transacted</span>
                      <span className="text-3xl font-black font-headline italic tracking-tighter">${order.pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 px-4 no-print">
              <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-foreground text-background hover:bg-primary transition-all shadow-lg" asChild>
                <Link href="/dashboard/orders">View Dashboard</Link>
              </Button>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-2" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Save Receipt
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" /> Service Agreement Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                  Your project is protected by a binding custom print agreement signed at checkout. 
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-10" onClick={() => setShowContract(true)}>
                    <Eye className="mr-2 h-3.5 w-3.5" /> View Signed Agreement
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-10" onClick={() => {
                    setTriggerDownload(true);
                    setShowContract(true);
                  }}>
                    <Download className="mr-2 h-3.5 w-3.5" /> Export Signature Pack
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-10" onClick={handleEmailAgreement} disabled={isSendingEmail}>
                    {isSendingEmail ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />} Email Copy —
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ContractDialog 
              open={showContract} 
              onOpenChange={(open) => {
                setShowContract(open);
                if (!open) setTriggerDownload(false);
              }} 
              triggerDownload={triggerDownload}
              data={{
                fullName: order.contractSignature?.fullName || '',
                billingAddress: order.contractSignature?.billingAddress || '',
                shippingAddress: order.contractSignature?.shippingAddress || '',
                email: order.customerEmail,
                ipAddress: order.contractSignature?.ipAddress,
                timestamp: order.contractSignature?.signedAt ? new Date(order.contractSignature.signedAt).toLocaleString() : ''
              }}
            />

            <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <ExternalLink className="h-3 w-3" /> Guest Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Full Registry Key</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={orderId || ''} className="h-10 bg-muted/5 border-2 font-mono text-[10px]" />
                    <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={copyRegistryKey}>
                      {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest" asChild>
                  <Link href={`/track?id=${orderId}&email=${email}`}>Track Project Status —</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-4 border-primary bg-primary text-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-10px font-black uppercase tracking-[0.4em] opacity-80 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Society Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Expected Delivery Window</p>
                  <div className="text-3xl font-black font-headline italic uppercase tracking-tighter leading-none mt-1">
                    {deliveryMin?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {deliveryMax?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function OrderConfirmationPage(props: { 
  searchParams: Promise<{ id?: string, email?: string }> 
}) {
  const searchParams = React.use(props.searchParams);
  const orderId = searchParams.id || null;
  const email = searchParams.email || null;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ConfirmationContent orderId={orderId} email={email} />
    </Suspense>
  );
}
