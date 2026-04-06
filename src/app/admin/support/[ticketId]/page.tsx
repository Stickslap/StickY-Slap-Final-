'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  History,
  LifeBuoy,
  Loader2,
  Settings2,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  updateDocumentNonBlocking, 
  useUser,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking
} from '@/firebase';
import { doc, arrayUnion, collection } from 'firebase/firestore';
import { SupportTicket, SupportMessage, EmailTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { dispatchSocietyEmail } from '@/app/actions/email';

export default function TicketResolutionPage(props: { params: Promise<{ ticketId: string }> }) {
  const params = React.use(props.params);
  const ticketId = params.ticketId;
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const ticketRef = useMemoFirebase(() => 
    ticketId ? doc(db, 'support_tickets', ticketId) : null, 
  [db, ticketId]);
  
  const { data: ticket, isLoading } = useDoc<SupportTicket>(ticketRef);

  // Fetch Templates for Client-Side Resolution
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  const handleSendReply = () => {
    if (!replyText.trim() || !ticketRef || !user || !ticket) return;

    setIsSending(true);
    const newMessage: Partial<SupportMessage> = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.uid,
      senderName: user.displayName || 'Staff Member',
      text: replyText,
      isAdmin: true,
      timestamp: new Date().toISOString()
    };

    updateDocumentNonBlocking(ticketRef, {
      messages: arrayUnion(newMessage),
      status: 'Waiting', 
      updatedAt: new Date().toISOString()
    });

    // Dispatch Support Response Blueprint (using client-resolved template)
    const template = templates?.find(t => t.trigger === 'support_reply' && t.enabled);
    if (template) {
      dispatchSocietyEmail(template, ticket.customerEmail, {
        customer_name: 'Society Member',
        ticket_subject: ticket.subject || 'Registry Inquiry',
        message_preview: replyText.slice(0, 100) + '...',
        ticket_link: `${window.location.origin}/dashboard/tickets/${ticket.id}`
      });
    }

    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user.uid,
      action: 'Support Replied',
      entityType: 'Ticket',
      entityId: ticketId,
      details: `Staff replied to ticket: "${ticket?.subject}"`,
      timestamp: new Date().toISOString()
    });

    setReplyText('');
    setIsSending(false);
    toast({ title: "Reply Sent" });
  };

  const updateStatus = (val: string) => {
    if (!ticketRef || !user) return;
    const oldStatus = ticket?.status;
    updateDocumentNonBlocking(ticketRef, { status: val, updatedAt: new Date().toISOString() });
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user.uid,
      action: 'Ticket Status Changed',
      entityType: 'Ticket',
      entityId: ticketId,
      details: `Resolution status moved from ${oldStatus} to ${val}`,
      timestamp: new Date().toISOString()
    });
    
    toast({ title: "Status Updated", description: `Ticket is now ${val}` });
  };

  const updatePriority = (val: string) => {
    if (!ticketRef || !user) return;
    updateDocumentNonBlocking(ticketRef, { priority: val, updatedAt: new Date().toISOString() });
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user.uid,
      action: 'Ticket Priority Updated',
      entityType: 'Ticket',
      entityId: ticketId,
      details: `Priority level adjusted to ${val}`,
      timestamp: new Date().toISOString()
    });
    
    toast({ title: "Priority Updated" });
  };

  const handleDelete = () => {
    if (confirm('Permanently delete this support ticket?') && ticketRef && user) {
      deleteDocumentNonBlocking(ticketRef);
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user.uid,
        action: 'Ticket Deleted',
        entityType: 'Ticket',
        entityId: ticketId,
        details: `Removed support ticket: "${ticket?.subject}"`,
        timestamp: new Date().toISOString()
      });
      
      router.push('/admin/support');
      toast({ title: "Ticket Deleted", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Ticket not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/support')}>Return to Support Desk</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight uppercase italic">{ticket.subject}</h2>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
              <span className="font-mono">ID: {ticket.id.slice(0, 8)}</span>
              <span>•</span>
              <span>Opened {new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'} className="uppercase font-bold tracking-widest text-[10px]">
            {ticket.status}
          </Badge>
          <Button variant="ghost" size="icon" className="text-destructive rounded-full" onClick={handleDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex flex-col h-[600px] overflow-hidden rounded-[2.5rem] border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 px-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Conversation History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 space-y-6" ref={scrollRef}>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 border shadow-sm">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-tight">Original Inquiry</span>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{new Date(ticket.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-5 bg-muted/30 rounded-[1.5rem] rounded-tl-none border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.message || 'No details provided.'}</p>
                  </div>
                </div>
              </div>

              {ticket.messages?.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4", msg.isAdmin ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                    msg.isAdmin ? "bg-primary text-white border-primary" : "bg-muted"
                  )}>
                    {msg.isAdmin ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className={cn("flex-1 space-y-1.5", msg.isAdmin ? "text-right" : "text-left")}>
                    <div className={cn("flex items-center gap-2", msg.isAdmin ? "justify-end" : "justify-start")}>
                      <span className="text-xs font-black uppercase tracking-tight">{msg.senderName}</span>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className={cn(
                      "p-5 rounded-[1.5rem] border inline-block max-w-[85%] text-left shadow-sm",
                      msg.isAdmin ? "bg-primary text-primary-foreground rounded-tr-none border-primary" : "bg-muted/30 rounded-tl-none"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="border-t p-6 bg-background">
              <div className="relative w-full">
                <Textarea 
                  placeholder="Type your response here..." 
                  className="min-h-[120px] pr-14 focus-visible:ring-primary border-2 bg-muted/10 rounded-2xl resize-none py-4 px-5"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg transition-transform active:scale-90" 
                  disabled={!replyText.trim() || isSending}
                  onClick={handleSendReply}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-2 shadow-sm">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Status</label>
                <Select value={ticket.status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="open">Open Ticket</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="Waiting">Waiting on Customer</SelectItem>
                    <SelectItem value="Resolved">Mark Resolved</SelectItem>
                    <SelectItem value="closed">Archive & Close</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Priority Level</label>
                <Select value={ticket.priority} onValueChange={updatePriority}>
                  <SelectTrigger className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Low">Low Priority</SelectItem>
                    <SelectItem value="Medium">Standard</SelectItem>
                    <SelectItem value="High">High / Expedited</SelectItem>
                    <SelectItem value="Urgent">Urgent Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4 px-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Customer ID</span>
                  <span className="font-mono">{ticket.userId?.slice(0, 12) || 'N/A'}...</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Assigned Agent</span>
                  <span>{ticket.assignedAgent || 'Unassigned'}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-8 pt-0">
              <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2" onClick={() => updateStatus('Resolved')}>
                <CheckCircle2 className="h-3 w-3 mr-2 text-emerald-500" />
                Resolve Ticket —
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
