import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Step8Employment({ data, onChange, onNext, onPrev }) {
  const handleEmploymentChange = (field, value) => {
    onChange({
      employment: {
        ...(data.employment || {}),
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          8
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employment Information</h2>
          <p className="text-gray-600 mt-1">Provide your employment details</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Employer Name *</Label>
              <Input
                placeholder="ABC Company"
                value={data.employment?.employer_name || ''}
                onChange={(e) => handleEmploymentChange('employer_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Position/Title *</Label>
              <Input
                placeholder="Software Engineer"
                value={data.employment?.position || ''}
                onChange={(e) => handleEmploymentChange('position', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Employer Phone</Label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={data.employment?.employer_phone || ''}
                onChange={(e) => handleEmploymentChange('employer_phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Years at Position</Label>
              <Input
                type="number"
                placeholder="5"
                value={data.employment?.years_at_position || ''}
                onChange={(e) => handleEmploymentChange('years_at_position', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="self_employed"
              checked={data.employment?.self_employed || false}
              onCheckedChange={(checked) => handleEmploymentChange('self_employed', checked)}
            />
            <label
              htmlFor="self_employed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Self-Employed
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Monthly Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Base Employment Income</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={data.employment?.base_income || ''}
                  onChange={(e) => handleEmploymentChange('base_income', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={data.employment?.overtime || ''}
                  onChange={(e) => handleEmploymentChange('overtime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bonuses</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={data.employment?.bonuses || ''}
                  onChange={(e) => handleEmploymentChange('bonuses', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Commissions</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={data.employment?.commissions || ''}
                  onChange={(e) => handleEmploymentChange('commissions', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dividends/Interest</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={data.employment?.dividends || ''}
                  onChange={(e) => handleEmploymentChange('dividends', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Net Rental Income</Label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={data.employment?.rental_income || ''}
                  onChange={(e) => handleEmploymentChange('rental_income', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Other Income (Describe)</Label>
                <Input
                  placeholder="Description"
                  value={data.employment?.other_income_desc || ''}
                  onChange={(e) => handleEmploymentChange('other_income_desc', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Other Income Amount</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={data.employment?.other_income || ''}
                  onChange={(e) => handleEmploymentChange('other_income', e.target.value)}
                />
              </div>
            </div>

            {/* Total Income Display */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Monthly Income:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${(
                    parseFloat(data.employment?.base_income || 0) +
                    parseFloat(data.employment?.overtime || 0) +
                    parseFloat(data.employment?.bonuses || 0) +
                    parseFloat(data.employment?.commissions || 0) +
                    parseFloat(data.employment?.dividends || 0) +
                    parseFloat(data.employment?.rental_income || 0) +
                    parseFloat(data.employment?.other_income || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          ← Previous
        </Button>
        <Button 
          onClick={onNext}
          disabled={!data.employment?.employer_name || !data.employment?.position}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}