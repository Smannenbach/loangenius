import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, AlertCircle } from 'lucide-react';

const BANKRUPTCY_TYPES = [
  { value: 'Chapter 7', label: 'Chapter 7' },
  { value: 'Chapter 11', label: 'Chapter 11' },
  { value: 'Chapter 12', label: 'Chapter 12' },
  { value: 'Chapter 13', label: 'Chapter 13' },
];

const DeclarationQuestion = ({ id, label, value, onChange, showFollowUp, followUpComponent }) => (
  <div className="space-y-3 p-4 bg-white rounded-lg border">
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor={id} className="text-sm leading-relaxed flex-1">
        {label}
      </Label>
      <RadioGroup
        value={value === true ? 'yes' : value === false ? 'no' : ''}
        onValueChange={(v) => onChange(v === 'yes')}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${id}-yes`} />
          <Label htmlFor={`${id}-yes`} className="cursor-pointer">Yes</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${id}-no`} />
          <Label htmlFor={`${id}-no`} className="cursor-pointer">No</Label>
        </div>
      </RadioGroup>
    </div>
    {showFollowUp && value === true && followUpComponent}
  </div>
);

export default function BPAStep6Declarations({ formData, updateFormData, errors }) {
  const hasCoApplicant = !!formData.co_applicant;

  const updateDeclaration = (field, value) => {
    updateFormData({
      declarations: { ...formData.declarations, [field]: value },
    });
  };

  const updateCoDeclaration = (field, value) => {
    updateFormData({
      co_applicant_declarations: { ...(formData.co_applicant_declarations || {}), [field]: value },
    });
  };

  const isPurchase = formData.loan_purpose === 'Purchase';

  const renderDeclarations = (declarations, update, prefix) => (
    <div className="space-y-4">
      {/* Show seller relationship only for Purchase */}
      {isPurchase && (
        <DeclarationQuestion
          id={`${prefix}-family-seller`}
          label="a. Will you have a family relationship or business affiliation with the seller of the property?"
          value={declarations.family_relationship_with_seller}
          onChange={(v) => update('family_relationship_with_seller', v)}
        />
      )}

      <DeclarationQuestion
        id={`${prefix}-undisclosed-money`}
        label="b. Are you borrowing any money for this real estate transaction (e.g., money for your closing costs or down payment) or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?"
        value={declarations.borrowing_undisclosed_money}
        onChange={(v) => update('borrowing_undisclosed_money', v)}
        showFollowUp={true}
        followUpComponent={
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Label className="text-sm">If YES, what is the amount of this money?</Label>
            <div className="relative mt-2 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                className="pl-7"
                value={declarations.undisclosed_money_amount}
                onChange={(e) => update('undisclosed_money_amount', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        }
      />

      <DeclarationQuestion
        id={`${prefix}-priority-lien`}
        label="c. Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?"
        value={declarations.property_subject_to_priority_lien}
        onChange={(v) => update('property_subject_to_priority_lien', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-judgments`}
        label="d. Have you had an ownership interest in another property in the last three years?"
        value={declarations.ownership_interest_3yr}
        onChange={(v) => update('ownership_interest_3yr', v)}
      />

      <div className="border-t pt-4 mt-6">
        <h4 className="font-semibold mb-4 text-gray-700">About Your Finances</h4>
      </div>

      <DeclarationQuestion
        id={`${prefix}-outstanding-judgments`}
        label="e. Are there any outstanding judgments against you?"
        value={declarations.outstanding_judgments}
        onChange={(v) => update('outstanding_judgments', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-lawsuit`}
        label="f. Are you a party to a lawsuit in which you potentially have any personal financial liability?"
        value={declarations.party_to_lawsuit}
        onChange={(v) => update('party_to_lawsuit', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-deed-in-lieu`}
        label="g. Have you conveyed title to any property in lieu of foreclosure in the past 4 years?"
        value={declarations.conveyed_title_in_lieu_4yr}
        onChange={(v) => update('conveyed_title_in_lieu_4yr', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-short-sale`}
        label="h. Within the past 4 years, have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the lender agreed to accept less than the outstanding mortgage balance due?"
        value={declarations.short_sale_4yr}
        onChange={(v) => update('short_sale_4yr', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-foreclosure`}
        label="i. Have you had property foreclosed upon in the last 4 years?"
        value={declarations.foreclosed_4yr}
        onChange={(v) => update('foreclosed_4yr', v)}
      />

      <DeclarationQuestion
        id={`${prefix}-bankruptcy`}
        label="j. Have you declared bankruptcy within the past 4 years?"
        value={declarations.bankruptcy_4yr}
        onChange={(v) => update('bankruptcy_4yr', v)}
        showFollowUp={true}
        followUpComponent={
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Bankruptcy Type</Label>
                <Select
                  value={declarations.bankruptcy_type}
                  onValueChange={(v) => update('bankruptcy_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKRUPTCY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Date Filed</Label>
                <Input
                  type="date"
                  value={declarations.bankruptcy_date}
                  onChange={(e) => update('bankruptcy_date', e.target.value)}
                />
              </div>
            </div>
          </div>
        }
      />

      <div className="border-t pt-4 mt-6">
        <h4 className="font-semibold mb-4 text-gray-700">About This Property and Your Money for This Loan</h4>
      </div>

      <DeclarationQuestion
        id={`${prefix}-non-affiliate-occupy`}
        label="k. Will anyone who is not your spouse, domestic partner, or financially dependent family member (such as a parent or child) have an ownership interest in the property? Or will a non-business affiliate occupy the property more than 14 days per calendar year?"
        value={declarations.non_affiliate_occupy_14_days}
        onChange={(v) => update('non_affiliate_occupy_14_days', v)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Declarations</h3>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> These questions apply to you and any co-applicant. 
          Answer "Yes" or "No" for each question. If "Yes", provide details where requested.
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
            {renderDeclarations(formData.declarations, updateDeclaration, 'applicant')}
          </TabsContent>
          <TabsContent value="co_applicant" className="pt-4">
            {renderDeclarations(
              formData.co_applicant_declarations || formData.declarations,
              updateCoDeclaration,
              'co_applicant'
            )}
          </TabsContent>
        </Tabs>
      ) : (
        renderDeclarations(formData.declarations, updateDeclaration, 'applicant')
      )}
    </div>
  );
}