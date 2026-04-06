'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Package, 
  LifeBuoy, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Search,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  addDocumentNonBlocking,
  useUser 
} from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { UserProfile, Order, SupportTicket } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAdmin } from '../../layout';

export default function NewSupportTicketPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user: adminUser } = useUser();
  const { isStaff, isSyncing } = useAdmin();

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<string>('Medium');
  const [details, setDetails] = useState('');
  const [associatedOrderId, setAssociatedOrderId] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data Queries
  const customersQuery = useMemoFirebase(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
  const { data: customers, isLoading: isCustomersLoading } = useCollection<UserProfile>(customersQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!selectedCustomerId) return null;
    return query(
      collection(db, 'orders'),
      where('userId', '==', selectedCustomerId), // Standardized to userId
      orderBy('createdAt', 'desc')
    );
  }, [db, selectedCustomerId]);
  const { data: customerOrders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const selectedCustomer = useMemo(() => 
    customers?.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const handleCreateTicket = () => {
    if (!selectedCustomerId || !subject || !details) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const ticketData: Partial<SupportTicket> = {
      userId: selectedCustomerId, // Standardized to userId
      customerEmail: selectedCustomer?.email,
      subject,
      priority: priority as any,
      status: 'open',
      message: details,
      assignedAgent: adminUser?.displayName || 'Staff',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (associatedOrderId !== 'none') {
      ticketData.orderId = associatedOrderId;
    }

    addDocumentNonBlocking(collection(db, 'support_tickets'), ticketData)
      .then(() => {
        toast({ title: "Ticket Created", description: "The customer has been notified." });
        router.push('/admin/support');
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  };

  if (isSyncing) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h3 className="text-xl font-semibold">Synchronizing Permissions</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Create Support Ticket</h2>
          <p className="text-muted-foreground">Proactively open a resolution thread for a customer.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                <LifeBuoy className="h-4 w-4" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Artwork revision needed for your recent order" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Initial Status</Label>
                  <Badge variant="outline" className="h-10 justify-center text-xs uppercase font-bold tracking-widest">
                    Open
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="details">Description & Internal Notes</Label>
                <Textarea 
                  id="details" 
                  placeholder="Describe the issue or reason for opening this ticket..." 
                  className="min-h-[150px]"
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Context (Optional)
              </CardTitle>
              <CardDescription>Link this ticket to a specific customer order.</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCustomerId ? (
                <div className="py-6 text-center border-2 border-dashed rounded-lg bg-muted/10">
                  <p className="text-sm text-muted-foreground italic">Select a customer first to view their orders.</p>
                </div>
              ) : isOrdersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : customerOrders?.length ? (
                <div className="grid gap-2">
                  <Label>Select Associated Order</Label>
                  <Select value={associatedOrderId} onValueChange={setAssociatedOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an order..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific order</SelectItem>
                      {customerOrders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          Order #{order.id.slice(0, 8)} - {new Date(order.createdAt).toLocaleDateString()} ({order.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="py-6 text-center border-2 border-dashed rounded-lg bg-muted/10">
                  <p className="text-sm text-muted-foreground italic">This customer has no orders yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Find Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isCustomersLoading ? (
                      <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                    ) : customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.email} {c.name ? `(${c.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{selectedCustomer.name || 'Unnamed User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-[10px] flex justify-between">
                    <span className="text-muted-foreground uppercase font-bold tracking-tighter">Joined</span>
                    <span className="font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button 
                className="w-full h-12 text-lg" 
                onClick={handleCreateTicket} 
                disabled={isSubmitting || !selectedCustomerId || !subject}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
                Open Ticket
              </Button>
              <p className="text-[10px] text-center text-muted-foreground leading-tight px-2">
                This will create a new support thread visible to the customer. They will see it in their dashboard immediately.
              </p>
            </CardFooter>
          </Card>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-widest">Logic Note</h4>
            </div>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              When you open a ticket, the status is set to "Open". If you need the customer to respond before proceeding with an order, use the resolution view to change the status to "Waiting on Customer".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
