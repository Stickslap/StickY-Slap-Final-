'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, Link as LinkIcon, Trash2, Eye, Mail, CheckCircle2, XCircle, Clock, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AdminProofsPage() {
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);
  
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
                    {getStatusBadge(proof.status)}
                    {proof.status === 'rejected' && proof.rejectionReason && (
                      <div className="text-[9px] text-rose-500 mt-1 max-w-[200px] truncate font-bold uppercase" title={proof.rejectionReason}>
                        Note: {proof.rejectionReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">
                    {new Date(proof.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
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
    </div>
  );
}
