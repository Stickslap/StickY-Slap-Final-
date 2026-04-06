'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Trash, 
  Save, 
  Loader2, 
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { TeamMember, TeamSettings } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

const DEFAULT_TEAM: TeamMember[] = [
  { id: '1', name: "Alex Rivet", role: "Master Printer", bio: "15 years of vinyl expertise.", imageUrl: "https://picsum.photos/seed/member-0/600/800", order: 0 },
  { id: '2', name: "Sarah Inks", role: "Lead Designer", bio: "Visionary behind our custom proofs.", imageUrl: "https://picsum.photos/seed/member-1/600/800", order: 1 },
  { id: '3', name: "Marcus Die", role: "Ops Manager", bio: "Ensuring 2-day turnarounds always.", imageUrl: "https://picsum.photos/seed/member-2/600/800", order: 2 },
  { id: '4', name: "Chloe Gloss", role: "QC Director", bio: "Nothing leaves without her stamp.", imageUrl: "https://picsum.photos/seed/member-3/600/800", order: 3 }
];

export default function TeamSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Fetch existing Team settings
  const teamRef = useMemoFirebase(() => doc(db, 'settings', 'team'), [db]);
  const { data: teamData, isLoading } = useDoc<TeamSettings>(teamRef);

  // Form State
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (teamData && teamData.members) {
      setMembers(teamData.members.sort((a, b) => a.order - b.order));
    } else {
      setMembers(DEFAULT_TEAM);
    }
  }, [teamData]);

  const handleSave = () => {
    if (!teamRef) return;
    setIsSaving(true);

    const updates: TeamSettings = {
      members: members.map((m, i) => ({ ...m, order: i })),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(teamRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Team Content Updated',
      entityType: 'System',
      entityId: 'team',
      details: `Updated 'About Us' team members list.`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Team Updated", 
      description: "About Us page has been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'team');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        updateMember(uploadingId, 'imageUrl', response.secure_url);
        toast({ title: "Avatar Synchronized", description: "Profile photo saved to media vault." });
      } else {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
      setUploadProgress(null);
      setUploadingId(null);
    };

    xhr.onerror = () => {
      toast({ title: "Network Error", variant: "destructive" });
      setUploadProgress(null);
      setUploadingId(null);
    };

    xhr.send(formData);
  };

  const addMember = () => {
    const newMember: TeamMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Member',
      role: 'Staff Member',
      bio: 'Add a short bio...',
      imageUrl: 'https://picsum.photos/seed/new-member/600/800',
      order: members.length
    };
    setMembers([...members, newMember]);
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newMembers = [...members];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newMembers.length) return;
    
    [newMembers[index], newMembers[target]] = [newMembers[target], newMembers[index]];
    setMembers(newMembers);
  };

  const updateMember = (id: string, field: keyof TeamMember, value: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const resetToDefault = () => {
    if (confirm('Reset to standard Society team? This will discard your current changes.')) {
      setMembers(DEFAULT_TEAM);
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
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleUpload} 
        accept="image/*" 
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            The Society <span className="text-primary">Team</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage team profiles for the About Us section</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={resetToDefault}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore Defaults —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Publish Changes —
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {members.map((member, idx) => (
          <Card key={member.id} className="border-2 rounded-3xl overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="bg-muted/30 border-r-2 p-4 flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center font-black text-xs border-2">
                    {idx + 1}
                  </div>
                  <Separator className="bg-muted-foreground/10" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveMember(idx, 'up')} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveMember(idx, 'down')} disabled={idx === members.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Separator className="bg-muted-foreground/10" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => removeMember(member.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 p-8 grid md:grid-cols-4 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profile Photo</Label>
                    <div className="aspect-[4/5] relative bg-muted rounded-2xl overflow-hidden border-2 group/img">
                      <img src={member.imageUrl} alt={member.name} className="object-cover w-full h-full" />
                      <div 
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                        onClick={() => {
                          setUploadingId(member.id);
                          fileInputRef.current?.click();
                        }}
                      >
                        {uploadingId === member.id && uploadProgress !== null ? (
                          <div className="w-full px-4 space-y-2">
                            <Loader2 className="h-6 w-6 animate-spin text-white mx-auto" />
                            <Progress value={uploadProgress} className="h-1 bg-white/20" />
                          </div>
                        ) : (
                          <Upload className="h-6 w-6 text-white" />
                        )}
                      </div>
                    </div>
                    <Input 
                      value={member.imageUrl} 
                      onChange={e => updateMember(member.id, 'imageUrl', e.target.value)}
                      className="h-8 text-[10px] rounded-lg bg-muted/5 font-mono"
                      placeholder="Photo URL"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                        <Input 
                          value={member.name} 
                          onChange={e => updateMember(member.id, 'name', e.target.value)}
                          className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Professional Role</Label>
                        <Input 
                          value={member.role} 
                          onChange={e => updateMember(member.id, 'role', e.target.value)}
                          className="h-12 rounded-xl bg-muted/5 border-2 text-primary font-black uppercase tracking-widest text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staff Bio</Label>
                      <Textarea 
                        value={member.bio} 
                        onChange={e => updateMember(member.id, 'bio', e.target.value)}
                        className="min-h-[100px] rounded-xl bg-muted/5 border-2 leading-relaxed"
                        placeholder="Expertise, history, or interesting facts..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button 
          variant="outline" 
          className="w-full h-24 border-2 border-dashed rounded-[2.5rem] bg-muted/5 hover:bg-primary/5 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary font-black uppercase tracking-widest"
          onClick={addMember}
        >
          <Plus className="mr-2 h-6 w-6" />
          Add Team Member
        </Button>
      </div>
    </div>
  );
}
