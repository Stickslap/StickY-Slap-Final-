'use client';

import React, { useState, Suspense, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Upload,
  User,
  Package,
  History,
  ExternalLink,
  ShieldCheck,
  Download,
  Eye,
  Edit,
  MapPin,
  Mail,
  Building2,
  Save, 
  Loader2, 
  RotateCcw,
  Zap,
  ChevronRight,
  FileCheck,
  Plus,
  Trash,
  MessageSquare,
  DollarSign,
  CreditCard,
  X,
  Check,
  LifeBuoy,
  ArrowLeft,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { doc, collection, query, orderBy, where, arrayUnion, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus, ActivityLog, UserProfile, SupportTicket, Proof, EmailTemplate, EmailTemplateTrigger, SupportMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import { dispatchSocietyEmail } from '@/app/actions/email';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

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

const ORDER_STATUSES: OrderStatus[] = [
  "Submitted", "Proofing", "Approved", "Rejected", "In Production", "QC", "Ready", "Shipped", "Delivered", "Closed", "On Hold", "Cancelled", "Refunded"
];

function OrderDetailsContent({ orderId, tab: initialTab }: { orderId: string, tab: string }) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [tracking, setTracking] = useState({ carrier: '', number: '' });
  const [proofInput, setProofInput] = useState({ url: '', name: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Support Messaging State
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSendingQuickReply, setIsSendingQuickReply] = useState(false);

  // Proactive Support Creation
  const [isCreatingProactive, setIsCreatingProactive] = useState(false);
  const [proactiveSubject, setProactiveSubject] = useState('Registry Update: Your Project');
  const [proactiveMessage, setProactiveMessage] = useState('');

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', street: '', city: '', state: '', zip: ''
  });

  const orderRef = useMemoFirebase(() => (orderId ? doc(db, 'orders', orderId) : null), [db, orderId]);
  
  const [liveOrder, setLiveOrder] = useState<Order | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(true);

  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  const getTemplate = (trigger: EmailTemplateTrigger) => {
    return templates?.find(t => t.trigger === trigger && t.enabled);
  };

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

  const profileId = liveOrder?.userId;
  const customerRef = useMemoFirebase(() => (profileId ? doc(db, 'users', profileId) : null), [db, profileId]);
  const { data: customer } = useDoc<UserProfile>(customerRef);

  const activityQuery = useMemoFirebase(() => 
    orderId ? query(collection(db, 'orders', orderId, 'activity'), orderBy('timestamp', 'desc')) : null
  , [db, orderId]);
  const { data: activity } = useCollection<ActivityLog>(activityQuery);

  const ticketsQuery = useMemoFirebase(() => 
    orderId ? query(collection(db, 'support_tickets'), where('orderId', '==', orderId)) : null
  , [db, orderId]);
  const { data: tickets } = useCollection<SupportTicket>(ticketsQuery);

  useEffect(() => {
    if (tickets && tickets.length > 0 && !activeTicketId && !isCreatingProactive) {
      setActiveTicketId(tickets[0].id);
    }
  }, [tickets, activeTicketId, isCreatingProactive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTicketId, tickets]);

  const actionRequiredCount = useMemo(() => {
    if (!tickets) return 0;
    return tickets.filter(t => {
      if (t.status === 'Resolved' || t.status === 'closed') return false;
      if (!t.messages || t.messages.length === 0) return true;
      return !t.messages[t.messages.length - 1].isAdmin;
    }).length;
  }, [tickets]);

  useEffect(() => {
    if (liveOrder?.shippingDetails?.address) {
      const parts = liveOrder.shippingDetails.address.split('\n');
      const name = parts[0] || '';
      const street = parts[1] || '';
      const lastLine = parts[2] || '';
      const lastLineParts = lastLine.split(',');
      const city = lastLineParts[0]?.trim() || '';
      const stateZip = lastLineParts[1]?.trim() || '';
      const stateZipParts = stateZip.split(' ');
      const state = stateZipParts[0] || '';
      const zip = stateZipParts[1] || '';
      setAddressForm({ name, street, city, state, zip });
    }
  }, [liveOrder]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  const logActivity = (action: string, details: string) => {
    if (!orderId) return;
    addDocumentNonBlocking(collection(db, 'orders', orderId, 'activity'), {
      action, timestamp: new Date().toISOString(), details, userId: user?.uid || 'system'
    });
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!orderRef || isUpdating || !liveOrder) return;
    setIsUpdating(true);
    const oldStatus = liveOrder?.status;
    updateDocumentNonBlocking(orderRef, { status: newStatus, updatedAt: new Date().toISOString() });
    logActivity(`Status updated to ${newStatus}`, `Lifecycle changed from ${oldStatus} to ${newStatus}`);
    
    let trigger: EmailTemplateTrigger = 'order_status_changed';
    if (newStatus === 'Shipped') trigger = 'order_shipped';
    if (newStatus === 'Refunded') trigger = 'order_refunded';
    if (newStatus === 'Cancelled') trigger = 'order_cancelled';
    if (newStatus === 'Approved') trigger = 'artwork_approved';
    if (newStatus === 'Rejected') trigger = 'artwork_rejected';

    const template = getTemplate(trigger);
    if (template) {
      await dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: customer?.name?.split(' ')[0] || 'Society Member',
        order_id: liveOrder.id.slice(0, 8),
        order_status: newStatus,
        tracking_number: liveOrder.shippingDetails?.trackingNumber || '',
        carrier: liveOrder.shippingDetails?.carrier || '',
        order_link: `${window.location.origin}/track?id=${liveOrder.id}`
      });
    }

    toast({ title: "Status Updated", description: `Order is now ${newStatus}` });
    setTimeout(() => setIsUpdating(false), 500);
  };

  const handleSendConfirmation = async () => {
    if (!liveOrder || isSendingEmail) return;
    
    const template = getTemplate('order_confirmed');
    if (!template) {
      toast({ title: "Blueprint Missing", description: "The 'order_confirmed' template was not found in registry.", variant: "destructive" });
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: customer?.name?.split(' ')[0] || 'Society Member',
        order_id: liveOrder.id.slice(0, 8),
        order_total: liveOrder.pricing?.total?.toFixed(2) || '0.00',
        order_link: `${window.location.origin}/track?id=${liveOrder.id}`,
        order_status: liveOrder.status
      });

      if (result.success) {
        toast({ title: "Dispatch Successful", description: "A copy of the confirmation email has been sent." });
        logActivity('Manual Dispatch', 'Sent manual copy of confirmation email to customer.');
      } else {
        toast({ title: "Dispatch Failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "System Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleUpdateAddress = () => {
    if (!orderRef || !addressForm.name.trim()) return;
    const finalAddress = `${addressForm.name}\n${addressForm.street}\n${addressForm.city}, ${addressForm.state} ${addressForm.zip}`;
    updateDocumentNonBlocking(orderRef, { 'shippingDetails.address': finalAddress, updatedAt: new Date().toISOString() });
    logActivity('Logistics Update', 'Shipping address modified by staff.');
    toast({ title: "Address Updated" });
    setIsEditingAddress(false);
  };

  const handleMarkShipped = async () => {
    if (!orderRef || !tracking.number || !liveOrder) {
      toast({ title: "Validation Error", description: "Waybill required.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    updateDocumentNonBlocking(orderRef, { 
      status: 'Shipped', shippedAt: now, updatedAt: now,
      shippingDetails: { ...(liveOrder?.shippingDetails || { address: '', method: 'Standard' }), trackingNumber: tracking.number, carrier: tracking.carrier }
    });
    logActivity('Shipment Finalized', `Dispatched via ${tracking.carrier} | Waybill: ${tracking.number}`);
    
    const template = getTemplate('order_shipped');
    if (template) {
      dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: customer?.name?.split(' ')[0] || 'Society Member',
        order_id: liveOrder.id.slice(0, 8),
        tracking_number: tracking.number,
        carrier: tracking.carrier,
        order_link: `${window.location.origin}/track?id=${liveOrder.id}`
      });
    }

    toast({ title: "Order Dispatched" });
    setTracking({ carrier: '', number: '' });
  };

  const handleProcessRefund = () => {
    if (!confirm("Process a full project refund?")) return;
    handleUpdateStatus('Refunded');
    logActivity('Financial Recovery', 'Full project refund initiated by administrator.');
  };

  const handleAddProof = async () => {
    if (!proofFile || !orderRef || !liveOrder) return;
    setIsUploadingProof(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `proofs/${liveOrder.id}`);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress((event.loaded / event.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const downloadURL = response.secure_url;

          const newProof: Proof = {
            id: Math.random().toString(36).substr(2, 9),
            fileUrl: downloadURL,
            fileName: proofInput.name || proofFile.name || 'Production Proof',
            uploadedAt: new Date().toISOString(),
            version: (liveOrder?.proofs?.length || 0) + 1,
            status: 'pendingApproval'
          };
          
          updateDocumentNonBlocking(orderRef, { 
            proofs: arrayUnion(newProof), 
            status: 'Proofing', 
            updatedAt: new Date().toISOString() 
          });
          
          logActivity('Proof Uploaded', `Production mockup v${newProof.version} added to registry.`);
          
          const template = getTemplate('order_status_changed');
          if (template) {
            dispatchSocietyEmail(template, liveOrder.customerEmail, {
              customer_name: customer?.name?.split(' ')[0] || 'Society Member',
              order_id: liveOrder.id.slice(0, 8),
              order_status: 'Proofing (Ready for Review)',
              proof_url: downloadURL,
              order_link: `${window.location.origin}/track?id=${liveOrder.id}`
            });
          }

          setProofInput({ url: '', name: '' }); 
          setProofFile(null); 
          setIsUploadingProof(false);
          toast({ title: "Proof Published" });
        } else {
          toast({ title: "Ingest Failed", description: "Cloudinary error.", variant: "destructive" });
          setIsUploadingProof(false);
        }
      };

      xhr.send(formData);
    } catch (e: any) {
      toast({ title: "Ingest Failed", description: e.message, variant: "destructive" });
      setIsUploadingProof(false);
    }
  };

  const handleSendQuickReply = async () => {
    if (!activeTicketId || !quickReplyText.trim() || !user || !liveOrder) return;

    setIsSendingQuickReply(true);
    const ticketRef = doc(db, 'support_tickets', activeTicketId);
    const newMessage: SupportMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.uid,
      senderName: user.displayName || 'Staff Member',
      text: quickReplyText,
      isAdmin: true,
      timestamp: new Date().toISOString()
    };

    updateDocumentNonBlocking(ticketRef, {
      messages: arrayUnion(newMessage),
      status: 'Waiting',
      updatedAt: new Date().toISOString()
    });

    // Log activity
    logActivity('Support Reply', 'Quick dispatch sent from order workstation.');

    // Notify customer
    const template = templates?.find(t => t.trigger === 'support_reply' && t.enabled);
    if (template) {
      dispatchSocietyEmail(template, liveOrder.customerEmail, {
        customer_name: liveOrder.customerName?.split(' ')[0] || 'Society Member',
        ticket_subject: 'Registry Inquiry Update',
        message_preview: quickReplyText.slice(0, 100) + '...',
        ticket_link: `${window.location.origin}/dashboard/tickets/${activeTicketId}`
      });
    }

    setQuickReplyText('');
    setIsSendingQuickReply(false);
    toast({ title: "Message Dispatched" });
  };

  const handleCreateProactiveTicket = async () => {
    if (!proactiveMessage.trim() || !user || !liveOrder || !orderRef) return;

    setIsSendingQuickReply(true);
    const now = new Date().toISOString();
    
    const ticketData: Partial<SupportTicket> = {
      userId: liveOrder.userId,
      customerEmail: liveOrder.customerEmail,
      orderId: liveOrder.id,
      subject: proactiveSubject,
      message: proactiveMessage,
      category: 'General Inquiry',
      status: 'open',
      priority: 'Medium',
      assignedAgent: user.displayName || 'Staff',
      messages: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      const colRef = collection(db, 'support_tickets');
      const ticketRef = await addDocumentNonBlocking(colRef, ticketData);
      
      if (ticketRef) {
        updateDocumentNonBlocking(orderRef, {
          supportTicketIds: arrayUnion(ticketRef.id)
        });

        // Notify customer
        const template = templates?.find(t => t.trigger === 'ticket_received' && t.enabled);
        if (template) {
          dispatchSocietyEmail(template, liveOrder.customerEmail, {
            customer_name: liveOrder.customerName?.split(' ')[0] || 'Society Member',
            ticket_subject: proactiveSubject,
            ticket_link: `${window.location.origin}/dashboard/tickets/${ticketRef.id}`
          });
        }

        logActivity('Resolution Thread Opened', `Proactive dispatch initiated: "${proactiveSubject}"`);
        
        toast({ title: "Thread Initialized" });
        setIsCreatingProactive(false);
        setProactiveMessage('');
        setActiveTicketId(ticketRef.id);
      }
    } catch (e) {
      // Error is handled globally
    } finally {
      setIsSendingQuickReply(false);
    }
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

  if (isLiveLoading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">Retrieving Registry...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 font-body">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')} className="no-print h-12 w-12 rounded-2xl border"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black font-headline tracking-tighter italic">#{liveOrder.id.slice(0, 8)}</h2>
              <Select value={liveOrder.status} onValueChange={(v) => handleUpdateStatus(v as OrderStatus)}>
                <SelectTrigger className={cn(statusColors[liveOrder.status], "text-white border-none h-8 px-3 rounded-xl font-black uppercase text-[10px] tracking-widest w-[140px] shadow-lg")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-black opacity-60">REGISTRY INTAKE: {new Date(liveOrder.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button 
            variant="outline" 
            className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-2" 
            onClick={handleSendConfirmation} 
            disabled={isSendingEmail}
          >
            {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Email Copy
          </Button>
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-2" onClick={handleProcessRefund}><DollarSign className="mr-2 h-4 w-4 text-rose-500" /> Refund</Button>
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-2" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Manifest</Button>
          <Button className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest bg-primary shadow-lg" onClick={() => handleUpdateStatus('In Production')} disabled={isUpdating || ['Shipped', 'Delivered', 'Cancelled', 'Refunded', 'Rejected'].includes(liveOrder.status)}>
            {isUpdating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />} Start Production —
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-14 bg-transparent gap-8 no-print p-0">
              <TabsTrigger value="manifest" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-widest">Order Manifest</TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Resolution Desk {actionRequiredCount > 0 && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-primary animate-pulse">{actionRequiredCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="approval" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-widest">Design Approval</TabsTrigger>
              <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-widest">Billing & Identity</TabsTrigger>
              <TabsTrigger value="journal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-widest">Activity Journal</TabsTrigger>
            </TabsList>

            <TabsContent value="manifest" className="pt-8 space-y-8">
              <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Delivery Logistics</CardTitle>
                    <CardDescription className="text-xs font-medium">Verify destination for this project.</CardDescription>
                  </div>
                  <Dialog open={isEditingAddress} onOpenChange={setIsEditingAddress}>
                    <DialogTrigger asChild><Button variant="outline" className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest border-2"><Edit className="mr-2 h-4 w-4" /> Edit Address</Button></DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] sm:max-w-lg">
                      <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Modify Logistics</DialogTitle></DialogHeader>
                      <div className="py-6 space-y-4">
                        <Input value={addressForm.name} onChange={e => setAddressForm({...addressForm, name: e.target.value})} placeholder="Recipient Name" className="h-12 rounded-xl" />
                        <Input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} placeholder="Street" className="h-12 rounded-xl" />
                        <div className="grid grid-cols-3 gap-4"><Input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} placeholder="City" /><Input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} placeholder="ST" /><Input value={addressForm.zip} onChange={e => setAddressForm({...addressForm, zip: e.target.value})} placeholder="Zip" /></div>
                      </div>
                      <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" onClick={handleUpdateAddress}>Synchronize Address —</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex gap-6 items-start p-6 bg-muted/5 border-2 rounded-[2rem]">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border"><Truck className="h-6 w-6 text-primary" /></div>
                    <div className="space-y-2">
                      <pre className="text-sm font-bold leading-relaxed whitespace-pre-wrap font-sans">{liveOrder.shippingDetails?.address}</pre>
                      {liveOrder.shippingDetails?.phone && (
                        <p className="text-sm font-bold text-primary">Phone: {liveOrder.shippingDetails.phone}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Design Registry</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild><Button className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg"><Plus className="mr-2 h-4 w-4" /> Ingest New Proof</Button></DialogTrigger>
                    <DialogContent className="rounded-[2.5rem]">
                      <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Ingest Proof</DialogTitle></DialogHeader>
                      <div className="py-6 space-y-6">
                        <input type="file" ref={proofFileInputRef} className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        <div onClick={() => proofFileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all", proofFile ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
                          {isUploadingProof ? (
                            <div className="w-full space-y-4 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /><div className="space-y-2"><Progress value={uploadProgress} className="h-1.5" /></div><p className="text-[10px] font-black uppercase tracking-widest">Vault Syncing: {Math.round(uploadProgress)}%</p></div>
                          ) : (
                            <>
                              {proofFile ? <FileCheck className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                              <p className="text-sm font-bold uppercase tracking-tighter">{proofFile ? proofFile.name : "Click to upload mockup"}</p>
                            </>
                          )}
                        </div>
                        <Input placeholder="Proof Name" className="h-12 rounded-xl" value={proofInput.name} onChange={e => setProofInput({...proofInput, name: e.target.value})} />
                      </div>
                      <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" onClick={handleAddProof} disabled={!proofFile || isUploadingProof}>{isUploadingProof ? "Syncing..." : "Publish to Registry —"}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {liveOrder.proofs?.map((proof) => (
                    <div key={proof.id} className="flex flex-col md:flex-row gap-8 p-6 bg-muted/5 border-2 rounded-[2rem] group hover:border-primary/30 transition-all">
                      <div className="h-32 w-32 relative rounded-2xl bg-muted/10 border-2 flex items-center justify-center overflow-hidden">
                        {isImage(proof.fileUrl) ? (
                          <Image src={proof.fileUrl} alt={proof.fileName} fill className="object-contain p-2" unoptimized />
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <FileText className="h-8 w-8 text-primary" />
                            <span className="text-[8px] font-black uppercase">Document</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4 py-2">
                        <div className="flex justify-between items-start">
                          <div><h4 className="text-xl font-black uppercase italic tracking-tight">{proof.fileName}</h4><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">v{proof.version} • {new Date(proof.uploadedAt).toLocaleDateString()}</p></div>
                          <Badge className={cn("uppercase font-black text-[8px] px-3 h-6 rounded-full shadow-sm", proof.status === 'approved' ? "bg-emerald-500" : proof.status === 'rejected' ? "bg-rose-500 text-white" : "bg-amber-500")}>{proof.status === 'pendingApproval' ? 'Awaiting Member' : proof.status}</Badge>
                        </div>
                        <div className="flex gap-3"><Button variant="outline" size="sm" className="h-9 rounded-xl font-black uppercase text-[9px] border-2" asChild><a href={proof.fileUrl} target="_blank"><Eye className="mr-2 h-3.5 w-3.5" /> View File</a></Button></div>
                        {proof.status === 'approved' && liveOrder.proofApproval && <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><p className="text-xs font-medium text-emerald-800 italic">"{liveOrder.proofApproval.comment}"</p></div>}
                        {proof.status === 'rejected' && proof.feedback && <div className="p-4 bg-rose-50 rounded-xl border border-rose-100"><p className="text-[8px] font-black uppercase text-rose-600">Revision Request</p><p className="text-xs font-medium text-rose-800 italic">"{proof.feedback}"</p></div>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {liveOrder.items?.map((item, idx) => (
                <Card key={`item-${idx}`} className="overflow-hidden border-2 rounded-[2rem] shadow-sm">
                  <CardContent className="p-0 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-72 bg-muted/10 relative border-r-2 flex flex-col items-center justify-center p-6 gap-4">
                      <div className="flex gap-2 w-full justify-center">
                        <div className="h-24 w-24 relative rounded-xl border-2 bg-background overflow-hidden shadow-sm flex items-center justify-center">
                          {item.productThumbnail ? <Image src={item.productThumbnail} alt="Product" fill className="object-contain p-2" unoptimized /> : <Package className="h-8 w-8 text-muted-foreground/20" />}
                        </div>
                        <div className="h-24 w-24 relative rounded-xl border-2 bg-background overflow-hidden shadow-sm flex items-center justify-center">
                          {item.artworkUrl ? (
                            isImage(item.artworkUrl) ? (
                              <Image src={item.artworkUrl} alt="Design" fill className="object-contain p-2" unoptimized />
                            ) : (
                              <div className="flex flex-col items-center gap-1 opacity-40">
                                <FileText className="h-8 w-8 text-primary" />
                                <span className="text-[6px] font-black uppercase">Document</span>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center opacity-20"><Plus className="h-6 w-6" /><span className="text-[6px] font-black">DESIGN</span></div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-2">Manifest Item #{idx + 1}</Badge>
                    </div>
                    <div className="flex-1 p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div><h3 className="text-2xl font-black uppercase italic tracking-tight">{item.productName}</h3><p className="text-[10px] font-mono text-muted-foreground mt-1">PRODUCT_ID: {item.productId}</p></div>
                        <Badge variant="outline" className="text-xl py-2 px-6 rounded-xl border-2 font-black">QTY: {item.quantity}</Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[11px] uppercase font-black text-primary tracking-[0.1em]">Technical Specifications & Options</Label>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(item.options || {}).map(([k, v]) => (
                              <Badge 
                                key={`${k}-${v}`} 
                                variant="secondary" 
                                className="text-[11px] px-4 h-9 border-2 font-black uppercase tracking-tight bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors shadow-sm"
                              >
                                <span className="opacity-50 mr-1.5">{k}:</span> {v as string}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4 no-print">
                          {item.artworkUrl && (
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black opacity-60 flex items-center gap-2"><FileText className="h-3 w-3" /> Production Artwork</Label>
                              <Button variant="outline" size="sm" className="w-full h-10 rounded-xl text-[10px] font-black uppercase border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50" asChild>
                                <a href={item.artworkUrl} target="_blank"><Download className="mr-2 h-4 w-4" /> Download Artwork —</a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="support" className="pt-8 space-y-8">
              <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-6">
                  <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-card">
                    <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Active Threads</CardTitle>
                      <Button variant="outline" size="sm" className="rounded-xl h-8 px-4 font-black uppercase text-[9px] border-2" onClick={() => setIsCreatingProactive(true)}>
                        <Plus className="mr-1 h-3 w-3" /> New
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y-2">
                      {tickets?.map((ticket) => (
                        <div 
                          key={ticket.id} 
                          onClick={() => { setActiveTicketId(ticket.id); setIsCreatingProactive(false); }}
                          className={cn(
                            "p-6 cursor-pointer transition-all hover:bg-muted/5 group",
                            activeTicketId === ticket.id && !isCreatingProactive ? "bg-primary/5 border-l-4 border-l-primary" : ""
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[7px] h-4 font-black uppercase px-1 border-primary/20 text-primary">{ticket.status}</Badge>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className={cn("text-sm font-black uppercase italic tracking-tight line-clamp-1", activeTicketId === ticket.id && !isCreatingProactive ? "text-primary" : "text-foreground")}>{ticket.subject || 'No Subject'}</h4>
                          <p className="text-[9px] text-muted-foreground uppercase font-medium mt-1 truncate">{ticket.message}</p>
                        </div>
                      ))}
                      {(!tickets || tickets.length === 0) && (
                        <div className="p-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">Registry Clear</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-8">
                  {isCreatingProactive ? (
                    <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card animate-in fade-in slide-in-from-bottom-4 duration-500 h-[600px] flex flex-col">
                      <CardHeader className="bg-muted/30 border-b py-6 px-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-black uppercase italic tracking-tight">Proactive Dispatch</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">Initiate a new resolution thread</CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setIsCreatingProactive(false)} className="rounded-full">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-10 space-y-6 flex-1 overflow-y-auto">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Subject Line</Label>
                          <Input 
                            value={proactiveSubject} 
                            onChange={e => setProactiveSubject(e.target.value)}
                            className="h-12 rounded-xl bg-muted/5 border-2 font-bold"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Initial Message</Label>
                          <Textarea 
                            placeholder="Detail the update or request for the member..."
                            className="min-h-[250px] rounded-2xl bg-muted/5 border-2 p-5 italic text-sm leading-relaxed"
                            value={proactiveMessage}
                            onChange={e => setProactiveMessage(e.target.value)}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="p-8 bg-muted/10 border-t">
                        <Button 
                          className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl transition-all"
                          disabled={isSendingQuickReply || !proactiveMessage.trim() || !proactiveSubject.trim()}
                          onClick={handleCreateProactiveTicket}
                        >
                          {isSendingQuickReply ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Initialize Thread —
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : activeTicketId ? (
                    (() => {
                      const t = tickets?.find(x => x.id === activeTicketId);
                      if (!t) return null;
                      return (
                        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col h-[600px] bg-card animate-in fade-in duration-500">
                          <CardHeader className="bg-muted/30 border-b py-4 px-10 flex flex-row items-center justify-between">
                            <div>
                              <CardTitle className="text-xl font-black uppercase italic tracking-tight">{t.subject}</CardTitle>
                              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">Technical Resolution Thread</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border" asChild title="Open in Resolution Desk">
                                <Link href={`/admin/support/${t.id}`}><ExternalLink className="h-4 w-4" /></Link>
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar" ref={scrollRef}>
                            <div className="flex gap-4">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 border shadow-sm">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase tracking-tight">Member Inquiry</span>
                                </div>
                                <div className="p-5 bg-muted/30 rounded-[1.5rem] rounded-tl-none border text-sm leading-relaxed">
                                  {t.message}
                                </div>
                              </div>
                            </div>

                            {t.messages?.map((msg) => (
                              <div key={msg.id} className={cn("flex gap-4", msg.isAdmin ? "flex-row-reverse" : "flex-row")}>
                                <div className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                  msg.isAdmin ? "bg-primary text-white border-primary" : "bg-muted"
                                )}>
                                  {msg.isAdmin ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className={cn("flex-1 space-y-1.5", msg.isAdmin ? "text-right" : "text-left")}>
                                  <div className={cn("flex items-center gap-2", msg.isAdmin ? "justify-end" : "justify-start")}>
                                    <span className="text-[9px] font-black uppercase tracking-tight">{msg.senderName}</span>
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className={cn(
                                    "p-5 rounded-[1.5rem] border inline-block max-w-[85%] text-left shadow-sm",
                                    msg.isAdmin ? "bg-primary text-primary-foreground rounded-tr-none border-primary" : "bg-muted/30 rounded-tl-none"
                                  )}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                          <CardFooter className="p-6 border-t bg-muted/5">
                            <div className="relative w-full">
                              <Input 
                                placeholder="Dispatch response..." 
                                className="h-14 pr-14 rounded-2xl border-2 bg-background font-medium focus-visible:ring-primary shadow-inner" 
                                value={quickReplyText}
                                onChange={e => setQuickReplyText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleSendQuickReply();
                                  }
                                }}
                              />
                              <Button 
                                size="icon" 
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform active:scale-95" 
                                onClick={handleSendQuickReply} 
                                disabled={isSendingQuickReply || !quickReplyText.trim()}
                              >
                                {isSendingQuickReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })()
                  ) : (
                    <div className="h-[600px] border-4 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center justify-center text-center p-12 space-y-6">
                      <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                        <MessageSquare className="h-10 w-10" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Resolution Desk</h3>
                        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground max-w-xs mx-auto">Select a thread from the registry or initiate a proactive dispatch to communicate with the member.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="rounded-xl h-14 px-10 font-black uppercase tracking-widest text-[10px] border-2 shadow-lg" 
                        onClick={() => setIsCreatingProactive(true)}
                      >
                        Proactive Dispatch —
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="approval" className="pt-8 space-y-8">
              {liveOrder.proofApproval ? (
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-emerald-50/10 border-emerald-500/20">
                  <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-6 px-10 flex flex-row items-center gap-3">
                    <FileCheck className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-emerald-700">Design Approval Registry</CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-72 aspect-square relative rounded-[2rem] border-2 overflow-hidden bg-background shadow-xl flex items-center justify-center">
                        {liveOrder.proofs?.find(p => p.status === 'approved')?.fileUrl ? (
                          isImage(liveOrder.proofs.find(p => p.status === 'approved')!.fileUrl) ? (
                            <Image 
                              src={liveOrder.proofs.find(p => p.status === 'approved')!.fileUrl} 
                              alt="Approved Design" 
                              fill 
                              className="object-contain p-4" 
                              unoptimized 
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 opacity-40">
                              <FileText className="h-12 w-12" />
                              <span className="text-[10px] font-black uppercase">Approved PDF</span>
                            </div>
                          )
                        ) : <Package className="h-12 w-12 opacity-10" />}
                      </div>
                      <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized By</p>
                            <p className="text-sm font-bold">{liveOrder.proofApproval.approvedByEmail}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed At</p>
                            <p className="text-sm font-bold">{new Date(liveOrder.proofApproval.approvedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Approval Message</p>
                          <div className="p-4 bg-background border-2 rounded-xl italic text-sm text-foreground/80">
                            "{liveOrder.proofApproval.comment || 'Member Web Approval'}"
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          {liveOrder.proofs?.find(p => p.status === 'approved')?.fileUrl && (
                            <Button variant="outline" size="sm" className="rounded-xl h-10 px-6 font-black uppercase text-[10px] border-2" asChild>
                              <a href={liveOrder.proofs.find(p => p.status === 'approved')!.fileUrl} target="_blank">
                                <Download className="mr-2 h-4 w-4" /> Download Certified Proof
                              </a>
                            </Button>
                          )}
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
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground max-w-sm mx-auto">
                      The project has not yet been authorized for production. Sign-off occurs in the member portal upon proof review.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="billing" className="pt-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <CardTitle className="text-sm font-black uppercase opacity-70 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> Registry Member
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <p className="text-xl font-black uppercase italic tracking-tight">{customer?.name || 'GUEST SESSION'}</p>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{customer?.email || liveOrder.customerEmail}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <CardTitle className="text-sm font-black uppercase opacity-70 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" /> Payment Ledger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="p-6 bg-primary/5 rounded-2xl border-2 border-primary/10 flex justify-between items-center">
                      <p className="text-lg font-black italic uppercase tracking-tighter">{liveOrder.paymentMethod || 'Society Secure Card'}</p>
                      <CreditCard className="h-8 w-8 text-primary opacity-40" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b p-8">
                  <CardTitle className="text-sm font-black uppercase opacity-70 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Global Logistics Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 grid md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Truck className="h-3 w-3" /> Shipping Registry</h4>
                    <pre className="text-sm font-bold leading-relaxed whitespace-pre-wrap font-sans bg-muted/5 p-6 rounded-2xl border-2">{liveOrder.shippingDetails?.address}</pre>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Building2 className="h-3 w-3" /> Billing Registry</h4>
                    <pre className="text-sm font-bold leading-relaxed whitespace-pre-wrap font-sans bg-muted/5 p-6 rounded-2xl border-2">{liveOrder.billingDetails?.address || liveOrder.shippingDetails?.address}</pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="journal" className="pt-8">
              <div className="space-y-8 pl-4 border-l-2 border-muted ml-2">
                {activity?.map((log) => (
                  <div key={log.id} className="relative flex gap-6 items-start">
                    <div className="absolute -left-[25px] top-1.5 h-4 w-4 rounded-full border-4 border-background bg-muted flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /></div>
                    <div className="space-y-1 bg-muted/5 p-6 rounded-[1.5rem] border-2 flex-1 group hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start"><p className="text-sm font-black uppercase italic">{log.action}</p><span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(log.timestamp).toLocaleString()}</span></div>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-2">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-foreground text-background">
            <CardHeader className="pb-4"><CardTitle className="text-xs font-black uppercase opacity-60">Dispatch Center</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <Input className="h-12 bg-white/5 border-white/10 text-white rounded-xl" placeholder="Carrier (e.g. UPS)" value={tracking.carrier} onChange={e => setTracking({...tracking, carrier: e.target.value})} />
                <Input className="h-12 bg-white/5 border-white/10 text-white rounded-xl" placeholder="Waybill #" value={tracking.number} onChange={e => setTracking({...tracking, number: e.target.value})} />
              </div>
              <Button className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg" onClick={handleMarkShipped} disabled={['Shipped', 'Delivered', 'Cancelled'].includes(liveOrder.status)}><Truck className="mr-3 h-6 w-6" /> Finalize Shipment —</Button>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2.5rem] bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-8 border-b"><CardTitle className="text-[10px] font-black uppercase opacity-70">Ledger</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground"><span>Subtotal</span><span>${liveOrder.pricing?.subtotal?.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground"><span>Shipping</span><span>${liveOrder.pricing?.shipping?.toFixed(2)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border-2 border-primary/10">
                <span className="text-xs font-black uppercase">Grand Total</span>
                <span className="text-3xl font-black font-headline italic tracking-tighter text-primary">${liveOrder.pricing?.total?.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage(props: { params: Promise<{ orderId: string }>, searchParams: Promise<{ tab?: string }> }) {
  const resolvedParams = React.use(props.params);
  const resolvedSearchParams = React.use(props.searchParams);
  const orderId = resolvedParams.orderId;
  const tab = resolvedSearchParams.tab || 'manifest';
  
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Opening Order Architecture...</p></div>}>
      <OrderDetailsContent orderId={orderId} tab={tab} />
    </Suspense>
  );
}
