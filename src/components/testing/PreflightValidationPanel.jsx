import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2, FileCode, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function PreflightValidationPanel() {
  const [canonicalJson, setCanonicalJson] = useState('');
  const [packId, setPackId] = useState('PACK_A_GENERIC_MISMO_34_B324');
  const [report, setReport] = useState(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      let data;
      try {
        data = JSON.parse(canonicalJson);
      } catch (e) {
        throw new Error('Invalid JSON: ' + e.message);
      }

      const response = await base44.functions.invoke('mismoLDDRulesEngine', {
        action: 'preflight_validation',
        canonical_data: data,
        pack_id: packId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data.report);
      if (data.report.status === 'PASS') {
        toast.success('Preflight validation passed!');
      } else if (data.report.status === 'PASS_WITH_WARNINGS') {
        toast.warning(`Passed with ${data.report.warnings.length} warning(s)`);
      } else {
        toast.error(`Validation failed with ${data.report.errors.length} error(s)`);
      }
    },
    onError: (error) => {
      toast.error('Validation failed: ' + error.message);
    }
  });

  const sampleData = {
    loan_amount: 500000,
    loan_purpose: 'Purchase',
    interest_rate: 7.5,
    occupancy_type: 'Investment',
    property_street: '123 Main St',
    property_city: 'Los Angeles',
    property_state: 'CA',
    property_zip: '90210',
    property_type: 'Detached',
    vesting_type: 'Individual',
    borrower_first_name: 'John',
    borrower_last_name: 'Doe',
    citizenship_status: 'USCitizen',
    marital_status: 'Married'
  };

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
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            MISMO Preflight Validation
          </CardTitle>
          <CardDescription>
            Validate canonical data against LDD rules before XML generation.
            Checks enums, datatypes, required fields, and conditional logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Schema Pack</Label>
              <Select value={packId} onValueChange={setPackId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PACK_A_GENERIC_MISMO_34_B324">Generic MISMO 3.4 B324</SelectItem>
                  <SelectItem value="PACK_B_DU_ULAD_STRICT_34_B324">DU/ULAD Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setCanonicalJson(JSON.stringify(sampleData, null, 2))}
            >
              Load Sample Data
            </Button>
          </div>

          <div>
            <Label>Canonical JSON Data</Label>
            <Textarea
              value={canonicalJson}
              onChange={(e) => setCanonicalJson(e.target.value)}
              placeholder='{"loan_amount": 500000, "loan_purpose": "Purchase", ...}'
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <Button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending || !canonicalJson.trim()}
            className="gap-2"
          >
            {validateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Validating...</>
            ) : (
              <><Play className="h-4 w-4" />Run Preflight Validation</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Report */}
      {report && (
        <Card className={`border-2 ${
          report.status === 'PASS' ? 'border-green-300 bg-green-50' :
          report.status === 'PASS_WITH_WARNINGS' ? 'border-yellow-300 bg-yellow-50' :
          'border-red-300 bg-red-50'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(report.status)}
                <span>Preflight Report</span>
                {getStatusBadge(report.status)}
              </div>
              <span className="text-sm font-normal text-gray-500">
                {new Date(report.validated_at).toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className={`text-2xl font-bold ${report.summary.total_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {report.summary.total_errors}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Warnings</p>
                <p className={`text-2xl font-bold ${report.summary.total_warnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {report.summary.total_warnings}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Missing Required</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.missing_required}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Enum Violations</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.enum_violations}</p>
              </div>
            </div>

            {/* Errors List */}
            {report.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Errors ({report.errors.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {report.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-white border border-red-200 rounded-lg text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1 text-xs">{error.category}</Badge>
                          <p className="font-medium text-red-800">{error.message}</p>
                          {error.field && (
                            <p className="text-red-600 text-xs mt-1">
                              Field: <code className="bg-red-100 px-1 rounded">{error.field}</code>
                              {error.value && <> • Value: <code className="bg-red-100 px-1 rounded">{error.value}</code></>}
                            </p>
                          )}
                          {error.allowed_values && (
                            <p className="text-xs text-gray-600 mt-1">
                              Allowed: {error.allowed_values.slice(0, 5).join(', ')}{error.allowed_values.length > 5 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings List */}
            {report.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({report.warnings.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {report.warnings.map((warning, idx) => (
                    <div key={idx} className="p-3 bg-white border border-yellow-200 rounded-lg text-sm">
                      <Badge variant="outline" className="mb-1 text-xs">{warning.category}</Badge>
                      <p className="text-yellow-800">{warning.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success message */}
            {report.status === 'PASS' && (
              <div className="p-4 bg-green-100 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Ready for Export</p>
                  <p className="text-sm text-green-700">All LDD rules passed. XML generation can proceed.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}