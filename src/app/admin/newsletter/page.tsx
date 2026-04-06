
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Save, 
  Loader2, 
  Users, 
  Trash, 
  Download, 
  Search,
  Settings2,
  BellRing,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { NewsletterSettings, NewsletterSubscriber } from '@/lib/types';

const DEFAULT_SETTINGS: NewsletterSettings = {
  title: "Stay in the Print Cycle",
  description: "Join our private editorial registry for investigative design drops and technical print deep-dives.",
  buttonText: "Join —",
  placeholder: "Registry Email",
  updatedAt: new Date().toISOString()
};

export default function NewsletterAdminPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Settings
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'newsletter'), [db]);
  const { data: settingsData, isLoading: isSettingsLoading } = useDoc<NewsletterSettings>(settingsRef);

  // Fetch Subscribers
  const subscribersQuery = useMemoFirebase(() => query(collection(db, 'newsletter_subscribers'), orderBy('createdAt', 'desc'), limit(500)), [db]);
  const { data: subscribers, isLoading: isSubsLoading } = useCollection<NewsletterSubscriber>(subscribersQuery);

  // Form State
  const [settings, setSettings] = useState<NewsletterSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  const handleSaveSettings = () => {
    if (!settingsRef) return;
    setIsSaving(true);

    const updates = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(settingsRef, updates, { merge: true });
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Newsletter CTA Updated',
      entityType: 'System',
      entityId: 'newsletter',
      details: `Updated newsletter section copy.`,
      timestamp: new Date().toISOString()
    });

    toast({ title: "Settings Saved", description: "Public newsletter section has been updated." });
    setTimeout(() => setIsSaving(false), 600);
  };

  const handleDeleteSubscriber = (id: string) => {
    if (confirm('Permanently remove this subscriber from the Society mailing list?')) {
      deleteDocumentNonBlocking(doc(db, 'newsletter_subscribers', id));
      toast({ title: "Subscriber Removed" });
    }
  };

  const filteredSubscribers = subscribers?.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const exportCSV = () => {
    if (!subscribers) return;
    const headers = ['Email', 'Source', 'Subscribed At'];
    const rows = subscribers.map(s => [s.email, s.source || 'Unknown', s.createdAt]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `society_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Dispatch <span className="text-primary">Registry</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage public newsletter content and subscriber list</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={exportCSV} disabled={!subscribers?.length}>
            <Download className="mr-2 h-3.5 w-3.5" /> Export Registry —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl" 
            onClick={handleSaveSettings}
            disabled={isSaving || isSettingsLoading}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Sync Section —
          </Button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 items-start">
        
        {/* Settings Column */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-6 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-primary" /> CTA Content
              </CardTitle>
              <CardDescription className="text-xs font-medium">Controls the newsletter section at the bottom of blog posts.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Section Heading</Label>
                <Input value={settings.title} onChange={e => setSettings({...settings, title: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Narrative Description</Label>
                <Textarea value={settings.description} onChange={e => setSettings({...settings, description: e.target.value})} className="min-h-[100px] rounded-xl bg-muted/5 border-2 leading-relaxed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Placeholder Text</Label>
                  <Input value={settings.placeholder} onChange={e => setSettings({...settings, placeholder: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Button Label</Label>
                  <Input value={settings.buttonText} onChange={e => setSettings({...settings, buttonText: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest">Security Protocol</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-medium">
              Subscriber data is stored in the <code>newsletter_subscribers</code> vault. 
              Only workstation administrators with verified role clearance can view or export this list.
            </p>
          </div>
        </div>

        {/* Subscriber List Column */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" /> Subscriber Registry
                </CardTitle>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Find email..." 
                  className="pl-8 h-8 text-[10px] rounded-lg bg-background"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isSubsLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto opacity-20" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Subscriber Email</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Source</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Logged At</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers?.map((sub) => (
                      <TableRow key={sub.id} className="group hover:bg-muted/10 transition-colors">
                        <TableCell className="px-8">
                          <span className="font-bold text-sm">{sub.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
                            {sub.source || 'General'}
                          </span>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteSubscriber(sub.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredSubscribers?.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center opacity-30 italic uppercase text-[10px] font-black tracking-widest">
                          No subscribers found in registry.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
