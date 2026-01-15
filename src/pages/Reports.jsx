import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Plus, Download, Eye } from 'lucide-react';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('PIPELINE');
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.ReportDefinition.filter({ is_system: true })
  });

  const filteredReports = reports.filter(r => r.report_type === selectedCategory);

  const categories = ['PIPELINE', 'PRODUCTION', 'SCORECARD', 'LENDER', 'CONVERSION', 'CUSTOM'];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        <Link to={createPageUrl('ReportBuilder')}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Custom Report
          </Button>
        </Link>
      </div>

      {/* Category Navigation */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map(report => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports in this category</p>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }) {
  const mutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateReport', {
      org_id: 'default',
      report_id: report.id,
      filters: {}
    })
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{report.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{report.description}</p>
        
        <div className="flex gap-2">
          <Link to={createPageUrl(`ReportViewer?id=${report.id}`)}>
            <Button size="sm" className="gap-2" variant="outline">
              <Eye className="h-4 w-4" />
              View
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Download className="h-4 w-4" />
            {mutation.isPending ? 'Running...' : 'Run'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}