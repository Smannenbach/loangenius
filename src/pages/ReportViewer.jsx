import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, Filter, TrendingUp, DollarSign, Users, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get('id');

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      try {
        const reports = await base44.entities.ReportDefinition.filter({ id: reportId });
        return reports[0];
      } catch {
        return null;
      }
    },
    enabled: !!reportId,
  });

  const { data: reportData, isLoading: dataLoading } = useQuery({
    queryKey: ['reportData', reportId],
    queryFn: async () => {
      if (!report) return [];
      
      // Fetch data based on report entity type
      const entity = report.query_config?.base_entity || 'Deal';
      try {
        switch (entity) {
          case 'Deal':
            return await base44.entities.Deal.list();
          case 'Borrower':
            return await base44.entities.Borrower.list();
          case 'Property':
            return await base44.entities.Property.list();
          case 'Document':
            return await base44.entities.Document.list();
          default:
            return [];
        }
      } catch {
        return [];
      }
    },
    enabled: !!report,
  });

  const handleExport = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const columns = report?.columns || ['id', 'created_date'];
    const csvContent = [
      columns.join(','),
      ...reportData.map(row => 
        columns.map(col => row[col] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report?.name || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported to CSV');
  };

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Report not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            {report.name}
          </h1>
          <p className="text-gray-500 mt-1">{report.description}</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold">{reportData?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Report Type</p>
                <Badge>{report.report_type}</Badge>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Report Data</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : reportData?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {(report.columns || ['id', 'created_date']).map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData?.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {(report.columns || ['id', 'created_date']).map(col => (
                        <td key={col} className="px-4 py-3 text-sm">
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : (row[col]?.toString() || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData?.length > 50 && (
                <p className="text-sm text-gray-500 p-4 text-center">
                  Showing first 50 of {reportData.length} records. Export to see all.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}