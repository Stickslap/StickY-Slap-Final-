'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Send, 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Loader2,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  useDoc, 
  useMemoFirebase, 
  useFirestore, 
  updateDocumentNonBlocking, 
  useUser
} from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { SupportTicket, SupportMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function TicketDetailPage(props: { params: Promise<{ ticketId: string }> }) {
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  const handleSendReply = () => {
    if (!replyText.trim() || !ticketRef || !user) return;

    setIsSending(true);
    const newMessage: Partial<SupportMessage> = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.uid,
      senderName: user.displayName || 'Member',
      text: replyText,
      isAdmin: false,
      timestamp: new Date().toISOString()
    };

    updateDocumentNonBlocking(ticketRef, {
      messages: arrayUnion(newMessage),
      status: 'open', // Set back to open after customer reply
      updatedAt: new Date().toISOString()
    });

    setReplyText('');
    setIsSending(false);
    toast({ title: "Response Sent" });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket || (user && ticket.userId !== user.uid)) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Ticket not found</h2>
        <Button variant="link" onClick={() => router.push('/dashboard/support')}>Return to Support Center</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight uppercase italic">{ticket.subject}</h2>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
              <span className="font-mono">TICKET #{ticket.id.slice(0, 8)}</span>
              <span>•</span>
              <span>OPENED {new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Badge className={cn(
          "uppercase font-bold tracking-widest text-[10px]",
          ticket.status === 'Resolved' || ticket.status === 'closed' ? 'bg-emerald-500' : 'bg-primary'
        )}>
          {ticket.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex flex-col h-[600px] overflow-hidden rounded-[2.5rem] border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 px-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Conversation History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 space-y-6" ref={scrollRef}>
              {/* Initial Details */}
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 border shadow-sm">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-tight">Your Inquiry</span>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{new Date(ticket.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-5 bg-muted/30 rounded-[1.5rem] rounded-tl-none border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.message || 'No details provided.'}</p>
                  </div>
                </div>
              </div>

              {ticket.messages?.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4", !msg.isAdmin ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                    msg.isAdmin ? "bg-primary text-white border-primary" : "bg-muted"
                  )}>
                    {msg.isAdmin ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className={cn("flex-1 space-y-1.5", !msg.isAdmin ? "text-right" : "text-left")}>
                    <div className={cn("flex items-center gap-2", !msg.isAdmin ? "justify-end" : "justify-start")}>
                      <span className="text-xs font-black uppercase tracking-tight">{msg.isAdmin ? 'Society Support' : 'You'}</span>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className={cn(
                      "p-5 rounded-[1.5rem] border inline-block max-w-[85%] text-left shadow-sm",
                      !msg.isAdmin ? "bg-primary text-primary-foreground rounded-tr-none border-primary" : "bg-muted/30 rounded-tl-none"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            {ticket.status !== 'closed' && (
              <CardFooter className="border-t p-6 bg-background">
                <div className="relative w-full">
                  <Textarea 
                    placeholder="Type your response here..." 
                    className="min-h-[100px] pr-14 focus-visible:ring-primary border-2 bg-muted/10 rounded-2xl resize-none py-4 px-5"
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
            )}
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-2 shadow-sm bg-primary/5">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ticket Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="outline" className="h-5 text-[8px] border-primary/20 text-primary">{ticket.priority || 'Standard'}</Badge>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Assigned Agent</span>
                  <span>{ticket.assignedAgent || 'Allocating...'}</span>
                </div>
              </div>
              <Separator className="bg-primary/10" />
              <p className="text-[10px] text-muted-foreground leading-relaxed font-medium uppercase text-center italic">
                Our support collective typically responds within 2-4 business hours.
              </p>
            </CardContent>
          </Card>

          <div className="p-8 bg-foreground text-background rounded-[2.5rem] shadow-2xl space-y-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase italic tracking-tight">Need urgent help?</h4>
              <p className="text-[10px] text-muted-foreground font-medium uppercase leading-relaxed">
                If this is regarding a production stop for an existing order, please ensure the Priority is set to "Urgent".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
