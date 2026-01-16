import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check } from 'lucide-react';

export default function Step9Declarations({ data, onChange, onNext, onPrev, loading }) {
  const declarations = [
    { id: 'family_relationship_seller', label: 'If this is a purchase transaction, do you have any family relationship with the seller?' },
    { id: 'borrowing_closing_money', label: 'Are you borrowing any money for this real estate transaction (e.g., money for your closing costs or down payment) or obtaining any money from another party?' },
    { id: 'priority_lien', label: 'Will this property be subject to a lien that could take priority over the first mortgage lien, such as a clean energy lien?' },
    { id: 'outstanding_judgments', label: 'Are there any outstanding judgments against Borrower or Guarantor?' },
    { id: 'party_to_lawsuit', label: 'Are you a party to a lawsuit?' },
    { id: 'conveyed_title_foreclosure', label: 'Have you conveyed title to any property in lieu of foreclosure in the past 4 years?' },
    { id: 'short_sale', label: 'Within the past 4 years have you completed a pre-foreclosure sale or short sale?' },
    { id: 'property_foreclosed', label: 'Have you had property charged off or foreclosed upon in the last 4 years?' },
    { id: 'declared_bankruptcy', label: 'Have you declared bankruptcy within the last 4 years?' },
    { id: 'ownership_interest', label: 'Have you had any ownership interest in real property in the last 3 years?' },
    { id: 'occupy_property', label: 'Does any applicant, co-applicant, family member or any non-business affiliate plan to occupy the subject property for more than 14 days per year?' },
  ];

  const handleDeclarationChange = (field, value) => {
    onChange({
      declarations: {
        ...(data.declarations || {}),
        [field]: value
      }
    });
  };

  const allAnswered = declarations.every(d => 
    data.declarations?.[d.id] === 'yes' || data.declarations?.[d.id] === 'no'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          8
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Declarations</h2>
          <p className="text-gray-600 mt-1">Answer the following questions truthfully</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {declarations.map((declaration) => (
            <div key={declaration.id} className="space-y-3 pb-6 border-b last:border-b-0">
              <Label className="text-gray-900">{declaration.label}</Label>
              <RadioGroup
                value={data.declarations?.[declaration.id] || ''}
                onValueChange={(value) => handleDeclarationChange(declaration.id, value)}
              >
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id={`${declaration.id}_yes`} />
                    <label htmlFor={`${declaration.id}_yes`} className="text-sm font-medium">
                      Yes
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id={`${declaration.id}_no`} />
                    <label htmlFor={`${declaration.id}_no`} className="text-sm font-medium">
                      No
                    </label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          ← Previous
        </Button>
        <Button 
          onClick={onNext}
          disabled={!allAnswered}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}