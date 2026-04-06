'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, 
  Save, 
  Loader2, 
  Video, 
  Image as ImageIcon, 
  CheckCircle2, 
  RefreshCw,
  Zap,
  Play,
  History,
  Moon,
  Sun,
  Upload,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { LandingSettings, Role } from '@/lib/types';
import { cn } from '@/lib/utils';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

const DEFAULT_LANDING: LandingSettings = {
  heroSection: {
    title: "Print Custom Stickers and Prints",
    tagline: "The Print Society Standard",
    description: "Express delivery as fast as 2-4 business days. Get an instant proof and free shipping!",
    buttonText: "Shop Now",
    isActive: true
  },
  videoSection: {
    title: "The Society Method",
    tagline: "Precision in Every Adhesive.",
    description: "Go behind the scenes of our boutique production lab. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers.",
    buttonText: "Watch Video",
    videoUrl: "https://picsum.photos/seed/bts-vid/1200/800",
    thumbnailUrl: "https://picsum.photos/seed/bts-thumb/1200/800",
    isActive: true,
    backgroundStyle: 'dark'
  },
  featuredImage: "https://picsum.photos/seed/featured/800/800",
  updatedAt: new Date().toISOString()
};

export default function LandingSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'video' | 'thumb' | 'featured' | null>(null);
  
  // Fetch existing Landing settings
  const landingRef = useMemoFirebase(() => doc(db, 'settings', 'landing'), [db]);
  const { data: landingData, isLoading } = useDoc<LandingSettings>(landingRef);

  const roleRef = useMemoFirebase(() => doc(db, 'roles', user?.uid || 'none'), [db, user]);
  const { data: roleData } = useDoc<Role>(roleRef);

  // Form State
  const [settings, setSettings] = useState<LandingSettings>(DEFAULT_LANDING);

  useEffect(() => {
    if (landingData) {
      setSettings({
        ...DEFAULT_LANDING,
        ...landingData,
        heroSection: {
          ...DEFAULT_LANDING.heroSection,
          ...(landingData.heroSection || {})
        },
        videoSection: {
          ...DEFAULT_LANDING.videoSection,
          ...(landingData.videoSection || {})
        }
      });
    } else {
      setSettings(DEFAULT_LANDING);
    }
  }, [landingData]);

  const handleSave = () => {
    if (!landingRef || !user) {
        console.log("Missing landingRef or user");
        return;
    }
    
    // Check role
    console.log("Checking role. roleData:", roleData);
    
    const isAdminEmail = user?.email && ["sticky@stickyslap.com", "atirndev@stickyslap.com", "j09banzuelo@gmail.com"].includes(user.email);
    const isAdminUid = user?.uid && ["Iit0JbEKytRkn35p4K0Rat6z4SE3", "V1P0P8NnceW0m3lpb2D4zjvU4jg2"].includes(user.uid);
    const isAssignedAdmin = roleData && roleData.role !== 'Vendor' && roleData.role !== 'Customer';

    if (!isAdminEmail && !isAdminUid && !isAssignedAdmin) {
        console.log("User does not have admin role. Role:", roleData?.role);
        toast({ title: "Permission Denied", description: "You do not have permission to save settings.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    console.log("Saving landing settings. User:", user);
    console.log("User email:", user?.email);
    console.log("User UID:", user?.uid);

    const updates: LandingSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(landingRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Landing Page Updated',
      entityType: 'System',
      entityId: 'landing',
      details: `Updated home page video section and background styling.`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Content Published", 
      description: "Home page content has been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'video' | 'thumb' | 'featured') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadTarget(target);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'landing_assets');

    const xhr = new XMLHttpRequest();
    const endpoint = target === 'video' ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`, true);

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
        
        if (target === 'video') {
          setSettings(prev => ({
            ...prev,
            videoSection: { ...prev.videoSection, videoUrl: finalUrl }
          }));
        } else if (target === 'thumb') {
          setSettings(prev => ({
            ...prev,
            videoSection: { ...prev.videoSection, thumbnailUrl: finalUrl }
          }));
        } else {
          setSettings(prev => ({
            ...prev,
            featuredImage: finalUrl
          }));
        }
        toast({ title: "Asset Ingested", description: "File successfully synchronized with the Society vault." });
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

  const resetToDefault = () => {
    if (confirm('Restore standard home page layout? This will discard your current changes.')) {
      setSettings(DEFAULT_LANDING);
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
            Landing <span className="text-primary">Content</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage home page sections and immersive media</p>
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
        {/* Hero Section Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" /> Hero Section
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">Main landing page hero content.</CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-2xl border">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Section Active</span>
              <Switch 
                checked={settings.heroSection.isActive} 
                onCheckedChange={v => setSettings({...settings, heroSection: {...settings.heroSection, isActive: v}})} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Button Text</Label>
              <Input 
                value={settings.heroSection.buttonText} 
                onChange={e => setSettings({...settings, heroSection: {...settings.heroSection, buttonText: e.target.value}})}
                className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Title</Label>
              <Input 
                value={settings.heroSection.title} 
                onChange={e => setSettings({...settings, heroSection: {...settings.heroSection, title: e.target.value}})}
                className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Tagline</Label>
              <Input 
                value={settings.heroSection.tagline} 
                onChange={e => setSettings({...settings, heroSection: {...settings.heroSection, tagline: e.target.value}})}
                className="h-12 rounded-xl bg-muted/5 border-2 text-primary font-black uppercase text-xs tracking-widest"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Hero Description</Label>
              <Textarea 
                value={settings.heroSection.description} 
                onChange={e => setSettings({...settings, heroSection: {...settings.heroSection, description: e.target.value}})}
                className="min-h-[120px] rounded-xl bg-muted/5 border-2 leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Section Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" /> Production Method Section
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">Immersive video area between Showcase and FAQs.</CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-2xl border">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Section Active</span>
              <Switch 
                checked={settings.videoSection.isActive} 
                onCheckedChange={v => setSettings({...settings, videoSection: {...settings.videoSection, isActive: v}})} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            {/* Background Style Toggle */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Section Background Theme</Label>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div 
                  onClick={() => setSettings({...settings, videoSection: {...settings.videoSection, backgroundStyle: 'light'}})}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3",
                    settings.videoSection.backgroundStyle === 'light' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/20"
                  )}
                >
                  <Sun className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Light</span>
                </div>
                <div 
                  onClick={() => setSettings({...settings, videoSection: {...settings.videoSection, backgroundStyle: 'dark'}})}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3",
                    settings.videoSection.backgroundStyle === 'dark' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/20"
                  )}
                >
                  <Moon className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dark</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Section Heading</Label>
                  <Input 
                    value={settings.videoSection.title} 
                    onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, title: e.target.value}})}
                    className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Button Text</Label>
                  <Input 
                    value={settings.videoSection.buttonText} 
                    onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, buttonText: e.target.value}})}
                    className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tagline / Label</Label>
                  <Input 
                    value={settings.videoSection.tagline} 
                    onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, tagline: e.target.value}})}
                    className="h-12 rounded-xl bg-muted/5 border-2 text-primary font-black uppercase text-xs tracking-widest"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Narrative Description</Label>
                  <Textarea 
                    value={settings.videoSection.description} 
                    onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, description: e.target.value}})}
                    className="min-h-[120px] rounded-xl bg-muted/5 border-2 leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Video Source (YouTube/Direct/Cloudinary)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Play className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={settings.videoSection.videoUrl} 
                        onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, videoUrl: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2 pl-12 font-mono text-xs"
                        placeholder="https://..."
                      />
                    </div>
                    <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => handleUpload(e, 'video')} />
                    <Button 
                      variant="outline" 
                      className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={!!uploadProgress}
                    >
                      {uploadTarget === 'video' && uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploadTarget === 'video' && uploadProgress !== null && (
                    <div className="space-y-1 mt-1">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Thumbnail Cover Asset</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={settings.videoSection.thumbnailUrl} 
                        onChange={e => setSettings({...settings, videoSection: {...settings.videoSection, thumbnailUrl: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2 pl-12 font-mono text-xs"
                        placeholder="https://..."
                      />
                    </div>
                    <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'thumb')} />
                    <Button 
                      variant="outline" 
                      className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                      onClick={() => thumbInputRef.current?.click()}
                      disabled={!!uploadProgress}
                    >
                      {uploadTarget === 'thumb' && uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploadTarget === 'thumb' && uploadProgress !== null && (
                    <div className="space-y-1 mt-1">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                </div>
                
                <div className="aspect-video relative rounded-3xl overflow-hidden border-2 bg-muted group">
                  {settings.videoSection.thumbnailUrl ? (
                    <img src={settings.videoSection.thumbnailUrl} className="object-cover w-full h-full opacity-50" alt="Cover Preview" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Image Management */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" /> Featured Image
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest">Replace the main featured image.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Featured Image Asset</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={settings.featuredImage} 
                    onChange={e => setSettings({...settings, featuredImage: e.target.value})}
                    className="h-12 rounded-xl bg-muted/5 border-2 pl-12 font-mono text-xs"
                    placeholder="https://..."
                  />
                </div>
                <input type="file" ref={featuredInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'featured')} />
                <Button 
                  variant="outline" 
                  className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                  onClick={() => featuredInputRef.current?.click()}
                  disabled={!!uploadProgress}
                >
                  {uploadTarget === 'featured' && uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
              {uploadTarget === 'featured' && uploadProgress !== null && (
                <div className="space-y-1 mt-1">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Activity Sync Note */}
        <div className="p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900">Instant Registry Propagation</h4>
            <p className="text-xs font-medium text-emerald-700 leading-relaxed uppercase tracking-tighter">
              All changes published here are synchronized instantly with the Society main entrance. 
              Active member sessions will receive updates on the next state cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
