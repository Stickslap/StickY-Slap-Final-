'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Settings2, 
  Monitor, 
  Lock, 
  Bell, 
  Globe, 
  History,
  Save, 
  Loader2, 
  Camera, 
  CheckCircle2, 
  Smartphone, 
  Eye, 
  Languages 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { useAdmin } from '../layout';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export default function AdminProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { role } = useAdmin();
  const { setTheme, theme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Password State
  const [passwords, setPasswords] = useState({
    current: '',
    next: ''
  });

  // Fetch Full Profile Data
  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, isLoading } = useDoc<UserProfile>(profileRef);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    language: 'English (US)',
    timezone: 'PST (UTC-8)',
    theme: 'system',
    density: 'standard',
    mfaEnabled: false,
    notifications: {
      newOrders: true,
      supportTickets: true,
      systemAlerts: false
    }
  });

  useEffect(() => {
    if (profile) {
      const prefs = (profile as any).preferences || {};
      setFormData(prev => ({
        ...prev,
        name: profile.name || user?.displayName || '',
        title: (profile as any).title || '',
        phone: (profile as any).phone || '',
        mfaEnabled: (profile as any).mfaEnabled || false,
        ...prefs,
        notifications: {
          ...prev.notifications,
          ...(prefs.notifications || {})
        }
      }));
    } else if (user && !profile && !isLoading) {
      // Fallback for new staff without a profile document
      setFormData(prev => ({
        ...prev,
        name: user.displayName || '',
      }));
    }
  }, [profile, user, isLoading]);

  const handleSaveProfile = async () => {
    if (!profileRef || !user) return;
    setIsSaving(true);

    try {
      // Sync Auth Profile for Header/Context parity
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: formData.name 
        });
      }

      const updates = {
        name: formData.name,
        title: formData.title,
        phone: formData.phone,
        mfaEnabled: formData.mfaEnabled,
        preferences: {
          language: formData.language,
          timezone: formData.timezone,
          theme: formData.theme,
          density: formData.density,
          notifications: formData.notifications
        },
        updatedAt: new Date().toISOString()
      };

      setDocumentNonBlocking(profileRef, updates, { merge: true });
      
      toast({ 
        title: "Settings Synchronized", 
        description: "Your workstation preferences have been updated." 
      });
    } catch (error: any) {
      toast({ 
        title: "Sync Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.next || passwords.next.length < 6) {
      toast({ 
        title: "Invalid Password", 
        description: "Password must be at least 6 characters.", 
        variant: "destructive" 
      });
      return;
    }

    if (!auth.currentUser) return;

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, passwords.next);
      toast({ 
        title: "Security Updated", 
        description: "Your login credentials have been synchronized." 
      });
      setPasswords({ current: '', next: '' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          title: "Session Expired", 
          description: "Please sign out and sign back in to change your password for security reasons.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Update Failed", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const toggleMFA = () => {
    const newState = !formData.mfaEnabled;
    setFormData(prev => ({ ...prev, mfaEnabled: newState }));
    
    if (profileRef) {
      setDocumentNonBlocking(profileRef, { mfaEnabled: newState }, { merge: true });
    }

    toast({
      title: newState ? "MFA Activated" : "MFA Deactivated",
      description: newState 
        ? "Multi-Factor Authentication has been enabled for your workstation." 
        : "Standard clearance restored. MFA is now inactive.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            My <span className="text-primary">Workstation</span>
          </h2>
          <p className="text-muted-foreground font-medium">Manage your administrative identity and interface settings.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" asChild>
            <Link href="/admin/activity">
              <History className="mr-2 h-3.5 w-3.5" /> Activity Log
            </Link>
          </Button>
          <Button 
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save Changes —
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card">
            <div className="h-32 bg-primary/10 relative">
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-2xl">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback className="text-2xl font-black bg-muted">
                      {(formData.name || user?.email || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-8 text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight">{formData.name || 'Staff Member'}</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">{formData.title || 'Administrative Staff'}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter py-0.5">
                  <ShieldCheck className="mr-1 h-3 w-3" /> {role?.role || 'Guest'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter py-0.5 border-emerald-500/20 text-emerald-600 bg-emerald-50/50">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                </Badge>
              </div>
              <Separator />
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground px-4">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {formData.phone && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground px-4">
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>{formData.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] bg-muted/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Session Intel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Last Login</span>
                <span className="font-mono">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Clearance</span>
                <span className="font-mono text-primary uppercase">{role?.role || 'Basic'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Society UID</span>
                <span className="font-mono opacity-50 truncate ml-4">{user?.uid.slice(0, 12)}...</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings Tabs */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md h-auto bg-muted/20 p-1 rounded-2xl mb-8">
              <TabsTrigger value="account" className="rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]">Account</TabsTrigger>
              <TabsTrigger value="interface" className="rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]">Interface</TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]">Security</TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Personal Identity
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">Your primary administrative profile information.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Display Name</Label>
                      <Input 
                        value={formData.name}
                        onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Professional Title</Label>
                      <Input 
                        placeholder="e.g. Master Printer" 
                        value={formData.title}
                        onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Contact Phone</Label>
                      <Input 
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Email Address (Registry Locked)</Label>
                      <Input 
                        value={user?.email || ''}
                        disabled
                        className="h-12 rounded-xl bg-muted/50 border-2 border-dashed"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Regional Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Interface Language</Label>
                      <Select value={formData.language} onValueChange={v => setFormData(prev => ({...prev, language: v}))}>
                        <SelectTrigger className="h-12 rounded-xl border-2">
                          <div className="flex items-center gap-2">
                            <Languages className="h-4 w-4 opacity-40" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="English (US)">English (US)</SelectItem>
                          <SelectItem value="Spanish">Español</SelectItem>
                          <SelectItem value="French">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Reporting Timezone</Label>
                      <Select value={formData.timezone} onValueChange={v => setFormData(prev => ({...prev, timezone: v}))}>
                        <SelectTrigger className="h-12 rounded-xl border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="PST (UTC-8)">PST (UTC-8)</SelectItem>
                          <SelectItem value="EST (UTC-5)">EST (UTC-5)</SelectItem>
                          <SelectItem value="GMT (UTC+0)">GMT (UTC+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interface Settings */}
            <TabsContent value="interface" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" /> Workstation Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                  
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">UI Theme Mode</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {['light', 'dark', 'system'].map((t) => (
                        <div 
                          key={t}
                          onClick={() => {
                            setTheme(t);
                            setFormData(prev => ({...prev, theme: t}));
                          }}
                          className={cn(
                            "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-3",
                            theme === t ? "border-primary bg-primary/5 ring-1 ring-primary shadow-lg" : "border-muted hover:border-primary/30"
                          )}
                        >
                          <div className={cn("h-8 w-12 rounded-md border", t === 'dark' ? "bg-zinc-900" : "bg-zinc-100 shadow-inner")} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Layout Density</Label>
                    <div className="flex gap-4">
                      {['standard', 'compact'].map((d) => (
                        <div 
                          key={d}
                          onClick={() => setFormData(prev => ({...prev, density: d}))}
                          className={cn(
                            "flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all text-center font-black uppercase tracking-widest text-[10px]",
                            formData.density === d ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md" : "border-muted hover:border-primary/30"
                          )}
                        >
                          {d} View
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Alert Subscriptions</Label>
                    <div className="space-y-4">
                      {[
                        { id: 'newOrders', label: 'Order Intake Alerts', icon: <Save className="h-4 w-4" /> },
                        { id: 'supportTickets', label: 'Ticket Status Changes', icon: <Bell className="h-4 w-4" /> },
                        { id: 'systemAlerts', label: 'System Performance', icon: <Settings2 className="h-4 w-4" /> }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-muted/5 border-2 rounded-2xl transition-all hover:border-primary/10">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center border-2">
                              {item.icon}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-tight">{item.label}</span>
                          </div>
                          <Switch 
                            checked={!!(formData.notifications as any)[item.id]} 
                            onCheckedChange={v => setFormData(prev => ({
                              ...prev, 
                              notifications: { ...prev.notifications, [item.id]: v }
                            }))} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" /> Credentials & Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid gap-6 max-w-md">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Current Password</Label>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="h-12 rounded-xl border-2"
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">New Password</Label>
                      <Input 
                        type="password" 
                        placeholder="Min 8 characters" 
                        className="h-12 rounded-xl border-2"
                        value={passwords.next}
                        onChange={e => setPasswords({...passwords, next: e.target.value})}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-fit h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] border-2"
                      onClick={handleUpdatePassword}
                      disabled={isUpdatingPassword}
                    >
                      {isUpdatingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                      Update Credentials —
                    </Button>
                  </div>

                  <Separator />

                  <div className="p-8 bg-primary/5 rounded-[2rem] border-2 border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Multi-Factor Auth (MFA)
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase leading-relaxed">
                        {formData.mfaEnabled ? 'MFA is currently active on this workstation registry.' : 'Additional security tier required for high-clearance actions.'}
                      </p>
                    </div>
                    <Button 
                      className={cn(
                        "rounded-xl px-8 font-black uppercase tracking-widest text-[10px] h-12 shadow-lg",
                        formData.mfaEnabled ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-primary hover:bg-primary/90 text-white"
                      )}
                      onClick={toggleMFA}
                    >
                      {formData.mfaEnabled ? 'Deactivate MFA —' : 'Enable MFA —'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
