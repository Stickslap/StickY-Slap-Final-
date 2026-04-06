'use client';

import React, { useState } from 'react';
import { 
  Share, 
  Search, 
  Trash, 
  MoreHorizontal, 
  Clock, 
  Calendar, 
  Link as LinkIcon, 
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ShareableLink } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminSharesPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const sharesQuery = useMemoFirebase(() => query(collection(db, 'shareable_links'), orderBy('createdAt', 'desc')), [db]);
  const { data: shares, isLoading } = useCollection<ShareableLink>(sharesQuery);

  const filteredShares = shares?.filter(s => 
    s.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.targetEntityType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this shareable link? Existing URLs will stop working.')) {
      deleteDocumentNonBlocking(doc(db, 'shareable_links', id));
      toast({ title: "Link Deleted", variant: "destructive" });
    }
  };

  const handleToggleActive = (share: ShareableLink) => {
    updateDocumentNonBlocking(doc(db, 'shareable_links', share.id), { isActive: !share.isActive });
    toast({ title: share.isActive ? "Link Deactivated" : "Link Reactivated" });
  };

  const isExpired = (expiry: string) => new Date(expiry) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight uppercase italic text-foreground">
            Shareable <span className="text-primary">Links</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage private URLs generated for cart sharing and proof reviews</p>
        </div>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by code, type or description..." 
              className="pl-10 h-12 rounded-xl bg-background border-2" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Syncing Link Registry...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Short Code</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Target Entity</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Expires</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Engagement</TableHead>
                  <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShares?.map((share) => {
                  const expired = isExpired(share.expiresAt);
                  return (
                    <TableRow key={share.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="px-8">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <LinkIcon className="h-4 w-4 text-primary" />
                          </div>
                          <code className="text-xs font-black uppercase">{share.shortCode}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight">{share.targetEntityType}</span>
                          <span className="text-[10px] text-muted-foreground font-medium line-clamp-1 italic">{share.description || 'No description'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="secondary" className="text-[9px] uppercase font-black bg-rose-100 text-rose-700 border-none px-2 h-5">
                            <XCircle className="h-2 w-2 mr-1" /> Expired
                          </Badge>
                        ) : share.isActive ? (
                          <Badge className="text-[9px] uppercase font-black bg-emerald-500 border-none px-2 h-5">
                            <CheckCircle2 className="h-2 w-2 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] uppercase font-black px-2 h-5">
                            Paused
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(share.expiresAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{share.accessCount || 0}</span>
                          <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Unique Clicks</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl p-2">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2">Management</DropdownMenuLabel>
                            <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => handleToggleActive(share)}>
                              {share.isActive ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                              {share.isActive ? "Pause Link" : "Activate Link"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => handleDelete(share.id)}>
                              <Trash className="h-4 w-4 mr-2" /> Delete Registry
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredShares?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                        <div className="h-16 w-16 rounded-full border-4 border-dashed flex items-center justify-center">
                          <Share className="h-8 w-8" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest italic">No active shareable links found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}