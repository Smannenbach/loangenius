import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft, Plus, X, FileText, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const ENTITY_CONFIGS = {
  'Deal': {
    label: 'Deals / Loans',
    description: 'Loan applications and pipeline deals',
    columns: [
      { key: 'deal_number', label: 'Deal Number', type: 'string' },
      { key: 'loan_amount', label: 'Loan Amount', type: 'currency' },
      { key: 'loan_product', label: 'Loan Product', type: 'string' },
      { key: 'loan_purpose', label: 'Loan Purpose', type: 'string' },
      { key: 'stage', label: 'Stage', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'interest_rate', label: 'Interest Rate', type: 'percent' },
      { key: 'ltv', label: 'LTV', type: 'percent' },
      { key: 'dscr', label: 'DSCR', type: 'number' },
      { key: 'created_date', label: 'Created Date', type: 'date' },
      { key: 'application_date', label: 'Application Date', type: 'date' },
    ],
    filters: ['stage', 'status', 'loan_product', 'loan_purpose']
  },
  'Lead': {
    label: 'Leads',
    description: 'Sales leads and prospects',
    columns: [
      { key: 'first_name', label: 'First Name', type: 'string' },
      { key: 'last_name', label: 'Last Name', type: 'string' },
      { key: 'home_email', label: 'Email', type: 'string' },
      { key: 'mobile_phone', label: 'Phone', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'loan_type', label: 'Loan Type', type: 'string' },
      { key: 'loan_amount', label: 'Loan Amount', type: 'currency' },
      { key: 'property_city', label: 'City', type: 'string' },
      { key: 'property_state', label: 'State', type: 'string' },
      { key: 'source', label: 'Source', type: 'string' },
      { key: 'created_date', label: 'Created Date', type: 'date' },
    ],
    filters: ['status', 'loan_type', 'source']
  },
  'Contact': {
    label: 'Contacts',
    description: 'Borrowers and business contacts',
    columns: [
      { key: 'first_name', label: 'First Name', type: 'string' },
      { key: 'last_name', label: 'Last Name', type: 'string' },
      { key: 'entity_name', label: 'Entity Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'phone', label: 'Phone', type: 'string' },
      { key: 'contact_type', label: 'Type', type: 'string' },
      { key: 'lead_status', label: 'Lead Status', type: 'string' },
      { key: 'created_date', label: 'Created Date', type: 'date' },
    ],
    filters: ['contact_type', 'lead_status']
  },
  'Task': {
    label: 'Tasks',
    description: 'Tasks and to-dos',
    columns: [
      { key: 'title', label: 'Title', type: 'string' },
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'priority', label: 'Priority', type: 'string' },
      { key: 'assigned_to', label: 'Assigned To', type: 'string' },
      { key: 'due_date', label: 'Due Date', type: 'date' },
      { key: 'created_date', label: 'Created Date', type: 'date' },
    ],
    filters: ['status', 'priority']
  },
  'Property': {
    label: 'Properties',
    description: 'Subject and REO properties',
    columns: [
      { key: 'address_street', label: 'Street Address', type: 'string' },
      { key: 'address_city', label: 'City', type: 'string' },
      { key: 'address_state', label: 'State', type: 'string' },
      { key: 'property_type', label: 'Property Type', type: 'string' },
      { key: 'estimated_value', label: 'Estimated Value', type: 'currency' },
      { key: 'gross_rent_monthly', label: 'Monthly Rent', type: 'currency' },
      { key: 'number_of_units', label: 'Units', type: 'number' },
    ],
    filters: ['property_type', 'address_state']
  }
};

export default function ReportBuilder() {
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState({
    name: '',
    description: '',
    report_type: 'CUSTOM',
    base_entity: 'Deal',
    columns: [],
    filters: [],
    sort_by: '',
    sort_order: 'desc'
  });
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id || 'default';

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ReportDefinition.create({
        org_id: orgId,
        name: data.name,
        description: data.description,
        report_type: 'CUSTOM',
        query_config: { 
          base_entity: data.base_entity,
          sort_by: data.sort_by,
          sort_order: data.sort_order
        },
        columns: data.columns,
        filters: data.filters,
        is_system: false,
        created_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report created successfully!');
      navigate(createPageUrl('Reports'));
    },
    onError: (error) => {
      toast.error('Failed to create report: ' + error.message);
    }
  });

  const entityConfig = ENTITY_CONFIGS[reportData.base_entity];

  const addFilter = () => {
    setReportData({
      ...reportData,
      filters: [...reportData.filters, { field: '', operator: 'equals', value: '' }]
    });
  };

  const updateFilter = (index, updates) => {
    const newFilters = [...reportData.filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setReportData({ ...reportData, filters: newFilters });
  };

  const removeFilter = (index) => {
    setReportData({
      ...reportData,
      filters: reportData.filters.filter((_, i) => i !== index)
    });
  };

  const toggleColumn = (colKey) => {
    if (reportData.columns.includes(colKey)) {
      setReportData({ ...reportData, columns: reportData.columns.filter(c => c !== colKey) });
    } else {
      setReportData({ ...reportData, columns: [...reportData.columns, colKey] });
    }
  };

  const selectAllColumns = () => {
    setReportData({ ...reportData, columns: entityConfig.columns.map(c => c.key) });
  };

  const clearColumns = () => {
    setReportData({ ...reportData, columns: [] });
  };

  const handleSubmit = () => {
    if (!reportData.name.trim()) {
      toast.error('Please enter a report name');
      return;
    }
    if (reportData.columns.length === 0) {
      toast.error('Please select at least one column');
      return;
    }
    createMutation.mutate(reportData);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <button
            onClick={() => setStep(s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
              step === s 
                ? 'bg-blue-600 text-white' 
                : step > s 
                  ? 'bg-green-100 text-green-700 border-2 border-green-500' 
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {step > s ? <Check className="h-5 w-5" /> : s}
          </button>
          {s < 4 && (
            <div className={`w-12 h-1 rounded ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          Report Builder
        </h1>
        <p className="text-gray-600 mt-2">Create custom reports in 4 easy steps</p>
      </div>

      <StepIndicator />

      {/* Step 1: Select Entity */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Choose Data Source</CardTitle>
            <CardDescription>Select which data you want to report on</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                <label
                  key={key}
                  className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    reportData.base_entity === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="entity"
                    value={key}
                    checked={reportData.base_entity === key}
                    onChange={(e) => setReportData({ ...reportData, base_entity: e.target.value, columns: [] })}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">{config.label}</span>
                    <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{config.columns.length} available fields</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Columns */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Columns</CardTitle>
            <CardDescription>Choose which fields to include in your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAllColumns}>Select All</Button>
              <Button variant="outline" size="sm" onClick={clearColumns}>Clear All</Button>
              <Badge variant="secondary" className="ml-auto">
                {reportData.columns.length} selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {entityConfig.columns.map(col => (
                <label
                  key={col.key}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    reportData.columns.includes(col.key) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={reportData.columns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-sm">{col.label}</span>
                    <p className="text-xs text-gray-500">{col.type}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={reportData.columns.length === 0} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters & Sorting */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Filters & Sorting</CardTitle>
            <CardDescription>Optionally filter and sort your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Filters</Label>
              {reportData.filters.length === 0 ? (
                <p className="text-sm text-gray-500 mb-3">No filters added. Click below to add one.</p>
              ) : (
                <div className="space-y-3 mb-3">
                  {reportData.filters.map((filter, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select value={filter.field} onValueChange={(v) => updateFilter(idx, { field: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {entityConfig.filters.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, { operator: v })}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(idx, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeFilter(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={addFilter} className="gap-2">
                <Plus className="h-4 w-4" /> Add Filter
              </Button>
            </div>

            {/* Sorting */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Sort By</Label>
              <div className="flex gap-3">
                <Select value={reportData.sort_by} onValueChange={(v) => setReportData({ ...reportData, sort_by: v })}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {reportData.columns.map(col => {
                      const colConfig = entityConfig.columns.find(c => c.key === col);
                      return <SelectItem key={col} value={col}>{colConfig?.label || col}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={reportData.sort_order} onValueChange={(v) => setReportData({ ...reportData, sort_order: v })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Save Report */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Name & Save</CardTitle>
            <CardDescription>Give your report a name and save it</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Report Name *</Label>
              <Input
                value={reportData.name}
                onChange={(e) => setReportData({ ...reportData, name: e.target.value })}
                placeholder="e.g., Weekly Pipeline Summary"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={reportData.description}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                placeholder="What is this report for?"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-semibold">Report Summary</h4>
              <p className="text-sm text-gray-600">
                <strong>Data Source:</strong> {ENTITY_CONFIGS[reportData.base_entity].label}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Columns:</strong> {reportData.columns.length} fields selected
              </p>
              <p className="text-sm text-gray-600">
                <strong>Filters:</strong> {reportData.filters.length || 'None'}
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || !reportData.name.trim()}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="h-4 w-4" /> Create Report</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}