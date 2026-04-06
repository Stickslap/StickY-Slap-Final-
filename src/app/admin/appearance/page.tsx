'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Save, 
  Loader2, 
  Upload, 
  RefreshCw, 
  Monitor, 
  Eye, 
  CheckCircle2, 
  Database, 
  ShieldAlert, 
  Globe,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';
import { addDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";
const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

export default function AppearanceSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'logo' | null>(null);
  
  // Fetch existing appearance settings
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance, isLoading } = useDoc<any>(appearanceRef);

  // Form State
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [loginVideoUrl, setLoginVideoUrl] = useState('');
  const [signupVideoUrl, setSignupVideoUrl] = useState('');
  const [orderStatusAlert, setOrderStatusAlert] = useState('');
  const [showSeedData, setShowSeedData] = useState(false);

  useEffect(() => {
    if (appearance) {
      setLogoUrl(appearance.logoUrl || DEFAULT_LOGO);
      setFaviconUrl(appearance.faviconUrl || DEFAULT_LOGO);
      setLoginVideoUrl(appearance.loginVideoUrl || '');
      setSignupVideoUrl(appearance.signupVideoUrl || '');
      setOrderStatusAlert(appearance.orderStatusAlert || '');
      setShowSeedData(appearance.showSeedData ?? false);
    } else {
      setLogoUrl(DEFAULT_LOGO);
      setFaviconUrl(DEFAULT_LOGO);
      setLoginVideoUrl('');
      setSignupVideoUrl('');
      setOrderStatusAlert('');
      setShowSeedData(false);
    }
  }, [appearance]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadTarget(target);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'brand_identity');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const finalUrl = response.secure_url;
        
        if (target === 'logo') {
          setLogoUrl(finalUrl);
        } else if (target === 'favicon') {
          setFaviconUrl(finalUrl);
        }
        toast({ title: "Identity Synchronized", description: "Asset saved to the Society vault." });
      } else {
        toast({ title: "Ingest Failed", description: "Cloudinary synchronization error.", variant: "destructive" });
      }
      setUploadProgress(null);
      setUploadTarget(null);
    };

    xhr.onerror = () => {
      toast({ title: "Network Error", variant: "destructive" });
      setUploadProgress(null);
      setUploadTarget(null);
    };

    xhr.send(formData);
  };

  const handleSave = () => {
    if (!appearanceRef) return;
    setIsSaving(true);

    const updates = {
      logoUrl: logoUrl.trim() || DEFAULT_LOGO,
      faviconUrl: faviconUrl.trim() || DEFAULT_LOGO,
      loginVideoUrl: loginVideoUrl.trim(),
      signupVideoUrl: signupVideoUrl.trim(),
      orderStatusAlert: orderStatusAlert.trim(),
      showSeedData,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid || 'system'
    };

    setDocumentNonBlocking(appearanceRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Brand Appearance Updated',
      entityType: 'System',
      entityId: 'appearance',
      details: `Updated global branding and platform controls (Seed Data: ${showSeedData ? 'ON' : 'OFF'}).`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Appearance Synchronized", 
      description: "Global branding and controls have been updated." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const resetLogo = () => {
    setLogoUrl(DEFAULT_LOGO);
    toast({ title: "Logo Reset", description: "Default Print Society branding restored." });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Brand <span className="text-primary">Appearance</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage global branding, logos, and portal media</p>
        </div>
        <Button 
          className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl" 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
          Update Branding —
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Platform Controls */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm border-primary/20 bg-primary/5">
          <CardHeader className="bg-primary/10 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" /> Platform Controls
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/70">Manage developer tools and global visibility switches.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between p-6 bg-background rounded-2xl border-2 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">Customer Portal Dev Tools</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                    Show "Seed Test Data" button on the user dashboard.
                  </p>
                </div>
              </div>
              <Switch 
                checked={showSeedData} 
                onCheckedChange={setShowSeedData} 
              />
            </div>
            <div className="grid gap-2 mt-6">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Order Status Page Alert</Label>
              <Input 
                value={orderStatusAlert} 
                onChange={e => setOrderStatusAlert(e.target.value)}
                className="h-12 rounded-xl bg-muted/5 border-2"
                placeholder="Sticky Slap need website all order have been transfer here. All commucations has to be done though our customer portal."
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" /> Identity Logo
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Controls the logo displayed in the header, footer, and auth portals.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Live Preview</Label>
                <div className="h-32 w-64 rounded-2xl border-2 border-dashed bg-muted/5 flex items-center justify-center p-6 relative group overflow-hidden">
                  <Image 
                    src={logoUrl || DEFAULT_LOGO} 
                    alt="Logo Preview" 
                    width={200} 
                    height={50} 
                    className="object-contain h-12 w-auto drop-shadow-sm"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-tighter" onClick={resetLogo}>
                    <RefreshCw className="mr-1.5 h-3 w-3" /> Reset Default
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Logo Asset URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={logoUrl} 
                      onChange={e => setLogoUrl(e.target.value)}
                      className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-xs"
                      placeholder="https://your-cloud-storage.com/logo.png"
                    />
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo')} />
                    <Button 
                      variant="outline" 
                      className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={!!uploadProgress}
                    >
                      {uploadTarget === 'logo' && uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploadTarget === 'logo' && uploadProgress !== null && (
                    <div className="space-y-1 mt-1">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    Pro-tip: Use a high-resolution transparent PNG or SVG for the best result.
                  </p>
                </div>
                
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Automatic Sync</p>
                    <p className="text-[9px] text-emerald-700 leading-relaxed font-medium">
                      Changing this URL will instantly update branding for all active society sessions globally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favicon Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Browser Favicon
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Controls the favicon displayed in the browser tab.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Live Preview</Label>
                <div className="h-32 w-32 rounded-2xl border-2 border-dashed bg-muted/5 flex items-center justify-center p-6 relative group overflow-hidden">
                  <Image 
                    src={faviconUrl || DEFAULT_LOGO} 
                    alt="Favicon Preview" 
                    width={48} 
                    height={48} 
                    className="object-contain h-12 w-12 drop-shadow-sm"
                    unoptimized
                  />
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Favicon Asset URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={faviconUrl} 
                      onChange={e => setFaviconUrl(e.target.value)}
                      className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-xs"
                      placeholder="https://your-cloud-storage.com/favicon.png"
                    />
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'favicon')} />
                    <Button 
                      variant="outline" 
                      className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={!!uploadProgress}
                    >
                      {uploadTarget === 'favicon' && uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploadTarget === 'favicon' && uploadProgress !== null && (
                    <div className="space-y-1 mt-1">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Media */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> Auth Portal Media
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Background media for the login and signup entry points.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Login Video URL (YouTube or Direct)</Label>
                <Input 
                  value={loginVideoUrl} 
                  onChange={e => setLoginVideoUrl(e.target.value)}
                  className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-xs"
                  placeholder="https://youtu.be/..."
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Signup Video URL (YouTube or Direct)</Label>
                <Input 
                  value={signupVideoUrl} 
                  onChange={e => setSignupVideoUrl(e.target.value)}
                  className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-xs"
                  placeholder="https://youtu.be/..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
