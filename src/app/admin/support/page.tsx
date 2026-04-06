'use client';

import React, { useState } from 'react';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MoreHorizontal, 
  ShieldAlert, 
  Loader2,
  ChevronRight,
  User,
  ArrowRight
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { SupportTicket } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAdmin } from '../layout';
import Link from 'next/link';

const statusIcons = {
  open: MessageSquare,
  pending: Clock,
  closed: CheckCircle2,
};

export default function SupportTicketsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');

  const ticketsQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return query(
      collection(db, 'support_tickets'), 
      orderBy('createdAt', 'desc'),
      limit(100)
    );
  }, [db, user, isStaff, isSyncing]);

  const { data: tickets, isLoading, error } = useCollection<SupportTicket>(ticketsQuery);

  const filteredTickets = tickets?.filter(t => 
    t.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground">Support Center</h2>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permission Denial</AlertTitle>
          <AlertDescription>
            Firestore is verifying your support staff access. This usually resolves within a few seconds.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStats = () => [
    { label: 'Open', count: tickets?.filter(t => t.status === 'open').length || 0, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending', count: tickets?.filter(t => t.status === 'pending').length || 0, color: 'bg-amber-50 text-amber-600' },
    { label: 'Closed', count: tickets?.filter(t => t.status === 'closed').length || 0, color: 'bg-muted text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground">Support Center</h2>
          <p className="text-muted-foreground">Manage inquiries, resolution workflows, and customer service.</p>
        </div>
        <Button asChild>
          <Link href="/admin/support/new">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {getStats().map((stat) => (
          <Card key={stat.label} className={cn(stat.color, "border-none shadow-none")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest opacity-70 font-bold">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by message, subject or email..." 
              className="pl-8 bg-muted/20 border-none h-11" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || isSyncing ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets?.map((ticket) => {
                  const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || MessageSquare;
                  return (
                    <TableRow key={ticket.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-medium leading-none">{ticket.customerEmail || 'Guest'}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">UID: {ticket.userId?.slice(0, 6) || 'N/A'}...</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium uppercase tracking-wider">{ticket.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/admin/support/${ticket.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredTickets?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                        <LifeBuoy className="h-12 w-12" />
                        <p className="text-sm font-bold uppercase tracking-widest">No active tickets</p>
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
