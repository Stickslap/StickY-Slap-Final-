
'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Users, Search, Filter, UserPlus, MoreHorizontal, Mail, Phone, Calendar, ShieldAlert, Loader2, Trash, Edit, Trophy, Star, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useMemoFirebase, useFirestore, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, addDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { useAdmin } from '../layout';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customersQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db, user, isStaff, isSyncing]);

  const { data: customers, isLoading, error } = useCollection<UserProfile>(customersQuery);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const usersCollection = collection(db, 'users');
        for (const row of results.data as any[]) {
          const newUser: Partial<UserProfile> = {
            email: row.customer_primary_email,
            name: row.customer_full_name,
            phone: row.customer_primary_phone_number,
            role: 'Customer',
            createdAt: new Date().toISOString(),
          };
          await addDoc(usersCollection, newUser);
        }
        toast({ title: "Customers Imported Successfully" });
      },
      error: (err) => {
        toast({ title: "Import Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const filteredCustomers = customers?.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      c.email.toLowerCase().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      (c as any).company?.toLowerCase().includes(term)
    );
    
    const matchesRole = roleFilter === 'All' || c.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer profile? This action cannot be undone.')) {
      deleteDocumentNonBlocking(doc(db, 'users', id));
      toast({ title: "Customer Deleted", variant: "destructive" });
    }
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'Gold': return <Trophy className="h-3 w-3 text-amber-500 mr-1" />;
      case 'Platinum': return <Star className="h-3 w-3 text-blue-400 mr-1" />;
      case 'Elite': return <ShieldAlert className="h-3 w-3 text-primary mr-1" />;
      default: return null;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground">Customers</h2>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Syncing</AlertTitle>
          <AlertDescription>
            Security rules are synchronizing your administrative permissions. Please wait a moment.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground uppercase italic">Society Directory</h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Manage client profiles, business details, and loyalty status.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV —
          </Button>
          <Button asChild className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <Link href="/admin/customers/new">
              <UserPlus className="mr-2 h-4 w-4" />
              New Customer —
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email or company..." 
                className="pl-10 bg-background border-2 h-11 rounded-xl" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-2 w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Refine" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl p-2 border-2">
                  <SelectItem value="All" className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">All Roles</SelectItem>
                  <SelectItem value="Customer" className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">Customer</SelectItem>
                  <SelectItem value="Vendor" className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">Vendor</SelectItem>
                  <SelectItem value="Admin" className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || isSyncing ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Retrieving Registry...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Customer & Company</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Account Tier</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Role / Segment</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Joined</TableHead>
                  <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="px-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase tracking-tight">{customer.name || 'Unnamed User'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{customer.email}</span>
                          {(customer as any).company && (
                            <>
                              <span className="text-[10px] text-muted-foreground opacity-30">•</span>
                              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{(customer as any).company}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-black tracking-tighter px-2 h-5 border-2",
                        customer.accountTier === 'Gold' ? "border-amber-500/30 bg-amber-50 text-amber-700" :
                        customer.accountTier === 'Platinum' ? "border-blue-500/30 bg-blue-50 text-blue-700" :
                        customer.accountTier === 'Elite' ? "border-primary/30 bg-primary/5 text-primary" : "border-muted"
                      )}>
                        {getTierIcon(customer.accountTier)}
                        {customer.accountTier || 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tighter h-5">
                          {customer.role || 'Customer'}
                        </Badge>
                        {(customer as any).segment && (
                          <Badge className="text-[9px] uppercase font-bold tracking-tighter bg-blue-500 h-5 border-none">
                            {(customer as any).segment}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-2">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2 opacity-40">Member Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => handleEmail(customer.email)}>
                            <Mail className="mr-2 h-4 w-4" /> Email Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer">
                            <Link href={`/admin/orders?search=${customer.email}`}>
                              <Calendar className="mr-2 h-4 w-4" /> View History
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem asChild className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer">
                            <Link href={`/admin/customers/${customer.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Manage Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer" onClick={() => handleDelete(customer.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredCustomers?.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                        <Users className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic">No matching member records found.</p>
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
