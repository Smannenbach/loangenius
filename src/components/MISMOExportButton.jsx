import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileOutput, Download, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function MISMOExportButton({ dealId, className = "" }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (bestEffort = true) => {
    if (!dealId) {
      toast.error('No deal selected');
      return;
    }

    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportDealMISMO', { 
        deal_id: dealId,
        best_effort: bestEffort,
      });
      
      const data = response.data;
      
      if (!data?.xml_content) {
        throw new Error('No XML content returned');
      }

      // Download the file
      const blob = new Blob([data.xml_content], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `MISMO34_${dealId}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show appropriate toast based on conformance
      if (data.conformance_status === 'pass') {
        toast.success('MISMO 3.4 XML Exported', {
          description: `File: ${data.filename} • Size: ${(data.byte_size / 1024).toFixed(1)} KB`,
          icon: <CheckCircle className="h-5 w-5" />,
        });
      } else if (data.conformance_status === 'warn') {
        toast.warning('MISMO Exported with Warnings', {
          description: `${data.validation_warnings?.length || 0} warnings • Review recommended`,
          icon: <AlertTriangle className="h-5 w-5" />,
        });
      } else {
        toast.error('Export Contains Validation Errors', {
          description: `${data.validation_errors?.length || 0} errors found • Best-effort export`,
        });
      }
    } catch (error) {
      console.error('MISMO export error:', error);
      toast.error('Export Failed', {
        description: error.message || 'Unable to generate MISMO 3.4 XML',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isExporting}
          className={`gap-2 ${className}`}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileOutput className="h-4 w-4" />
              Export MISMO
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport(true)} className="gap-2">
          <Download className="h-4 w-4" />
          MISMO 3.4 XML (Best Effort)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(false)} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          MISMO 3.4 XML (Strict)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-gray-500">
          More formats coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}