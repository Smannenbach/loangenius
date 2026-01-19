import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, XCircle, AlertTriangle, Info, 
  FileCode, ChevronDown, ChevronRight, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export default function MISMOValidationReport({ 
  report, 
  validationStatus, 
  schemaPack,
  onProceed,
  onCancel,
  context = 'export',
  allowRawStorage = false,
  onStoreRaw
}) {
  const [expandedSections, setExpandedSections] = React.useState({
    errors: true,
    warnings: true,
    info: false,
  });

  if (!report) return null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const statusConfig = {
    PASS: { 
      icon: CheckCircle2, 
      color: 'text-green-600', 
      bg: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-800',
      label: 'PASS' 
    },
    PASS_WITH_WARNINGS: { 
      icon: AlertTriangle, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      label: 'PASS WITH WARNINGS' 
    },
    FAIL: { 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      label: 'FAIL' 
    },
  };

  const config = statusConfig[validationStatus] || statusConfig.FAIL;
  const StatusIcon = config.icon;

  const renderIssue = (issue, index) => (
    <div 
      key={index} 
      className="p-3 bg-white rounded border border-gray-100 text-sm space-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {issue.code}
          </Badge>
          <span className="font-medium">{issue.message}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => copyToClipboard(`${issue.code}: ${issue.message} at ${issue.xpath || 'N/A'}`)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      {(issue.line || issue.xpath) && (
        <div className="flex gap-4 text-xs text-gray-500 font-mono">
          {issue.line && (
            <span>Line: {issue.line}{issue.column ? `:${issue.column}` : ''}</span>
          )}
          {issue.xpath && (
            <span>XPath: {issue.xpath}</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className={`${config.bg} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-8 w-8 ${config.color}`} />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                XSD Validation Report
                <Badge className={config.badge}>{config.label}</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Schema: {schemaPack}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="flex gap-4">
              <div>
                <span className="text-gray-500">Errors:</span>
                <span className={`ml-1 font-bold ${report.summary.total_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {report.summary.total_errors}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Warnings:</span>
                <span className={`ml-1 font-bold ${report.summary.total_warnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {report.summary.total_warnings}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={report.summary.well_formed ? 'bg-green-50' : 'bg-red-50'}>
            {report.summary.well_formed ? '✓' : '✗'} Well-formed XML
          </Badge>
          <Badge variant="outline" className={report.summary.structure_valid ? 'bg-green-50' : 'bg-red-50'}>
            {report.summary.structure_valid ? '✓' : '✗'} Structure Valid
          </Badge>
          <Badge variant="outline" className={report.summary.data_valid ? 'bg-green-50' : 'bg-red-50'}>
            {report.summary.data_valid ? '✓' : '✗'} Data Valid
          </Badge>
        </div>

        {/* Errors Section */}
        {report.errors.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button 
              className="w-full px-4 py-2 bg-red-100 flex items-center justify-between text-left"
              onClick={() => toggleSection('errors')}
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">
                  Errors ({report.errors.length})
                </span>
              </div>
              {expandedSections.errors ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedSections.errors && (
              <div className="p-3 bg-red-50 space-y-2 max-h-60 overflow-y-auto">
                {report.errors.map((error, idx) => renderIssue(error, idx))}
              </div>
            )}
          </div>
        )}

        {/* Warnings Section */}
        {report.warnings.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button 
              className="w-full px-4 py-2 bg-yellow-100 flex items-center justify-between text-left"
              onClick={() => toggleSection('warnings')}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  Warnings ({report.warnings.length})
                </span>
              </div>
              {expandedSections.warnings ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedSections.warnings && (
              <div className="p-3 bg-yellow-50 space-y-2 max-h-60 overflow-y-auto">
                {report.warnings.map((warning, idx) => renderIssue(warning, idx))}
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        {report.info && report.info.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button 
              className="w-full px-4 py-2 bg-blue-100 flex items-center justify-between text-left"
              onClick={() => toggleSection('info')}
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Info ({report.info.length})
                </span>
              </div>
              {expandedSections.info ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedSections.info && (
              <div className="p-3 bg-blue-50 space-y-2">
                {report.info.map((info, idx) => (
                  <div key={idx} className="text-sm text-blue-800">
                    {info.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 border-t">
          {validationStatus === 'FAIL' ? (
            <>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              {allowRawStorage && context === 'import' && (
                <Button 
                  variant="secondary" 
                  onClick={onStoreRaw}
                  className="flex-1"
                >
                  Store as Raw Only
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={onProceed}
                className={validationStatus === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
              >
                {context === 'export' ? 'Download XML' : 'Import Data'}
                {validationStatus === 'PASS_WITH_WARNINGS' && ' (with warnings)'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}