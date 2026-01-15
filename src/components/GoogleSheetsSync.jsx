import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, RefreshCw, Check, AlertCircle, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GoogleSheetsSync() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: syncConfig } = useQuery({
    queryKey: ['googleSheetsSync', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return null;
      const configs = await base44.entities.GoogleSheetsSync.filter({
        org_id: user.org_id
      });
      return configs?.[0] || null;
    },
    enabled: !!user?.org_id,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const sheetId = spreadsheetId || syncConfig?.spreadsheet_id;
      if (!sheetId) {
        throw new Error('Please enter a Google Sheets ID');
      }
      return await base44.functions.invoke('syncGoogleSheetsLeads', {
        spreadsheet_id: sheetId,
        sync_direction: 'export',
      });
    },
    onSuccess: (data) => {
      alert(`Successfully synced ${data.data.synced_count} leads to Google Sheets!`);
      setIsOpen(false);
      setSpreadsheetId('');
    },
    onError: (error) => {
      alert(`Sync failed: ${error.message}`);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-11 shadow-sm">
          <Sheet className="h-4 w-4" />
          {syncConfig ? 'Google Sheets Synced' : 'Sync with Google Sheets'}
          {syncConfig && <Check className="h-4 w-4 text-emerald-600 ml-1" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-blue-600" />
            Sync Leads to Google Sheets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {syncConfig && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900 text-sm">Connected</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Last synced: {new Date(syncConfig.last_sync_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {syncConfig.last_sync_count} leads synced
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">Google Sheets ID</Label>
            <p className="text-xs text-slate-600">
              Find this in your Sheet URL: docs.google.com/spreadsheets/d/<span className="font-mono font-bold">SHEET_ID</span>/edit
            </p>
            <Input
              placeholder={syncConfig?.spreadsheet_id || "Paste your Sheets ID here..."}
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="h-11 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">What gets synced:</p>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Lead names and contact info (email, phone)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Property details and loan information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Lead status and creation date</span>
              </li>
            </ul>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 h-11 gap-2"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}