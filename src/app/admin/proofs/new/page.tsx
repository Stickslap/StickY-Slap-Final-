'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ClientProof, UserProfile, EmailTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, ArrowLeft, Upload, X, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { dispatchSocietyEmail } from '@/app/actions/email';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

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
    console.log('Starting proof creation process...');
    
    try {
      let finalFileUrl = fileUrl;
      let finalFileName = fileName || 'proof_file';

      if (file) {
        console.log('Uploading file to Cloudinary:', file.name);
        
        finalFileUrl = await new Promise<string>((resolve, reject) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', 'proofs');

          const xhr = new XMLHttpRequest();
          // Use 'auto' to handle images and PDFs correctly
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, true);

          let timeoutId: any;
          const resetTimeout = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              xhr.abort();
              reject(new Error('Upload stalled: No progress detected for 60 seconds.'));
            }, 60000);
          };

          resetTimeout();

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              setUploadProgress(progress);
              console.log(`Upload progress: ${Math.round(progress)}%`);
              resetTimeout();
            }
          };

          xhr.onload = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              console.log('Cloudinary upload complete:', response.secure_url);
              resolve(response.secure_url);
            } else {
              console.error('Cloudinary upload failed:', xhr.responseText);
              reject(new Error('Failed to upload file to Cloudinary.'));
            }
          };

          xhr.onerror = () => {
            if (timeoutId) clearTimeout(timeoutId);
            reject(new Error('Network error during upload.'));
          };

          xhr.send(formData);
        });

        finalFileName = file.name;
      }

      console.log('Saving proof to Firestore...');
      const newProof = {
        customerEmail,
        customerName,
        projectName,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        status: 'pending',
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'client_proofs'), newProof);
      console.log('Proof document created with ID:', docRef.id);
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/proof/${docRef.id}`;
      await updateDoc(doc(db, 'client_proofs', docRef.id), { shareableLink });
      console.log('Shareable link updated:', shareableLink);

      toast({ title: 'Proof Created', description: 'Registry entry synchronized. Dispatching notification...' });
      
      // Redirect immediately to avoid "stuck" feeling
      router.push('/admin/proofs');

      // Send Email Notification in the background (don't await it before redirecting)
      // We still trigger it, but the UI has already moved on
      dispatchSocietyEmail(
        {
          id: 'proof_notification',
          name: 'Proof Ready Notification',
          trigger: 'order_status_changed',
          subject: `Proof Ready for Approval: ${projectName}`,
          previewText: 'Your proof is ready for review.',
          senderName: 'Sticky Slap',
          replyTo: 'lab@stickyslap.com',
          enabled: true,
          header: { logoUrl: 'https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png' },
          blocks: [
            { id: '1', type: 'text', content: `Hi ${customerName || 'there'},\n\nYour proof for project "${projectName}" is ready for approval. Please review it and let us know if you have any feedback.` },
            { id: '2', type: 'artwork_preview', url: finalFileUrl },
            { id: '3', type: 'button', label: 'Review Proof', link: shareableLink }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        customerEmail,
        {
          customer_name: customerName || 'Valued Customer',
          project_name: projectName,
          proof_url: finalFileUrl,
          review_link: shareableLink
        }
      ).then(result => {
        if (result.success) {
          console.log('Background email dispatch successful:', result.id);
        } else {
          console.error('Background email dispatch failed:', result.error);
        }
      }).catch(err => {
        console.error('Background email dispatch fatal error:', err);
      });

    } catch (error: any) {
      console.error('Proof creation failed:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsSubmitting(false); // Ensure it's reset on error
    } finally {
      // We don't set isSubmitting(false) here if we're redirecting, 
      // but if the redirect fails or we stay on page, we should.
      // Actually, it's safer to set it if we're still on the page.
      setTimeout(() => setIsSubmitting(false), 5000); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/proofs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Proof</h1>
          <p className="text-muted-foreground">Create and send a new proof to a client.</p>
        </div>
      </div>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b p-8">
          <CardTitle className="text-xl font-black uppercase italic tracking-tight">Proof Configuration</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest">Define the project and recipient details.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleCreateProof} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Select Customer (Optional)</Label>
                  <Select onValueChange={(val) => {
                    const customer = customers?.find(c => c.id === val);
                    if (customer) {
                      setCustomerEmail(customer.email);
                      setCustomerName(customer.name || '');
                    }
                  }}>
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Select existing customer..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-2">
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id} className="rounded-xl py-3">{c.name || c.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer Email *</Label>
                    <Input 
                      type="email" 
                      required 
                      value={customerEmail} 
                      onChange={e => setCustomerEmail(e.target.value)} 
                      placeholder="client@example.com"
                      className="h-12 rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer Name</Label>
                    <Input 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      placeholder="John Doe"
                      className="h-12 rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Project Name *</Label>
                  <Input 
                    required 
                    value={projectName} 
                    onChange={e => setProjectName(e.target.value)} 
                    placeholder="e.g. Summer Festival Tees"
                    className="h-12 rounded-xl border-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Notes to Client</Label>
                  <Textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Please review the placement and colors..."
                    rows={5}
                    className="rounded-xl border-2 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Proof File *</Label>
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[300px]",
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
                    <Upload className="h-12 w-12 text-primary mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Click to upload proof file</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">PDF, PNG, or JPG (Max 50MB)</p>
                  </div>

                  {file && (
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm font-bold truncate">{file.name}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]">
                      <span className="bg-card px-4 text-muted-foreground">Or provide a URL</span>
                    </div>
                  </div>

                  <Input 
                    value={fileUrl} 
                    onChange={e => {
                      setFileUrl(e.target.value);
                      if (!fileName) setFileName(e.target.value.split('/').pop() || 'proof');
                      if (e.target.value) setFile(null); // Clear file if URL is provided
                    }} 
                    placeholder="https://..."
                    className="h-12 rounded-xl border-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-8 border-t-2">
              {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Uploading Assets</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-3 rounded-full" />
                </div>
              )}
              <div className="flex justify-end gap-4">
                <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest" onClick={() => router.push('/admin/proofs')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest bg-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Upload className="mr-2 h-5 w-5 animate-bounce" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Create & Send Proof —
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
