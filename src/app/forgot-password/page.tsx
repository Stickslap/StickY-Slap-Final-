'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [isSent, setIsSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSent(true);
      toast({
        title: "Email Sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email.",
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl">
        <CardHeader className="text-center pt-10">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive reset instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="text-center space-y-4">
              <p>Password reset email sent. Please check your inbox.</p>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
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
                <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send Reset Email'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
