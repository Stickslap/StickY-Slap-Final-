'use client';

import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Trash, 
  Save, 
  Loader2, 
  GripVertical,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { FAQItem, FAQSettings } from '@/lib/types';

const DEFAULT_FAQS: FAQItem[] = [
  { 
    id: '1', 
    question: 'What makes Print Society .co\'s custom stickers special?', 
    answer: 'We use military-grade vinyl and UV-resistant inks. Every order is inspected by a human, and we offer free digital proofs so you see exactly what you get.',
    order: 0 
  },
  { 
    id: '2', 
    question: 'How long does shipping take?', 
    answer: 'Standard shipping takes 3-5 business days. We also offer expedited options for those urgent sticker needs.',
    order: 1 
  },
  { 
    id: '3', 
    question: 'Can I get a proof before my order ships?', 
    answer: 'Yes! We provide a free digital proof within 24 hours of your order. We won\'t start production until you give the green light.',
    order: 2 
  },
  { 
    id: '4', 
    question: 'What are the different size/finish options?', 
    answer: 'We offer everything from Matte to Holographic, Glitter, and Chrome. Sizes range from 1" up to full wall decals.',
    order: 3 
  },
  { 
    id: '5', 
    question: 'Are Print Society .co stickers waterproof?', 
    answer: 'Absolutely. Our stickers are 100% waterproof and dishwasher safe. They can handle the outdoors for up to 5 years.',
    order: 4 
  },
  { 
    id: '6', 
    question: 'Can I use my own design?', 
    answer: 'Yes! You can upload your own design in most common file formats (PNG, JPG, PDF, SVG). Our design team will review it and create a proof for you.',
    order: 5 
  }
];

export default function FAQSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch existing FAQ settings
  const faqRef = useMemoFirebase(() => doc(db, 'settings', 'faqs'), [db]);
  const { data: faqData, isLoading } = useDoc<FAQSettings>(faqRef);

  // Form State
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  useEffect(() => {
    if (faqData && faqData.items) {
      setFaqs(faqData.items.sort((a, b) => a.order - b.order));
    } else {
      setFaqs(DEFAULT_FAQS);
    }
  }, [faqData]);

  const handleSave = () => {
    if (!faqRef) return;
    setIsSaving(true);

    const updates: FAQSettings = {
      items: faqs.map((f, i) => ({ ...f, order: i })),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(faqRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'FAQ Content Updated',
      entityType: 'System',
      entityId: 'faqs',
      details: `Updated landing page Frequently Asked Questions set.`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "FAQs Published", 
      description: "Landing page FAQ section has been updated." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const addFaq = () => {
    const newFaq: FAQItem = {
      id: Math.random().toString(36).substr(2, 9),
      question: 'New Question?',
      answer: 'Add your detailed response here...',
      order: faqs.length
    };
    setFaqs([...faqs, newFaq]);
  };

  const removeFaq = (id: string) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  const moveFaq = (index: number, direction: 'up' | 'down') => {
    const newFaqs = [...faqs];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newFaqs.length) return;
    
    [newFaqs[index], newFaqs[target]] = [newFaqs[target], newFaqs[index]];
    setFaqs(newFaqs);
  };

  const updateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const resetToDefault = () => {
    if (confirm('Reset to standard Society FAQs? This will discard your current changes.')) {
      setFaqs(DEFAULT_FAQS);
      toast({ title: "Restored Defaults" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Landing Page <span className="text-primary">FAQs</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage the Frequently Asked Questions set for the main site</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={resetToDefault}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore Standard —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Publish Changes —
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, idx) => (
          <Card key={faq.id} className="border-2 rounded-3xl overflow-hidden shadow-sm group hover:border-primary/30 transition-all">
            <CardContent className="p-0">
              <div className="flex">
                <div className="bg-muted/30 border-r-2 p-4 flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center font-black text-xs border-2">
                    {idx + 1}
                  </div>
                  <Separator className="bg-muted-foreground/10" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveFaq(idx, 'up')} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => moveFaq(idx, 'down')} disabled={idx === faqs.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Separator className="bg-muted-foreground/10" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => removeFaq(faq.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 p-8 space-y-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Question</Label>
                    <Input 
                      value={faq.question} 
                      onChange={e => updateFaq(faq.id, 'question', e.target.value)}
                      className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold"
                      placeholder="e.g. Do you ship internationally?"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Response</Label>
                    <Textarea 
                      value={faq.answer} 
                      onChange={e => updateFaq(faq.id, 'answer', e.target.value)}
                      className="min-h-[100px] rounded-xl bg-muted/5 border-2 leading-relaxed"
                      placeholder="Enter detailed answer here..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button 
          variant="outline" 
          className="w-full h-24 border-2 border-dashed rounded-[2.5rem] bg-muted/5 hover:bg-primary/5 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary font-black uppercase tracking-widest"
          onClick={addFaq}
        >
          <Plus className="mr-2 h-6 w-6" />
          Add FAQ Item
        </Button>
      </div>
    </div>
  );
}
