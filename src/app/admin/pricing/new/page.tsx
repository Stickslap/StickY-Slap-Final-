
'use client';

import React from 'react';
import { PricingRuleEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewPricingRulePage() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rules
        </Button>
      </div>
      <PricingRuleEditorForm isNew={true} />
    </div>
  );
}
