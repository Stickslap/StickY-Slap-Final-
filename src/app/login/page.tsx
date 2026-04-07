
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { useToast } from '@/hooks/use-toast';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png";

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  const videoUrl = (isMounted && appearance?.loginVideoUrl) ? appearance.loginVideoUrl : "https://youtu.be/MJ9JaM7tI3w";
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : LOGO_URL;

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = getYoutubeId(videoUrl);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    async function checkRoleAndRedirect() {
      if (isMounted && !isUserLoading && user && !isRedirecting) {
        setIsRedirecting(true);
        try {
          const roleDoc = await getDoc(doc(db, 'roles', user.uid));
          if (roleDoc.exists() && roleDoc.data().role) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        } catch (e) {
          router.push('/dashboard');
        }
      }
    }
    checkRoleAndRedirect();
  }, [user, isUserLoading, db, router, isRedirecting, isMounted]);

  if (!isMounted || isUserLoading || user || isRedirecting) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    signInWithEmailAndPassword(auth, values.email, values.password)
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid email or password.",
        });
      });
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-body">
      <div className="absolute inset-0 z-0 bg-black">
        {ytId ? (
          <div className="absolute inset-0 pointer-events-none">
            <iframe
              className="absolute top-1/2 left-1/2 w-[300%] h-[300%] md:w-[177.77vh] md:h-[56.25vw] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 border-none"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&showinfo=0&rel=0&enablejsapi=1`}
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <video
            key={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      <Header />
      
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 sm:p-6 space-y-8">
        <Link href="/" className="transition-all duration-500 hover:scale-105 active:scale-95">
          <Image 
            src={logoUrl} 
            alt="Sticky Slap" 
            width={280} 
            height={70} 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-2xl"
            unoptimized
          />
        </Link>
        
        <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border border-white/10 bg-black/20 backdrop-blur-2xl text-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pt-8 sm:pt-10 text-center">
            <CardTitle className="text-2xl sm:text-3xl font-headline font-black uppercase italic tracking-tighter text-white">
              Welcome <span className="text-primary">Back</span>
            </CardTitle>
            <CardDescription className="text-white/50 font-medium text-xs sm:text-sm">
              Access your custom print projects dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 sm:pb-10 px-6 sm:px-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email Address" 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 h-12 rounded-xl" 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••"
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 h-12 rounded-xl" 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-400" />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl rounded-xl transition-all" 
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    'Enter Portal —'
                  )}
                </Button>
                <div className="text-center">
                  <Link href="/forgot-password" className="text-[10px] font-bold text-white/40 hover:text-primary transition-colors underline underline-offset-4">
                    Forgot Password?
                  </Link>
                </div>
              </form>
            </Form>
            <div className="mt-8 text-center text-[10px] font-medium text-white/40 uppercase tracking-widest">
              New to the society?{' '}
              <Link href="/signup" className="text-primary hover:text-white transition-colors underline underline-offset-4 font-black">
                Join Now
              </Link>
              <br />
              Imported customer?{' '}
              <Link href="/claim" className="text-primary hover:text-white transition-colors underline underline-offset-4 font-black">
                Claim Account
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em] pointer-events-none text-center px-4">
          HIGH PRECISION FULFILLMENT — Sticky Slap
        </p>
      </div>
    </div>
  );
}
