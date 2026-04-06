'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Plus, 
  Trash, 
  Save, 
  Loader2, 
  GripVertical,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Layout,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { CheckoutField, CheckoutSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEFAULT_FIELDS: CheckoutField[] = [
  { id: 'f1', label: 'Special Production Instructions', type: 'textarea', placeholder: 'Any specific cut or finish details...', required: false, order: 0 },
  { id: 'f2', label: 'How did you hear about the Society?', type: 'select', options: ['Instagram', 'Google Search', 'Word of Mouth', 'Referral'], required: true, order: 1 }
];

export default function CheckoutSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch existing Checkout settings
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'checkout'), [db]);
  const { data: settingsData, isLoading } = useDoc<CheckoutSettings>(settingsRef);

  // Form State
  const [fields, setFields] = useState<CheckoutField[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (settingsData) {
      if (settingsData.fields) {
        setFields(settingsData.fields.sort((a, b) => a.order - b.order));
      }
      if (settingsData.theme) {
        setTheme(settingsData.theme);
      }
    } else {
      setFields(DEFAULT_FIELDS);
      setTheme('dark');
    }
  }, [settingsData]);

  const handleSave = () => {
    if (!settingsRef) return;
    setIsSaving(true);

    const updates: CheckoutSettings = {
      fields: fields.map((f, i) => ({ ...f, order: i })),
      theme,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(settingsRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Checkout Logic Updated',
      entityType: 'System',
      entityId: 'checkout',
      details: `Modified checkout theme to ${theme} and updated smart fields.`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Checkout Config Published", 
      description: "Portal theme and smart logic have been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const addField = () => {
    const newField: CheckoutField = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Checkout Field',
      type: 'text',
      placeholder: 'Enter details...',
      required: false,
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setFields(newFields);
  };

  const updateField = (id: string, updates: Partial<CheckoutField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleOptionsChange = (id: string, value: string) => {
    const options = value.split(',').map(v => v.trim()).filter(v => !!v);
    updateField(id, { options });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Checkout <span className="text-primary">Editor</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage smart fields and portal aesthetic</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={() => { setFields(DEFAULT_FIELDS); setTheme('dark'); }}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore Defaults —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Publish Logic —
          </Button>
        </div>
      </div>

      {/* Theme Section */}
      <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-6 px-10">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" /> Portal Aesthetic
          </CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest">Select the visual mode for the Order Summary column.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <div 
              onClick={() => setTheme('light')}
              className={cn(
                "p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col items-center gap-4",
                theme === 'light' ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-muted hover:border-primary/20"
              )}
            >
              <div className="h-12 w-20 rounded-xl border bg-white shadow-inner" />
              <div className="flex items-center gap-2">
                <Sun className={cn("h-4 w-4", theme === 'light' ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[10px] font-black uppercase tracking-widest">Professional Light</span>
              </div>
            </div>
            <div 
              onClick={() => setTheme('dark')}
              className={cn(
                "p-6 rounded-3xl border-2 cursor-pointer transition-all flex flex-col items-center gap-4",
                theme === 'dark' ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-muted hover:border-primary/20"
              )}
            >
              <div className="h-12 w-20 rounded-xl border bg-zinc-900 shadow-inner" />
              <div className="flex items-center gap-2">
                <Moon className={cn("h-4 w-4", theme === 'dark' ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[10px] font-black uppercase tracking-widest">Society Dark</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-amber-100 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
          <Info className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-widest text-amber-900">Logic Note</h4>
          <p className="text-xs font-medium text-amber-700 leading-relaxed uppercase tracking-tighter">
            Smart fields added below will appear in the order manifest for all customers. Data collected will be visible in the 
            Admin Order View and follow the project through fulfillment.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {fields.map((field, idx) => (
          <Card key={field.id} className="border-2 rounded-3xl overflow-hidden shadow-sm group hover:border-primary/30 transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="bg-muted/30 border-r-2 p-4 flex flex-row md:flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center font-black text-xs border-2 shrink-0">
                    {idx + 1}
                  </div>
                  <Separator className="bg-muted-foreground/10 hidden md:block" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveField(idx, 'up')} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Separator className="bg-muted-foreground/10 hidden md:block" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => removeField(field.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Field Label</Label>
                      <Input 
                        value={field.label} 
                        onChange={e => updateField(field.id, { label: e.target.value })}
                        className="h-12 rounded-xl bg-muted/5 border-2 font-bold"
                        placeholder="e.g. Special Instructions"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Input Type</Label>
                      <Select value={field.type} onValueChange={v => updateField(field.id, { type: v as any })}>
                        <SelectTrigger className="h-12 rounded-xl border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="text">Single Line Text</SelectItem>
                          <SelectItem value="textarea">Multi-line Narrative</SelectItem>
                          <SelectItem value="select">Dropdown Menu</SelectItem>
                          <SelectItem value="checkbox">Toggle / Checkbox</SelectItem>
                          <SelectItem value="number">Numeric Input</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Placeholder / Hint</Label>
                      <Input 
                        value={field.placeholder} 
                        onChange={e => updateField(field.id, { placeholder: e.target.value })}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="Inform the user what to enter..."
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/5 border-2 rounded-xl">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Mandatory Field</Label>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium">Blocking validation if empty.</p>
                      </div>
                      <Switch 
                        checked={field.required} 
                        onCheckedChange={v => updateField(field.id, { required: v })} 
                      />
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Options (Comma separated)</Label>
                      <Input 
                        value={field.options?.join(', ')} 
                        onChange={e => handleOptionsChange(field.id, e.target.value)}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="Option A, Option B, Option C"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button 
          variant="outline" 
          className="w-full h-24 border-2 border-dashed rounded-[2.5rem] bg-muted/5 hover:bg-primary/5 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary font-black uppercase tracking-widest"
          onClick={addField}
        >
          <Plus className="mr-2 h-6 w-6" />
          Add Custom Checkout Field —
        </Button>
      </div>
    </div>
  );
}
