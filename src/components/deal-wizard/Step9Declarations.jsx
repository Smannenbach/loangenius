import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Step9Declarations({ data, onChange, onNext, onPrev, loading }) {
  const declarations = [
    { id: 'outstanding_judgments', label: 'Are there any outstanding judgments against you?' },
    { id: 'declared_bankruptcy', label: 'Have you been declared bankrupt within the past 7 years?' },
    { id: 'property_foreclosed', label: 'Have you had property foreclosed upon or given title in lieu thereof in the last 7 years?' },
    { id: 'party_to_lawsuit', label: 'Are you a party to a lawsuit?' },
    { id: 'loan_foreclosure', label: 'Have you directly or indirectly been obligated on any loan which resulted in foreclosure, transfer of title in lieu of foreclosure, or judgment?' },
    { id: 'delinquent_federal_debt', label: 'Are you presently delinquent or in default on any Federal debt or any other loan, mortgage, financial obligation, bond, or loan guarantee?' },
    { id: 'alimony_obligations', label: 'Are you obligated to pay alimony, child support, or separate maintenance?' },
    { id: 'down_payment_borrowed', label: 'Is any part of the down payment borrowed?' },
    { id: 'co_maker_endorser', label: 'Are you a co-maker or endorser on a note?' },
    { id: 'us_citizen', label: 'Are you a U.S. citizen?' },
    { id: 'permanent_resident', label: 'Are you a permanent resident alien?' },
    { id: 'criminal_offense', label: 'Have you ever been charged with a criminal offense?' },
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
          9
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