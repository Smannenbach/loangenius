import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet, AlertCircle } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'Checking', label: 'Checking' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Money Market', label: 'Money Market' },
  { value: 'Brokerage', label: 'Brokerage' },
  { value: 'Retirement', label: 'Retirement (401k, IRA, etc.)' },
  { value: 'Other', label: 'Other (specify)' },
];

export default function BPAStep3Assets({ formData, updateFormData, errors }) {
  const addAsset = () => {
    const newAsset = {
      id: Date.now(),
      account_type: '',
      account_type_other: '',
      bank_name: '',
      account_last4: '',
      account_balance: '',
      funds_used_for_closing: false,
    };
    updateFormData({
      assets: [...(formData.assets || []), newAsset],
    });
  };

  const updateAsset = (id, field, value) => {
    const updated = (formData.assets || []).map(asset => {
      if (asset.id === id) {
        return { ...asset, [field]: value };
      }
      return asset;
    });
    updateFormData({ assets: updated });
  };

  const removeAsset = (id) => {
    updateFormData({
      assets: (formData.assets || []).filter(a => a.id !== id),
    });
  };

  const totalAssets = (formData.assets || []).reduce((sum, a) => sum + (parseFloat(a.account_balance) || 0), 0);
  const totalForClosing = (formData.assets || [])
    .filter(a => a.funds_used_for_closing)
    .reduce((sum, a) => sum + (parseFloat(a.account_balance) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Bank Accounts & Assets
          </h3>
          <p className="text-sm text-gray-500">List all accounts you want to use for qualification</p>
        </div>
        <Button type="button" onClick={addAsset} className="gap-2">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {(formData.assets || []).length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No accounts added yet</p>
          <Button type="button" variant="outline" onClick={addAsset} className="gap-2">
            <Plus className="h-4 w-4" /> Add Your First Account
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {(formData.assets || []).map((asset, index) => (
            <div key={asset.id} className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Account #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAsset(asset.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={asset.account_type}
                    onValueChange={(v) => updateAsset(asset.id, 'account_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {asset.account_type === 'Other' && (
                  <div className="space-y-2">
                    <Label>Specify Type</Label>
                    <Input
                      value={asset.account_type_other}
                      onChange={(e) => updateAsset(asset.id, 'account_type_other', e.target.value)}
                      placeholder="e.g., CD, HSA"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Bank/Institution Name</Label>
                  <Input
                    value={asset.bank_name}
                    onChange={(e) => updateAsset(asset.id, 'bank_name', e.target.value)}
                    placeholder="Chase Bank"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account # (Last 4)</Label>
                  <Input
                    maxLength={4}
                    value={asset.account_last4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      updateAsset(asset.id, 'account_last4', val);
                    }}
                    placeholder="1234"
                    className={asset.account_last4 && asset.account_last4.length !== 4 ? 'border-amber-500' : ''}
                  />
                  {asset.account_last4 && asset.account_last4.length !== 4 && (
                    <p className="text-xs text-amber-600">Must be exactly 4 digits</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={asset.account_balance}
                      onChange={(e) => updateAsset(asset.id, 'account_balance', e.target.value)}
                      placeholder="25,000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox
                  id={`closing-${asset.id}`}
                  checked={asset.funds_used_for_closing}
                  onCheckedChange={(checked) => updateAsset(asset.id, 'funds_used_for_closing', checked)}
                />
                <Label htmlFor={`closing-${asset.id}`} className="cursor-pointer text-sm">
                  Use funds from this account for closing
                </Label>
              </div>

              {asset.funds_used_for_closing && !asset.account_balance && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Balance required if using for closing
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {(formData.assets || []).length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Assets</div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalAssets.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Available for Closing</div>
              <div className="text-2xl font-bold text-blue-600">
                ${totalForClosing.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}