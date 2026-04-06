
'use client';

import React, { useState } from 'react';
import { 
  Truck, 
  Package, 
  Clock, 
  Settings, 
  BarChart3,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShippingQueueTab } from './queue-tab';
import { ShippingOptionsTab } from './options-tab';
import { ShippingSettingsTab } from './settings-tab';
import { useAdmin } from '../layout';

export default function ShippingAdminPage() {
  const [activeTab, setActiveTab] = useState('queue');
  const { isStaff, isSyncing } = useAdmin();

  if (!isStaff && !isSyncing) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Shipping</h2>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Administrative Access Required</AlertTitle>
          <AlertDescription>
            You do not have the required permissions to access shipping fulfillment. 
            Please contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Shipping & Fulfillment</h2>
          <p className="text-muted-foreground">Manage shipping methods, transit times, and your delivery queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Carrier Stats
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="queue"><Clock className="mr-2 h-4 w-4" /> Queue</TabsTrigger>
          <TabsTrigger value="options"><Truck className="mr-2 h-4 w-4" /> Methods</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="queue">
            <ShippingQueueTab />
          </TabsContent>
          <TabsContent value="options">
            <ShippingOptionsTab />
          </TabsContent>
          <TabsContent value="settings">
            <ShippingSettingsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
