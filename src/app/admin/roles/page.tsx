'use client';

import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  Trash, 
  Save, 
  User, 
  ShieldAlert,
  Edit,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  addDocumentNonBlocking, 
  useUser,
  useFirestore
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Role, UserRole, UserProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: UserRole[] = [
  "Owner",
  "Admin",
  "Ops Manager",
  "Production",
  "Support",
  "Content",
  "Read-only"
];

export default function RolesPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog State
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ uid: '', role: 'Production' as UserRole });
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Staff Registry
  const rolesQuery = useMemoFirebase(() => collection(db, 'roles'), [db]);
  const { data: staff, isLoading } = useCollection<Role>(rolesQuery);

  // Fetch User Profiles for name resolution
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: usersData } = useCollection<UserProfile>(usersQuery);

  // Map UIDs to Names
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    usersData?.forEach(u => {
      map[u.id] = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
    });
    return map;
  }, [usersData]);

  const filteredStaff = staff?.filter(s => {
    const name = userMap[s.id] || '';
    return s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
           name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleUpdateRole = () => {
    if (!editingRole) return;
    setIsProcessing(true);

    const now = new Date().toISOString();
    const roleRef = doc(db, 'roles', editingRole.id);
    
    updateDocumentNonBlocking(roleRef, { 
      role: editingRole.role 
    });

    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: authUser?.uid || 'system',
      action: 'Staff Role Modified',
      entityType: 'UserRole',
      entityId: editingRole.id,
      details: `Changed role for ${userMap[editingRole.id] || editingRole.id} to ${editingRole.role}`,
      timestamp: now
    });

    toast({ 
      title: "Clearance Updated", 
      description: "Permissions have been synchronized with the registry." 
    });
    
    setTimeout(() => {
      setIsProcessing(false);
      setEditingRole(null);
    }, 400);
  };

  const handleAddStaff = () => {
    if (!newStaff.uid.trim()) {
      toast({ title: "UID Required", variant: "destructive" });
      return;
    }
    setIsProcessing(true);

    const now = new Date().toISOString();
    const roleRef = doc(db, 'roles', newStaff.uid.trim());
    
    setDocumentNonBlocking(roleRef, {
      id: newStaff.uid.trim(),
      role: newStaff.role
    }, { merge: true });

    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: authUser?.uid || 'system',
      action: 'Staff Member Ingested',
      entityType: 'UserRole',
      entityId: newStaff.uid.trim(),
      details: `Added new staff member (${userMap[newStaff.uid.trim()] || newStaff.uid.trim()}) with role: ${newStaff.role}`,
      timestamp: now
    });

    toast({ 
      title: "Staff Added", 
      description: "Administrative access has been authorized." 
    });
    
    setTimeout(() => {
      setIsProcessing(false);
      setIsAddOpen(false);
      setNewStaff({ uid: '', role: 'Production' });
    }, 400);
  };

  const handleRevokeAccess = (id: string) => {
    const name = userMap[id] || id;
    if (confirm(`Permanently revoke administrative access for ${name}? They will be restricted to standard customer clearance.`)) {
      const now = new Date().toISOString();
      deleteDocumentNonBlocking(doc(db, 'roles', id));
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: authUser?.uid || 'system',
        action: 'Staff Access Revoked',
        entityType: 'UserRole',
        entityId: id,
        details: `Purged administrative clearance for ${name}`,
        timestamp: now
      });

      toast({ title: "Access Revoked", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Clearance <span className="text-primary">Registry</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage administrative access and professional role hierarchies</p>
        </div>
        <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" onClick={() => setIsAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Ingest Staff Member —
        </Button>
      </div>

      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search staff by name, UID or assigned role..." 
                className="pl-12 h-14 rounded-2xl bg-background border-2" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Retrieving Hierarchy Vault...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="px-10 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Registry Profile</TableHead>
                    <TableHead className="px-10 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Assigned Authorization</TableHead>
                    <TableHead className="px-10 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Registry Status</TableHead>
                    <TableHead className="px-10 py-5 text-right font-black uppercase tracking-[0.2em] text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff?.map((s) => (
                    <TableRow key={s.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm uppercase tracking-tight text-foreground">{userMap[s.id] || 'Unknown Identity'}</span>
                            <span className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground opacity-60">{s.id}</span>
                            {s.id === authUser?.uid && <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">(Your Session)</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-10">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 px-3 h-6">
                          {s.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-10">
                        <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase h-5 px-2">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      </TableCell>
                      <TableCell className="px-10 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all" onClick={() => setEditingRole(s)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Edit Role
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleRevokeAccess(s.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredStaff?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                          <ShieldAlert className="h-12 w-12" />
                          <p className="text-[10px] font-black uppercase tracking-widest italic">No staff records found in registry.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Modify Clearance</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">Adjust the administrative role for: {userMap[editingRole?.id || ''] || editingRole?.id.slice(0, 12)}</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Target Authorization</Label>
              <Select value={editingRole?.role} onValueChange={(v) => setEditingRole(prev => prev ? { ...prev, role: v as UserRole } : null)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-black uppercase text-xs tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role} className="text-xs font-bold uppercase">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-[9px] text-amber-700 font-bold uppercase leading-relaxed">Role changes affect workstation access immediately. Ensure the member is briefed on their new responsibilities.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px]" onClick={() => setEditingRole(null)}>Abort</Button>
            <Button className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary shadow-lg" onClick={handleUpdateRole} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync Registry —"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest Staff Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Staff Ingest</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">Authorize administrative access for an existing Society UID.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">User UID</Label>
              <Input 
                placeholder="Paste UID from Directory..." 
                className="h-14 rounded-2xl bg-muted/5 border-2 font-mono text-xs"
                value={newStaff.uid}
                onChange={e => setNewStaff({...newStaff, uid: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Initial Authorization</Label>
              <Select value={newStaff.role} onValueChange={(v) => setNewStaff({...newStaff, role: v as UserRole})}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-black uppercase text-xs tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role} className="text-xs font-bold uppercase">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px]" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary shadow-lg" onClick={handleAddStaff} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Member —"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
