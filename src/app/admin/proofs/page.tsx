'use client';

import React, { useState, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ClientProof, UserProfile, EmailTemplate } from '@/lib/types';
import { dispatchSocietyEmail } from '@/app/actions/email';
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
import { Switch } from '@/components/ui/switch';
import { FileText, Plus, Link as LinkIcon, Trash2, Eye, Mail, CheckCircle2, XCircle, Clock, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AdminProofsPage() {
  const db = useFirestore();
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);
  
  const proofsQuery = useMemoFirebase(() => query(collection(db, 'client_proofs'), orderBy('createdAt', 'desc')), [db]);
  const { data: proofs, isLoading } = useCollection<ClientProof>(proofsQuery);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase italic">Client Proofs</h1>
          <p className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Manage and send production proofs to clients for authorization.</p>
        </div>
        <Button asChild className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 bg-primary">
          <Link href="/admin/proofs/new">
            <Plus className="w-4 h-4 mr-2" /> New Proof —
          </Link>
        </Button>
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
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setProofToDelete(proof.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this proof? This action cannot be undone.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setProofToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Proof</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
