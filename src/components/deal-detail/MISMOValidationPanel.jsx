import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, XCircle, AlertTriangle, Shield, Loader2, 
  ChevronDown, ChevronRight, FileCode, Lightbulb, RefreshCw
} from 'lucide-react';

// Correction suggestions for common validation errors
const ERROR_CORRECTIONS = {
  'MISSING_ELEMENT': {
    'COLLATERALS': 'Add at least one property to the deal before export.',
    'PARTIES': 'Add at least one borrower to the deal before export.',
    'TERMS_OF_LOAN': 'Ensure loan amount and rate are set on the deal.',
  },
  'INVALID_LDD_ENUM': {
    'LoanPurposeType': 'Valid values: Purchase, CashOutRefinance, NoCashOutRefinance, ConstructionToPermanent',
    'PropertyType': 'Valid values: SingleFamily, Condominium, Townhouse, TwoToFourFamily, Multifamily',
    'PropertyUsageType': 'Valid values: Investment, PrimaryResidence, SecondHome',
    'AmortizationType': 'Valid values: Fixed, AdjustableRate, InterestOnly',
  },
  'VALUE_TOO_LOW': {
    'BaseLoanAmount': 'Loan amount must be greater than 0.',
    'NoteRatePercent': 'Interest rate must be greater than 0.',
  },
  'VALUE_TOO_HIGH': {
    'LoanToValueRatioPercent': 'LTV exceeds 200%. Check property value and loan amount.',
  },
  'INVALID_FORMAT': {
    'StateCode': 'State code must be 2 uppercase letters (e.g., CA, TX, FL).',
    'PostalCode': 'ZIP code must be 5 digits or 5+4 format (e.g., 90210 or 90210-1234).',
  },
};

function getCorrection(error) {
  const category = ERROR_CORRECTIONS[error.code];
  if (!category) return null;
  
  // Extract field name from xpath or message
  const field = error.xpath?.split('/').pop() || 
    error.message?.match(/(\w+):/)?.[1] ||
    Object.keys(category).find(k => error.message?.includes(k));
  
  return category[field] || Object.values(category)[0];
}

function ValidationItem({ item, type }) {
  const [expanded, setExpanded] = useState(false);
  const correction = type === 'error' ? getCorrection(item) : null;

  const bgColor = type === 'error' 
    ? 'bg-red-50 border-red-200' 
    : type === 'warning' 
      ? 'bg-yellow-50 border-yellow-200' 
      : 'bg-blue-50 border-blue-200';

  const Icon = type === 'error' ? XCircle : type === 'warning' ? AlertTriangle : Lightbulb;
  const iconColor = type === 'error' ? 'text-red-500' : type === 'warning' ? 'text-yellow-500' : 'text-blue-500';

  return (
    <div className={`p-3 border rounded-lg ${bgColor}`}>
      <div 
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className={`h-4 w-4 mt-0.5 ${iconColor} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">{item.code}</Badge>
            {item.line && <span className="text-xs text-gray-500">Line {item.line}</span>}
          </div>
          <p className="text-sm mt-1">{item.message}</p>
        </div>
        {(correction || item.xpath) && (
          expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </div>
      
      {expanded && (
        <div className="mt-2 pl-6 space-y-2">
          {item.xpath && (
            <div className="text-xs">
              <span className="text-gray-500">XPath:</span>
              <code className="ml-1 bg-white px-1.5 py-0.5 rounded font-mono">{item.xpath}</code>
            </div>
          )}
          {correction && (
            <div className="flex items-start gap-2 p-2 bg-white rounded border border-green-200">
              <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-800">Suggested Fix:</p>
                <p className="text-xs text-green-700">{correction}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MISMOValidationPanel({ dealId, onValidationComplete, lenderRequirements }) {
  const [validationResult, setValidationResult] = useState(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      // First generate the MISMO XML
      const exportResponse = await base44.functions.invoke('generateMISMO34', {
        deal_id: dealId,
        include_demographics: true
      });
      
      if (!exportResponse.data.success && exportResponse.data.error) {
        throw new Error(exportResponse.data.error);
      }

      // Then validate it against the schema
      const validationResponse = await base44.functions.invoke('mismoSchemaValidator', {
        xml_content: exportResponse.data.xml_content,
        schema_pack: lenderRequirements?.schema_pack || 'standard',
        validation_mode: 'full',
        context: 'export'
      });

      return {
        export: exportResponse.data,
        validation: validationResponse.data
      };
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (onValidationComplete) {
        onValidationComplete(data);
      }
    }
  });

  const status = validationResult?.validation?.validation_status;
  const report = validationResult?.validation?.report;
  const canProceed = validationResult?.validation?.can_proceed;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            MISMO Validation
          </div>
          <Button
            size="sm"
            variant={validationResult ? "outline" : "default"}
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="gap-2"
          >
            {validateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Validating...</>
            ) : validationResult ? (
              <><RefreshCw className="h-4 w-4" />Re-validate</>
            ) : (
              <><FileCode className="h-4 w-4" />Run Validation</>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!validationResult && !validateMutation.isPending && (
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Click "Run Validation" to check MISMO XML compliance</p>
            <p className="text-xs mt-1">Validates against MISMO 3.4 schema and lender requirements</p>
          </div>
        )}

        {validateMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="font-medium text-red-800">Validation Failed</p>
            </div>
            <p className="text-sm text-red-700 mt-1">{validateMutation.error.message}</p>
          </div>
        )}

        {validationResult && (
          <>
            {/* Status Summary */}
            <div className={`p-4 rounded-lg border-2 ${
              status === 'PASS' 
                ? 'bg-green-50 border-green-300' 
                : status === 'PASS_WITH_WARNINGS'
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status === 'PASS' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : status === 'PASS_WITH_WARNINGS' ? (
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">
                      {status === 'PASS' && 'Validation Passed'}
                      {status === 'PASS_WITH_WARNINGS' && 'Passed with Warnings'}
                      {status === 'FAIL' && 'Validation Failed'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {report?.summary.total_errors} errors, {report?.summary.total_warnings} warnings
                    </p>
                  </div>
                </div>
                <Badge variant={canProceed ? 'default' : 'destructive'} className="text-sm">
                  {canProceed ? 'Can Submit' : 'Blocked'}
                </Badge>
              </div>
            </div>

            {/* Validation Details */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className={`p-3 rounded-lg text-center ${report?.summary.well_formed ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-medium">Well-Formed</p>
                <p>{report?.summary.well_formed ? '✓ Yes' : '✗ No'}</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${report?.summary.structure_valid ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-medium">Structure Valid</p>
                <p>{report?.summary.structure_valid ? '✓ Yes' : '✗ No'}</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${report?.summary.data_valid ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <p className="font-medium">Data Valid</p>
                <p>{report?.summary.data_valid ? '✓ Yes' : '! Warnings'}</p>
              </div>
            </div>

            {/* Errors */}
            {report?.errors?.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Errors ({report.errors.length})
                </h4>
                <div className="space-y-2">
                  {report.errors.map((error, idx) => (
                    <ValidationItem key={idx} item={error} type="error" />
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {report?.warnings?.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({report.warnings.length})
                </h4>
                <div className="space-y-2">
                  {report.warnings.slice(0, 5).map((warning, idx) => (
                    <ValidationItem key={idx} item={warning} type="warning" />
                  ))}
                  {report.warnings.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{report.warnings.length - 5} more warnings
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Block Reason */}
            {!canProceed && validationResult.validation.block_reason && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="font-medium text-red-800">Submission Blocked</p>
                <p className="text-sm text-red-700 mt-1">{validationResult.validation.block_reason}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}