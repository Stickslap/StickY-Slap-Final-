'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ClientProof, UserProfile, ProofRevision, OrderStatus } from '@/lib/types';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, Link as LinkIcon, Trash2, Eye, Mail, CheckCircle2, XCircle, Clock, Upload, X, Loader2, History, MessageCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { dispatchSocietyEmail } from '@/app/actions/email';

export default function AdminProofsPage() {
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);
  
  // Revision State
  const [proofToRevise, setProofToRevise] = useState<ClientProof | null>(null);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const revisionFileInputRef = useRef<HTMLInputElement>(null);

  // Internal Notes State
  const [proofForNotes, setProofForNotes] = useState<ClientProof | null>(null);
  const [tempInternalNotes, setTempInternalNotes] = useState('');

  // History State
  const [viewingHistory, setViewingHistory] = useState<ClientProof | null>(null);

  const CLOUDINARY_CLOUD_NAME = "dabgothkm";
  const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";
  
  const proofsQuery = useMemoFirebase(() => query(collection(db, 'client_proofs'), orderBy('createdAt', 'desc')), [db]);
  const { data: proofs, isLoading } = useCollection<ClientProof>(proofsQuery);

  const stats = useMemo(() => {
    if (!proofs) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return proofs.reduce((acc, p) => {
      acc.total++;
      if (p.status === 'pending') acc.pending++;
      else if (p.status === 'approved') acc.approved++;
      else if (p.status === 'rejected') acc.rejected++;
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0 });
  }, [proofs]);

  const handleDelete = async () => {
    if (!proofToDelete) return;
    try {
      await deleteDoc(doc(db, 'client_proofs', proofToDelete));
      toast({ title: 'Deleted', description: 'Proof deleted successfully.' });
      setProofToDelete(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (proofId: string, newStatus: string, orderId?: string) => {
    try {
      await updateDoc(doc(db, 'client_proofs', proofId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast({ title: 'Status Updated' });

      // If approved and linked to an order, offer to update order status
      if (newStatus === 'approved' && orderId) {
        toast({
          title: "Order sync detected",
          description: "Proof approved. Would you like to mark the order as Approved?",
          action: (
            <Button size="sm" onClick={() => updateOrderStatus(orderId, 'Approved')}>Update Order</Button>
          ),
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status, updatedAt: new Date().toISOString() });
      toast({ title: 'Order Updated', description: `Order ${orderId} is now ${status}.` });
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: "Ensure the order reference is a valid Registry ID.", variant: 'destructive' });
    }
  };

  const handleSendRevision = async () => {
    if (!proofToRevise || !revisionFile) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', revisionFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'proofs');

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      const newUrl = uploadData.secure_url;

      const revision: ProofRevision = {
        fileUrl: proofToRevise.fileUrl,
        fileName: proofToRevise.fileName,
        notes: proofToRevise.notes,
        rejectionReason: proofToRevise.rejectionReason,
        status: proofToRevise.status,
        createdAt: proofToRevise.updatedAt || proofToRevise.createdAt
      };

      await updateDoc(doc(db, 'client_proofs', proofToRevise.id), {
        fileUrl: newUrl,
        fileName: revisionFile.name,
        status: 'pending',
        notes: revisionNotes || proofToRevise.notes,
        rejectionReason: null, 
        history: arrayUnion(revision),
        updatedAt: new Date().toISOString()
      });

      toast({ title: 'Revision Sent', description: 'The client has been notified of the update.' });
      setProofToRevise(null);
      setRevisionFile(null);
      setRevisionNotes('');
    } catch (error: any) {
      toast({ title: 'Revision Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!proofForNotes) return;
    try {
      await updateDoc(doc(db, 'client_proofs', proofForNotes.id), {
        internalNotes: tempInternalNotes,
        updatedAt: new Date().toISOString()
      });
      toast({ title: 'Internal Notes Saved' });
      setProofForNotes(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Client <span className="text-primary">Proofs</span>
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage and send proofs to clients for approval.</p>
        </div>
        <Button asChild className="h-12 px-8 rounded-xl font-black uppercase tracking-widest bg-primary">
          <Link href="/admin/proofs/new">
            <Plus className="w-4 h-4 mr-2" /> New Proof —
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2 rounded-[2rem] bg-foreground text-background shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Total Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-primary">{stats.total}</div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Registry Lifetime</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-yellow-500">{stats.pending}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Awaiting Client Action</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">{stats.approved}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Ready for Production</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-[2rem] bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-rose-600">{stats.rejected}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Revisions Required</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[2.5rem] border-2 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="px-8 font-black uppercase tracking-widest text-[10px] py-6">Project</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Client</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Status Control</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Logged At</TableHead>
              <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Proof Registry...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : proofs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <FileText className="h-12 w-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No matching registry entries found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              proofs?.map((proof) => (
                <TableRow key={proof.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="px-8 py-6">
                    <div className="font-black uppercase italic tracking-tight">{proof.projectName}</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mt-1 opacity-60">
                      <FileText className="w-3 h-3" /> {proof.fileName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold uppercase tracking-tight italic">{proof.customerName || 'Unknown'}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{proof.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(proof.status)}
                      {proof.status === 'rejected' && proof.rejectionReason && (
                        <div className="text-[9px] text-rose-500 max-w-[200px] truncate font-bold uppercase italic" title={proof.rejectionReason}>
                          Client Feedback: {proof.rejectionReason}
                        </div>
                      )}
                      {proof.internalNotes && (
                        <div className="text-[9px] text-blue-500 max-w-[200px] truncate font-bold uppercase" title={proof.internalNotes}>
                          Staff Note: {proof.internalNotes}
                        </div>
                      )}
                      {proof.history && proof.history.length > 0 && (
                        <Button 
                          variant="ghost" 
                          className="h-5 p-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary w-fit"
                          onClick={() => setViewingHistory(proof)}
                        >
                          <History className="w-2.5 h-2.5 mr-1" /> View Timeline ({proof.history.length})
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">
                    {new Date(proof.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
                      {proof.status === 'rejected' && (
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-dashed border-rose-500/50 text-rose-600 hover:bg-rose-50 text-[9px] font-black uppercase tracking-widest" onClick={() => {
                          setProofToRevise(proof);
                          setRevisionNotes(`Revision based on feedback: ${proof.rejectionReason}`);
                        }}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Send Revision
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Internal Notes" onClick={() => {
                        setProofForNotes(proof);
                        setTempInternalNotes(proof.internalNotes || '');
                      }}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="View Public Page" onClick={() => window.open(`/proof/${proof.id}`, '_blank')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Copy Link" onClick={() => copyLink(proof.shareableLink || `${window.location.origin}/proof/${proof.id}`)}>
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Email Link" onClick={() => window.location.href = `mailto:${proof.customerEmail}?subject=Proof for ${proof.projectName}&body=Hi ${proof.customerName || ''},%0D%0A%0D%0APlease review your proof here: ${proof.shareableLink || `${window.location.origin}/proof/${proof.id}`}`}>
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setProofToDelete(proof.id)}>
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

      <Dialog open={!!proofToDelete} onOpenChange={(open) => !open && setProofToDelete(null)}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-sm font-medium text-muted-foreground uppercase tracking-widest leading-relaxed">
            Are you sure you want to delete this proof? This action cannot be undone and will void the shareable link.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" className="rounded-xl" onClick={() => setProofToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl px-8 font-bold uppercase tracking-widest" onClick={handleDelete}>Delete Proof —</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={!!proofToRevise} onOpenChange={(open) => !open && setProofToRevise(null)}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Deploy Revision</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-rose-600 mb-1 leading-none">Rejected Feedback</p>
              <p className="text-sm font-medium italic opacity-80">"{proofToRevise?.rejectionReason}"</p>
            </div>
            
            <input type="file" ref={revisionFileInputRef} className="hidden" onChange={e => setRevisionFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
            <div onClick={() => revisionFileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all", revisionFile ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
              {isSubmitting ? (
                <div className="w-full space-y-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Uploading Revision...</p>
                </div>
              ) : (
                <>
                  {revisionFile ? <CheckCircle2 className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                  <p className="text-sm font-bold uppercase tracking-tighter">{revisionFile ? revisionFile.name : "Select Updated Design"}</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Notes to Client (Revision Context)</Label>
              <Textarea 
                value={revisionNotes} 
                onChange={e => setRevisionNotes(e.target.value)} 
                placeholder="Briefly explain the changes made..."
                className="rounded-xl border-2 italic text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" onClick={handleSendRevision} disabled={!revisionFile || isSubmitting}>
              {isSubmitting ? "Processing..." : "Publish Revision —"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Notes Dialog */}
      <Dialog open={!!proofForNotes} onOpenChange={(open) => !open && setProofForNotes(null)}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Internal Registry Note</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-xs font-medium text-muted-foreground">These notes are for staff eyes only and will not be visible to the client.</p>
            <Textarea 
              value={tempInternalNotes} 
              onChange={e => setTempInternalNotes(e.target.value)}
              placeholder="Enter internal production notes or reminders..."
              className="min-h-[150px] rounded-2xl border-2 p-5"
            />
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary" onClick={handleSaveInternalNotes}>
              Save Internal Entry —
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History/Timeline Dialog */}
      <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Revision History</DialogTitle>
          </DialogHeader>
          <div className="py-6 overflow-y-auto max-h-[60vh] space-y-6 pr-4">
            {/* Current/Latest */}
            <div className="relative pl-8 border-l-2 border-primary pb-6">
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Current Version (Live)</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{new Date(viewingHistory?.updatedAt || viewingHistory?.createdAt || '').toLocaleString()}</span>
                </div>
                <div className="p-4 bg-muted/30 border-2 rounded-2xl flex gap-4 items-center">
                  <div className="h-12 w-12 rounded-xl bg-background border flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold truncate">{viewingHistory?.fileName}</p>
                    <p className="text-[10px] font-medium text-muted-foreground italic truncate">Notes: {viewingHistory?.notes || 'No notes'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* History Items */}
            {viewingHistory?.history?.slice().reverse().map((rev, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-muted pb-6">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-muted border-4 border-background" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version Audit</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{new Date(rev.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-card border-2 rounded-2xl flex gap-4 items-center opacity-60">
                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold truncate">{rev.fileName}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <Badge className="text-[7px] font-black uppercase h-4 px-1.5">{rev.status}</Badge>
                        {rev.rejectionReason && <p className="text-[8px] font-bold text-rose-500 italic truncate">Reason: {rev.rejectionReason}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => window.open(rev.fileUrl, '_blank')}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setViewingHistory(null)}>
              Dismiss Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
