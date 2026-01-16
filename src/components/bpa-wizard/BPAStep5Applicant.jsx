import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UserPlus, AlertCircle } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const MARITAL_STATUS = [
  { value: 'Married', label: 'Married' },
  { value: 'Unmarried', label: 'Unmarried (single, divorced, widowed)' },
  { value: 'Separated', label: 'Separated' },
];

const CITIZENSHIP_STATUS = [
  { value: 'US_Citizen', label: 'US Citizen' },
  { value: 'Permanent_Resident', label: 'Permanent Resident Alien' },
  { value: 'NPRA_Work_Visa', label: 'Non-Perm Res Alien w/ Work Visa (NPRA)' },
  { value: 'NPRA_ITIN', label: 'Non-Perm Res Alien w/out Work Visa (ITIN)' },
  { value: 'Foreign_National', label: 'Foreign National' },
];

const HOUSING_STATUS = [
  { value: 'Own', label: 'Own' },
  { value: 'Rent', label: 'Rent' },
  { value: 'Rent Free', label: 'Rent Free' },
];

const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

export default function BPAStep5Applicant({ formData, updateFormData, errors }) {
  const [activeTab, setActiveTab] = useState('applicant');
  const [hasCoApplicant, setHasCoApplicant] = useState(!!formData.co_applicant);

  const updateApplicant = (field, value) => {
    updateFormData({
      applicant: { ...formData.applicant, [field]: value },
    });
  };

  const updateCoApplicant = (field, value) => {
    updateFormData({
      co_applicant: { ...(formData.co_applicant || {}), [field]: value },
    });
  };

  const toggleCoApplicant = () => {
    if (hasCoApplicant) {
      updateFormData({ co_applicant: null });
      setHasCoApplicant(false);
      setActiveTab('applicant');
    } else {
      updateFormData({
        co_applicant: {
          first_name: '',
          middle_name: '',
          last_name: '',
          suffix: '',
          ssn: '',
          taxpayer_id_type: 'SSN',
          home_phone: '',
          dob: '',
          marital_status: '',
          citizenship_status: '',
          current_address_street: '',
          current_address_city: '',
          current_address_state: '',
          current_address_zip: '',
          time_at_address_years: '',
          time_at_address_months: '',
          housing_status: '',
          mailing_same_as_current: true,
          dependents_count: 0,
          dependents_ages: '',
        },
      });
      setHasCoApplicant(true);
    }
  };

  const timeAtAddress = (parseInt(formData.applicant.time_at_address_years) || 0) * 12 
    + (parseInt(formData.applicant.time_at_address_months) || 0);
  const needsFormerAddress = timeAtAddress < 24;

  const renderApplicantForm = (data, update, prefix) => (
    <div className="space-y-6">
      {/* Name Section */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Full Legal Name</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>First Name <span className="text-red-500">*</span></Label>
            <Input
              value={data.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              className={errors[`${prefix}.first_name`] ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>Middle Name</Label>
            <Input
              value={data.middle_name}
              onChange={(e) => update('middle_name', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Last Name <span className="text-red-500">*</span></Label>
            <Input
              value={data.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              className={errors[`${prefix}.last_name`] ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>Suffix</Label>
            <Select value={data.suffix} onValueChange={(v) => update('suffix', v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {SUFFIXES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SSN & DOB */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>SSN / Tax ID</Label>
          <Input
            type="password"
            placeholder="XXX-XX-XXXX"
            value={data.ssn}
            onChange={(e) => update('ssn', e.target.value)}
          />
          <p className="text-xs text-gray-500">Will be encrypted and masked after entry</p>
        </div>
        <div className="space-y-2">
          <Label>Tax ID Type</Label>
          <Select value={data.taxpayer_id_type} onValueChange={(v) => update('taxpayer_id_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SSN">SSN</SelectItem>
              <SelectItem value="ITIN">ITIN</SelectItem>
              <SelectItem value="Foreign">Foreign Tax ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={data.dob}
            onChange={(e) => update('dob', e.target.value)}
          />
        </div>
      </div>

      {/* Contact & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Home Phone</Label>
          <Input
            placeholder="(555) 555-5555"
            value={data.home_phone}
            onChange={(e) => update('home_phone', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Marital Status</Label>
          <Select value={data.marital_status} onValueChange={(v) => update('marital_status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Residency Status <span className="text-red-500">*</span></Label>
          <Select value={data.citizenship_status} onValueChange={(v) => update('citizenship_status', v)}>
            <SelectTrigger className={errors[`${prefix}.citizenship_status`] ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {CITIZENSHIP_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current Address */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Current Address</Label>
        
        <AddressAutocomplete
          value={data.current_address_street}
          onChange={(val) => update('current_address_street', val)}
          onAddressParsed={(parsed) => {
            update('current_address_street', parsed.street);
            update('current_address_city', parsed.city);
            update('current_address_state', parsed.state);
            update('current_address_zip', parsed.zip);
          }}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={data.current_address_city}
              onChange={(e) => update('current_address_city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              maxLength={2}
              value={data.current_address_state}
              onChange={(e) => update('current_address_state', e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label>ZIP</Label>
            <Input
              value={data.current_address_zip}
              onChange={(e) => update('current_address_zip', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Housing</Label>
            <Select value={data.housing_status} onValueChange={(v) => update('housing_status', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {HOUSING_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="space-y-2">
            <Label>Years at Address</Label>
            <Input
              type="number"
              min="0"
              value={data.time_at_address_years}
              onChange={(e) => update('time_at_address_years', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Months</Label>
            <Input
              type="number"
              min="0"
              max="11"
              value={data.time_at_address_months}
              onChange={(e) => update('time_at_address_months', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Former Address (if < 24 months) */}
      {prefix === 'applicant' && needsFormerAddress && (
        <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Former Address (Required - less than 2 years at current)</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="former-na"
                checked={data.former_address_na}
                onCheckedChange={(checked) => update('former_address_na', checked)}
              />
              <Label htmlFor="former-na" className="text-sm">Does not apply</Label>
            </div>
          </div>
          
          {!data.former_address_na && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={data.former_address_street}
                  onChange={(e) => update('former_address_street', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={data.former_address_city}
                  onChange={(e) => update('former_address_city', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    maxLength={2}
                    value={data.former_address_state}
                    onChange={(e) => update('former_address_state', e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input
                    value={data.former_address_zip}
                    onChange={(e) => update('former_address_zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mailing Address */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${prefix}-mailing-same`}
            checked={data.mailing_same_as_current}
            onCheckedChange={(checked) => update('mailing_same_as_current', checked)}
          />
          <Label htmlFor={`${prefix}-mailing-same`}>Mailing address same as current address</Label>
        </div>

        {!data.mailing_same_as_current && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="md:col-span-2 space-y-2">
              <Label>Mailing Street Address</Label>
              <Input
                value={data.mailing_address_street}
                onChange={(e) => update('mailing_address_street', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={data.mailing_address_city}
                onChange={(e) => update('mailing_address_city', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  maxLength={2}
                  value={data.mailing_address_state}
                  onChange={(e) => update('mailing_address_state', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input
                  value={data.mailing_address_zip}
                  onChange={(e) => update('mailing_address_zip', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dependents */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="space-y-2">
          <Label>Number of Dependents</Label>
          <Input
            type="number"
            min="0"
            value={data.dependents_count}
            onChange={(e) => update('dependents_count', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ages of Dependents</Label>
          <Input
            placeholder="e.g., 3, 7, 12"
            value={data.dependents_ages}
            onChange={(e) => update('dependents_ages', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Applicant Information
        </h3>
        <Button
          type="button"
          variant={hasCoApplicant ? "destructive" : "outline"}
          size="sm"
          onClick={toggleCoApplicant}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {hasCoApplicant ? 'Remove Co-Applicant' : 'Add Co-Applicant'}
        </Button>
      </div>

      {hasCoApplicant ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applicant">Primary Applicant</TabsTrigger>
            <TabsTrigger value="co_applicant">Co-Applicant</TabsTrigger>
          </TabsList>
          <TabsContent value="applicant" className="pt-4">
            {renderApplicantForm(formData.applicant, updateApplicant, 'applicant')}
          </TabsContent>
          <TabsContent value="co_applicant" className="pt-4">
            {formData.co_applicant && renderApplicantForm(formData.co_applicant, updateCoApplicant, 'co_applicant')}
          </TabsContent>
        </Tabs>
      ) : (
        renderApplicantForm(formData.applicant, updateApplicant, 'applicant')
      )}
    </div>
  );
}