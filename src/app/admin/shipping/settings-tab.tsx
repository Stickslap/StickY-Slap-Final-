
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Save, Loader2, Globe, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShippingSettings } from '@/lib/types';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useAdmin } from '../layout';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ShippingSettingsTab() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  
  const settingsRef = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return doc(db, 'settings', 'shipping');
  }, [db, user, isStaff, isSyncing]);

  const { data: settings, isLoading, error } = useDoc<ShippingSettings>(settingsRef);
  
  const [formData, setFormData] = useState<Partial<ShippingSettings>>({
    businessDays: [1, 2, 3, 4, 5],
    holidays: [],
    defaultCutoffTime: '14:00',
    timezone: 'America/New_York'
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({ title: "Settings Saved" });
  };

  const toggleDay = (dayIndex: number) => {
    const current = formData.businessDays || [];
    const updated = current.includes(dayIndex) 
      ? current.filter(d => d !== dayIndex) 
      : [...current, dayIndex];
    setFormData({...formData, businessDays: updated});
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Unable to access shipping settings. Your administrative session may need a moment to synchronize.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading global rules...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Days</CardTitle>
            <CardDescription>Select which days your production team operates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {DAYS.map((day, idx) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`day-${idx}`} 
                    checked={formData.businessDays?.includes(idx)}
                    onCheckedChange={() => toggleDay(idx)}
                  />
                  <label htmlFor={`day-${idx}`} className="text-sm font-medium leading-none cursor-pointer">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Local Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Cutoff Time</Label>
              <Input 
                type="time" 
                value={formData.defaultCutoffTime} 
                onChange={e => setFormData({...formData, defaultCutoffTime: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input 
                value={formData.timezone} 
                onChange={e => setFormData({...formData, timezone: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Holiday & Blackout Dates</CardTitle>
            <CardDescription>Add specific dates where no processing or shipping occurs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.holidays?.map((date, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {date}
                  <button onClick={() => setFormData({...formData, holidays: formData.holidays?.filter(h => h !== date)})}>
                    &times;
                  </button>
                </Badge>
              ))}
              {!formData.holidays?.length && <p className="text-xs text-muted-foreground italic">No blackout dates added.</p>}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <CalendarIcon className="mr-2 h-4 w-4" /> Add Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  onSelect={(date) => {
                    if (!date) return;
                    const iso = format(date, 'yyyy-MM-dd');
                    if (!formData.holidays?.includes(iso)) {
                      setFormData({...formData, holidays: [...(formData.holidays || []), iso]});
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} size="lg" className="px-8" disabled={!settingsRef}>
            <Save className="mr-2 h-4 w-4" /> Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
