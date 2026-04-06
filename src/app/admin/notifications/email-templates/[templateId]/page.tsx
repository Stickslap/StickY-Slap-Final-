'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EmailEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { EmailTemplate } from '@/lib/types';

export default function EditEmailTemplatePage(props: { params: Promise<{ templateId: string }> }) {
  const resolvedParams = React.use(props.params);
  const templateId = resolvedParams.templateId;
  const router = useRouter();
  const db = useFirestore();

  const templateRef = useMemoFirebase(() => 
    templateId ? doc(db, 'email_templates', templateId) : null, 
  [db, templateId]);
  
  const { data: template, isLoading } = useDoc<EmailTemplate>(templateRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Template not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/notifications/email-templates')}>Return to Registry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <EmailEditorForm initialData={template} isNew={false} />
    </div>
  );
}
