
'use client';

import React, { useState } from 'react';
import { 
  Mail, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Copy, 
  Eye, 
  Power,
  Loader2,
  AlertCircle,
  Zap,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  Send,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { EmailTemplate, EmailBlock } from '@/lib/types';
import { verifySocietyDispatch } from '@/app/actions/email';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function EmailTemplatesPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('stickyslapco@gmail.com');

  const templatesQuery = useMemoFirebase(() => query(collection(db, 'email_templates'), orderBy('name')), [db]);
  const { data: templates, isLoading } = useCollection<EmailTemplate>(templatesQuery);

  const filtered = templates?.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.trigger.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRunDiagnostic = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    try {
      const result = await verifySocietyDispatch(testEmail);
      if (result.success) {
        toast({ title: "Diagnostic Successful", description: `Verification email sent to ${testEmail}` });
      } else {
        toast({ title: "Diagnostic Failed", description: "Check your API key in the registry.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "System Error", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Permanently delete the "${name}" template? This action cannot be undone.`)) {
      deleteDocumentNonBlocking(doc(db, 'email_templates', id));
      toast({ title: "Template Purged", variant: "destructive" });
    }
  };

  const handleToggle = (template: EmailTemplate) => {
    updateDocumentNonBlocking(doc(db, 'email_templates', template.id), {
      enabled: !template.enabled,
      updatedAt: new Date().toISOString()
    });
    toast({ title: template.enabled ? "Trigger Deactivated" : "Trigger Activated" });
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    const { id, ...data } = template;
    const duplicatedData = {
      ...data,
      name: `${data.name} (Copy)`,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await addDocumentNonBlocking(collection(db, 'email_templates'), duplicatedData);
    toast({ title: "Template Duplicated" });
  };

  const seedTemplates = async () => {
    setIsSeeding(true);
    const now = new Date().toISOString();
    
    const defaults: Partial<EmailTemplate>[] = [
      {
        name: 'Order Confirmation',
        trigger: 'order_confirmed',
        subject: 'Society Receipt: #{{order_id}}',
        previewText: 'Your custom print project has been logged.',
        senderName: 'Sticky Slap',
        replyTo: 'lab@stickyslap.com',
        enabled: true,
        header: { bgColor: '#FFFFFF', logoUrl: LOGO_URL },
        blocks: [
          { id: 'b1', type: 'text', content: 'Hello {{customer_name}},', alignment: 'left' },
          { id: 'b2', type: 'text', content: 'Your project has been successfully ingested into the Sticky Slap Registry. Our lab technicians are currently performing artwork resolution checks.', alignment: 'left' },
          { id: 'b3', type: 'order_summary' },
          { id: 'b4', type: 'button', label: 'View Order Registry —', link: '{{order_link}}', alignment: 'center' }
        ]
      },
      {
        name: 'Welcome Member',
        trigger: 'welcome_member',
        subject: 'Welcome to Sticky Slap, {{customer_name}}',
        previewText: 'Your administrative profile is now active.',
        senderName: 'Sticky Slap',
        replyTo: 'lab@stickyslap.com',
        enabled: true,
        header: { bgColor: '#000000', logoUrl: LOGO_URL },
        blocks: [
          { id: 'b1', type: 'text', content: 'Verification Successful, {{customer_name}}.', alignment: 'left' },
          { id: 'b2', type: 'text', content: 'Your professional print dashboard is now authorized. You can track projects, manage artwork vaults, and access wholesale pricing directly.', alignment: 'left' },
          { id: 'b3', type: 'button', label: 'Access Dashboard —', link: '{{society_link}}/dashboard', alignment: 'center' }
        ]
      },
      {
        name: 'Artwork Approved',
        trigger: 'artwork_approved',
        subject: 'Design Authorized: #{{order_id}}',
        previewText: 'Your artwork has passed verification.',
        senderName: 'Sticky Slap',
        replyTo: 'lab@stickyslap.com',
        enabled: true,
        header: { bgColor: '#FFFFFF', logoUrl: LOGO_URL },
        blocks: [
          { id: 'b1', type: 'text', content: 'Design Authorized, {{customer_name}}.', alignment: 'left' },
          { id: 'b2', type: 'text', content: 'Your production proof has been authorized. The project is now moving to the manufacturing queue.', alignment: 'left' },
          { id: 'b3', type: 'button', label: 'Track Production —', link: '{{order_link}}', alignment: 'center' }
        ]
      },
      {
        name: 'Proof Ready for Review',
        trigger: 'proof_ready',
        subject: 'Action Required: Your Proof for {{project_name}} is Ready',
        previewText: 'Please review and approve your artwork proof.',
        senderName: 'Sticky Slap',
        replyTo: 'lab@stickyslap.com',
        enabled: true,
        header: { bgColor: '#FFFFFF', logoUrl: LOGO_URL },
        blocks: [
          { id: 'b1', type: 'text', content: 'Hello {{customer_name}},', alignment: 'left' },
          { id: 'b2', type: 'text', content: 'Your artwork proof for "{{project_name}}" is ready for your review. Please check the details carefully before approving for production.', alignment: 'left' },
          { id: 'b3', type: 'artwork_preview' },
          { id: 'b4', type: 'button', label: 'Review Proof —', link: '{{proof_link}}', alignment: 'center' },
          { id: 'b5', type: 'text', content: 'If you need any changes, you can request them directly through the review link above.', alignment: 'left' }
        ]
      }
    ];

    try {
      for (const t of defaults) {
        await addDocumentNonBlocking(collection(db, 'email_templates'), {
          ...t,
          createdAt: now,
          updatedAt: now
        });
      }
      toast({ title: "Registry Initialized", description: "Default Society templates have been preloaded." });
    } catch (e) {
      toast({ title: "Seeding Failed", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
            <Zap className="h-3 w-3" /> Automation Registry
          </div>
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic text-foreground leading-none">
            Email <span className="text-primary">Templates</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs opacity-70">
            Manage the visual identity and logic of automated shop communications.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl h-16 px-8 font-black uppercase tracking-widest text-[10px] border-2" onClick={seedTemplates} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Seed Defaults —
          </Button>
          <Button asChild className="rounded-2xl h-16 px-10 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 transition-all active:scale-95">
            <Link href="/admin/notifications/email-templates/new">
              <Plus className="mr-2 h-5 w-5" />
              Build Template —
            </Link>
          </Button>
        </div>
      </div>

      {/* Connection Diagnostic Tools */}
      <Card className="border-4 border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden shadow-xl">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[1.25rem] bg-primary flex items-center justify-center shadow-lg">
              <Send className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tight">Diagnostic Console</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/70">Verify Resend API Connectivity</p>
            </div>
          </div>
          <div className="flex flex-1 max-w-md w-full gap-2">
            <Input 
              value={testEmail} 
              onChange={e => setTestEmail(e.target.value)} 
              placeholder="recipient@example.com"
              className="h-14 bg-background border-2 rounded-2xl font-bold"
            />
            <Button 
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-primary transition-all shadow-xl"
              onClick={handleRunDiagnostic}
              disabled={isTesting}
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Test Dispatch —'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-8">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by name or trigger event..." 
              className="pl-12 h-12 rounded-xl bg-background border-2" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Retrieving Logic Vault...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Template Profile</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Event Trigger</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Lifecycle</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Automation Status</TableHead>
                  <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((template) => (
                  <TableRow key={template.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 border-2 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-bold text-sm block uppercase tracking-tight">{template.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-60 line-clamp-1">{template.subject}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-primary/20 text-primary">
                        {template.trigger}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={template.enabled} 
                          onCheckedChange={() => handleToggle(template)}
                        />
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          template.enabled ? "text-emerald-600" : "text-muted-foreground opacity-40"
                        )}>
                          {template.enabled ? 'Live' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2">Management</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            <Link href={`/admin/notifications/email-templates/${template.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Blueprint
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => handleDuplicate(template)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => handleDelete(template.id, template.name)}>
                            <Trash className="mr-2 h-4 w-4" /> Purge Registry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-6">
                        <div className="h-16 w-16 rounded-3xl bg-muted/30 flex items-center justify-center border-4 border-dashed border-muted">
                          <Mail className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black uppercase tracking-widest italic text-muted-foreground">Registry Empty</p>
                          <p className="text-xs text-muted-foreground font-medium max-w-xs mx-auto">No automation templates found. Use the seed tool to initialize default Society dispatches.</p>
                        </div>
                        <Button variant="outline" className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 shadow-sm" onClick={seedTemplates} disabled={isSeeding}>
                          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                          Initialize Registry —
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
