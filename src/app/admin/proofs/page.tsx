'use client';

import React, { useState, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ClientProof, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Plus, Link as LinkIcon, Trash2, Eye, Mail, CheckCircle2, XCircle, Clock, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AdminProofsPage() {
  const db = useFirestore();
  const [isNewProofOpen, setIsNewProofOpen] = useState(false);
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

  const proofsQuery = useMemoFirebase(() => query(collection(db, 'client_proofs'), orderBy('createdAt', 'desc')), [db]);
  const { data: proofs, isLoading } = useCollection<ClientProof>(proofsQuery);

  const customersQuery = useMemoFirebase(() => query(collection(db, 'users')), [db]);
  const { data: customers } = useCollection<UserProfile>(customersQuery);

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
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/proof/${docRef.id}`;
      await updateDoc(doc(db, 'client_proofs', docRef.id), { shareableLink });

      toast({ title: 'Success', description: 'Proof created successfully.' });
      setIsNewProofOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerEmail('');
    setCustomerName('');
    setProjectName('');
    setFileUrl('');
    setFileName('');
    setNotes('');
    setFile(null);
    setUploadProgress(0);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this proof?')) {
      try {
        await deleteDoc(doc(db, 'client_proofs', id));
        toast({ title: 'Deleted', description: 'Proof deleted successfully.' });
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied', description: 'Link copied to clipboard.' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Proofs</h1>
          <p className="text-muted-foreground">Manage and send proofs to clients for approval.</p>
        </div>
        <Dialog open={isNewProofOpen} onOpenChange={setIsNewProofOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Proof</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send New Proof</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProof} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Customer (Optional)</Label>
                <Select onValueChange={(val) => {
                  const customer = customers?.find(c => c.id === val);
                  if (customer) {
                    setCustomerEmail(customer.email);
                    setCustomerName(customer.name || '');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Email *</Label>
                  <Input 
                    type="email" 
                    required 
                    value={customerEmail} 
                    onChange={e => setCustomerEmail(e.target.value)} 
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input 
                  required 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  placeholder="e.g. Summer Festival Tees"
                />
              </div>

              <div className="space-y-4">
                <Label>Proof File *</Label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer",
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
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to upload proof file</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, PNG, or JPG</p>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or provide a URL</span>
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
                />
              </div>

              <div className="space-y-2">
                <Label>Notes to Client</Label>
                <Textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Please review the placement and colors..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2 pt-4">
                {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">Uploading: {Math.round(uploadProgress)}%</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create & Generate Link'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading proofs...</TableCell>
              </TableRow>
            ) : proofs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No proofs found.</TableCell>
              </TableRow>
            ) : (
              proofs?.map((proof) => (
                <TableRow key={proof.id}>
                  <TableCell>
                    <div className="font-medium">{proof.projectName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <FileText className="w-3 h-3" /> {proof.fileName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{proof.customerName || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{proof.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(proof.status)}
                    {proof.status === 'rejected' && proof.rejectionReason && (
                      <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={proof.rejectionReason}>
                        Note: {proof.rejectionReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(proof.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="View Public Page" onClick={() => window.open(`/proof/${proof.id}`, '_blank')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Copy Link" onClick={() => copyLink(proof.shareableLink || `${window.location.origin}/proof/${proof.id}`)}>
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Email Link" onClick={() => window.location.href = `mailto:${proof.customerEmail}?subject=Proof for ${proof.projectName}&body=Hi ${proof.customerName || ''},%0D%0A%0D%0APlease review your proof here: ${proof.shareableLink || `${window.location.origin}/proof/${proof.id}`}`}>
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(proof.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
