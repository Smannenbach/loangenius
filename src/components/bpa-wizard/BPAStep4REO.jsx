import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, AlertCircle } from 'lucide-react';

const PROPERTY_USE_OPTIONS = [
  { value: 'Primary', label: 'Primary Residence' },
  { value: 'Rental Prop', label: 'Rental Property' },
  { value: '2nd Home', label: 'Second Home' },
  { value: 'Short Term', label: 'Short Term Rental' },
];

export default function BPAStep4REO({ formData, updateFormData, errors }) {
  const addREO = () => {
    const newREO = {
      id: Date.now(),
      property_address: '',
      property_city: '',
      property_state: '',
      property_zip: '',
      lien_holder_1: '',
      lien_holder_2: '',
      property_use: '',
      property_type: '',
      mortgage_lien_1_amount: '',
      mortgage_lien_2_amount: '',
      property_value: '',
      net_equity: '',
      net_equity_override: false,
    };
    updateFormData({
      reo_properties: [...(formData.reo_properties || []), newREO],
    });
  };

  const updateREO = (id, field, value) => {
    const updated = (formData.reo_properties || []).map(reo => {
      if (reo.id === id) {
        const updatedREO = { ...reo, [field]: value };
        
        // Auto-calculate net equity unless overridden
        if (['property_value', 'mortgage_lien_1_amount', 'mortgage_lien_2_amount'].includes(field) && !reo.net_equity_override) {
          const propValue = parseFloat(field === 'property_value' ? value : reo.property_value) || 0;
          const lien1 = parseFloat(field === 'mortgage_lien_1_amount' ? value : reo.mortgage_lien_1_amount) || 0;
          const lien2 = parseFloat(field === 'mortgage_lien_2_amount' ? value : reo.mortgage_lien_2_amount) || 0;
          updatedREO.net_equity = (propValue - lien1 - lien2).toString();
        }
        
        return updatedREO;
      }
      return reo;
    });
    updateFormData({ reo_properties: updated });
  };

  const removeREO = (id) => {
    updateFormData({
      reo_properties: (formData.reo_properties || []).filter(r => r.id !== id),
    });
  };

  const totalEquity = (formData.reo_properties || []).reduce((sum, r) => sum + (parseFloat(r.net_equity) || 0), 0);
  const totalValue = (formData.reo_properties || []).reduce((sum, r) => sum + (parseFloat(r.property_value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Schedule of Real Estate Owned (REO)
          </h3>
          <p className="text-sm text-gray-500">List all real estate you currently own</p>
        </div>
        <Button type="button" onClick={addREO} className="gap-2">
          <Plus className="h-4 w-4" /> Add Property
        </Button>
      </div>

      {(formData.reo_properties || []).length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No properties added yet</p>
          <Button type="button" variant="outline" onClick={addREO} className="gap-2">
            <Plus className="h-4 w-4" /> Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(formData.reo_properties || []).map((reo, index) => (
            <div key={reo.id} className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-semibold">Property #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeREO(reo.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Address Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Property Address</Label>
                  <Input
                    value={reo.property_address}
                    onChange={(e) => updateREO(reo.id, 'property_address', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={reo.property_city}
                    onChange={(e) => updateREO(reo.id, 'property_city', e.target.value)}
                    placeholder="Los Angeles"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      maxLength={2}
                      value={reo.property_state}
                      onChange={(e) => updateREO(reo.id, 'property_state', e.target.value.toUpperCase())}
                      placeholder="CA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={reo.property_zip}
                      onChange={(e) => updateREO(reo.id, 'property_zip', e.target.value)}
                      placeholder="90001"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Input
                    value={reo.property_type}
                    onChange={(e) => updateREO(reo.id, 'property_type', e.target.value)}
                    placeholder="SFR, Condo, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property Used As</Label>
                  <Select
                    value={reo.property_use}
                    onValueChange={(v) => updateREO(reo.id, 'property_use', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select use" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_USE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={reo.property_value}
                      onChange={(e) => updateREO(reo.id, 'property_value', e.target.value)}
                      placeholder="500,000"
                    />
                  </div>
                </div>
              </div>

              {/* Lien Holders Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>1st Lien Holder</Label>
                  <Input
                    value={reo.lien_holder_1}
                    onChange={(e) => updateREO(reo.id, 'lien_holder_1', e.target.value)}
                    placeholder="Bank of America"
                  />
                </div>
                <div className="space-y-2">
                  <Label>2nd Lien Holder (if any)</Label>
                  <Input
                    value={reo.lien_holder_2}
                    onChange={(e) => updateREO(reo.id, 'lien_holder_2', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Amounts Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>1st Mortgage Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={reo.mortgage_lien_1_amount}
                      onChange={(e) => updateREO(reo.id, 'mortgage_lien_1_amount', e.target.value)}
                      placeholder="300,000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>2nd Mortgage Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={reo.mortgage_lien_2_amount}
                      onChange={(e) => updateREO(reo.id, 'mortgage_lien_2_amount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Net Equity
                    {reo.net_equity_override && (
                      <span className="text-xs text-amber-600">(Manual)</span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      className={`pl-7 ${parseFloat(reo.net_equity) < 0 ? 'text-red-600' : 'text-green-600'} font-semibold`}
                      value={reo.net_equity}
                      onChange={(e) => {
                        updateREO(reo.id, 'net_equity', e.target.value);
                        updateREO(reo.id, 'net_equity_override', true);
                      }}
                      placeholder="200,000"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Show "Add Another" if 6+ properties */}
          {(formData.reo_properties || []).length >= 6 && (
            <Button type="button" variant="outline" onClick={addREO} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Another Property (Continued)
            </Button>
          )}
        </div>
      )}

      {/* Summary */}
      {(formData.reo_properties || []).length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Properties</div>
              <div className="text-2xl font-bold text-gray-900">
                {(formData.reo_properties || []).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalValue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Equity</div>
              <div className={`text-2xl font-bold ${totalEquity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${totalEquity.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}