import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import WizardStep from './WizardStep';

export default function Step5Borrower({ data, onChange, onNext, onPrev }) {
  const [currentBorrower, setCurrentBorrower] = useState({});

  const addBorrower = () => {
    if (!currentBorrower.firstName || !currentBorrower.lastName || !currentBorrower.email) {
      alert('Please fill in required fields');
      return;
    }
    const borrowers = [...(data.borrowers || []), { ...currentBorrower, id: Date.now() }];
    onChange({ borrowers });
    setCurrentBorrower({});
  };

  const removeBorrower = (id) => {
    onChange({ borrowers: data.borrowers.filter(b => b.id !== id) });
  };

  const isValid = (data.borrowers?.length || 0) > 0;

  return (
    <WizardStep
      stepNumber={5}
      title="Borrower Information"
      description="Add borrowers and guarantors"
      onNext={onNext}
      onPrev={onPrev}
      isValid={isValid}
    >
      <div className="space-y-6">
        {/* Borrower Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input
              placeholder="John"
              value={currentBorrower.firstName || ''}
              onChange={(e) => setCurrentBorrower({ ...currentBorrower, firstName: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input
              placeholder="Smith"
              value={currentBorrower.lastName || ''}
              onChange={(e) => setCurrentBorrower({ ...currentBorrower, lastName: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={currentBorrower.email || ''}
              onChange={(e) => setCurrentBorrower({ ...currentBorrower, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              placeholder="(303) 555-0100"
              value={currentBorrower.phone || ''}
              onChange={(e) => setCurrentBorrower({ ...currentBorrower, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Party Type</Label>
            <Select value={currentBorrower.partyType || 'Primary_Borrower'} onValueChange={(v) => setCurrentBorrower({ ...currentBorrower, partyType: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary_Borrower">Primary Borrower</SelectItem>
                <SelectItem value="Co_Borrower">Co-Borrower</SelectItem>
                <SelectItem value="Guarantor">Guarantor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={addBorrower} variant="outline" className="w-full">
          + Add Borrower
        </Button>

        {/* Borrower List */}
        {data.borrowers && data.borrowers.length > 0 && (
          <div className="space-y-3">
            <Label className="font-semibold">Borrowers ({data.borrowers.length})</Label>
            {data.borrowers.map(borrower => (
              <Card key={borrower.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{borrower.firstName} {borrower.lastName}</p>
                  <p className="text-sm text-gray-500">{borrower.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{borrower.partyType.replace(/_/g, ' ')}</p>
                </div>
                <button onClick={() => removeBorrower(borrower.id)} className="text-red-500 hover:text-red-700">
                  <X className="h-5 w-5" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WizardStep>
  );
}