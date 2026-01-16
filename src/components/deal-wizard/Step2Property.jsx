import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddressAutocomplete from '../AddressAutocomplete';
import { MapPin, X } from 'lucide-react';

export default function Step2Property({ data, onChange, onNext, onPrev, isBlanket }) {
  const [currentProperty, setCurrentProperty] = useState({
    address_street: '',
    address_unit: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    county: '',
    property_type: '',
    year_built: '',
    sqft: '',
    beds: '',
    baths: '',
  });

  const propertyTypes = [
    'SFR', 'PUD Detached', 'PUD Attached', 'Condo', 'Condo (Non-Warrantable)', 
    '2-4 Units', 'Log Home', '5+ Units', 'Mixed Use (51% Residential)'
  ];

  const handleAddProperty = () => {
    if (!currentProperty.address_street || !currentProperty.property_type) return;
    
    const properties = [...(data.properties || []), { 
      ...currentProperty,
      id: `prop_${Date.now()}`
    }];
    onChange({ properties });
    
    setCurrentProperty({
      address_street: '',
      address_unit: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      county: '',
      property_type: '',
      year_built: '',
      sqft: '',
      beds: '',
      baths: '',
    });
  };

  const handleRemoveProperty = (index) => {
    const properties = data.properties.filter((_, i) => i !== index);
    onChange({ properties });
  };

  const canProceed = data.properties?.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          2
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Information</h2>
          <p className="text-gray-600 mt-1">Enter property details</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label className="text-gray-700">Street Address *</Label>
              <AddressAutocomplete 
                value={currentProperty.address_street}
                onChange={(val) => setCurrentProperty({ ...currentProperty, address_street: val })}
                onAddressParsed={(parsed) => {
                  setCurrentProperty({ 
                    ...currentProperty, 
                    address_street: parsed.street,
                    address_city: parsed.city,
                    address_state: parsed.state,
                    address_zip: parsed.zip,
                    county: parsed.county || '',
                  });
                }}
                placeholder="Enter street address"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Unit/Apt</Label>
              <Input
                placeholder="Enter unit or apartment number"
                value={currentProperty.address_unit}
                onChange={(e) => setCurrentProperty({ ...currentProperty, address_unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">City *</Label>
              <Input
                placeholder="Enter city"
                value={currentProperty.address_city}
                onChange={(e) => setCurrentProperty({ ...currentProperty, address_city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">State *</Label>
              <Input
                placeholder="Enter state"
                value={currentProperty.address_state}
                onChange={(e) => setCurrentProperty({ ...currentProperty, address_state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">ZIP Code *</Label>
              <Input
                placeholder="Enter 5-digit ZIP code"
                value={currentProperty.address_zip}
                onChange={(e) => setCurrentProperty({ ...currentProperty, address_zip: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Property Type *</Label>
              <Select
                value={currentProperty.property_type}
                onValueChange={(v) => setCurrentProperty({ ...currentProperty, property_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Year Built</Label>
              <Input
                type="number"
                placeholder="Enter year built (optional)"
                value={currentProperty.year_built}
                onChange={(e) => setCurrentProperty({ ...currentProperty, year_built: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Square Feet</Label>
              <Input
                type="number"
                placeholder="Enter square footage (optional)"
                value={currentProperty.sqft}
                onChange={(e) => setCurrentProperty({ ...currentProperty, sqft: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={handleAddProperty}
            disabled={!currentProperty.address_street || !currentProperty.property_type}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {data.properties?.length > 0 ? '+ Add Another Property' : '+ Add Property'}
          </Button>

          {/* Added Properties */}
          {data.properties?.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium text-gray-900">Added Properties ({data.properties.length})</h3>
              {data.properties.map((prop, idx) => (
                <div key={idx} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{prop.address_street}</p>
                      <p className="text-sm text-gray-600">
                        {prop.address_city}, {prop.address_state} {prop.address_zip}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{prop.property_type}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveProperty(idx)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          ← Previous
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}