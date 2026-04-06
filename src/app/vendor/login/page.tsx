'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  Loader2, 
  ShieldAlert, 
  ArrowRight,
  UserCheck,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function VendorLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/vendor');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isSignUp && !businessName) {
      toast({ title: "Business Name Required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: businessName });
        
        // Initialize vendor profile
        setDocumentNonBlocking(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          email,
          name: businessName,
          role: 'Vendor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Set role authorization
        setDocumentNonBlocking(doc(db, 'roles', userCredential.user.uid), {
          id: userCredential.user.uid,
          role: 'Vendor'
        }, { merge: true });

        toast({ title: "Registration Successful", description: "Your vendor profile has been initialized." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Verification Successful", description: "Accessing Vendor Registry..." });
      }
      router.push('/vendor');
    } catch (e: any) {
      toast({ 
        title: isSignUp ? "Signup Failed" : "Access Denied", 
        description: e.message || "Invalid credentials or unauthorized account.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-muted/5 p-6 font-body relative overflow-hidden">
      {/* Dynamic Background Accent */}
      <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
        <Lock className="h-[500px] w-[500px] rotate-12" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image src={LOGO_URL} alt="Print Society" width={220} height={55} className="h-12 w-auto object-contain" unoptimized priority />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
              {isSignUp ? 'Partner Onboarding' : 'Vendor Clearance'}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {isSignUp ? 'Join the Society Supply Network' : 'Authorized Suppliers Only'}
            </p>
          </div>
        </div>

        <Card className="border-2 rounded-[2.5rem] shadow-2xl bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b p-8 text-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4" /> {isSignUp ? 'Create Profile' : 'Secure Access'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {isSignUp && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="e.g. Master Supply Co." 
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        className="h-12 rounded-xl bg-muted/5 border-2 font-bold pl-12"
                        required
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Vendor Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="registry@supplier.com" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 pl-12 rounded-xl bg-muted/5 border-2 font-bold"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Security Key</Label>
                    {!isSignUp && <Link href="#" className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Forgot Key?</Link>}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 pl-12 rounded-xl bg-muted/5 border-2 font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-xl transition-all active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isSignUp ? 'Register Account —' : 'Access Registry —'}</>}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? 'Already registered? Access Registry' : 'New supplier? Join the Network'}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Encrypted Session Protocol v2.4 Active</p>
        </div>
      </div>
    </div>
  );
}