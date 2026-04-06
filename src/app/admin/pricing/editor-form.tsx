
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Trash, 
  Zap, 
  Settings2, 
  Target, 
  ShieldAlert, 
  BarChart3, 
  Plus, 
  Info,
  ChevronRight,
  User,
  Package,
  Calculator,
  Layout,
  Layers,
  Clock,
  ArrowRight
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
import { PricingRule, PricingCondition, PricingEffect } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PricingRuleEditorProps {
  initialData?: Partial<PricingRule>;
  isNew?: boolean;
}

const DEFAULT_RULE: Partial<PricingRule> = {
  name: '',
  description: '',
  status: 'Draft',
  priority: 10,
  stackBehavior: 'Stackable',
  scope: {
    type: 'Global',
    targetIds: []
  },
  conditions: [],
  effects: [],
};

export function PricingRuleEditorForm({ initialData, isNew }: PricingRuleEditorProps) {
  const router = useRouter();
  const db = useFirestore();
  const [data, setData] = useState<Partial<PricingRule>>(initialData || DEFAULT_RULE);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationQty, setSimulationQty] = useState(100);
  const [simulationBase, setSimulationBase] = useState(1.50);

  const handleSave = () => {
    setIsLoading(true);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      addDocumentNonBlocking(collection(db, 'pricing_rules'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Rule Created", description: "Pricing rule has been added." });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'pricing_rules', data.id), updatedData, { merge: true });
      toast({ title: "Rule Saved", description: "Changes updated successfully." });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/pricing');
    }, 500);
  };

  const addCondition = () => {
    const newCondition: PricingCondition = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Quantity',
      operator: 'greater_than',
      value: 100
    };
    setData({ ...data, conditions: [...(data.conditions || []), newCondition] });
  };

  const addEffect = () => {
    const newEffect: PricingEffect = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Percent',
      target: 'Base',
      value: -10
    };
    setData({ ...data, effects: [...(data.effects || []), newEffect] });
  };

  // Logic Simulator Calculation
  const simulatePrice = () => {
    let price = simulationBase;
    const details: string[] = [];

    data.effects?.forEach(effect => {
      if (effect.type === 'Percent') {
        const delta = (price * effect.value) / 100;
        price += delta;
        details.push(`${effect.value}% change to ${effect.target}`);
      } else if (effect.type === 'Fixed') {
        price += effect.value;
        details.push(`$${effect.value} added to ${effect.target}`);
      } else if (effect.type === 'Multiplier') {
        price *= effect.value;
        details.push(`x${effect.value} multiplier applied`);
      }
    });

    return { total: price * simulationQty, unit: price, details };
  };

  const simulation = simulatePrice();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur z-20 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{isNew ? 'New Pricing Rule' : `Editing: ${data.name}`}</h2>
            <p className="text-sm text-muted-foreground">Define dynamic price modifiers for custom print orders.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-5 h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="basics" className="py-2"><Layout className="mr-2 h-4 w-4" /> Basics</TabsTrigger>
          <TabsTrigger value="conditions" className="py-2"><Layers className="mr-2 h-4 w-4" /> Conditions</TabsTrigger>
          <TabsTrigger value="effects" className="py-2"><Zap className="mr-2 h-4 w-4" /> Effects</TabsTrigger>
          <TabsTrigger value="simulation" className="py-2"><Calculator className="mr-2 h-4 w-4" /> Simulator</TabsTrigger>
          <TabsTrigger value="history" className="py-2"><BarChart3 className="mr-2 h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Rule Settings</CardTitle>
                <CardDescription>Internal identification and priority management.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Rule Name</Label>
                  <Input 
                    id="name" 
                    value={data.name} 
                    onChange={e => setData({...data, name: e.target.value})} 
                    placeholder="e.g. Bulk Vinyl Discount (>500 qty)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={data.description} 
                    onChange={e => setData({...data, description: e.target.value})}
                    placeholder="Describe what this rule does and why..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={data.status} onValueChange={v => setData({...data, status: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
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
                    <p className="text-[10px] text-muted-foreground">Higher numbers execute later (overriding previous rules).</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Target Scope</Label>
                    <Select 
                      value={data.scope?.type} 
                      onValueChange={v => setData({...data, scope: {...data.scope!, type: v as any}})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Global">Global (All Products)</SelectItem>
                        <SelectItem value="Category">Specific Categories</SelectItem>
                        <SelectItem value="Product">Specific Products</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Stack Behavior</Label>
                    <Select 
                      value={data.stackBehavior} 
                      onValueChange={v => setData({...data, stackBehavior: v as any})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stackable">Stackable (Combines with others)</SelectItem>
                        <SelectItem value="Exclusive">Exclusive (Blocks others if matched)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Conditions Builder</h3>
                <p className="text-sm text-muted-foreground">Define when this rule should apply.</p>
              </div>
              <Button onClick={addCondition} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Condition
              </Button>
            </div>

            <div className="space-y-4">
              {data.conditions?.map((condition, idx) => (
                <Card key={condition.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-center">
                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Context Type</Label>
                        <Select 
                          value={condition.type} 
                          onValueChange={v => {
                            const conds = [...(data.conditions || [])];
                            conds[idx].type = v as any;
                            setData({...data, conditions: conds});
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Quantity">Order Quantity</SelectItem>
                            <SelectItem value="Option">Selected Option</SelectItem>
                            <SelectItem value="Rush">Rush Status</SelectItem>
                            <SelectItem value="Subtotal">Cart Subtotal</SelectItem>
                            <SelectItem value="CustomerSegment">Customer Segment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Operator</Label>
                        <Select 
                          value={condition.operator}
                          onValueChange={v => {
                            const conds = [...(data.conditions || [])];
                            conds[idx].operator = v as any;
                            setData({...data, conditions: conds});
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="greater_than">Is Greater Than</SelectItem>
                            <SelectItem value="less_than">Is Less Than</SelectItem>
                            <SelectItem value="between">Is Between</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Value</Label>
                        <Input 
                          value={condition.value}
                          onChange={e => {
                            const conds = [...(data.conditions || [])];
                            conds[idx].value = e.target.value;
                            setData({...data, conditions: conds});
                          }}
                        />
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="mt-6 text-destructive"
                        onClick={() => {
                          setData({...data, conditions: data.conditions?.filter(c => c.id !== condition.id)});
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!data.conditions?.length && (
                <div className="p-12 border-2 border-dashed rounded-lg text-center bg-muted/20">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground italic">No conditions set. This rule will always apply to its scope.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="effects" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Price Adjustments</h3>
                <p className="text-sm text-muted-foreground">Define what happens when the conditions match.</p>
              </div>
              <Button onClick={addEffect} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Adjustment
              </Button>
            </div>

            <div className="space-y-4">
              {data.effects?.map((effect, idx) => (
                <Card key={effect.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-center">
                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Target Component</Label>
                        <Select 
                          value={effect.target}
                          onValueChange={v => {
                            const effs = [...(data.effects || [])];
                            effs[idx].target = v as any;
                            setData({...data, effects: effs});
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Base">Base Unit Price</SelectItem>
                            <SelectItem value="Option">Option Modifiers</SelectItem>
                            <SelectItem value="Rush">Rush Fees</SelectItem>
                            <SelectItem value="Setup">Setup Fees</SelectItem>
                            <SelectItem value="Total">Grand Total</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Adjustment Type</Label>
                        <Select 
                          value={effect.type}
                          onValueChange={v => {
                            const effs = [...(data.effects || [])];
                            effs[idx].type = v as any;
                            setData({...data, effects: effs});
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Percent">Percentage (+/- %)</SelectItem>
                            <SelectItem value="Fixed">Fixed Amount (+/- $)</SelectItem>
                            <SelectItem value="Multiplier">Multiplier (x)</SelectItem>
                            <SelectItem value="OverrideUnitPrice">Override Unit Price</SelectItem>
                            <SelectItem value="WaiveFee">Waive Fee (Free)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5 flex-1">
                        <Label className="text-xs">Value</Label>
                        <Input 
                          type="number"
                          value={effect.value}
                          onChange={e => {
                            const effs = [...(data.effects || [])];
                            effs[idx].value = parseFloat(e.target.value) || 0;
                            setData({...data, effects: effs});
                          }}
                        />
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="mt-6 text-destructive"
                        onClick={() => {
                          setData({...data, effects: data.effects?.filter(e => e.id !== effect.id)});
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Pricing Simulator
                </CardTitle>
                <CardDescription>Verify your logic against sample order scenarios.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Test Unit Price (Sample Base)</Label>
                      <Input type="number" step="0.01" value={simulationBase} onChange={e => setSimulationBase(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Test Quantity</Label>
                      <Input type="number" value={simulationQty} onChange={e => setSimulationQty(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-background rounded-lg border shadow-sm space-y-3">
                      <h4 className="font-semibold text-sm">Calculation Breakdown</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Original Unit Price</span>
                          <span>${simulationBase.toFixed(2)}</span>
                        </div>
                        {simulation.details.map((detail, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-primary">
                            <span>{detail}</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Simulated Total</span>
                        <span>${simulation.total.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground">Effective Unit Price: ${simulation.unit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Explanation
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This simulation applies current rule effects sequentially to a base price. 
                    In production, the engine will first filter rules by scope and matched conditions, 
                    then apply them based on the priority order defined in the Basics tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>Track how often this rule triggers in production.</CardDescription>
              </CardHeader>
              <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-sm italic">No triggers logged for this rule period.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
