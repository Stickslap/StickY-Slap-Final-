'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, orderBy, query } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ClientProof, UserProfile, EmailTemplate } from '@/lib/types';
import { dispatchSocietyEmail } from '@/app/actions/email';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, X, Loader2, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function NewProofPage() {
  const db = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendEmail, setSendEmail] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customersQuery = useMemoFirebase(() => query(collection(db, 'users')), [db]);
  const { data: customers } = useCollection<UserProfile>(customersQuery);

  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileUrl(''); // Clear URL if file is selected
    }
  };

  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !projectName || (!fileUrl && !file)) {
      toast({ title: 'Error', description: 'Please fill all required fields and provide a file or URL.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let finalFileUrl = fileUrl;
      let finalFileName = fileName || 'proof_file';

      if (file) {
        const storage = getStorage();
        const storageRef = ref(storage, `proofs/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            () => resolve()
          );
        });

        finalFileUrl = await getDownloadURL(storageRef);
        finalFileName = file.name;
      }

      // Pre-generate ID to avoid double write
      const proofRef = doc(collection(db, 'client_proofs'));
      const shareableLink = `${window.location.origin}/proof/${proofRef.id}`;

      const newProof = {
        id: proofRef.id,
        customerEmail,
        customerName,
        projectName,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        status: 'pending',
        notes,
        shareableLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(proofRef, newProof);

      // Automated Email Dispatch
      if (sendEmail && templates) {
        const template = templates.find(t => t.trigger === 'proof_ready' && t.enabled);
        if (template) {
          try {
            await dispatchSocietyEmail(template, customerEmail, {
              customer_name: customerName || 'Valued Customer',
              project_name: projectName,
              proof_link: shareableLink,
              proof_url: finalFileUrl,
              file_name: finalFileName
            });
          } catch (emailErr) {
            console.error("Email dispatch failed:", emailErr);
            toast({ title: 'Warning', description: 'Proof created, but email notification failed to send.', variant: 'destructive' });
          }
        }
      }

      toast({ title: 'Success', description: sendEmail ? 'Proof created and email dispatched.' : 'Proof created successfully.' });
      router.push('/admin/proofs');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/admin/proofs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase italic">New Artwork Proof</h1>
          <p className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Generate and dispatch production proofs for client authorization.</p>
        </div>
      </div>

      <form onSubmit={handleCreateProof} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-black uppercase italic tracking-tight">Project Details</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Basic information for the proof registry.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Project Name *</Label>
                <Input 
                  required 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  placeholder="e.g. Summer Festival Tees"
                  className="h-12 rounded-xl border-2 focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Customer Email *</Label>
                  <Input 
                    type="email" 
                    required 
                    value={customerEmail} 
                    onChange={e => setCustomerEmail(e.target.value)} 
                    placeholder="client@example.com"
                    className="h-12 rounded-xl border-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Customer Name</Label>
                  <Input 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="John Doe"
                    className="h-12 rounded-xl border-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Notes to Client</Label>
                <Textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Please review the placement and colors carefully..."
                  rows={4}
                  className="rounded-xl border-2 focus-visible:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-black uppercase italic tracking-tight">Artwork Asset</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Upload the visual proof for review.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div 
                className={cn(
                  "border-4 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer group",
                  file ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                />
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest">Click to upload proof asset</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mt-2 tracking-tighter">PDF, PNG, or JPG (Max 50MB)</p>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border-2 border-primary/20">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-black uppercase tracking-tight truncate">{file.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                  <span className="bg-background px-4 text-muted-foreground">Or provide a URL</span>
                </div>
              </div>

              <Input 
                value={fileUrl} 
                onChange={e => {
                  setFileUrl(e.target.value);
                  if (!fileName) setFileName(e.target.value.split('/').pop() || 'proof');
                  if (e.target.value) setFile(null);
                }} 
                placeholder="https://external-storage.com/proof.jpg"
                className="h-12 rounded-xl border-2 focus-visible:ring-primary"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm sticky top-28">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-black uppercase italic tracking-tight">Dispatch Control</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest">Select Customer</Label>
                <Select onValueChange={(val) => {
                  const customer = customers?.find(c => c.id === val);
                  if (customer) {
                    setCustomerEmail(customer.email);
                    setCustomerName(customer.name || '');
                  }
                }}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Existing Registry..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 shadow-2xl">
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-bold text-xs uppercase tracking-tight">
                        {c.name || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border-2 border-primary/10">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Mail className="h-3 w-3" /> Automated Dispatch
                  </Label>
                  <p className="text-[8px] font-bold uppercase text-muted-foreground leading-tight">Send review link to client immediately via email.</p>
                </div>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>

              <div className="space-y-4 pt-4">
                {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span>Uploading Asset</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3 rounded-full" />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Syncing Registry...
                    </>
                  ) : (
                    <>
                      Create & Dispatch Proof —
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-muted-foreground"
                  onClick={() => router.push('/admin/proofs')}
                  disabled={isSubmitting}
                >
                  Discard Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl p-6 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" /> Production Note
            </h4>
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
              Once approved, this proof will be marked as "Ready for Production" in the order manifest.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
