
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Save, 
  Loader2, 
  RefreshCw,
  Zap,
  Play,
  Sun,
  Moon,
  Package,
  Sparkles,
  Type,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { CatalogSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEFAULT_CATALOG: CatalogSettings = {
  title: "Master Catalog",
  tagline: "The Society Collections",
  description: "High-precision manufacturing across DTF, Screen, Vinyl, and Bulk Roll architectures.",
  backgroundStyle: 'light',
  updatedAt: new Date().toISOString()
};

export default function CatalogSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch existing Catalog settings
  const catalogRef = useMemoFirebase(() => doc(db, 'settings', 'catalog'), [db]);
  const { data: catalogData, isLoading } = useDoc<CatalogSettings>(catalogRef);

  // Form State
  const [settings, setSettings] = useState<CatalogSettings>(DEFAULT_CATALOG);

  useEffect(() => {
    if (catalogData) {
      setSettings({
        ...DEFAULT_CATALOG,
        ...catalogData
      });
    } else {
      setSettings(DEFAULT_CATALOG);
    }
  }, [catalogData]);

  const handleSave = () => {
    if (!catalogRef) return;
    setIsSaving(true);

    const updates: CatalogSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(catalogRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Catalog Header Updated',
      entityType: 'System',
      entityId: 'catalog',
      details: `Updated catalog page header content and theme (${settings.backgroundStyle}).`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Catalog Updated", 
      description: "Public catalog header has been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const resetToDefault = () => {
    if (confirm('Restore standard catalog header? This will discard your current changes.')) {
      setSettings(DEFAULT_CATALOG);
      toast({ title: "Restored Defaults" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Catalog <span className="text-primary">Branding</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage the master catalog header and immersive theme</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={resetToDefault}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore Layout —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Publish Changes —
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Header Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Catalog Hero Section
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">Full-width slim banner at the top of the /products page.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            {/* Background Style Toggle */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Background Theme</Label>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div 
                  onClick={() => setSettings({...settings, backgroundStyle: 'light'})}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3",
                    settings.backgroundStyle === 'light' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/20"
                  )}
                >
                  <Sun className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Society Light</span>
                </div>
                <div 
                  onClick={() => setSettings({...settings, backgroundStyle: 'dark'})}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3",
                    settings.backgroundStyle === 'dark' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/20"
                  )}
                >
                  <Moon className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Registry Dark</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Title</Label>
                  <Input 
                    value={settings.title} 
                    onChange={e => setSettings({...settings, title: e.target.value})}
                    className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tagline / Label</Label>
                  <Input 
                    value={settings.tagline} 
                    onChange={e => setSettings({...settings, tagline: e.target.value})}
                    className="h-12 rounded-xl bg-muted/5 border-2 text-primary font-black uppercase text-xs tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Narrative Description</Label>
                  <Textarea 
                    value={settings.description} 
                    onChange={e => setSettings({...settings, description: e.target.value})}
                    className="min-h-[120px] rounded-xl bg-muted/5 border-2 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview Simulation */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden bg-muted/5 border-dashed">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Visual Prototype</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className={cn(
              "w-full py-8 rounded-3xl border-2 overflow-hidden px-8 relative transition-colors duration-500",
              settings.backgroundStyle === 'dark' ? "bg-foreground text-background border-white/10" : "bg-white text-foreground border-muted"
            )}>
              <div className="flex flex-col gap-3 max-w-xl">
                <div className={cn(
                  "inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest",
                  settings.backgroundStyle === 'dark' ? "bg-white/5 border-white/10 text-primary" : "bg-primary/10 border-primary/20 text-primary"
                )}>
                  <Sparkles className="h-3 w-3" /> {settings.tagline || 'Tagline'}
                </div>
                <h3 className="text-3xl font-black font-headline uppercase italic leading-none">{settings.title || 'Catalog Title'}</h3>
                <p className="text-xs font-medium opacity-60 italic">{settings.description || 'Collection description goes here...'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
