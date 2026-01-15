import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight } from 'lucide-react';

export default function ReportBuilder() {
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState({
    name: '',
    description: '',
    report_type: 'CUSTOM',
    base_entity: 'Deal',
    columns: [],
    filters: {}
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportDefinition.create({
      org_id: 'default',
      name: data.name,
      description: data.description,
      report_type: data.report_type,
      query_config: { base_entity: data.base_entity },
      columns: data.columns,
      created_by: 'current_user'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      alert('Report created!');
      setStep(1);
      setReportData({
        name: '',
        description: '',
        report_type: 'CUSTOM',
        base_entity: 'Deal',
        columns: [],
        filters: {}
      });
    }
  });

  const handleStepNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleSubmit = () => {
    createMutation.mutate(reportData);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Custom Report</h1>
        <p className="text-gray-600">Step {step} of 4</p>
      </div>

      {/* Step 1: Base Table */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Select Base Entity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Which table would you like to report on?</p>
            {['Deal', 'Borrower', 'Property', 'Document', 'Task'].map(entity => (
              <label key={entity} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-blue-50">
                <input
                  type="radio"
                  name="entity"
                  value={entity}
                  checked={reportData.base_entity === entity}
                  onChange={(e) => setReportData({ ...reportData, base_entity: e.target.value })}
                />
                <span className="font-medium">{entity}</span>
              </label>
            ))}
            <Button onClick={handleStepNext} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Columns */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Select Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Which fields should appear in the report?</p>
            <div className="space-y-2">
              {getColumnsForEntity(reportData.base_entity).map(col => (
                <label key={col} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={reportData.columns.includes(col)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setReportData({ ...reportData, columns: [...reportData.columns, col] });
                      } else {
                        setReportData({ ...reportData, columns: reportData.columns.filter(c => c !== col) });
                      }
                    }}
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              <Button onClick={handleStepNext} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Add Filters (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Filter the data to show only relevant records</p>
            <div className="flex gap-2">
              <Button variant="outline">Add Filter</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              <Button onClick={handleStepNext} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Save */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Save Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Report Name</label>
              <Input
                value={reportData.name}
                onChange={(e) => setReportData({ ...reportData, name: e.target.value })}
                placeholder="e.g., My Custom Pipeline Report"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={reportData.description}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                placeholder="What is this report for?"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getColumnsForEntity(entity) {
  const columnMap = {
    'Deal': ['deal_number', 'borrower_name', 'loan_amount', 'stage', 'created_at'],
    'Borrower': ['name', 'email', 'credit_score', 'deals_count'],
    'Property': ['address', 'property_type', 'value', 'monthly_rent'],
    'Document': ['name', 'type', 'status', 'uploaded_at'],
    'Task': ['title', 'assigned_to', 'due_date', 'status']
  };
  return columnMap[entity] || [];
}