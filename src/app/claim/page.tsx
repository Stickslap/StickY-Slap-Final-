'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function ClaimAccountPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // 1. Check if email exists in users collection
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('email', '==', values.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Account Not Found",
          description: "No account found with this email. Please contact support.",
        });
        return;
      }

      const userDoc = querySnapshot.docs[0];

      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      // 3. Update user document with new UID
      await updateDoc(doc(db, 'users', userDoc.id), {
        uid: userCredential.user.uid,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Account Claimed",
        description: "Your account has been successfully claimed. You can now log in.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to claim account.",
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl">
        <CardHeader className="text-center pt-10">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Claim Account</CardTitle>
          <CardDescription>Enter your details to claim your imported account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email Address" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Claim Account —'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
