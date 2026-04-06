
'use client';

import React from 'react';
import { HelpEditorForm } from '../editor-form';

export default function NewHelpArticlePage() {
  return (
    <div className="max-w-6xl mx-auto pb-20">
      <HelpEditorForm isNew={true} />
    </div>
  );
}
