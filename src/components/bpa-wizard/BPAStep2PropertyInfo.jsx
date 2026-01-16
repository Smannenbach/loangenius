import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, Plus, Trash2 } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const LOCATION_TYPES = [
  { value: 'Metropolitan', label: 'Metropolitan' },
  { value: 'Suburban', label: 'Suburban' },
  { value: 'Rural', label: 'Rural' },
];

const ENTITY_TYPES = [
  { value: 'Corp', label: 'Corporation' },
  { value: 'GP', label: 'General Partnership' },
  { value: 'LLC', label: 'LLC' },
  { value: 'Trust', label: 'Trust' },
];

const OWNER_ROLES = [
  { value: 'Managing Member', label: 'Managing Member' },
  { value: 'Member', label: 'Member' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Trustee', label: 'Trustee' },
  { value: 'Guarantor', label: 'Guarantor' },
];

export default function BPAStep2PropertyInfo({ formData, updateFormData, errors }) {
  const isRefinance = ['Rate & Term', 'Cash-Out', 'Delayed Financing'].includes(formData.loan_purpose);

  const addEntityOwner = () => {
    const newOwner = {
      id: Date.now(),
      owner_role: '',
      ownership_percent: '',
      first_name: '',
      last_name: '',
      application_required: false,
    };
    updateFormData({
      entity_owners: [...(formData.entity_owners || []), newOwner],
    });
  };

  const updateEntityOwner = (id, field, value) => {
    const updated = (formData.entity_owners || []).map(owner => {
      if (owner.id === id) {
        const updatedOwner = { ...owner, [field]: value };
        // Auto-set application_required if ownership >= 20%
        if (field === 'ownership_percent') {
          updatedOwner.application_required = parseFloat(value) >= 20;
        }
        return updatedOwner;
      }
      return owner;
    });
    updateFormData({ entity_owners: updated });
  };

  const removeEntityOwner = (id) => {
    updateFormData({
      entity_owners: (formData.entity_owners || []).filter(o => o.id !== id),
    });
  };

  return (
    <div className="space-y-8">
      {/* Property Address */}
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Subject Property Address
        </Label>
        
        <AddressAutocomplete
          value={formData.property_address_street}
          onChange={(val) => updateFormData({ property_address_street: val })}
          onAddressParsed={(parsed) => {
            updateFormData({
              property_address_street: parsed.street,
              property_address_city: parsed.city,
              property_address_state: parsed.state,
              property_address_zip: parsed.zip,
              property_county: parsed.county,
            });
          }}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Unit/Apt</Label>
            <Input
              placeholder="Apt 101"
              value={formData.property_address_unit}
              onChange={(e) => updateFormData({ property_address_unit: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>City <span className="text-red-500">*</span></Label>
            <Input
              value={formData.property_address_city}
              onChange={(e) => updateFormData({ property_address_city: e.target.value })}
              className={errors.property_address_city ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>State <span className="text-red-500">*</span></Label>
            <Input
              maxLength={2}
              placeholder="CA"
              value={formData.property_address_state}
              onChange={(e) => updateFormData({ property_address_state: e.target.value.toUpperCase() })}
              className={errors.property_address_state ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>ZIP <span className="text-red-500">*</span></Label>
            <Input
              value={formData.property_address_zip}
              onChange={(e) => updateFormData({ property_address_zip: e.target.value })}
              className={errors.property_address_zip ? 'border-red-500' : ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>County</Label>
            <Input
              value={formData.property_county}
              onChange={(e) => updateFormData({ property_county: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Location Type</Label>
            <Select
              value={formData.location_type}
              onValueChange={(v) => updateFormData({ location_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Number of Units */}
        {['2-4 Units', '5+ Units'].includes(formData.property_type) && (
          <div className="space-y-2">
            <Label>Number of Units <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="1"
              value={formData.number_of_units}
              onChange={(e) => updateFormData({ number_of_units: parseInt(e.target.value) || 1 })}
            />
          </div>
        )}
      </div>

      {/* Refinance Block */}
      {isRefinance && (
        <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Label className="text-base font-semibold">Refinance Details</Label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Month/Year Acquired</Label>
              <Input
                placeholder="MM/YYYY"
                value={formData.month_year_acquired}
                onChange={(e) => updateFormData({ month_year_acquired: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Original Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.original_cost}
                  onChange={(e) => updateFormData({ original_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Existing Liens Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.existing_liens_balance}
                  onChange={(e) => updateFormData({ existing_liens_balance: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Improvements Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.improvements_cost}
                  onChange={(e) => updateFormData({ improvements_cost: e.target.value })}
                />
              </div>
            </div>
          </div>

          {formData.improvements_cost && (
            <div className="space-y-2">
              <Label>Improvements Month/Year</Label>
              <Input
                placeholder="MM/YYYY"
                value={formData.improvements_month_year}
                onChange={(e) => updateFormData({ improvements_month_year: e.target.value })}
                className="max-w-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Vesting / Title */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          Title Vesting <span className="text-red-500">*</span>
        </Label>
        
        <RadioGroup
          value={formData.vesting_type}
          onValueChange={(v) => updateFormData({ vesting_type: v })}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Individual" id="vesting-individual" />
            <Label htmlFor="vesting-individual" className="cursor-pointer">Individual</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Entity" id="vesting-entity" />
            <Label htmlFor="vesting-entity" className="cursor-pointer">Entity</Label>
          </div>
        </RadioGroup>
        {errors.vesting_type && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.vesting_type}
          </p>
        )}
      </div>

      {/* Entity Details */}
      {formData.vesting_type === 'Entity' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-base font-semibold">Entity Information</Label>
          
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <RadioGroup
              value={formData.entity_type}
              onValueChange={(v) => updateFormData({ entity_type: v })}
              className="flex flex-wrap gap-4"
            >
              {ENTITY_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={`entity-${type.value}`} />
                  <Label htmlFor={`entity-${type.value}`} className="cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Number of Business Owners with 20%+ Ownership</Label>
            <Input
              type="number"
              min="0"
              value={formData.business_owners_20pct_count}
              onChange={(e) => updateFormData({ business_owners_20pct_count: parseInt(e.target.value) || 0 })}
              className="max-w-xs"
            />
            <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
              ⚠️ Each owner with 20%+ ownership must complete a separate application
            </p>
          </div>

          {/* Entity Owners List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Business Owners / Guarantors</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEntityOwner} className="gap-1">
                <Plus className="h-4 w-4" /> Add Owner
              </Button>
            </div>

            {(formData.entity_owners || []).map((owner, index) => (
              <div key={owner.id} className="p-3 bg-white rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Owner #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntityOwner(owner.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">First Name</Label>
                    <Input
                      value={owner.first_name}
                      onChange={(e) => updateEntityOwner(owner.id, 'first_name', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name</Label>
                    <Input
                      value={owner.last_name}
                      onChange={(e) => updateEntityOwner(owner.id, 'last_name', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={owner.owner_role}
                      onValueChange={(v) => updateEntityOwner(owner.id, 'owner_role', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNER_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ownership %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={owner.ownership_percent}
                      onChange={(e) => updateEntityOwner(owner.id, 'ownership_percent', e.target.value)}
                      placeholder="25"
                    />
                  </div>
                </div>

                {owner.application_required && (
                  <div className="text-xs text-amber-700 bg-amber-100 p-2 rounded flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Application required (20%+ ownership)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}