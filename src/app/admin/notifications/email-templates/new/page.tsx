
'use client';

import React from 'react';
import { EmailEditorForm } from '../editor-form';

export default function NewEmailTemplatePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <EmailEditorForm isNew={true} />
    </div>
  );
}
