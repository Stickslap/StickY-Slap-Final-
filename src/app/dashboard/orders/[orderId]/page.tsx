'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  History,
  Download,
  ExternalLink,
  ShieldCheck,
  Truck,
  MapPin,
  Loader2,
  Calendar,
  XCircle,
  ArrowRight,
  MessageSquare,
  Eye,
  Send,
  Building2,
  Mail,
  Smartphone,
  Check,
  X,
  FileCheck,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser
} from '@/firebase';
import { doc, collection, query, orderBy, onSnapshot, arrayUnion } from 'firebase/firestore';
import { Order, OrderStatus, ActivityLog, Proof, EmailTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import { dispatchSocietyEmail } from '@/app/actions/email';

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

export default function OrderDetailsPage(props: { params: Promise<{ orderId: string }> }) {
  const params = React.use(props.params);
  const orderId = params.orderId;
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [isApproving, setIsApproving] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [liveOrder, setLiveOrder] = useState<Order | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  const alertMessage = appearance?.orderStatusAlert || '';

  const orderRef = useMemoFirebase(() => (orderId ? doc(db, 'orders', orderId) : null), [db, orderId]);

  // Fetch Templates for Automation
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  useEffect(() => {
    if (!orderRef) return;
    const unsub = onSnapshot(orderRef, (snap) => {
      if (snap.exists()) {
        setLiveOrder({ ...snap.data() as Order, id: snap.id });
      }
      setIsLiveLoading(false);
    });
    return () => unsub();
  }, [orderRef]);

  const activityQuery = useMemoFirebase(() => 
    orderId ? query(collection(db, 'orders', orderId, 'activity'), orderBy('timestamp', 'desc')) : null
  , [db, orderId]);
  const { data: activity } = useCollection<ActivityLog>(activityQuery);

  const handleApproveProof = async (proofId: string) => {
    if (!orderRef || !liveOrder || !user) return;
    setIsApproving(true);
    
    const now = new Date().toISOString();
    
    const updatedProofs = (liveOrder.proofs || []).map(p => 
      p.id === proofId ? { ...p, status: 'approved' as const, feedback: '' } : p
    );

    updateDocumentNonBlocking(orderRef, { 
      status: 'Approved',
      proofs: updatedProofs,
      proofApproval: {
        approvedByUid: user.uid,
        approvedByEmail: user.email || '',
        approvedAt: now,
        comment: 'Member Web Approval'
      },
      updatedAt: now 
    });

    // Dispatch Automation
    const template = templates?.find(t => t.trigger === 'artwork_approved' && t.enabled);
    if (template) {
      await dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: user.displayName?.split(' ')[0] || 'Society Member',
        order_id: liveOrder.id.slice(0, 8),
        order_status: 'Approved',
        order_link: `${window.location.origin}/dashboard/orders/${liveOrder.id}`
      });
    }
    
    addDocumentNonBlocking(collection(db, 'orders', orderId, 'activity'), {
      action: 'Design Approved',
      timestamp: now,
      details: `Member authorized production proof v${liveOrder.proofs?.find(p => p.id === proofId)?.version || 1} for manufacturing.`
    });

    toast({ title: "Design Authorized", description: "Your project has moved to the production queue." });
    setIsApproving(false);
  };

  const handleRejectProof = async (proofId: string) => {
    if (!orderRef || !rejectionNote.trim() || !user || !liveOrder) {
      toast({ title: "Note Required", description: "Please explain the required adjustments.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    const updatedProofs = (liveOrder.proofs || []).map(p => 
      p.id === proofId ? { ...p, status: 'rejected' as const, feedback: rejectionNote } : p
    );

    updateDocumentNonBlocking(orderRef, {
      status: 'Rejected',
      proofs: updatedProofs,
      updatedAt: now
    });

    // Dispatch Automation
    const template = templates?.find(t => t.trigger === 'artwork_rejected' && t.enabled);
    if (template) {
      await dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: user.displayName?.split(' ')[0] || 'Society Member',
        order_id: liveOrder.id.slice(0, 8),
        order_status: 'Revisions Requested',
        rejection_reason: rejectionNote,
        order_link: `${window.location.origin}/dashboard/orders/${liveOrder.id}`
      });
    }

    addDocumentNonBlocking(collection(db, 'orders', orderId, 'activity'), {
      action: 'Revisions Requested',
      timestamp: now,
      details: `Member requested changes to v${liveOrder.proofs?.find(p => p.id === proofId)?.version || 1}: ${rejectionNote}`
    });

    toast({ title: "Feedback Sent", description: "Our design team will review your notes and update the registry." });
    setRejectionNote('');
  };

  const isImage = (url?: string) => {
    if (!url) return false;
    const path = url.split('?')[0].toLowerCase();
    return (
      path.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)$/i) || 
      url.startsWith('data:image') ||
      url.includes('cloudinary.com') ||
      url.includes('picsum.photos') ||
      url.includes('images.unsplash.com')
    );
  };

  const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
    if (!trackingNumber) return null;
    const c = carrier?.toLowerCase() || '';
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    if (c.includes('fedex')) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`;
    return `https://www.google.com/search?q=${trackingNumber}`;
  };

  if (isLiveLoading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Retrieving Society Registry...</p>
    </div>
  );
  
  if (!liveOrder) return (
    <div className="p-20 text-center space-y-6">
      <AlertCircle className="h-16 w-16 text-destructive mx-auto opacity-20" />
      <h2 className="text-2xl font-black uppercase font-headline">Order Not Found</h2>
      <Button variant="outline" className="rounded-xl px-8" onClick={() => router.push('/dashboard/orders')}>
        Return to Registry
      </Button>
    </div>
  );

  const approvedProof = liveOrder.proofs?.find(p => p.status === 'approved');

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {alertMessage && (
        <div className="p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center gap-4 text-amber-900">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
          <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">{alertMessage}</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 border hover:bg-primary hover:text-white transition-all" onClick={() => router.push('/dashboard/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
                Project <span className="text-primary">#{liveOrder.id.slice(0, 8)}</span>
              </h2>
              <Badge className={cn(statusColors[liveOrder.status], "text-[10px] h-5 uppercase font-black tracking-tighter px-2")}>{liveOrder.status}</Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">
              INITIATED: {new Date(liveOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] border-2 group" asChild>
            <Link href="/products">
              New Project <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-4 px-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Fulfillment Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 px-4 gap-6 sm:gap-0">
                <div className="absolute top-[34px] left-[19px] sm:left-[10%] sm:right-[10%] w-1 sm:w-auto sm:h-1 bg-muted -z-0" />
                {[
                  { label: 'Submitted', active: true },
                  { label: 'Proofing', active: ['Proofing', 'Approved', 'Rejected', 'In Production', 'QC', 'Ready', 'Shipped', 'Delivered'].includes(liveOrder.status) },
                  { label: 'Production', active: ['In Production', 'QC', 'Ready', 'Shipped', 'Delivered'].includes(liveOrder.status) },
                  { label: 'Shipped', active: ['Shipped', 'Delivered'].includes(liveOrder.status) },
                  { label: 'Delivered', active: liveOrder.status === 'Delivered' }
                ].map((step, idx) => (
                  <div key={`step-${idx}`} className="flex items-center sm:flex-col gap-4 sm:gap-3 z-10">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border-4 bg-background transition-all duration-500",
                      step.active ? "border-primary text-primary shadow-lg shadow-primary/20 scale-110" : "border-muted text-muted-foreground"
                    )}>
                      {step.active ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-black italic">{idx + 1}</span>}
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest text-center", step.active ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="manifest" className="w-full">
            <TabsList className="w-full justify-start bg-transparent h-auto border-b rounded-none gap-4 sm:gap-8 p-0 flex-wrap">
              <TabsTrigger value="manifest" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-[10px] font-black uppercase tracking-widest">Manifest & Proofs</TabsTrigger>
              <TabsTrigger value="approval" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-[10px] font-black uppercase tracking-widest">Design Approval</TabsTrigger>
              <TabsTrigger value="logistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-[10px] font-black uppercase tracking-widest">Logistics Hub</TabsTrigger>
              <TabsTrigger value="journal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-[10px] font-black uppercase tracking-widest">Activity Journal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manifest" className="pt-8 space-y-8">
              {liveOrder.proofs && liveOrder.proofs.length > 0 && (
                <Card className="border-4 border-amber-500/20 bg-amber-500/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight text-foreground">Production Verification</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest text-amber-700">Please review and authorize your designs before manufacturing.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-6">
                      {liveOrder.proofs.map((proof) => (
                        <div key={proof.id} className="flex flex-col md:flex-row gap-8 p-6 bg-background border-2 rounded-[2rem] shadow-xl transition-all hover:border-amber-500/30">
                          <div className="relative aspect-square w-full md:w-56 bg-muted/5 border-2 rounded-2xl overflow-hidden group shadow-inner flex items-center justify-center">
                            {isImage(proof.fileUrl) ? (
                              <Image src={proof.fileUrl} alt={proof.fileName} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-700" unoptimized />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                                <FileText className="h-12 w-12" />
                                <span className="text-[10px] font-black uppercase">Document</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="ghost" size="icon" className="text-white" asChild>
                                <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-8 w-8" />
                                </a>
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 space-y-6 flex flex-col justify-center">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xl font-black uppercase tracking-tight italic">{proof.fileName}</h4>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Version {proof.version} • Registry Ingest {new Date(proof.uploadedAt).toLocaleDateString()}</p>
                              </div>
                              <Badge className={cn(
                                "uppercase text-[8px] font-black px-3 h-6 rounded-full shadow-sm",
                                proof.status === 'approved' ? "bg-emerald-500" : 
                                proof.status === 'rejected' ? "bg-rose-500 text-white" : "bg-amber-500"
                              )}>
                                {proof.status === 'pendingApproval' ? 'Action Required' : proof.status}
                              </Badge>
                            </div>

                            {proof.feedback && proof.status === 'rejected' && (
                              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                                <p className="text-[8px] font-black uppercase text-rose-600">Your Requested Revisions</p>
                                <p className="text-xs font-medium text-rose-800 italic leading-relaxed">"{proof.feedback}"</p>
                              </div>
                            )}

                            <div className="flex gap-3">
                              <Button variant="outline" size="sm" className="rounded-xl font-black uppercase text-[9px] tracking-widest h-10 border-2" asChild>
                                <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-2 h-3.5 w-3.5" /> Full Res View
                                </a>
                              </Button>
                              
                              {proof.status === 'pendingApproval' && (
                                <div className="flex gap-2 flex-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="secondary" size="sm" className="flex-1 rounded-xl font-black uppercase text-[9px] tracking-widest h-10 border-2">
                                        Request Changes
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[2.5rem]">
                                      <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Technical Feedback</DialogTitle>
                                        <DialogDescription className="text-xs font-bold uppercase tracking-widest">Detail the specific adjustments required for v{proof.version}. Our designers will update the registry.</DialogDescription>
                                      </DialogHeader>
                                      <div className="py-6 space-y-4">
                                        <div className="grid gap-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Revision Notes</Label>
                                          <Textarea 
                                            placeholder="e.g. Please adjust the cut line to be tighter..." 
                                            className="min-h-[150px] rounded-2xl bg-muted/10 p-4 border-2 focus-visible:ring-primary"
                                            value={rejectionNote}
                                            onChange={e => setRejectionNote(e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button 
                                          variant="destructive" 
                                          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg"
                                          onClick={() => handleRejectProof(proof.id)}
                                          disabled={!rejectionNote.trim()}
                                        >
                                          Submit Revisions —
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[9px] tracking-widest h-10 shadow-lg"
                                    onClick={() => handleApproveProof(proof.id)}
                                    disabled={isApproving}
                                  >
                                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Design —"}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-4 px-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Project Manifest</CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y-2">
                  {liveOrder.items.map((item, idx) => (
                    <div key={`manifest-${idx}`} className="p-8 flex flex-col md:flex-row md:items-center gap-8 group">
                      <div className="h-24 w-24 rounded-2xl bg-muted/10 border-2 overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner">
                        {item.artworkUrl ? (
                          isImage(item.artworkUrl) ? (
                            <Image src={item.artworkUrl} alt={item.productName} fill className="object-contain p-2 transition-transform duration-700 group-hover:scale-110" unoptimized />
                          ) : (
                            <FileText className="h-8 w-8 text-primary opacity-40" />
                          )
                        ) : (
                          <Package className="h-10 w-10 text-muted-foreground opacity-20" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xl font-black uppercase tracking-tight italic leading-none">{item.productName}</h5>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-60">Item ID: {item.productId.slice(0, 12)}</p>
                          </div>
                          <Badge variant="secondary" className="font-black h-6 text-[10px] uppercase tracking-tighter border">QTY: {item.quantity}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.options).map(([k, v]) => (
                            <Badge key={`${k}-${v}`} variant="outline" className="text-[8px] font-bold uppercase border-muted-foreground/20 bg-muted/5">
                              {k}: {v as string}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approval" className="pt-8 space-y-8">
              {liveOrder.proofApproval && approvedProof ? (
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-emerald-50/10 border-emerald-500/20">
                  <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-6 px-10 flex flex-row items-center gap-3">
                    <FileCheck className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-emerald-700">Digital Signature Verified</CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                    <div className="flex flex-col lg:flex-row gap-12 items-start">
                      <div className="relative aspect-square w-full lg:w-80 bg-white border-2 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center justify-center p-6 group">
                        {isImage(approvedProof.fileUrl) ? (
                          <Image src={approvedProof.fileUrl} alt="Approved Design" fill className="object-contain p-8" unoptimized />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                            <FileText className="h-16 w-16" />
                            <span className="text-xs font-black uppercase">Approved Document</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="ghost" size="icon" className="text-white" asChild>
                            <a href={approvedProof.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Maximize2 className="h-8 w-8" />
                            </a>
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 space-y-10 py-4">
                        <div className="grid sm:grid-cols-2 gap-8">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Registry Authorization</p>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              <p className="text-sm font-bold uppercase italic">{liveOrder.proofApproval.approvedByEmail}</p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Certified Timestamp</p>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <p className="text-sm font-bold uppercase italic">{new Date(liveOrder.proofApproval.approvedAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="bg-emerald-500/10" />
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase tracking-widest h-5 px-2">v{approvedProof.version} Final</Badge>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Approval Note</p>
                          </div>
                          <div className="p-6 bg-white rounded-2xl border-2 italic text-emerald-800 text-sm leading-relaxed shadow-inner">
                            "{liveOrder.proofApproval.comment}"
                          </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <Button variant="outline" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-2" asChild>
                            <a href={approvedProof.fileUrl} download={`approved_design_${liveOrder.id.slice(0, 8)}.png`}>
                              <Download className="mr-2 h-4 w-4" /> Download Certified Mockup
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-24 text-center border-4 border-dashed rounded-[4rem] bg-muted/5 space-y-6">
                  <div className="h-20 w-20 rounded-[2rem] bg-primary/5 border-2 flex items-center justify-center mx-auto text-primary opacity-20">
                    <FileCheck className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Awaiting Authorization</h3>
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground max-sm mx-auto">
                      Navigate to the <b>Manifest & Proofs</b> tab to review and sign off on your production mockup.
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] border-2" onClick={() => {
                    // Force jump back to manifest tab
                    const tabTrigger = document.querySelector('[data-value="manifest"]') as HTMLButtonElement;
                    tabTrigger?.click();
                  }}>
                    Review Proofs Now —
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="logistics" className="pt-8 space-y-6">
              {liveOrder.shippingDetails?.trackingNumber ? (
                <Card className="border-2 border-primary/20 bg-primary/5 rounded-[2rem] overflow-hidden p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                      <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {liveOrder.shippingDetails.carrier || 'Society Dispatch'}
                      </p>
                      <p className="text-2xl font-black font-mono tracking-tighter">{liveOrder.shippingDetails.trackingNumber}</p>
                    </div>
                  </div>
                  <Button className="rounded-xl h-14 px-10 font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-primary transition-all shadow-xl" asChild>
                    <a href={getTrackingUrl(liveOrder.shippingDetails.carrier, liveOrder.shippingDetails.trackingNumber) || '#'} target="_blank" rel="noopener noreferrer">
                      Follow Shipment —
                    </a>
                  </Button>
                </Card>
              ) : (
                <div className="p-20 text-center border-4 border-dashed rounded-[3rem] bg-muted/5 space-y-4">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                  <p className="text-lg font-black uppercase italic tracking-tight">Logistics Pending</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your project is securely logged in the production queue.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="journal" className="pt-8">
              <div className="space-y-8 pl-4 border-l-2 border-muted ml-2">
                {activity?.map((log) => (
                  <div key={log.id} className="relative flex gap-6 items-start">
                    <div className="absolute -left-[25px] top-1.5 h-4 w-4 rounded-full border-4 border-background bg-muted flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <div className="space-y-1 bg-muted/5 p-6 rounded-[1.5rem] border-2 flex-1 group hover:border-primary/20 transition-all">
                      <p className="text-sm font-black uppercase tracking-tight italic">{log.action}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">{log.details}</p>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase pt-3 block opacity-40">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-foreground text-background">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Order Total</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                  <span>Manufacturing</span>
                  <span>${liveOrder.pricing?.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                  <span>Shipping Cost</span>
                  <span>${liveOrder.pricing?.shipping?.toFixed(2) || '0.00'}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Total</span>
                    <span className="text-4xl font-black font-headline italic tracking-tighter text-primary">${liveOrder.pricing?.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-8 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Logistics Registry</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Shipping Address</p>
                  <pre className="text-xs font-bold whitespace-pre-wrap font-sans">{liveOrder.shippingDetails?.address}</pre>
                </div>
              </div>
              
              {liveOrder.shippingDetails?.trackingNumber && (
                <div className="flex items-start gap-4 pt-4 border-t-2 border-dashed">
                  <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                      Active Tracking ({liveOrder.shippingDetails.carrier})
                    </p>
                    <a 
                      href={getTrackingUrl(liveOrder.shippingDetails.carrier, liveOrder.shippingDetails.trackingNumber) || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-black font-mono text-primary hover:underline flex items-center gap-2 group"
                    >
                      {liveOrder.shippingDetails.trackingNumber}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 space-y-4 shadow-inner">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-black uppercase tracking-widest">Resolution Desk</h4>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase leading-relaxed">
              Need technical assistance or artwork advice? Connect directly with a lab technician.
            </p>
            <Button variant="link" className="px-0 h-auto font-black uppercase tracking-[0.2em] text-[10px] text-primary" asChild>
              <Link href={`/dashboard/support?order=${liveOrder.id}`}>Initialize Thread <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
