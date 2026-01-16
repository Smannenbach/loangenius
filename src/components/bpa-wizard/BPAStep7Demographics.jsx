import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, AlertCircle, Info } from 'lucide-react';

const ETHNICITY_OPTIONS = [
  { value: 'Hispanic or Latino', label: 'Hispanic or Latino' },
  { value: 'Not Hispanic or Latino', label: 'Not Hispanic or Latino' },
  { value: 'I do not wish to provide', label: 'I do not wish to provide this information' },
];

const HISPANIC_ORIGINS = [
  { value: 'Mexican', label: 'Mexican' },
  { value: 'Puerto Rican', label: 'Puerto Rican' },
  { value: 'Cuban', label: 'Cuban' },
  { value: 'Other', label: 'Other Hispanic or Latino' },
];

const RACE_OPTIONS = [
  { value: 'American Indian or Alaska Native', label: 'American Indian or Alaska Native' },
  { value: 'Asian', label: 'Asian' },
  { value: 'Black or African American', label: 'Black or African American' },
  { value: 'Native Hawaiian or Other Pacific Islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'White', label: 'White' },
  { value: 'I do not wish to provide', label: 'I do not wish to provide this information' },
];

const ASIAN_ORIGINS = [
  { value: 'Asian Indian', label: 'Asian Indian' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Filipino', label: 'Filipino' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Other Asian', label: 'Other Asian' },
];

const PACIFIC_ORIGINS = [
  { value: 'Native Hawaiian', label: 'Native Hawaiian' },
  { value: 'Guamanian or Chamorro', label: 'Guamanian or Chamorro' },
  { value: 'Samoan', label: 'Samoan' },
  { value: 'Other Pacific Islander', label: 'Other Pacific Islander' },
];

const SEX_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'I do not wish to provide', label: 'I do not wish to provide this information' },
];

const COLLECTION_METHODS = [
  { value: 'Face to Face', label: 'Face-to-Face Interview (includes Electronic Media with video)' },
  { value: 'Telephone', label: 'Telephone Interview' },
  { value: 'Fax or Mail', label: 'Fax or Mail' },
  { value: 'Email or Internet', label: 'Email or Internet' },
];

export default function BPAStep7Demographics({ formData, updateFormData, errors }) {
  const hasCoApplicant = !!formData.co_applicant;
  const isIndividualVesting = formData.vesting_type === 'Individual';

  const updateDemographics = (field, value) => {
    updateFormData({
      demographics: { ...formData.demographics, [field]: value },
    });
  };

  const updateCoDemographics = (field, value) => {
    updateFormData({
      co_applicant_demographics: { ...(formData.co_applicant_demographics || {}), [field]: value },
    });
  };

  const toggleArrayValue = (arr, value, update, field) => {
    const current = arr || [];
    if (current.includes(value)) {
      update(field, current.filter(v => v !== value));
    } else {
      update(field, [...current, value]);
    }
  };

  // Only show demographics for individual vesting
  if (!isIndividualVesting) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Demographic Information</h3>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg border text-center">
          <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h4 className="font-semibold text-gray-700 mb-2">Not Applicable</h4>
          <p className="text-gray-500 text-sm">
            Demographic information is only collected when the property will be held in an individual's name.
            <br /><br />
            Since the vesting type is <strong>Entity</strong>, this section does not apply to guarantors or trustees.
          </p>
        </div>
      </div>
    );
  }

  const renderDemographicsForm = (demographics, update, prefix) => (
    <div className="space-y-8">
      {/* Ethnicity */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Ethnicity</Label>
        <p className="text-sm text-gray-500">Check one or more</p>
        
        <div className="space-y-3">
          {ETHNICITY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${prefix}-eth-${option.value}`}
                checked={(demographics.ethnicity || []).includes(option.value)}
                onCheckedChange={() => toggleArrayValue(demographics.ethnicity, option.value, update, 'ethnicity')}
              />
              <Label htmlFor={`${prefix}-eth-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Hispanic sub-origins */}
        {(demographics.ethnicity || []).includes('Hispanic or Latino') && (
          <div className="ml-6 p-4 bg-gray-50 rounded-lg border space-y-3">
            <Label className="text-sm font-medium">If Hispanic or Latino, select origin(s):</Label>
            <div className="grid grid-cols-2 gap-3">
              {HISPANIC_ORIGINS.map((origin) => (
                <div key={origin.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${prefix}-hisp-${origin.value}`}
                    checked={(demographics.ethnicity_hispanic_origin || []).includes(origin.value)}
                    onCheckedChange={() => toggleArrayValue(demographics.ethnicity_hispanic_origin, origin.value, update, 'ethnicity_hispanic_origin')}
                  />
                  <Label htmlFor={`${prefix}-hisp-${origin.value}`} className="cursor-pointer text-sm">
                    {origin.label}
                  </Label>
                </div>
              ))}
            </div>
            {(demographics.ethnicity_hispanic_origin || []).includes('Other') && (
              <Input
                placeholder="Please specify other Hispanic or Latino origin"
                value={demographics.ethnicity_hispanic_other_text}
                onChange={(e) => update('ethnicity_hispanic_other_text', e.target.value)}
                className="mt-2"
              />
            )}
          </div>
        )}
      </div>

      {/* Race */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Race</Label>
        <p className="text-sm text-gray-500">Check one or more</p>
        
        <div className="space-y-3">
          {RACE_OPTIONS.map((option) => (
            <div key={option.value}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${prefix}-race-${option.value}`}
                  checked={(demographics.race || []).includes(option.value)}
                  onCheckedChange={() => toggleArrayValue(demographics.race, option.value, update, 'race')}
                />
                <Label htmlFor={`${prefix}-race-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>

              {/* American Indian - Tribe */}
              {option.value === 'American Indian or Alaska Native' && 
               (demographics.race || []).includes('American Indian or Alaska Native') && (
                <div className="ml-6 mt-2">
                  <Input
                    placeholder="Enter name of enrolled or principal tribe"
                    value={demographics.race_native_tribe}
                    onChange={(e) => update('race_native_tribe', e.target.value)}
                  />
                </div>
              )}

              {/* Asian sub-origins */}
              {option.value === 'Asian' && (demographics.race || []).includes('Asian') && (
                <div className="ml-6 mt-2 p-3 bg-gray-50 rounded border space-y-2">
                  <Label className="text-xs font-medium">Select Asian origin(s):</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {ASIAN_ORIGINS.map((origin) => (
                      <div key={origin.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${prefix}-asian-${origin.value}`}
                          checked={(demographics.race_asian_origin || []).includes(origin.value)}
                          onCheckedChange={() => toggleArrayValue(demographics.race_asian_origin, origin.value, update, 'race_asian_origin')}
                        />
                        <Label htmlFor={`${prefix}-asian-${origin.value}`} className="cursor-pointer text-xs">
                          {origin.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {(demographics.race_asian_origin || []).includes('Other Asian') && (
                    <Input
                      placeholder="Specify other Asian origin"
                      value={demographics.race_asian_other_text}
                      onChange={(e) => update('race_asian_other_text', e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Pacific Islander sub-origins */}
              {option.value === 'Native Hawaiian or Other Pacific Islander' && 
               (demographics.race || []).includes('Native Hawaiian or Other Pacific Islander') && (
                <div className="ml-6 mt-2 p-3 bg-gray-50 rounded border space-y-2">
                  <Label className="text-xs font-medium">Select Pacific Islander origin(s):</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PACIFIC_ORIGINS.map((origin) => (
                      <div key={origin.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${prefix}-pacific-${origin.value}`}
                          checked={(demographics.race_pacific_origin || []).includes(origin.value)}
                          onCheckedChange={() => toggleArrayValue(demographics.race_pacific_origin, origin.value, update, 'race_pacific_origin')}
                        />
                        <Label htmlFor={`${prefix}-pacific-${origin.value}`} className="cursor-pointer text-xs">
                          {origin.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {(demographics.race_pacific_origin || []).includes('Other Pacific Islander') && (
                    <Input
                      placeholder="Specify other Pacific Islander origin"
                      value={demographics.race_pacific_other_text}
                      onChange={(e) => update('race_pacific_other_text', e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sex */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Sex</Label>
        <RadioGroup
          value={demographics.sex}
          onValueChange={(v) => update('sex', v)}
          className="space-y-2"
        >
          {SEX_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${prefix}-sex-${option.value}`} />
              <Label htmlFor={`${prefix}-sex-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Collection Method */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <Label className="text-base font-semibold">How was this information provided?</Label>
        <Select
          value={demographics.demographics_collection_method}
          onValueChange={(v) => update('demographics_collection_method', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select collection method" />
          </SelectTrigger>
          <SelectContent>
            {COLLECTION_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Visual observation (only for face-to-face) */}
        {demographics.demographics_collection_method === 'Face to Face' && (
          <div className="space-y-3 mt-4 p-3 bg-white rounded border">
            <Label className="text-sm font-medium">For Financial Institution Use Only</Label>
            <p className="text-xs text-gray-500">Was information collected by visual observation or surname?</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${prefix}-visual-ethnicity`}
                  checked={demographics.ethnicity_collected_visual}
                  onCheckedChange={(c) => update('ethnicity_collected_visual', c)}
                />
                <Label htmlFor={`${prefix}-visual-ethnicity`} className="text-sm">Ethnicity</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${prefix}-visual-race`}
                  checked={demographics.race_collected_visual}
                  onCheckedChange={(c) => update('race_collected_visual', c)}
                />
                <Label htmlFor={`${prefix}-visual-race`} className="text-sm">Race</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${prefix}-visual-sex`}
                  checked={demographics.sex_collected_visual}
                  onCheckedChange={(c) => update('sex_collected_visual', c)}
                />
                <Label htmlFor={`${prefix}-visual-sex`} className="text-sm">Sex</Label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Demographic Information</h3>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> The purpose of collecting this information is to help ensure that all 
          applicants are treated fairly and that the housing needs of communities and neighborhoods are being fulfilled.
          <br /><br />
          You are not required to furnish this information, but are encouraged to do so. You may select one or more 
          designations for "Ethnicity" and "Race."
        </p>
      </div>

      {hasCoApplicant ? (
        <Tabs defaultValue="applicant">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applicant">
              {formData.applicant.first_name || 'Primary'} (Applicant)
            </TabsTrigger>
            <TabsTrigger value="co_applicant">
              {formData.co_applicant?.first_name || 'Co-Applicant'}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="applicant" className="pt-4">
            {renderDemographicsForm(formData.demographics, updateDemographics, 'applicant')}
          </TabsContent>
          <TabsContent value="co_applicant" className="pt-4">
            {renderDemographicsForm(
              formData.co_applicant_demographics || {},
              updateCoDemographics,
              'co_applicant'
            )}
          </TabsContent>
        </Tabs>
      ) : (
        renderDemographicsForm(formData.demographics, updateDemographics, 'applicant')
      )}
    </div>
  );
}