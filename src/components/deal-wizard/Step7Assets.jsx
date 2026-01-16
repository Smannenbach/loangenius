import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';

export default function Step7Assets({ data, onChange, onNext, onPrev }) {
  const [currentAsset, setCurrentAsset] = useState({
    account_type: 'checking',
    bank_name: '',
    account_number: '',
    balance: '',
  });

  const addAsset = () => {
    if (currentAsset.account_type && currentAsset.balance) {
      onChange({
        assets: [...(data.assets || []), { ...currentAsset }]
      });
      setCurrentAsset({
        account_type: 'checking',
        bank_name: '',
        account_number: '',
        balance: '',
      });
    }
  };

  const removeAsset = (index) => {
    const newAssets = [...(data.assets || [])];
    newAssets.splice(index, 1);
    onChange({ assets: newAssets });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          7
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assets & Liabilities</h2>
          <p className="text-gray-600 mt-1">List your financial accounts and assets</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {/* Add Asset Form */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Add Asset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={currentAsset.account_type}
                  onValueChange={(v) => setCurrentAsset({ ...currentAsset, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="stocks">Stocks & Bonds</SelectItem>
                    <SelectItem value="retirement">IRA/401K</SelectItem>
                    <SelectItem value="life_insurance">Life Insurance</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bank/Institution Name</Label>
                <Input
                  placeholder="Bank of America"
                  value={currentAsset.bank_name}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, bank_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number (Last 4)</Label>
                <Input
                  placeholder="1234"
                  maxLength={4}
                  value={currentAsset.account_number}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, account_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Balance *</Label>
                <Input
                  type="number"
                  placeholder="25000"
                  value={currentAsset.balance}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, balance: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={addAsset} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>

          {/* Assets List */}
          {data.assets && data.assets.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Added Assets</h3>
              {data.assets.map((asset, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{asset.account_type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">{asset.bank_name || 'N/A'}</p>
                    <p className="text-sm font-semibold text-green-600">
                      ${parseFloat(asset.balance).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAsset(idx)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Total Liquid Assets:</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${data.assets.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0).toLocaleString()}
                </p>
              </div>
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}