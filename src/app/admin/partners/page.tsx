'use client';

import React, { useState } from 'react';
import { 
  UsersRound, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  ExternalLink, 
  Calendar as CalendarIcon, 
  BadgeDollarSign, 
  Globe, 
  Loader2,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Building2,
  Trash,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  MessageSquare,
  Info,
  Phone,
  User,
  History,
  FileText,
  Save,
  UserPlus,
  Zap,
  CreditCard,
  Copy,
  Check,
  Link as LinkIcon,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { PartnerLead } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PartnerLeadsPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLead, setActiveLead] = useState<PartnerLead | null>(null);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [onboardingTier, setOnboardingTier] = useState<'Tier A' | 'Tier B'>('Tier A');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => query(collection(db, 'partner_leads'), orderBy('createdAt', 'desc')), [db]);
  const { data: leads, isLoading } = useCollection<PartnerLead>(leadsQuery);

  const filteredLeads = leads?.filter(l => 
    l.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Permanently purge this partner lead from the registry?')) {
      deleteDocumentNonBlocking(doc(db, 'partner_leads', id));
      toast({ title: "Lead Purged" });
    }
  };

  const updateStatus = (id: string, status: PartnerLead['status']) => {
    const now = new Date().toISOString();
    updateDocumentNonBlocking(doc(db, 'partner_leads', id), { 
      status, 
      updatedAt: now,
      activityLog: arrayUnion({
        action: 'Status Transition',
        staffName: authUser?.displayName || 'Staff',
        timestamp: now,
        details: `Registry status moved to: ${status.toUpperCase()}`
      })
    });
    toast({ title: "Status Updated", description: `Lead moved to ${status}` });
  };

  const handleOpenOnboarding = (lead: PartnerLead) => {
    setActiveLead(lead);
    setIsOnboardingOpen(true);
  };

  const handlePrepareOnboarding = async () => {
    if (!activeLead || !authUser) return;
    const now = new Date().toISOString();
    
    updateDocumentNonBlocking(doc(db, 'partner_leads', activeLead.id), {
      status: 'Onboarding',
      onboarding: {
        tier: onboardingTier,
        status: 'Pending',
        isTrialActive: false
      },
      updatedAt: now,
      activityLog: arrayUnion({
        action: 'Onboarding Initialized',
        staffName: authUser.displayName || 'Staff',
        timestamp: now,
        details: `Prepared ${onboardingTier} onboarding link for partner.`
      })
    });

    const shareCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    await addDocumentNonBlocking(collection(db, 'shareable_links'), {
      shortCode: shareCode,
      targetEntityId: activeLead.id,
      targetEntityType: 'Onboarding',
      creatorId: authUser.uid,
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      accessCount: 0,
      description: `Onboarding for ${activeLead.businessName}`
    });

    toast({ title: "Onboarding Prepared", description: "Registry updated. Private link is now available in strategic view." });
    setIsOnboardingOpen(false);
    // Automatically open strategic view so they can see the link
    setIsDetailsOpen(true);
  };

  const handleToggleTrial = (lead: PartnerLead) => {
    if (!authUser) return;
    const now = new Date().toISOString();
    const isStarting = !lead.onboarding?.isTrialActive;

    updateDocumentNonBlocking(doc(db, 'partner_leads', lead.id), {
      'onboarding.isTrialActive': isStarting,
      'onboarding.trialStartDate': isStarting ? now : null,
      updatedAt: now,
      activityLog: arrayUnion({
        action: isStarting ? '3-Day Trial Started' : 'Trial Deactivated',
        staffName: authUser.displayName || 'Staff',
        timestamp: now,
        details: isStarting ? 'Clock initialized. Build fee charge scheduled for T+72h.' : 'Administrative override: Trial halted.'
      })
    });

    toast({ 
      title: isStarting ? "Trial Commenced" : "Trial Paused", 
      description: isStarting ? "Build fee sequence initiated." : "Administrative override active."
    });
  };

  const handleOpenFollowUp = (lead: PartnerLead) => {
    setActiveLead(lead);
    setFollowUpMessage(`Hello ${lead.firstName},\n\nI'm reaching out from the Print Society team regarding your business architecture request for ${lead.businessName}. We've analyzed your current scale on ${lead.currentPlatform} and would like to discuss how our unified infrastructure can optimize your production.`);
    setIsFollowUpOpen(true);
  };

  const handleSendFollowUp = async () => {
    if (!activeLead || !followUpMessage.trim() || !authUser) return;
    setIsSending(true);

    try {
      const now = new Date().toISOString();
      const staffName = authUser.displayName || 'Society Staff';
      
      updateDocumentNonBlocking(doc(db, 'partner_leads', activeLead.id), { 
        status: 'Contacted', 
        updatedAt: now,
        activityLog: arrayUnion({
          action: 'Follow-up Sent',
          staffName: staffName,
          timestamp: now,
          details: `Sent introductory dispatch to ${activeLead.email}`
        })
      });

      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: authUser.uid,
        action: 'Partner Follow-up Sent',
        entityType: 'PartnerLead',
        entityId: activeLead.id,
        details: `Staff member ${staffName} sent follow-up to ${activeLead.businessName}`,
        timestamp: now
      });

      await addDocumentNonBlocking(collection(db, 'support_tickets'), {
        userId: `partner_${activeLead.id}`,
        customerEmail: activeLead.email,
        subject: `Partner Intake: ${activeLead.businessName}`,
        message: followUpMessage,
        category: 'General Inquiry',
        status: 'open',
        priority: 'High',
        createdAt: now,
        updatedAt: now,
        messages: [{
          id: 'msg-init',
          senderId: authUser.uid,
          senderName: staffName,
          text: followUpMessage,
          isAdmin: true,
          timestamp: now
        }]
      });

      toast({ title: "Dispatch Sent", description: "Follow-up communication initialized." });
      setIsFollowUpOpen(false);
    } catch (e) {
      toast({ title: "Transmission Error", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveInternalNote = () => {
    if (!activeLead || !authUser) return;
    setIsSavingNote(true);
    const now = new Date().toISOString();
    
    updateDocumentNonBlocking(doc(db, 'partner_leads', activeLead.id), {
      notes: internalNote,
      updatedAt: now,
      activityLog: arrayUnion({
        action: 'Internal Note Added',
        staffName: authUser.displayName || 'Staff',
        timestamp: now,
        details: 'Staff member updated lead narrative and strategy notes.'
      })
    });

    toast({ title: "Notes Registry Updated" });
    setIsSavingNote(false);
  };

  const handleCopyLink = (leadId: string) => {
    const url = `${window.location.origin}/onboard/${leadId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(leadId);
    toast({ title: "Link Copied", description: "Onboarding URL is now in your clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Partner Active': case 'Live': return 'bg-emerald-500';
      case 'Onboarding': return 'bg-purple-500';
      case 'Call Scheduled': return 'bg-blue-500';
      case 'Qualified': return 'bg-amber-500';
      case 'New': return 'bg-primary';
      default: return 'bg-slate-500';
    }
  };

  const handleAssignStaff = (name: string) => {
    if (!activeLead || !authUser) return;
    const now = new Date().toISOString();
    updateDocumentNonBlocking(doc(db, 'partner_leads', activeLead.id), {
      assignedStaffId: authUser.uid,
      assignedStaffName: name,
      updatedAt: now,
      activityLog: arrayUnion({
        action: 'Staff Assigned',
        staffName: name,
        timestamp: now,
        details: `Registry ownership claimed by ${name}.`
      })
    });
    toast({ title: "Ownership Claimed" });
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
            <TrendingUp className="h-3 w-3" /> Growth Engine
          </div>
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic text-foreground leading-none">
            Partner <span className="text-primary">Registry</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs opacity-70">
            Manage infrastructure partner store leads, strategy calls, and onboarding workflows.
          </p>
        </div>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search leads by business name, email, or identity..." 
                className="pl-12 h-14 rounded-2xl bg-background border-2" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-14 w-14 rounded-2xl border-2">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Syncing Intake Vault...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Partner & Status</TableHead>
                    <TableHead className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Subscription</TableHead>
                    <TableHead className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Build Phase</TableHead>
                    <TableHead className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Trial Cycle</TableHead>
                    <TableHead className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Staff Owner</TableHead>
                    <TableHead className="px-8 py-5 text-right font-black uppercase tracking-[0.2em] text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => (
                    <TableRow key={lead.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-transform group-hover:scale-110",
                            lead.status === 'Onboarding' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            <Building2 className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="font-black text-sm block uppercase tracking-tight italic leading-tight">{lead.businessName}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={cn("text-[8px] font-black uppercase px-2 h-5 border-none", getStatusColor(lead.status))}>{lead.status}</Badge>
                              <span className="text-[10px] text-muted-foreground font-mono lowercase opacity-60">{lead.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8">
                        {lead.onboarding?.tier ? (
                          <div className="space-y-1">
                            <p className="text-xs font-black italic">{lead.onboarding.tier}</p>
                            <div className="flex items-center gap-2">
                              {lead.onboarding.paymentToken ? (
                                <Badge variant="outline" className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border-emerald-500/20">Card **** {lead.onboarding.lastFour}</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[8px] font-black uppercase">No Card on File</Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase opacity-40">Not Selected</span>
                        )}
                      </TableCell>
                      <TableCell className="px-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-tighter">
                            {lead.onboarding?.status || 'Pre-Onboarding'}
                          </p>
                          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", lead.status === 'Live' ? "w-full bg-emerald-500" : lead.status === 'Onboarding' ? "w-1/2 bg-purple-500" : "w-0 bg-muted")} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8">
                        {lead.onboarding?.paymentToken ? (
                          <div className="flex items-center gap-3">
                            <Switch checked={lead.onboarding.isTrialActive} onCheckedChange={() => handleToggleTrial(lead)} />
                            <div className="space-y-0.5">
                              <p className={cn("text-[9px] font-black uppercase", lead.onboarding.isTrialActive ? "text-primary" : "text-muted-foreground opacity-40")}>
                                {lead.onboarding.isTrialActive ? 'Trial Active' : 'Trial Paused'}
                              </p>
                              {lead.onboarding.trialStartDate && (
                                <p className="text-[8px] text-muted-foreground font-mono">Started: {new Date(lead.onboarding.trialStartDate).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic">Auth Required</span>
                        )}
                      </TableCell>
                      <TableCell className="px-8">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 border flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tighter">{lead.assignedStaffName || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2 opacity-40">Command & Control</DropdownMenuLabel>
                            <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => { setActiveLead(lead); setIsDetailsOpen(true); setInternalNote(lead.notes || ''); }}>
                              <FileText className="mr-2 h-4 w-4" /> Strategic View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => handleOpenOnboarding(lead)}>
                              <Zap className="mr-2 h-4 w-4 text-purple-500" /> Prepare Onboarding
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => handleOpenFollowUp(lead)}>
                              <Mail className="mr-2 h-4 w-4" /> Send Dispatch
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => updateStatus(lead.id, 'Qualified')}>
                              <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" /> Mark Qualified
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => handleDelete(lead.id)}>
                              <Trash className="mr-2 h-4 w-4" /> Purge Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Preparation Dialog */}
      <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-2 overflow-hidden p-0">
          <DialogHeader className="bg-purple-500/10 p-8 border-b border-purple-500/20">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-500" /> Initialize Onboarding
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-purple-700">
              Prepare the infrastructure build sequence for {activeLead?.businessName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Target Tier Strategy</Label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setOnboardingTier('Tier A')}
                  className={cn(
                    "p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    onboardingTier === 'Tier A' ? "border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20" : "border-muted hover:border-purple-500/30"
                  )}
                >
                  <p className="text-sm font-black uppercase italic">Tier A (Premium)</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-1">$800 Build + $25/mo</p>
                </div>
                <div 
                  onClick={() => setOnboardingTier('Tier B')}
                  className={cn(
                    "p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    onboardingTier === 'Tier B' ? "border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20" : "border-muted hover:border-purple-500/30"
                  )}
                >
                  <p className="text-sm font-black uppercase italic">Tier B (Standard)</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-1">$400 Build + $60/mo</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/5 rounded-2xl border-2 border-dashed space-y-3">
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-purple-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Logic Note</h4>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-medium">
                The onboarding portal will collect store credentials, migration data, and payment authorization. Link generation will occur upon synchronization.
              </p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase text-[10px]" onClick={() => setIsOnboardingOpen(false)}>Cancel</Button>
            <Button className="rounded-xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-purple-600 hover:bg-purple-700 text-white shadow-xl" onClick={handlePrepareOnboarding}>
              Synchronize Registry —
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Sheet (Strategic View) */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-xl rounded-l-[3rem] overflow-hidden p-0 border-l-4">
          <SheetHeader className="p-10 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-[1.25rem] bg-primary flex items-center justify-center shadow-xl">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter leading-none">Lead Profile</SheetTitle>
                  <SheetDescription className="text-xs font-bold uppercase tracking-widest mt-1">Strategic Intake Summary</SheetDescription>
                </div>
              </div>
              {activeLead && !activeLead.assignedStaffId && (
                <Button variant="outline" size="sm" className="rounded-xl font-black uppercase tracking-widest text-[9px] border-2" onClick={() => handleAssignStaff(authUser?.displayName || 'Staff')}>
                  Claim Ownership
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-10 space-y-10">
              
              {/* Onboarding Access URL Section */}
              {activeLead?.status === 'Onboarding' || activeLead?.status === 'Live' || activeLead?.onboarding ? (
                <div className="p-8 bg-purple-500/5 rounded-[2.5rem] border-2 border-purple-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-700">Registry Access URL</h4>
                    <Badge className="bg-purple-500 text-[8px] font-black uppercase">Private Link</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/onboard/${activeLead.id}`} 
                      className="h-12 bg-white/50 border-2 rounded-xl font-mono text-[10px]" 
                    />
                    <Button 
                      size="icon" 
                      className="h-12 w-12 shrink-0 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => handleCopyLink(activeLead.id)}
                    >
                      {copiedId === activeLead.id ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </div>
                  <p className="text-[9px] text-purple-600 font-bold uppercase tracking-widest italic opacity-60">Send this link to the partner to finalize their build.</p>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 text-center space-y-4">
                  <Zap className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Onboarding Inactive</p>
                    <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-primary" onClick={() => { setIsDetailsOpen(false); handleOpenOnboarding(activeLead!); }}>
                      Prepare Build Architecture —
                    </Button>
                  </div>
                </div>
              )}

              {/* Subscription Logic Summary */}
              {activeLead?.onboarding && (
                <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase italic tracking-tight">Onboarding Architecture</h4>
                    <Badge className="bg-primary text-[8px] uppercase font-black">{activeLead.onboarding.tier}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Membership Status</p>
                      <p className={cn("text-xs font-bold uppercase", activeLead.onboarding.isTrialActive ? "text-primary" : "text-rose-500")}>
                        {activeLead.onboarding.isTrialActive ? 'Paying Member (Trial)' : 'Billing Inactive'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Payment Registry</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3 w-3 text-primary opacity-40" />
                        <span className="text-[10px] font-bold font-mono">**** {activeLead.onboarding.lastFour || 'UNVAULTED'}</span>
                      </div>
                    </div>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase">Initialize 3-Day Trial</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">T+72h Build Fee Capture</p>
                    </div>
                    <Switch checked={activeLead.onboarding.isTrialActive} onCheckedChange={() => handleToggleTrial(activeLead)} />
                  </div>
                </div>
              )}

              {/* Core Specs */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Identity</p>
                  <p className="text-lg font-black italic">{activeLead?.firstName} {activeLead?.lastName}</p>
                  <p className="text-[10px] font-bold text-primary">{activeLead?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contact</p>
                  <p className="text-lg font-black italic">{activeLead?.phone || 'N/A'}</p>
                  <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary h-5">{activeLead?.status}</Badge>
                </div>
              </div>

              <Separator />

              {/* Business Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/5 border-2 rounded-2xl space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Traffic</p>
                  <p className="text-xs font-bold">{activeLead?.websiteTraffic}</p>
                </div>
                <div className="p-4 bg-muted/5 border-2 rounded-2xl space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Revenue</p>
                  <p className="text-xs font-bold">{activeLead?.annualRevenue}</p>
                </div>
                <div className="p-4 bg-muted/5 border-2 rounded-2xl space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Field</p>
                  <p className="text-xs font-bold truncate">{activeLead?.printingField}</p>
                </div>
              </div>

              {/* Notes Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Internal Staff Notes</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest" onClick={handleSaveInternalNote} disabled={isSavingNote}>
                    {isSavingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Sync Notes
                  </Button>
                </div>
                <Textarea 
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  placeholder="Draft strategy notes or preference logs..."
                  className="min-h-[120px] rounded-2xl bg-muted/5 border-2 p-5 italic text-sm leading-relaxed"
                />
              </div>

              {/* Activity Log */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-primary" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Activity Registry</h4>
                </div>
                <div className="space-y-6 pl-4 border-l-2 border-muted ml-2">
                  {activeLead?.activityLog?.map((log, idx) => (
                    <div key={idx} className="relative space-y-1 animate-in slide-in-from-left-2">
                      <div className="absolute -left-[25px] top-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary shadow-sm" />
                      <div className="flex justify-between items-start">
                        <p className="text-[11px] font-black uppercase italic tracking-tight">{log.action}</p>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                        {log.details || `Logged by staff member: ${log.staffName}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Follow-up Dispatch Dialog */}
      <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-2 overflow-hidden p-0">
          <DialogHeader className="bg-muted/30 p-8 border-b">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
              <Send className="h-6 w-6 text-primary" /> Follow-up Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">
              Initiate the first forum of contact with the partner lead.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Recipient Registry</Label>
                <div className="p-4 bg-muted/10 rounded-xl border-2 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary opacity-40" />
                  <Input 
                    readOnly 
                    value={activeLead?.email || ''} 
                    className="border-none bg-transparent h-auto p-0 font-mono text-sm font-bold focus-visible:ring-0 shadow-none" 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Introductory Narrative</Label>
                <Textarea 
                  value={followUpMessage} 
                  onChange={e => setFollowUpMessage(e.target.value)}
                  placeholder="Detail your follow-up message..."
                  className="min-h-[200px] rounded-2xl bg-muted/5 border-2 p-5 focus-visible:ring-primary leading-relaxed text-sm italic"
                />
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-muted-foreground uppercase font-medium">
                Sending this dispatch will update the lead status to <span className="text-primary font-black">CONTACTED</span> and initiate a proactive thread in the Resolution Desk.
              </p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase text-[10px]" onClick={() => setIsFollowUpOpen(false)}>Cancel</Button>
            <Button 
              className="rounded-xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl flex-1 sm:flex-none" 
              onClick={handleSendFollowUp}
              disabled={isSending || !followUpMessage.trim()}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Dispatch —
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}