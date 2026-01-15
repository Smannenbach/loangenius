import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WizardStep from './WizardStep';

export default function Step5Borrower({ data, onChange, onNext, onPrev }) {
   const [currentBorrower, setCurrentBorrower] = useState({});
   const [creditLoading, setCreditLoading] = useState(null);
   const [creditResults, setCreditResults] = useState({});



  const removeBorrower = (id) => {
    onChange({ borrowers: data.borrowers.filter(b => b.id !== id) });
  };

  const pullCreditReport = async (borrower) => {
    if (!borrower.firstName || !borrower.lastName) return;

    setCreditLoading(borrower.id);
    try {
      const response = await base44.functions.invoke('scoreLeads', {
        firstName: borrower.firstName,
        lastName: borrower.lastName,
        email: borrower.email,
      });

      if (response.data?.creditScore) {
        setCreditResults({
          ...creditResults,
          [borrower.id]: response.data.creditScore
        });
        const updatedBorrowers = data.borrowers.map(b => 
          b.id === borrower.id ? { ...b, ficoScore: response.data.creditScore } : b
        );
        onChange({ borrowers: updatedBorrowers });
      }
    } catch (error) {
      console.error('Credit pull failed:', error);
    } finally {
      setCreditLoading(null);
    }
  };

  const isValid = (data.borrowers?.length || 0) > 0;

  const [borrowerError, setBorrowerError] = React.useState('');

  const handleAddBorrower = () => {
    setBorrowerError('');
    if (!currentBorrower.firstName?.trim()) {
      setBorrowerError('First name is required');
      return;
    }
    if (!currentBorrower.lastName?.trim()) {
      setBorrowerError('Last name is required');
      return;
    }
    if (!currentBorrower.email?.trim()) {
      setBorrowerError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentBorrower.email)) {
      setBorrowerError('Please enter a valid email');
      return;
    }
    const borrowers = [...(data.borrowers || []), { ...currentBorrower, id: Date.now() }];
    onChange({ borrowers });
    setCurrentBorrower({});
  };

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
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                placeholder="Enter first name"
                value={currentBorrower.firstName || ''}
                onChange={(e) => setCurrentBorrower({ ...currentBorrower, firstName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                placeholder="Enter last name"
                value={currentBorrower.lastName || ''}
                onChange={(e) => setCurrentBorrower({ ...currentBorrower, lastName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="Enter email address"
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

          {borrowerError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {borrowerError}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleAddBorrower} className="flex-1 bg-blue-600 hover:bg-blue-700">
              + Add Borrower
            </Button>
            <Button 
              onClick={() => {
                setCurrentBorrower({});
                setBorrowerError('');
              }} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Borrower List */}
        {data.borrowers && data.borrowers.length > 0 && (
          <div className="space-y-3">
            <Label className="font-semibold">Borrowers ({data.borrowers.length})</Label>
            {data.borrowers.map(borrower => (
              <Card key={borrower.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium">{borrower.firstName} {borrower.lastName}</p>
                    <p className="text-sm text-gray-500">{borrower.email}</p>
                    <p className="text-xs text-gray-400 mt-1">{borrower.partyType.replace(/_/g, ' ')}</p>
                    {borrower.ficoScore && (
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">FICO: {borrower.ficoScore}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!borrower.ficoScore && (
                      <Button
                        onClick={() => pullCreditReport(borrower)}
                        disabled={creditLoading === borrower.id}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {creditLoading === borrower.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Pulling...
                          </>
                        ) : (
                          'Pull Credit'
                        )}
                      </Button>
                    )}
                    <button onClick={() => removeBorrower(borrower.id)} className="text-red-500 hover:text-red-700">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WizardStep>
  );
}