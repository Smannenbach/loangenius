import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, XCircle, AlertTriangle, FileText, 
  Download, Eye, EyeOff, Shield, Hash 
} from 'lucide-react';

export default function ConformanceReportViewer({ report }) {
  const [showDetails, setShowDetails] = useState(true);

  if (!report) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No conformance report to display</p>
          <p className="text-sm text-gray-400 mt-1">Run validation to generate a report</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'PASS_WITH_WARNINGS':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'FAIL':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'PASS': 'bg-green-100 text-green-800',
      'PASS_WITH_WARNINGS': 'bg-yellow-100 text-yellow-800',
      'FAIL': 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status]}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'well-formedness': 'bg-red-100 text-red-800',
      'xsd': 'bg-orange-100 text-orange-800',
      'enum': 'bg-purple-100 text-purple-800',
      'missing_required': 'bg-blue-100 text-blue-800',
      'conditionality': 'bg-indigo-100 text-indigo-800',
      'mapping_gaps': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conformance_report_${report.report_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`border-2 ${
      report.status === 'PASS' ? 'border-green-300' :
      report.status === 'PASS_WITH_WARNINGS' ? 'border-yellow-300' :
      'border-red-300'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(report.status)}
            <div>
              <CardTitle>Conformance Report</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{report.context === 'export' ? 'Export' : 'Import'}</span>
                <span>•</span>
                <span className="font-mono text-xs">{report.report_id}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(report.status)}
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600">{report.summary.total_errors}</p>
            <p className="text-sm text-gray-600">Errors</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-600">{report.summary.total_warnings}</p>
            <p className="text-sm text-gray-600">Warnings</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-sm font-medium text-gray-900">{report.pack_info?.pack_id?.split('_')[1] || 'MISMO'}</p>
            <p className="text-sm text-gray-600">Schema Pack</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center flex items-center justify-center gap-1">
            <Shield className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-600">PII Redacted</p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h4 className="font-semibold mb-2 text-sm text-gray-600">Issues by Category</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.summary.by_category || {}).map(([category, count]) => (
              count > 0 && (
                <Badge key={category} variant="outline" className={getCategoryColor(category)}>
                  {category.replace(/_/g, ' ')}: {count}
                </Badge>
              )
            ))}
            {Object.values(report.summary.by_category || {}).every(v => v === 0) && (
              <span className="text-sm text-gray-500">No issues found</span>
            )}
          </div>
        </div>

        {/* Errors & Warnings Tabs */}
        <Tabs defaultValue="errors">
          <TabsList>
            <TabsTrigger value="errors" className="gap-1">
              <XCircle className="h-4 w-4" />
              Errors ({report.errors?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="warnings" className="gap-1">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({report.warnings?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="mt-4">
            {report.errors?.length === 0 ? (
              <div className="text-center py-8 text-green-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No errors found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.errors?.map((error, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(error.category)}>{error.category}</Badge>
                        <code className="text-xs bg-red-100 px-1 rounded">{error.code}</code>
                      </div>
                      {error.line > 0 && (
                        <span className="text-xs text-gray-500">Line {error.line}</span>
                      )}
                    </div>
                    <p className="text-red-800 font-medium">{error.message}</p>
                    {error.xpath && error.xpath !== 'unknown' && (
                      <p className="text-xs text-red-600 mt-1 font-mono">XPath: {error.xpath}</p>
                    )}
                    {(error.expected || error.actual) && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {error.expected && (
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-500">Expected:</span>
                            <p className="font-medium">{error.expected}</p>
                          </div>
                        )}
                        {error.actual && (
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-500">Actual:</span>
                            <p className="font-medium">{error.actual}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="warnings" className="mt-4">
            {report.warnings?.length === 0 ? (
              <div className="text-center py-8 text-green-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No warnings</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.warnings?.map((warning, idx) => (
                  <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <div className="flex items-start justify-between mb-1">
                      <Badge className={getCategoryColor(warning.category)}>{warning.category}</Badge>
                      {warning.code && (
                        <code className="text-xs bg-yellow-100 px-1 rounded">{warning.code}</code>
                      )}
                    </div>
                    <p className="text-yellow-800">{warning.message}</p>
                    {warning.details && (
                      <div className="mt-2 bg-white p-2 rounded text-xs">
                        <p className="font-medium mb-1">Unmapped fields (sample):</p>
                        {warning.details.slice(0, 5).map((d, i) => (
                          <div key={i} className="font-mono text-gray-600">{d.element}: {d.value_preview}</div>
                        ))}
                        {warning.details.length > 5 && (
                          <p className="text-gray-500 mt-1">...and {warning.details.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Metadata */}
        <div className="text-xs text-gray-500 flex items-center justify-between border-t pt-3">
          <span>Generated: {new Date(report.metadata?.generated_at).toLocaleString()}</span>
          <span>By: {report.metadata?.generated_by}</span>
        </div>
      </CardContent>
    </Card>
  );
}