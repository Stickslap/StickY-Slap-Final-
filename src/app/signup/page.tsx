
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronRight, ChevronLeft, MapPin, User, Building2, ShieldCheck } from 'lucide-react';
import Header from '@/components/header';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

const formSchema = z.object({
  email: z.string().email({ message: 'Valid email required.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  firstName: z.string().min(1, { message: 'First name required.' }),
  lastName: z.string().min(1, { message: 'Last name required.' }),
  address: z.string().min(5, { message: 'Shipping address required.' }),
  city: z.string().min(2, { message: 'City required.' }),
  state: z.string().min(2, { message: 'State required.' }),
  zip: z.string().min(5, { message: 'Zip code required.' }),
  isPrintShop: z.boolean().default(false),
  shopName: z.string().optional(),
  shopSpecialty: z.string().optional(),
  monthlyVolume: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  const videoUrl = (isMounted && appearance?.signupVideoUrl) ? appearance.signupVideoUrl : "https://www.youtube.com/watch?v=MJ9JaM7tI3w";
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : LOGO_URL;

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = getYoutubeId(videoUrl);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      isPrintShop: false,
      shopName: '',
      shopSpecialty: '',
      monthlyVolume: '0-500',
    },
  });

  const isPrintShop = form.watch('isPrintShop');

  useEffect(() => {
    if (isMounted && !isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, isMounted]);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background" suppressHydrationWarning>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;
      const fullName = `${values.firstName} ${values.lastName}`;

      await updateProfile(newUser, { displayName: fullName });

      const userProfile = {
        id: newUser.uid,
        email: values.email,
        name: fullName,
        firstName: values.firstName,
        lastName: values.lastName,
        shippingAddress: {
          street: values.address,
          city: values.city,
          state: values.state,
          zip: values.zip,
        },
        isPrintShop: values.isPrintShop,
        printShopDetails: values.isPrintShop ? {
          businessName: values.shopName,
          specialty: values.shopSpecialty,
          monthlyVolume: values.monthlyVolume,
        } : null,
        role: 'Customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDocumentNonBlocking(doc(db, 'users', newUser.uid), userProfile, { merge: true });
      toast({ title: "Welcome to the Society" });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message });
    }
  }

  const nextStep = async () => {
    const fields = step === 1 ? ['firstName', 'lastName', 'email', 'password'] : ['address', 'city', 'state', 'zip'];
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(prev => prev + 1);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-body" suppressHydrationWarning>
      <div className="absolute inset-0 z-0 bg-black">
        {ytId ? (
          <div className="absolute inset-0 pointer-events-none">
            <iframe className="absolute top-1/2 left-1/2 w-[177.77777778vh] h-[56.25vw] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 border-none" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&showinfo=0&rel=0&enablejsapi=1`} allow="autoplay; encrypted-media" />
          </div>
        ) : (
          <video key={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"><source src={videoUrl} type="video/mp4" /></video>
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      </div>
      <Header />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 py-12">
        <Link href="/" className="mb-8"><Image src={logoUrl} alt="Logo" width={280} height={70} className="h-10 w-auto object-contain" unoptimized /></Link>
        <Card className="w-full max-w-2xl shadow-2xl border border-white/10 bg-black/40 backdrop-blur-2xl text-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pt-10 text-center">
            <CardTitle className="text-3xl font-headline font-black uppercase italic tracking-tighter text-white">Join the <span className="text-primary">Society</span></CardTitle>
            <CardDescription className="text-white/50 font-medium text-sm">Step {step} of {isPrintShop ? '3' : '2'}</CardDescription>
          </CardHeader>
          <CardContent className="pb-10 px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Alex" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold text-rose-400" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Printsmith" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold text-rose-400" />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold text-rose-400" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold text-rose-400" />
                      </FormItem>
                    )} />
                    <Button type="button" onClick={nextStep} className="w-full h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-xl">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Shipping Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street Address" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold text-rose-400" />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                          </FormControl>
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">State</FormLabel>
                            <FormControl>
                              <Input placeholder="CA" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="zip" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Zip</FormLabel>
                            <FormControl>
                              <Input placeholder="90210" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <FormField control={form.control} name="isPrintShop" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 p-4 rounded-xl border border-white/10 bg-white/5">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          <FormLabel className="text-sm font-bold text-white">I operate a print shop</FormLabel>
                        </div>
                      </FormItem>
                    )} />
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-14 border-white/20 text-white rounded-xl font-black uppercase text-[10px]">Back</Button>
                      {isPrintShop ? (
                        <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-primary text-white rounded-xl">Next</Button>
                      ) : (
                        <Button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-xl">Signup</Button>
                      )}
                    </div>
                  </div>
                )}
                {step === 3 && isPrintShop && (
                  <div className="space-y-4">
                    <FormField control={form.control} name="shopName" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">Shop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Master Stickers LLC" {...field} className="bg-white/5 border-white/10 text-white h-12 rounded-xl" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-14 bg-primary text-white rounded-xl">Complete Registration —</Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
