'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PricingRuleEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PricingRule } from '@/lib/types';

export default function EditPricingRulePage(props: { params: Promise<{ ruleId: string }> }) {
  const params = React.use(props.params);
  const ruleId = params.ruleId;
  const router = useRouter();
  const db = useFirestore();

  const ruleRef = useMemoFirebase(() => 
    ruleId ? doc(db, 'pricing_rules', ruleId) : null, 
  [db, ruleId]);
  
  const { data: rule, isLoading } = useDoc<PricingRule>(ruleRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Pricing Rule not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/pricing')}>Return to rules</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rules
        </Button>
      </div>
      <PricingRuleEditorForm initialData={rule} isNew={false} />
    </div>
  );
}
