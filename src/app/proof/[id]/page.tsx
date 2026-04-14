'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ClientProof } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function PublicProofPage() {
  const params = useParams();
  const proofId = params.id as string;
  const db = useFirestore();

  const [proof, setProof] = useState<ClientProof | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProof = async () => {
      if (!proofId) return;
      try {
        const docRef = doc(db, 'client_proofs', proofId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProof({ id: docSnap.id, ...docSnap.data() } as ClientProof);
        } else {
          setError('Proof not found. The link may be invalid or expired.');
        }
      } catch (err: any) {
        console.error("Error fetching proof:", err);
        setError('Failed to load proof. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProof();
  }, [db, proofId]);

  const handleApprove = async () => {
    if (!proof) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'client_proofs', proof.id), {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
      setProof({ ...proof, status: 'approved' });
      toast({ title: 'Proof Approved', description: 'Thank you! Your approval has been recorded.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!proof) return;
    if (!rejectionNotes.trim()) {
      toast({ title: 'Notes Required', description: 'Please provide notes explaining why the proof is rejected.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'client_proofs', proof.id), {
        status: 'rejected',
        rejectionReason: rejectionNotes,
        updatedAt: new Date().toISOString()
      });
      setProof({ ...proof, status: 'rejected', rejectionReason: rejectionNotes });
      toast({ title: 'Proof Rejected', description: 'Your feedback has been sent to our team.' });
      setIsRejecting(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Proof Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Artwork Proof Review</h1>
          <p className="text-muted-foreground">Please review your artwork for {proof.projectName}</p>
        </div>

        <Card className="overflow-hidden border-2 shadow-xl">
          <div className="bg-muted p-4 flex justify-between items-center border-b">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Status:</span>
              {proof.status === 'pending' && <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 text-sm py-1 px-3"><Clock className="w-4 h-4 mr-2" /> Pending Review</Badge>}
              {proof.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 text-sm py-1 px-3"><CheckCircle2 className="w-4 h-4 mr-2" /> Approved</Badge>}
              {proof.status === 'rejected' && <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 text-sm py-1 px-3"><XCircle className="w-4 h-4 mr-2" /> Changes Requested</Badge>}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-2" /> Download Original
              </a>
            </Button>
          </div>
          
          <CardContent className="p-0">
            <div className="relative w-full aspect-video bg-black/5 flex items-center justify-center overflow-hidden">
              <Image 
                src={proof.fileUrl} 
                alt={`Proof for ${proof.projectName}`}
                fill
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project Details</h3>
                  <p className="font-medium text-lg">{proof.projectName}</p>
                  <p className="text-muted-foreground">{proof.fileName}</p>
                </div>
                
                {proof.notes && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes from our team</h3>
                    <div className="bg-primary/5 p-4 rounded-xl text-sm leading-relaxed border border-primary/10">
                      {proof.notes}
                    </div>
                  </div>
                )}
              </div>

              {proof.status === 'rejected' && proof.rejectionReason && (
                <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-xl mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Requested Changes
                  </h3>
                  <p className="text-sm">{proof.rejectionReason}</p>
                </div>
              )}
            </div>
          </CardContent>

          {proof.status === 'pending' && (
            <CardFooter className="bg-muted/30 p-8 flex flex-col sm:flex-row gap-4 justify-end border-t">
              {!isRejecting ? (
                <>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => setIsRejecting(true)}
                  >
                    <XCircle className="w-5 h-5 mr-2" /> Request Changes
                  </Button>
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                    Approve Artwork
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Please describe the changes needed:</label>
                    <Textarea 
                      placeholder="E.g., Make the logo larger, change the background color to blue..."
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      className="min-h-[100px]"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={() => setIsRejecting(false)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Submit Changes Request
                    </Button>
                  </div>
                </div>
              )}
            </CardFooter>
          )}
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </div>
  );
}
