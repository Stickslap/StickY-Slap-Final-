
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from '@/components/ui/progress';
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Globe, 
  Play, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin,
  Loader2,
  Users,
  ShieldCheck,
  Building2,
  Upload,
  Plus,
  Trash,
  Save,
  RefreshCw,
  X,
  Video
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFirestore, useUser, setDocumentNonBlocking, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { TeamSettings, TeamMember, AboutSettings, ContactSettings, PartnerLogo } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";
const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

const FALLBACK_ABOUT: AboutSettings = {
  mission: {
    title: "Our Mission",
    tagline: "Stick to Greatness.",
    description1: "Founded in 2024, Print Society .co was born from a simple observation: ordering custom stickers was either too expensive or too difficult. We set out to change that by combining professional-grade equipment with a boutique service experience.",
    description2: "Every project we touch is treated as a piece of art. From our choice of military-grade vinyl to our UV-resistant ink sets, we ensure your brand stands out and stays stuck.",
    videoUrl: "https://www.youtube.com/watch?v=MJ9JaM7tI3w",
    videoThumbnailUrl: "https://picsum.photos/seed/about-vid/1200/800",
    highlights: ["100% Waterproof", "Hand Inspected"]
  },
  partners: [
    { id: 'p1', name: 'Brand A', imageUrl: 'https://picsum.photos/seed/p1/200/100', order: 0 },
    { id: 'p2', name: 'Brand B', imageUrl: 'https://picsum.photos/seed/p2/200/100', order: 1 }
  ],
  updatedAt: new Date().toISOString()
};

export default function AboutSettingsAdmin() {
  const db = useFirestore();
  const { user } = useUser();
  const partnerInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingPartnerId, setUploadingPartnerId] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const aboutRef = useMemoFirebase(() => doc(db, 'settings', 'about'), [db]);
  const { data: aboutData, isLoading } = useDoc<AboutSettings>(aboutRef);

  const [settings, setSettings] = useState<AboutSettings>(FALLBACK_ABOUT);

  useEffect(() => {
    if (aboutData) {
      setSettings({
        ...FALLBACK_ABOUT,
        ...aboutData,
        mission: { ...FALLBACK_ABOUT.mission, ...(aboutData.mission || {}) },
        partners: aboutData.partners || FALLBACK_ABOUT.partners
      });
    }
  }, [aboutData]);

  const handleSave = () => {
    if (!aboutRef) return;
    setIsSaving(true);
    setDocumentNonBlocking(aboutRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'About Registry Updated',
      entityType: 'System',
      entityId: 'about',
      details: 'Updated mission narrative and media assets.',
      timestamp: new Date().toISOString()
    });

    toast({ title: "About Registry Updated" });
    setTimeout(() => setIsSaving(false), 600);
  };

  const handlePartnerUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPartnerId(id);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'partners');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const finalUrl = response.secure_url;
        setSettings(prev => ({
          ...prev,
          partners: prev.partners.map(p => p.id === id ? { ...p, imageUrl: finalUrl } : p)
        }));
        toast({ title: "Asset Synchronized" });
      }
      setUploadProgress(null);
      setUploadingPartnerId(null);
    };

    xhr.send(formData);
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'about');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        setSettings(prev => ({
          ...prev,
          mission: { ...prev.mission, videoThumbnailUrl: response.secure_url }
        }));
        toast({ title: "Thumbnail Asset Synchronized" });
      }
      setUploadProgress(null);
      setIsUploadingThumbnail(false);
    };

    xhr.send(formData);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'about_videos');

    const xhr = new XMLHttpRequest();
    // Use video endpoint for Cloudinary
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        setSettings(prev => ({
          ...prev,
          mission: { ...prev.mission, videoUrl: response.secure_url }
        }));
        toast({ title: "Video Ingested", description: "Asset saved to the Society vault." });
      } else {
        toast({ title: "Ingest Failed", description: "Video upload error.", variant: "destructive" });
      }
      setUploadProgress(null);
      setIsUploadingVideo(false);
    };

    xhr.onerror = () => {
      toast({ title: "Network Error", variant: "destructive" });
      setUploadProgress(null);
      setIsUploadingVideo(false);
    };

    xhr.send(formData);
  };

  const addPartner = () => {
    const newPartner: PartnerLogo = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Collaborator',
      imageUrl: 'https://picsum.photos/seed/new/200/100',
      order: settings.partners.length
    };
    setSettings({ ...settings, partners: [...settings.partners, newPartner] });
  };

  if (!isMounted || isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic leading-none">About Us <span className="text-primary">Admin</span></h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage mission narrative and collaborator showcase</p>
        </div>
        <Button className="rounded-xl h-12 px-8 font-black uppercase text-[10px] bg-primary shadow-xl" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sync Changes —
        </Button>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-8">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Mission Narrative</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Title</Label>
              <Input value={settings.mission.title} onChange={e => setSettings({...settings, mission: {...settings.mission, title: e.target.value}})} className="h-12 border-2 font-bold" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tagline</Label>
              <Input value={settings.mission.tagline} onChange={e => setSettings({...settings, mission: {...settings.mission, tagline: e.target.value}})} className="h-12 border-2" />
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
              <Video className="h-4 w-4" /> Story Media Assets
            </h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">About Us Video (YouTube or MP4)</Label>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <Play className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      value={settings.mission.videoUrl} 
                      onChange={e => setSettings({...settings, mission: {...settings.mission, videoUrl: e.target.value}})} 
                      className="h-12 pl-12 border-2 font-mono text-xs" 
                      placeholder="https://..." 
                    />
                  </div>
                  <input type="file" ref={videoInputRef} className="hidden" onChange={handleVideoUpload} accept="video/*" />
                  <Button 
                    variant="outline" 
                    className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingVideo}
                  >
                    {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {isUploadingVideo && uploadProgress !== null && (
                  <div className="space-y-1 mt-1">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-[8px] font-black uppercase text-primary text-right">Uploading Video: {Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Thumbnail Asset URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={settings.mission.videoThumbnailUrl || ''} 
                    onChange={e => setSettings({...settings, mission: {...settings.mission, videoThumbnailUrl: e.target.value}})} 
                    className="h-12 border-2 font-mono text-[10px]" 
                    placeholder="Thumbnail photo URL..." 
                  />
                  <input type="file" ref={thumbInputRef} className="hidden" onChange={handleThumbnailUpload} accept="image/*" />
                  <Button 
                    variant="outline" 
                    className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={isUploadingThumbnail}
                  >
                    {isUploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {isUploadingThumbnail && uploadProgress !== null && (
                  <div className="space-y-1 mt-1">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-[8px] font-black uppercase text-primary text-right">Uploading Image: {Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6">
            <div className="grid gap-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Paragraph 1</Label><Textarea value={settings.mission.description1} onChange={e => setSettings({...settings, mission: {...settings.mission, description1: e.target.value}})} className="min-h-[100px] border-2" /></div>
            <div className="grid gap-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Paragraph 2</Label><Textarea value={settings.mission.description2} onChange={e => setSettings({...settings, mission: {...settings.mission, description2: e.target.value}})} className="min-h-[100px] border-2" /></div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Highlights (Comma separated)</Label>
              <Input 
                value={settings.mission.highlights?.join(', ') || ''} 
                onChange={e => setSettings({...settings, mission: {...settings.mission, highlights: e.target.value.split(',').map(h => h.trim()).filter(h => !!h)}})} 
                className="h-12 border-2" 
                placeholder="100% Waterproof, Hand Inspected"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Society Collaborators</CardTitle>
          <Button variant="outline" size="sm" className="rounded-xl h-9 border-2 font-bold uppercase text-[9px]" onClick={addPartner}><Plus className="h-3 w-3 mr-1" /> Add Logo —</Button>
        </CardHeader>
        <CardContent className="p-8 grid md:grid-cols-2 gap-6">
          {settings.partners.map((p) => (
            <div key={p.id} className="p-6 bg-muted/5 border-2 rounded-[2rem] space-y-4 relative group">
              <div 
                className="aspect-[2/1] relative bg-white rounded-2xl border-2 overflow-hidden flex items-center justify-center cursor-pointer group/img"
                onClick={() => { setUploadingPartnerId(p.id); partnerInputRef.current?.click(); }}
              >
                <img src={p.imageUrl} alt={p.name} className="object-contain p-4 transition-transform group-hover/img:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPartnerId === p.id && uploadProgress !== null ? <Loader2 className="animate-spin text-white" /> : <Upload className="text-white" />}
                </div>
              </div>
              <Input value={p.name} onChange={e => setSettings({...settings, partners: settings.partners.map(item => item.id === p.id ? { ...item, name: e.target.value } : item)})} className="h-10 text-[10px] font-black uppercase text-center border-none bg-transparent" />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full bg-background shadow-md" onClick={() => setSettings({...settings, partners: settings.partners.filter(item => item.id !== p.id)})}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <input type="file" ref={partnerInputRef} className="hidden" onChange={e => uploadingPartnerId && handlePartnerUpload(e, uploadingPartnerId)} accept="image/*" />
        </CardContent>
      </Card>
    </div>
  );
}
