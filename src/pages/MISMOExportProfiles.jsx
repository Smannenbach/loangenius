import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Plus, 
  Copy, 
  Trash2, 
  Save, 
  FileCode, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Upload,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';

export default function MISMOExportProfiles() {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: profiles = [] } = useQuery({
    queryKey: ['mismoProfiles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.FieldMappingProfile.filter({ org_id: orgId });
    },
    enabled: !!orgId,
  });

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldMappingProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismoProfiles'] });
      setIsCreateOpen(false);
      toast.success('Export profile created');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FieldMappingProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismoProfiles'] });
      setIsEditMode(false);
      toast.success('Profile updated');
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldMappingProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismoProfiles'] });
      setSelectedProfile(null);
      toast.success('Profile deleted');
    },
  });

  const duplicateProfileMutation = useMutation({
    mutationFn: async (profile) => {
      const { id, created_date, updated_date, created_by, ...data } = profile;
      return base44.entities.FieldMappingProfile.create({
        ...data,
        profile_name: `${data.profile_name} (Copy)`,
        is_default: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismoProfiles'] });
      toast.success('Profile duplicated');
    },
  });

  const platformOptions = [
    { value: 'MISMO_34', label: 'MISMO 3.4 (Generic)', icon: '📄' },
    { value: 'Encompass', label: 'Encompass', icon: '🏢' },
    { value: 'LendingPad', label: 'LendingPad', icon: '📊' },
    { value: 'Arive', label: 'Arive', icon: '🚀' },
    { value: 'LendingWise', label: 'LendingWise', icon: '💡' },
    { value: 'Custom', label: 'Custom Platform', icon: '⚙️' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileCode className="h-8 w-8 text-blue-600" />
            MISMO 3.4 Export Profiles
          </h1>
          <p className="text-gray-500 mt-1">Configure field mappings for different loan systems</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Export Profile</DialogTitle>
            </DialogHeader>
            <CreateProfileForm
              orgId={orgId}
              platforms={platformOptions}
              onSubmit={(data) => createProfileMutation.mutate(data)}
              isPending={createProfileMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profiles List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Profiles</CardTitle>
              <CardDescription>{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No profiles yet</p>
                </div>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedProfile?.id === profile.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{profile.profile_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{profile.platform} • v{profile.version || '1.0'}</p>
                      </div>
                      {profile.is_default && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Default</Badge>
                      )}
                    </div>
                    {!profile.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          {selectedProfile ? (
            <ProfileEditor
              profile={selectedProfile}
              onUpdate={(data) => updateProfileMutation.mutate({ id: selectedProfile.id, data })}
              onDelete={() => deleteProfileMutation.mutate(selectedProfile.id)}
              onDuplicate={() => duplicateProfileMutation.mutate(selectedProfile)}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Select a profile to view and edit</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateProfileForm({ orgId, platforms, onSubmit, isPending }) {
  const [formData, setFormData] = useState({
    profile_name: '',
    platform: 'MISMO_34',
    version: '3.4',
    extension_namespace: 'LG',
    is_active: true,
    is_default: false,
    mapping_json: getDefaultMapping('MISMO_34'),
  });

  const handlePlatformChange = (platform) => {
    setFormData({
      ...formData,
      platform,
      mapping_json: getDefaultMapping(platform),
    });
  };

  const handleSubmit = () => {
    if (!formData.profile_name || !orgId) {
      toast.error('Profile name is required');
      return;
    }
    onSubmit({ ...formData, org_id: orgId });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Profile Name *</Label>
        <Input
          value={formData.profile_name}
          onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
          placeholder="Encompass DSCR Export"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Target Platform *</Label>
          <Select value={formData.platform} onValueChange={handlePlatformChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Version</Label>
          <Input
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="3.4"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Extension Namespace</Label>
        <Input
          value={formData.extension_namespace}
          onChange={(e) => setFormData({ ...formData, extension_namespace: e.target.value })}
          placeholder="LG"
          maxLength={10}
        />
        <p className="text-xs text-gray-500">Used for custom DSCR/business-purpose fields (e.g., LG:DSCRRatio)</p>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-sm">Set as Default</p>
          <p className="text-xs text-gray-500">Use this profile for all exports by default</p>
        </div>
        <Switch
          checked={formData.is_default}
          onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? 'Creating...' : 'Create Profile'}
      </Button>
    </div>
  );
}

function ProfileEditor({ profile, onUpdate, onDelete, onDuplicate, isEditMode, setIsEditMode }) {
  const [editData, setEditData] = useState(profile);

  const handleSave = () => {
    onUpdate(editData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isEditMode ? (
                <Input
                  value={editData.profile_name}
                  onChange={(e) => setEditData({ ...editData, profile_name: e.target.value })}
                  className="text-xl font-bold"
                />
              ) : (
                profile.profile_name
              )}
            </CardTitle>
            <CardDescription>
              {profile.platform} • Version {profile.version} • Namespace: {profile.extension_namespace || 'LG'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} className="gap-1">
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-1">
                  <Copy className="h-3 w-3" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="gap-1 text-red-600">
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="core">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="core">Core Fields</TabsTrigger>
            <TabsTrigger value="extensions">Extensions</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="space-y-4 mt-4">
            <CoreFieldMappings
              mapping={editData.mapping_json || {}}
              onChange={(mapping) => setEditData({ ...editData, mapping_json: mapping })}
              isEditMode={isEditMode}
            />
          </TabsContent>

          <TabsContent value="extensions" className="space-y-4 mt-4">
            <ExtensionMappings
              mapping={editData.mapping_json || {}}
              namespace={editData.extension_namespace || 'LG'}
              onChange={(mapping) => setEditData({ ...editData, mapping_json: mapping })}
              isEditMode={isEditMode}
            />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4 mt-4">
            <ValidationRules
              mapping={editData.mapping_json || {}}
              onChange={(mapping) => setEditData({ ...editData, mapping_json: mapping })}
              isEditMode={isEditMode}
            />
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <ExportSettings
              profile={editData}
              onChange={setEditData}
              isEditMode={isEditMode}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CoreFieldMappings({ mapping, onChange, isEditMode }) {
  const coreFields = [
    { mismo: 'LoanIdentifier', local: 'deal.deal_number', required: true },
    { mismo: 'LoanPurposeType', local: 'deal.loan_purpose', required: true },
    { mismo: 'BaseLoanAmount', local: 'deal.loan_amount', required: true },
    { mismo: 'NoteRatePercent', local: 'deal.interest_rate', required: true },
    { mismo: 'LoanTermMonths', local: 'deal.loan_term_months', required: true },
    { mismo: 'PropertyEstimatedValueAmount', local: 'property.estimated_value', required: true },
    { mismo: 'PropertyUsageType', local: 'deal.occupancy_type', required: true },
    { mismo: 'PropertyCurrentUsageType', local: 'property.occupancy_type', required: false },
    { mismo: 'BorrowerFirstName', local: 'borrower.first_name', required: true },
    { mismo: 'BorrowerLastName', local: 'borrower.last_name', required: true },
    { mismo: 'BorrowerMiddleName', local: 'borrower.middle_name', required: false },
    { mismo: 'AddressLineText', local: 'property.address_street', required: true },
    { mismo: 'CityName', local: 'property.address_city', required: true },
    { mismo: 'StateCode', local: 'property.address_state', required: true },
    { mismo: 'PostalCode', local: 'property.address_zip', required: true },
  ];

  const currentMapping = mapping.core_fields || {};

  const handleFieldChange = (mismo, value) => {
    if (!isEditMode) return;
    const updated = {
      ...mapping,
      core_fields: {
        ...currentMapping,
        [mismo]: value,
      },
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Core MISMO 3.4 Fields</h3>
        <Badge variant="outline">{coreFields.length} fields</Badge>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {coreFields.map((field) => (
          <div key={field.mismo} className="grid grid-cols-3 gap-3 items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">{field.mismo}</p>
              {field.required && <Badge className="bg-red-100 text-red-700 text-xs mt-1">Required</Badge>}
            </div>
            <div className="text-sm text-gray-500">→</div>
            <Input
              value={currentMapping[field.mismo] || field.local}
              onChange={(e) => handleFieldChange(field.mismo, e.target.value)}
              disabled={!isEditMode}
              placeholder={field.local}
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtensionMappings({ mapping, namespace, onChange, isEditMode }) {
  const extensionFields = [
    { field: 'DSCRRatio', local: 'deal.dscr', type: 'decimal', description: 'Debt Service Coverage Ratio' },
    { field: 'LTVRatio', local: 'deal.ltv', type: 'decimal', description: 'Loan-to-Value Ratio' },
    { field: 'MonthlyPITIA', local: 'deal.monthly_pitia', type: 'currency', description: 'Monthly Principal, Interest, Taxes, Insurance, Association' },
    { field: 'LoanProductType', local: 'deal.loan_product', type: 'string', description: 'DSCR, Hard Money, Bridge, etc.' },
    { field: 'BusinessPurposeIndicator', local: 'deal.is_business_purpose', type: 'boolean', description: 'Business Purpose Loan Flag' },
    { field: 'IsBlanketLoan', local: 'deal.is_blanket', type: 'boolean', description: 'Blanket/Portfolio Loan' },
    { field: 'PropertyCountInBlanket', local: 'deal.blanket_property_count', type: 'integer', description: 'Number of properties in blanket' },
    { field: 'GrossRentalIncome', local: 'property.gross_rent_monthly', type: 'currency', description: 'Monthly rental income' },
    { field: 'NetRentalIncome', local: 'property.net_rent_monthly', type: 'currency', description: 'Net rental income after expenses' },
    { field: 'PrepaymentPenaltyType', local: 'deal.prepay_penalty_type', type: 'string', description: '5-4-3-2-1, Soft PPP, etc.' },
    { field: 'PrepaymentPenaltyTermMonths', local: 'deal.prepay_penalty_term_months', type: 'integer', description: 'Prepay penalty duration' },
    { field: 'IsInterestOnly', local: 'deal.is_interest_only', type: 'boolean', description: 'Interest Only Loan' },
    { field: 'InterestOnlyPeriodMonths', local: 'deal.interest_only_period_months', type: 'integer', description: 'IO period length' },
  ];

  const currentExtensions = mapping.extension_fields || {};

  const handleExtensionChange = (field, value) => {
    if (!isEditMode) return;
    const updated = {
      ...mapping,
      extension_fields: {
        ...currentExtensions,
        [field]: value,
      },
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Extension Fields ({namespace}:*)</h3>
          <p className="text-xs text-gray-500 mt-1">Custom DSCR/commercial fields per MEG 0025</p>
        </div>
        <Badge variant="outline">{extensionFields.length} extensions</Badge>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {extensionFields.map((ext) => (
          <div key={ext.field} className="p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-3 items-start mb-2">
              <div>
                <p className="text-sm font-mono text-blue-600">{namespace}:{ext.field}</p>
                <Badge variant="secondary" className="text-xs mt-1">{ext.type}</Badge>
              </div>
              <div className="text-sm text-gray-500">→</div>
              <Input
                value={currentExtensions[ext.field] || ext.local}
                onChange={(e) => handleExtensionChange(ext.field, e.target.value)}
                disabled={!isEditMode}
                placeholder={ext.local}
                className="text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">{ext.description}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>MEG 0025 Compliance:</strong> All extension fields are namespaced under <code className="bg-white px-1 py-0.5 rounded">{namespace}:</code> and validate against MISMO 3.4 schema.
        </p>
      </div>
    </div>
  );
}

function ValidationRules({ mapping, onChange, isEditMode }) {
  const validationRules = mapping.validation_rules || {
    require_all_borrowers: true,
    require_subject_property: true,
    allow_partial_data: false,
    strict_enum_validation: true,
    require_signatures: false,
  };

  const handleRuleChange = (rule, value) => {
    if (!isEditMode) return;
    onChange({
      ...mapping,
      validation_rules: {
        ...validationRules,
        [rule]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Validation Rules</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Require All Borrowers</p>
            <p className="text-xs text-gray-500">Export fails if borrower data is incomplete</p>
          </div>
          <Switch
            checked={validationRules.require_all_borrowers}
            onCheckedChange={(v) => handleRuleChange('require_all_borrowers', v)}
            disabled={!isEditMode}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Require Subject Property</p>
            <p className="text-xs text-gray-500">At least one subject property must exist</p>
          </div>
          <Switch
            checked={validationRules.require_subject_property}
            onCheckedChange={(v) => handleRuleChange('require_subject_property', v)}
            disabled={!isEditMode}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Allow Partial Data (Best Effort)</p>
            <p className="text-xs text-gray-500">Export with warnings instead of failing</p>
          </div>
          <Switch
            checked={validationRules.allow_partial_data}
            onCheckedChange={(v) => handleRuleChange('allow_partial_data', v)}
            disabled={!isEditMode}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Strict Enum Validation</p>
            <p className="text-xs text-gray-500">Reject values not in MISMO enumerations</p>
          </div>
          <Switch
            checked={validationRules.strict_enum_validation}
            onCheckedChange={(v) => handleRuleChange('strict_enum_validation', v)}
            disabled={!isEditMode}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Require Signatures</p>
            <p className="text-xs text-gray-500">Application must have borrower signatures</p>
          </div>
          <Switch
            checked={validationRules.require_signatures}
            onCheckedChange={(v) => handleRuleChange('require_signatures', v)}
            disabled={!isEditMode}
          />
        </div>
      </div>
    </div>
  );
}

function ExportSettings({ profile, onChange, isEditMode }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Export Settings</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Active Profile</p>
            <p className="text-xs text-gray-500">Enable this profile for exports</p>
          </div>
          <Switch
            checked={profile.is_active}
            onCheckedChange={(v) => onChange({ ...profile, is_active: v })}
            disabled={!isEditMode}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Default Profile</p>
            <p className="text-xs text-gray-500">Use as default for all exports</p>
          </div>
          <Switch
            checked={profile.is_default}
            onCheckedChange={(v) => onChange({ ...profile, is_default: v })}
            disabled={!isEditMode}
          />
        </div>
      </div>

      <div className="p-4 border-2 border-dashed rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-sm">Profile JSON</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const json = JSON.stringify(profile.mapping_json, null, 2);
              navigator.clipboard.writeText(json);
              toast.success('Mapping JSON copied to clipboard');
            }}
            className="gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto max-h-48">
          {JSON.stringify(profile.mapping_json, null, 2)}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export as JSON
        </Button>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import from JSON
        </Button>
      </div>
    </div>
  );
}

function getDefaultMapping(platform) {
  const baseMapping = {
    core_fields: {
      LoanIdentifier: 'deal.deal_number',
      LoanPurposeType: 'deal.loan_purpose',
      BaseLoanAmount: 'deal.loan_amount',
      NoteRatePercent: 'deal.interest_rate',
      LoanTermMonths: 'deal.loan_term_months',
    },
    extension_fields: {
      DSCRRatio: 'deal.dscr',
      LTVRatio: 'deal.ltv',
      MonthlyPITIA: 'deal.monthly_pitia',
      LoanProductType: 'deal.loan_product',
    },
    validation_rules: {
      require_all_borrowers: true,
      require_subject_property: true,
      allow_partial_data: platform === 'MISMO_34',
      strict_enum_validation: true,
    },
  };

  // Platform-specific overrides
  if (platform === 'Encompass') {
    baseMapping.extension_fields.EncompassLoanGuid = 'deal.external_id';
  } else if (platform === 'LendingPad') {
    baseMapping.extension_fields.LendingPadFileNumber = 'deal.external_id';
  }

  return baseMapping;
}