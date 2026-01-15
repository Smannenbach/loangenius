import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, Home } from 'lucide-react';
import WizardStep from './WizardStep';

const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

const PROPERTY_TYPES = ['SFR', 'Condo', 'Townhouse', 'PUD', '2-Unit', '3-Unit', '4-Unit', '5+ Unit', 'Mixed Use', 'Commercial'];

export default function Step2Property({ data, onChange, onNext, onPrev, isBlanket }) {
  const [currentProperty, setCurrentProperty] = useState({});

  const addProperty = () => {
    const errors = [];
    if (!currentProperty.street) errors.push('Street address');
    if (!currentProperty.city) errors.push('City');
    if (!currentProperty.state) errors.push('State');
    if (!currentProperty.zip) errors.push('ZIP code');
    
    if (errors.length > 0) {
      alert(`Missing required fields: ${errors.join(', ')}`);
      return;
    }
    const properties = [...(data.properties || []), { ...currentProperty, id: Date.now() }];
    onChange({ properties });
    setCurrentProperty({});
  };

  const removeProperty = (id) => {
    onChange({ properties: data.properties.filter(p => p.id !== id) });
  };

  const isValidSingle = currentProperty.street && currentProperty.city && currentProperty.state && currentProperty.zip;
  const isValidBlanket = (data.properties?.length || 0) >= 2;

  const handlePropertyChange = (field, value) => {
    const updated = { ...currentProperty, [field]: value };
    if (field === 'propertyType') {
      const unitMap = { 'SFR': 1, 'Condo': 1, 'Townhouse': 1, 'PUD': 1, '2-Unit': 2, '3-Unit': 3, '4-Unit': 4, '5+ Unit': 5 };
      updated.unitCount = unitMap[value] || 1;
    }
    setCurrentProperty(updated);
  };

  return (
    <WizardStep
      stepNumber={2}
      title={isBlanket ? 'Add Properties' : 'Property Information'}
      description={isBlanket ? 'Add at least 2 properties for blanket loan' : 'Enter property details'}
      onNext={onNext}
      onPrev={onPrev}
      isValid={isBlanket ? isValidBlanket : isValidSingle}
    >
      <div className="space-y-6">
        {/* Property Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Street Address *</Label>
            <Input
              placeholder="Enter street address"
              value={currentProperty.street || ''}
              onChange={(e) => handlePropertyChange('street', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Unit/Apt</Label>
            <Input
              placeholder="Enter unit or apartment number"
              value={currentProperty.unit || ''}
              onChange={(e) => handlePropertyChange('unit', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>City *</Label>
            <Input
              placeholder="Enter city"
              value={currentProperty.city || ''}
              onChange={(e) => handlePropertyChange('city', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>State *</Label>
            <Select value={currentProperty.state || ''} onValueChange={(v) => handlePropertyChange('state', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ZIP Code *</Label>
            <Input
              placeholder="Enter 5-digit ZIP code"
              value={currentProperty.zip || ''}
              onChange={(e) => handlePropertyChange('zip', e.target.value)}
              className="mt-1"
              maxLength={5}
            />
          </div>
          <div>
            <Label>Property Type *</Label>
            <Select value={currentProperty.propertyType || 'SFR'} onValueChange={(v) => handlePropertyChange('propertyType', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Year Built</Label>
            <Input
              type="number"
              placeholder="Enter year built (optional)"
              value={currentProperty.yearBuilt || ''}
              onChange={(e) => handlePropertyChange('yearBuilt', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Square Feet</Label>
            <Input
              type="number"
              placeholder="Enter square footage (optional)"
              value={currentProperty.squareFeet || ''}
              onChange={(e) => handlePropertyChange('squareFeet', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {isBlanket && (
          <Button onClick={addProperty} variant="outline" className="w-full" disabled={!isValidSingle}>
            + Add Property
          </Button>
        )}

        {/* Property List */}
         {isBlanket && data.properties && data.properties.length > 0 && (
           <div className="space-y-3">
             <Label className="font-semibold">Added Properties ({data.properties.length})</Label>
             {data.properties.map(prop => (
               <Card key={prop.id} className="p-4">
                 <div className="flex items-start gap-4">
                   <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                     <Home className="h-5 w-5 text-blue-600" />
                   </div>
                   <div className="flex-1">
                     <p className="font-medium text-gray-900">{prop.street}</p>
                     <p className="text-sm text-gray-600">{prop.city}, {prop.state} {prop.zip}</p>
                     {prop.propertyType && (
                       <p className="text-xs text-gray-500 mt-1">{prop.propertyType}</p>
                     )}
                   </div>
                   <button onClick={() => removeProperty(prop.id)} className="text-red-500 hover:text-red-700 flex-shrink-0 mt-1">
                     <X className="h-5 w-5" />
                   </button>
                 </div>
               </Card>
             ))}
           </div>
         )}
      </div>
    </WizardStep>
  );
}