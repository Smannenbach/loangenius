import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Settings } from 'lucide-react';

export default function ReportViewer() {
  const [viewMode, setViewMode] = useState('chart');
  const [filters, setFilters] = useState({});
  const queryClient = useQueryClient();
  
  const reportId = new URLSearchParams(window.location.search).get('id');

  const { data: report } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => base44.entities.ReportDefinition.filter({ id: reportId }).then(r => r[0])
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reportData', reportId, filters],
    queryFn: () => base44.functions.invoke('generateReport', {
      org_id: 'default',
      report_id: reportId,
      filters
    }).then(r => r.data),
    enabled: !!reportId
  });

  if (isLoading) return <div className="p-6">Loading report...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{report?.name}</h1>
          <p className="text-gray-600">{report?.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'chart' ? 'default' : 'outline'}
          onClick={() => setViewMode('chart')}
        >
          Chart View
        </Button>
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onClick={() => setViewMode('table')}
        >
          Table View
        </Button>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && reportData && (
        <Card>
          <CardContent className="pt-6 h-96">
            <ResponsiveContainer width="100%" height="100%">
              {report?.report_type === 'PIPELINE' ? (
                <BarChart data={reportData}>
                  <CartesianGrid />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="loan_amount" fill="#3b82f6" />
                </BarChart>
              ) : report?.report_type === 'PRODUCTION' ? (
                <LineChart data={reportData}>
                  <CartesianGrid />
                  <XAxis dataKey="funded_date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="loan_amount" stroke="#3b82f6" />
                </LineChart>
              ) : (
                <BarChart data={reportData}>
                  <CartesianGrid />
                  <XAxis dataKey="user_name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="funded_volume" fill="#10b981" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {viewMode === 'table' && reportData && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {report?.columns?.map(col => (
                      <th key={col.key} className="text-left py-3 px-4 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      {report?.columns?.map(col => (
                        <td key={col.key} className="py-3 px-4">
                          {typeof row[col.key] === 'number' 
                            ? row[col.key].toLocaleString() 
                            : String(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-500">
        {reportData?.length} rows returned
      </div>
    </div>
  );
}