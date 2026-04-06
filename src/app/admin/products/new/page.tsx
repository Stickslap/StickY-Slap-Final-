
'use client';

import React, { useState } from 'react';
import { ProductEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Scaling, Zap, Package, Layers, Box, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ProductSegment } from '@/lib/types';
import { cn } from '@/lib/utils';

const SEGMENT_OPTIONS: { id: ProductSegment; title: string; description: string; icon: any; color: string }[] = [
  { 
    id: 'DTF', 
    title: 'DTF Transfers', 
    description: 'Direct to Film. Calculated per SqIn or Gang Sheet.', 
    icon: Zap, 
    color: 'text-amber-500' 
  },
  { 
    id: 'Screen Printing', 
    title: 'Screen Printing', 
    description: 'Bulk apparel. Calculated by garment + colors + screens.', 
    icon: Layers, 
    color: 'text-blue-500' 
  },
  { 
    id: 'Vinyl Printing', 
    title: 'Vinyl & Stickers', 
    description: 'Stickers and decals. Calculated by SqFt and material grade.', 
    icon: Package, 
    color: 'text-emerald-500' 
  },
  { 
    id: 'Roll Printing', 
    title: 'Bulk Roll Material', 
    description: 'Banners and printable rolls. Calculated per linear foot.', 
    icon: Box, 
    color: 'text-purple-500' 
  }
];

export default function NewProductPage() {
  const router = useRouter();
  const [selectedSegment, setSelectedSegment] = useState<ProductSegment | null>(null);

  if (!selectedSegment) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 py-12">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
              New <span className="text-primary">Architecture</span>
            </h2>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Step 1: Select Industry Segment</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {SEGMENT_OPTIONS.map((opt) => (
            <Card 
              key={opt.id} 
              className="border-2 rounded-[2.5rem] overflow-hidden cursor-pointer group hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
              onClick={() => setSelectedSegment(opt.id)}
            >
              <CardContent className="p-8 flex items-center gap-6">
                <div className={cn("h-16 w-16 rounded-[1.5rem] bg-muted/10 border-2 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", opt.color)}>
                  <opt.icon className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-black uppercase italic tracking-tight">{opt.title}</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">{opt.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="p-8 bg-muted/5 border-2 border-dashed rounded-[3rem] text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Registry Note: Segment selection determines the pricing engine and data schema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSegment(null)} className="mb-2 rounded-xl border">
          <ArrowLeft className="mr-2 h-4 w-4" /> Change Segment
        </Button>
      </div>
      <ProductEditorForm 
        isNew={true} 
        initialData={{ 
          segment: selectedSegment,
          uiTemplate: (selectedSegment === 'Roll Printing' || selectedSegment === 'DTF') ? 'Rolls / DTF' : 'Standard',
          name: '',
          category: selectedSegment === 'Screen Printing' ? 'Apparel' : selectedSegment === 'DTF' ? 'Transfers' : 'Stickers'
        }} 
      />
    </div>
  );
}
