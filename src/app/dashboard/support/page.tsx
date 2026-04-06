
'use client';

import React, { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  LifeBuoy, 
  Upload, 
  Send, 
  Loader2, 
  FileText,
  X,
  History,
  ArrowRight,
  Package,
  ShieldCheck,
  MessageSquare,
  BellRing
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase';
import { collection, query, where, doc, arrayUnion, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Order, SupportTicket, EmailTemplate } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { dispatchSocietyEmail } from '@/app/actions/email';

const CATEGORIES = [
  "Damaged Item",
  "Artwork Submission",
  "General Inquiry",
  "Shipping Issue",
  "Billing Correction"
];

function SupportFormContent() {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  
  const { user } = useUser();
  const db = useFirestore();
  const storage = getStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orderIdFromUrl || 'none');
  const [category, setCategory] = useState<string>('General Inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Templates for Client-Side Resolution
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  // Fetch User's Orders for selection
  const ordersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'orders'), where('userId', '==', user.uid), limit(50));
  }, [db, user]);
  const { data: userOrders } = useCollection<Order>(ordersQuery);

  // Fetch User's Tickets
  const ticketsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'support_tickets'), where('userId', '==', user.uid), limit(50));
  }, [db, user]);
  const { data: userTickets, isLoading: isTicketsLoading } = useCollection<SupportTicket>(ticketsQuery);

  const sortedTickets = useMemo(() => {
    if (!userTickets) return [];
    return [...userTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userTickets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim() || !subject.trim()) {
      toast({ title: "Validation Error", description: "Subject and message are mandatory.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const ticketId = Math.random().toString(36).substr(2, 9); 
      const fileUrls: string[] = [];
      const orderIdForPath = selectedOrderId === 'none' ? 'general' : selectedOrderId;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storagePath = `support_tickets/${user.uid}/${orderIdForPath}/${ticketId}/${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        fileUrls.push(url);
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const ticketData: Partial<SupportTicket> = {
        userId: user.uid,
        customerEmail: user.email || '',
        orderId: selectedOrderId === 'none' ? undefined : selectedOrderId,
        subject,
        message,
        category: category as any,
        fileUrls,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };

      const ticketRef = await addDocumentNonBlocking(collection(db, 'support_tickets'), ticketData);

      if (selectedOrderId !== 'none' && ticketRef) {
        const orderRef = doc(db, 'orders', selectedOrderId);
        updateDocumentNonBlocking(orderRef, {
          supportTicketIds: arrayUnion(ticketRef.id)
        });
      }

      // Dispatch Intake Confirmation Blueprint
      const template = templates?.find(t => t.trigger === 'ticket_received' && t.enabled);
      if (template) {
        dispatchSocietyEmail(template, user.email || '', {
          customer_name: user.displayName?.split(' ')[0] || 'Society Member',
          ticket_subject: subject,
          ticket_link: `${window.location.origin}/dashboard/tickets/${ticketRef?.id || ''}`
        });
      }

      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user.uid,
        action: 'Support Ticket Opened',
        entityType: 'Ticket',
        entityId: ticketRef?.id || 'new',
        details: `Member opened thread: "${subject}"`,
        timestamp: new Date().toISOString()
      });

      toast({ title: "Resolution Thread Initialized", description: "The Society team has been alerted." });
      
      setSubject('');
      setMessage('');
      setFiles([]);
      setSelectedOrderId('none');
      setUploadProgress(0);
    } catch (error: any) {
      toast({ title: "Submission Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
          Resolution <span className="text-primary">Desk</span>
        </h2>
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Direct communication threads with the society lab</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b py-6 px-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Open New Thread
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Select an order and detail your request.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Related Order</Label>
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General Society Inquiry</SelectItem>
                        {userOrders?.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            Order #{order.id.slice(0, 8)} - {new Date(order.createdAt).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Inquiry Type</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Thread Subject</Label>
                  <Input 
                    required
                    placeholder="e.g. Question about my artwork bleed..."
                    className="h-12 rounded-xl bg-muted/5 border-2 px-4 focus-visible:ring-primary"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Resolution Message</Label>
                  <Textarea 
                    required
                    placeholder="Describe the issue or ask a question about your project..."
                    className="min-h-[150px] rounded-2xl bg-muted/5 border-2 p-4 focus-visible:ring-primary transition-all resize-none"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Evidence & Assets (Photos / Files)</Label>
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
                      files.length > 0 ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      multiple
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                    />
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-black uppercase tracking-widest">Click to attach media</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">PDF, AI, PNG, or JPG (Max 10MB per file)</p>
                  </div>

                  {files.length > 0 && (
                    <div className="grid gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-xl border-2 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-bold truncate">{file.name}</span>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive rounded-full"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isSubmitting && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-[9px] text-center font-black uppercase tracking-widest text-primary">
                      Syncing with Society Vault: {uploadProgress}%
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={isSubmitting || !message.trim() || !subject.trim()}
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Initiate Resolution Thread —</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="border-2 rounded-[2.5rem] bg-foreground text-background overflow-hidden shadow-2xl">
            <CardHeader className="p-8 border-b border-white/10">
              <CardTitle className="text-sm font-black uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                <History className="h-4 w-4" /> Resolution Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto divide-y-2 divide-white/5">
                {isTicketsLoading ? (
                  <div className="p-12 text-center flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Threads...</p>
                  </div>
                ) : sortedTickets.length === 0 ? (
                  <div className="p-12 text-center space-y-4 opacity-40">
                    <LifeBuoy className="h-12 w-12 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest italic">No active resolution threads.</p>
                  </div>
                ) : (
                  sortedTickets.map(ticket => {
                    const hasNewResponse = ticket.messages && ticket.messages.length > 0 && ticket.messages[ticket.messages.length - 1].isAdmin;
                    
                    return (
                      <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block">
                        <div className="p-8 space-y-4 group hover:bg-white/5 transition-colors cursor-pointer relative">
                          {hasNewResponse && (
                            <div className="absolute top-8 right-8 flex items-center gap-1 text-primary animate-pulse">
                              <BellRing className="h-3 w-3" />
                              <span className="text-[8px] font-black uppercase tracking-widest">New Response</span>
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-white/20 text-primary">
                                {ticket.category}
                              </Badge>
                              <h4 className="text-lg font-black uppercase tracking-tight italic pr-16">
                                {ticket.subject || `ID: #${ticket.id.slice(0, 8)}`}
                              </h4>
                            </div>
                            <Badge className={cn(
                              "text-[9px] font-black uppercase",
                              ticket.status === 'open' ? "bg-emerald-500" : "bg-zinc-700"
                            )}>
                              {ticket.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary group-hover:gap-2 transition-all">
                              View Thread <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SupportDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>}>
      <SupportFormContent />
    </Suspense>
  );
}
