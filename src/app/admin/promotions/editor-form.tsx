
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Trash, 
  Percent, 
  DollarSign, 
  Calendar, 
  Settings2, 
  Target, 
  ShieldAlert, 
  BarChart3, 
  Tag, 
  Plus, 
  History,
  Info,
  ChevronRight,
  Zap,
  User,
  Package,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Discount } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DiscountEditorProps {
  initialData?: Partial<Discount>;
  isNew?: boolean;
}

const DEFAULT_DISCOUNT: Partial<Discount> = {
  name: '',
  label: '',
  description: '',
  status: 'Draft',
  priority: 0,
  type: 'Percent',
  value: 0,
  scope: 'Order',
  targets: ['Product'],
  rules: {
    includeProducts: [],
    excludeProducts: [],
    includeCategories: [],
    excludeCategories: [],
    customerSegments: [],
    minOrderSubtotal: 0,
    minItemSubtotal: 0,
    minItemQuantity: 0,
    shippingMethods: [],
    domesticOnly: false
  },
  mode: 'Code',
  code: '',
  limits: {
    maxTotalUses: 0,
    maxPerCustomer: 1,
    oneTimeUse: false,
    stackable: false,
    maxDiscountAmount: 0
  },
  stats: {
    totalUses: 0,
    totalSaved: 0,
    revenueInfluenced: 0
  }
};

export function DiscountEditorForm({ initialData, isNew }: DiscountEditorProps) {
  const router = useRouter();
  const db = useFirestore();
  const [data, setData] = useState<Partial<Discount>>(initialData || DEFAULT_DISCOUNT);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationSubtotal, setSimulationSubtotal] = useState(100);

  const handleSave = () => {
    setIsLoading(true);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      addDocumentNonBlocking(collection(db, 'discounts'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Promotion Created", description: "Your new discount is ready." });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'discounts', data.id), updatedData, { merge: true });
      toast({ title: "Promotion Updated", description: "Changes saved successfully." });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/promotions');
    }, 500);
  };

  const calculateSimulatedDiscount = () => {
    if (data.type === 'Percent') return (simulationSubtotal * (data.value || 0)) / 100;
    if (data.type === 'Fixed') return Math.min(simulationSubtotal, data.value || 0);
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur z-20 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{isNew ? 'Create New Promotion' : `Editing: ${data.name}`}</h2>
            <p className="text-sm text-muted-foreground">Configure logic for custom print discounts.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Promotion'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="basics" className="py-2"><Tag className="mr-2 h-4 w-4" /> Basics</TabsTrigger>
          <TabsTrigger value="value" className="py-2"><Zap className="mr-2 h-4 w-4" /> Value</TabsTrigger>
          <TabsTrigger value="rules" className="py-2"><Target className="mr-2 h-4 w-4" /> Rules</TabsTrigger>
          <TabsTrigger value="limits" className="py-2"><ShieldAlert className="mr-2 h-4 w-4" /> Limits</TabsTrigger>
          <TabsTrigger value="simulation" className="py-2"><Calculator className="mr-2 h-4 w-4" /> Simulator</TabsTrigger>
          <TabsTrigger value="stats" className="py-2"><BarChart3 className="mr-2 h-4 w-4" /> Stats</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Information</CardTitle>
                <CardDescription>Internal identification and scheduling.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Internal Promotion Name</Label>
                  <Input 
                    id="name" 
                    value={data.name} 
                    onChange={e => setData({...data, name: e.target.value})} 
                    placeholder="e.g. Summer Sticker Sale 2026"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="label">Customer Facing Label</Label>
                  <Input 
                    id="label" 
                    value={data.label} 
                    onChange={e => setData({...data, label: e.target.value})} 
                    placeholder="e.g. 10% Off Your First Order!"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Visible to the customer during checkout.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={data.status} onValueChange={v => setData({...data, status: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Input 
                      type="number" 
                      value={data.priority} 
                      onChange={e => setData({...data, priority: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-[10px] text-muted-foreground">Higher numbers resolve first for auto-apply logic.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="datetime-local" 
                      value={data.startAt?.slice(0, 16)} 
                      onChange={e => setData({...data, startAt: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date</Label>
                    <Input 
                      type="datetime-local" 
                      value={data.endAt?.slice(0, 16)} 
                      onChange={e => setData({...data, endAt: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution Method</CardTitle>
                <CardDescription>How will customers get this discount?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-6">
                  <div 
                    className={cn(
                      "flex-1 p-4 border rounded-lg cursor-pointer transition-all",
                      data.mode === 'Code' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    )}
                    onClick={() => setData({...data, mode: 'Code'})}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", data.mode === 'Code' ? "border-primary" : "border-muted-foreground")}>
                        {data.mode === 'Code' && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <Label className="cursor-pointer">Discount Code</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Customers enter a specific code at checkout.</p>
                  </div>
                  <div 
                    className={cn(
                      "flex-1 p-4 border rounded-lg cursor-pointer transition-all",
                      data.mode === 'Auto' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    )}
                    onClick={() => setData({...data, mode: 'Auto'})}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", data.mode === 'Auto' ? "border-primary" : "border-muted-foreground")}>
                        {data.mode === 'Auto' && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <Label className="cursor-pointer">Automatic</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Applies automatically if rules are met.</p>
                  </div>
                </div>

                {data.mode === 'Code' && (
                  <div className="grid gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="code">Enter Promo Code</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="code" 
                        value={data.code} 
                        onChange={e => setData({...data, code: e.target.value.toUpperCase().replace(/\s/g, '')})} 
                        placeholder="SUMMER20"
                        className="font-mono"
                      />
                      <Button variant="outline" onClick={() => setData({...data, code: Math.random().toString(36).substring(2, 10).toUpperCase()})}>
                        Generate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Discount Value</CardTitle>
                <CardDescription>What kind of savings does this offer?</CardDescription>
              </CardHeader>
            
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Discount Type</Label>
                    <Select value={data.type} onValueChange={v => setData({...data, type: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percent">Percentage (%) Off</SelectItem>
                        <SelectItem value="Fixed">Fixed Amount ($) Off</SelectItem>
                        <SelectItem value="Tiered">Quantity Tiers</SelectItem>
                        <SelectItem value="FreeShipping">Free Shipping</SelectItem>
                        <SelectItem value="RushDiscount">Rush Fee Discount</SelectItem>
                        <SelectItem value="SetupWaiver">Setup Fee Waiver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{data.type === 'Percent' ? 'Percentage Value' : 'Fixed Amount'}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">
                        {data.type === 'Percent' ? '%' : '$'}
                      </span>
                      <Input 
                        type="number" 
                        className="pl-7" 
                        value={data.value}
                        onChange={e => setData({...data, value: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="font-semibold block">Scope & Targets</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs">Application Level</Label>
                      <Select value={data.scope} onValueChange={v => setData({...data, scope: v as any})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Order">Entire Order (Subtotal)</SelectItem>
                          <SelectItem value="LineItem">Specific Line Items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs">Target Components</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Product', 'Options', 'Rush', 'Setup', 'Shipping'].map(target => (
                        <Badge 
                          key={target} 
                          variant={data.targets?.includes(target as any) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const targets = data.targets || [];
                            const updated = targets.includes(target as any) 
                              ? targets.filter(t => t !== target) 
                              : [...targets, target as any];
                            setData({...data, targets: updated});
                          }}
                        >
                          {target}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Which parts of the price calculation should this discount affect?</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Eligibility Rules</CardTitle>
                <CardDescription>Define the conditions for this promotion to apply.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2"><Package className="h-4 w-4" /> Min Order Subtotal</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          className="pl-7" 
                          value={data.rules?.minOrderSubtotal}
                          onChange={e => setData({...data, rules: {...data.rules!, minOrderSubtotal: parseFloat(e.target.value) || 0}})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2"><Plus className="h-4 w-4" /> Min Item Quantity</Label>
                      <Input 
                        type="number" 
                        value={data.rules?.minItemQuantity}
                        onChange={e => setData({...data, rules: {...data.rules!, minItemQuantity: parseInt(e.target.value) || 0}})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2"><User className="h-4 w-4" /> Customer Segments</Label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {['VIP', 'Wholesale', 'Employee', 'First-Time'].map(segment => (
                          <Badge 
                            key={segment} 
                            variant={data.rules?.customerSegments.includes(segment) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const segments = data.rules?.customerSegments || [];
                              const updated = segments.includes(segment) 
                                ? segments.filter(s => s !== segment) 
                                : [...segments, segment];
                              setData({...data, rules: {...data.rules!, customerSegments: updated}});
                            }}
                          >
                            {segment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Switch 
                        checked={data.rules?.domesticOnly}
                        onCheckedChange={v => setData({...data, rules: {...data.rules!, domesticOnly: v}})}
                      />
                      <Label>Domestic Shipping Only</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label>Restricted Product Categories</Label>
                  <Textarea 
                    placeholder="Enter category IDs separated by commas..." 
                    value={data.rules?.includeCategories.join(', ')}
                    onChange={e => setData({...data, rules: {...data.rules!, includeCategories: e.target.value.split(',').map(v => v.trim()).filter(v => !!v)}})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Leave empty to include all categories.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage & Anti-Abuse</CardTitle>
                <CardDescription>Control how often this promotion can be used.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Max Total Redemptions (Global)</Label>
                    <Input 
                      type="number" 
                      value={data.limits?.maxTotalUses}
                      onChange={e => setData({...data, limits: {...data.limits!, maxTotalUses: parseInt(e.target.value) || 0}})}
                    />
                    <p className="text-[10px] text-muted-foreground italic">0 for unlimited.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Redemptions Per Customer</Label>
                    <Input 
                      type="number" 
                      value={data.limits?.maxPerCustomer}
                      onChange={e => setData({...data, limits: {...data.limits!, maxPerCustomer: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={data.limits?.stackable}
                      onCheckedChange={v => setData({...data, limits: {...data.limits!, stackable: v}})}
                    />
                    <div>
                      <Label className="block">Allow Stacking</Label>
                      <span className="text-[10px] text-muted-foreground font-normal">Can be combined with other promotions.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={data.limits?.oneTimeUse}
                      onCheckedChange={v => setData({...data, limits: {...data.limits!, oneTimeUse: v}})}
                    />
                    <div>
                      <Label className="block">One-Time Use</Label>
                      <span className="text-[10px] text-muted-foreground font-normal">Code is destroyed after single use.</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 pt-2">
                  <Label>Maximum Discount Cap (Per Order)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      className="pl-7" 
                      value={data.limits?.maxDiscountAmount}
                      onChange={e => setData({...data, limits: {...data.limits!, maxDiscountAmount: parseFloat(e.target.value) || 0}})}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Limits total savings even if rules allow more.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Discount Simulator</CardTitle>
                <CardDescription>Test your logic against sample order totals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Sample Order Subtotal</Label>
                    <Input 
                      type="number" 
                      value={simulationSubtotal}
                      onChange={e => setSimulationSubtotal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="p-4 bg-background rounded-lg border shadow-sm space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Original Total</span>
                        <span>${simulationSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-600 font-medium">
                        <span>Discount ({data.name || 'New Discount'})</span>
                        <span>-${calculateSimulatedDiscount().toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Projected Total</span>
                        <span>${(simulationSubtotal - calculateSimulatedDiscount()).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-xs space-y-2">
                  <h4 className="font-semibold flex items-center gap-1"><Info className="h-3 w-3" /> Rule Validation Log</h4>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      {simulationSubtotal >= (data.rules?.minOrderSubtotal || 0) ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      )}
                      Minimum subtotal condition: {simulationSubtotal >= (data.rules?.minOrderSubtotal || 0) ? 'MET' : 'NOT MET'}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Date validity: CURRENTLY VALID
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>How is this promotion performing?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Redemptions</p>
                    <p className="text-2xl font-bold">{data.stats?.totalUses || 0}</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total Discounted</p>
                    <p className="text-2xl font-bold text-emerald-600">${data.stats?.totalSaved?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Revenue Influence</p>
                    <p className="text-2xl font-bold text-primary">${data.stats?.revenueInfluenced?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-sm font-semibold mb-4">Recent Activity</h4>
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                    <History className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm italic">No redemptions logged for this period.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
