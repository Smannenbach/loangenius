import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, User } from 'lucide-react';

export default function Step5Borrower({ data, onChange, onNext, onPrev }) {
  const [showForm, setShowForm] = useState(false);
  const [currentBorrower, setCurrentBorrower] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    party_type: 'Primary Borrower',
  });

  const partyTypes = ['Primary Borrower', 'Co-Borrower', 'Guarantor'];

  const handleAddBorrower = () => {
    if (!currentBorrower.first_name || !currentBorrower.last_name || !currentBorrower.email) return;
    
    const borrowers = [...(data.borrowers || []), {
      ...currentBorrower,
      id: `borrower_${Date.now()}`
    }];
    onChange({ borrowers });
    
    setCurrentBorrower({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      party_type: 'Primary Borrower',
    });
    setShowForm(false);
  };

  const handleRemoveBorrower = (index) => {
    const borrowers = data.borrowers.filter((_, i) => i !== index);
    onChange({ borrowers });
  };

  const canProceed = data.borrowers?.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          1
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Borrower Information</h2>
          <p className="text-gray-600 mt-1">Add borrowers and guarantors</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {!showForm && (
            <Button 
              onClick={() => setShowForm(true)}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              + Add Borrower
            </Button>
          )}

          {showForm && (
            <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">First Name *</Label>
                  <Input
                    placeholder="Enter first name"
                    value={currentBorrower.first_name}
                    onChange={(e) => setCurrentBorrower({ ...currentBorrower, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Last Name *</Label>
                  <Input
                    placeholder="Enter last name"
                    value={currentBorrower.last_name}
                    onChange={(e) => setCurrentBorrower({ ...currentBorrower, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Email *</Label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={currentBorrower.email}
                    onChange={(e) => setCurrentBorrower({ ...currentBorrower, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Phone</Label>
                  <Input
                    type="tel"
                    placeholder="(303) 555-0100"
                    value={currentBorrower.phone}
                    onChange={(e) => setCurrentBorrower({ ...currentBorrower, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Party Type</Label>
                <Select
                  value={currentBorrower.party_type}
                  onValueChange={(v) => setCurrentBorrower({ ...currentBorrower, party_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partyTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleAddBorrower}
                  disabled={!currentBorrower.first_name || !currentBorrower.last_name || !currentBorrower.email}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  + Add Borrower
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setCurrentBorrower({
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      party_type: 'Primary Borrower',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Added Borrowers */}
          {data.borrowers?.length > 0 && (
            <div className="space-y-3">
              {data.borrowers.map((borrower, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {borrower.first_name} {borrower.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{borrower.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{borrower.party_type}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveBorrower(idx)}
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