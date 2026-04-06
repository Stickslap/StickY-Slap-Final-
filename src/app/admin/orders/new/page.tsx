
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash, 
  Search, 
  User, 
  Package, 
  Truck, 
  DollarSign, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  addDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ProductTemplate, UserProfile, Order, OrderItem } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAdmin } from '../../layout';

export default function NewManualOrderPage() {
  const router = useRouter();
  const db = useFirestore();
  const { isStaff, isSyncing } = useAdmin();

  // Queries
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products'), orderBy('name')), [db]);
  const { data: products } = useCollection<ProductTemplate>(productsQuery);

  const usersQuery = useMemoFirebase(() => query(collection(db, 'users'), orderBy('email')), [db]);
  const { data: users } = useCollection<UserProfile>(usersQuery);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Standard Shipping');
  const [shippingCost, setShippingMethodCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductTemplate | null>(null);
  const [itemQty, setItemQty] = useState(100);
  const [itemOptions, setItemOptions] = useState<Record<string, string>>({});

  // Calculations
  const pricing = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const prod = products?.find(p => p.id === item.productId);
      const base = prod?.pricingModel?.basePrice || 0;
      return acc + (base * item.quantity);
    }, 0);

    const tax = subtotal * 0.08; // 8% placeholder tax
    const total = subtotal + shippingCost + tax - discount;

    return { subtotal, tax, total, shipping: shippingCost, discount };
  }, [items, products, shippingCost, discount]);

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: itemQty,
      options: itemOptions,
      productThumbnail: selectedProduct.thumbnail
    };

    setItems([...items, newItem]);
    setIsItemModalOpen(false);
    setSelectedProduct(null);
    setItemQty(100);
    setItemOptions({});
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!selectedCustomer) {
      toast({ title: "Missing Customer", description: "Please select a customer for this order.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Empty Order", description: "Please add at least one item.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const orderData: Partial<Order> = {
      userId: selectedCustomer.id, // Mandatory for member dashboard visibility
      customerEmail: selectedCustomer.email,
      status: 'Submitted',
      items,
      pricing,
      shippingDetails: {
        address: shippingAddress || 'Standard Warehouse Pickup',
        method: shippingMethod,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addDocumentNonBlocking(collection(db, 'orders'), orderData)
      .then(() => {
        toast({ title: "Order Created", description: "Manual order has been successfully submitted." });
        router.push('/admin/orders');
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">New Manual Order</h2>
          <p className="text-muted-foreground">Draft an order directly for a client profile.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Select Client</Label>
                <Select 
                  value={selectedCustomer?.id || ''} 
                  onValueChange={(id) => setSelectedCustomer(users?.find(u => u.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search or select a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} {user.name ? `(${user.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCustomer && (
                <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between border">
                  <div>
                    <p className="text-sm font-semibold">{selectedCustomer.name || 'Unnamed User'}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">UID: {selectedCustomer.id.slice(0, 8)}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Items
              </CardTitle>
              <Button size="sm" onClick={() => setIsItemModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg group hover:bg-muted/10 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 bg-muted rounded flex items-center justify-center overflow-hidden relative">
                        {item.productThumbnail ? (
                          <Image src={item.productThumbnail} alt={item.productName} fill className="object-cover" unoptimized />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">${((products?.find(p => p.id === item.productId)?.pricingModel?.basePrice || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleRemoveItem(idx)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="py-12 border-2 border-dashed rounded-lg text-center bg-muted/10">
                    <Package className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground italic">No items added yet. Click "Add Item" to begin.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Logistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Shipping Method</Label>
                <Select value={shippingMethod} onValueChange={setShippingMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard Shipping">Standard Shipping</SelectItem>
                    <SelectItem value="Express Overnight">Express Overnight</SelectItem>
                    <SelectItem value="Warehouse Pickup">Warehouse Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Delivery Address</Label>
                <Input 
                  placeholder="Street, City, State, ZIP" 
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      className="h-6 w-20 text-right text-xs py-0" 
                      type="number" 
                      value={shippingCost} 
                      onChange={(e) => setShippingMethodCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${pricing.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <Input 
                    className="h-6 w-20 text-right text-xs py-0 text-emerald-600 font-medium" 
                    type="number" 
                    value={discount} 
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold">Order Total</span>
                <span className="text-xl font-bold text-primary">${pricing.total.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button className="w-full h-12 text-lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Create Order
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Select a product and configure options.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Product Template</Label>
              <Select 
                value={selectedProduct?.id || ''} 
                onValueChange={(id) => setSelectedProduct(products?.find(p => p.id === id) || null)}
              >
                <SelectTrigger><SelectValue placeholder="Choose a product..." /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={itemQty} onChange={(e) => setItemQty(parseInt(e.target.value) || 0)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedProduct.optionGroups.map((group) => (
                    <div key={group.id} className="grid gap-2">
                      <Label>{group.name}</Label>
                      <Select 
                        value={itemOptions[group.name] || ''} 
                        onValueChange={(val) => setItemOptions({...itemOptions, [group.name]: val})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {group.options.map(opt => (
                            <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!selectedProduct}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
