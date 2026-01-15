import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, User, Building2 } from 'lucide-react';

/**
 * Multi-borrower selector for deals
 * Supports primary/co-borrower/guarantor/co-signer roles
 * Can add new borrowers inline or select existing
 */
export default function BorrowerSelector({ onBorrowersChange }) {
  const [borrowers, setBorrowers] = useState([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newBorrower, setNewBorrower] = useState({
    type: 'individual',
    first_name: '',
    last_name: '',
    entity_name: '',
    email: '',
    phone: '',
    role: 'primary'
  });

  const { data: existingBorrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => base44.entities.Borrower.list()
  });

  const handleAddExisting = (borrower, role) => {
    const newEntry = {
      id: borrower.id,
      name: borrower.first_name && borrower.last_name 
        ? `${borrower.first_name} ${borrower.last_name}`
        : borrower.entity_name,
      type: borrower.borrower_type,
      role,
      existing: true
    };

    const updated = [...borrowers, newEntry];
    setBorrowers(updated);
    onBorrowersChange?.(updated);
  };

  const handleAddNew = () => {
    if (!newBorrower.first_name && !newBorrower.entity_name) {
      return;
    }

    const entry = {
      id: `new_${Date.now()}`,
      name: newBorrower.type === 'individual'
        ? `${newBorrower.first_name} ${newBorrower.last_name}`
        : newBorrower.entity_name,
      type: newBorrower.type,
      role: newBorrower.role,
      email: newBorrower.email,
      phone: newBorrower.phone,
      existing: false,
      data: newBorrower // Store full data for creation
    };

    const updated = [...borrowers, entry];
    setBorrowers(updated);
    onBorrowersChange?.(updated);

    // Reset form
    setNewBorrower({
      type: 'individual',
      first_name: '',
      last_name: '',
      entity_name: '',
      email: '',
      phone: '',
      role: 'primary'
    });
    setShowNewForm(false);
  };

  const handleRemove = (index) => {
    const updated = borrowers.filter((_, i) => i !== index);
    setBorrowers(updated);
    onBorrowersChange?.(updated);
  };

  const handleRoleChange = (index, newRole) => {
    const updated = [...borrowers];
    updated[index].role = newRole;
    setBorrowers(updated);
    onBorrowersChange?.(updated);
  };

  const primaryBorrowerExists = borrowers.some(b => b.role === 'primary');

  return (
    <div className="space-y-4">
      {/* Current Borrowers */}
      {borrowers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Borrowers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {borrowers.map((borrower, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {borrower.type === 'individual' ? (
                    <User className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Building2 className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{borrower.name}</p>
                    {borrower.email && <p className="text-xs text-gray-500">{borrower.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={borrower.role} onValueChange={(val) => handleRoleChange(idx, val)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="co_borrower">Co-Borrower</SelectItem>
                      <SelectItem value="guarantor">Guarantor</SelectItem>
                      <SelectItem value="co_signer">Co-Signer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Borrower Options */}
      <div className="flex gap-2">
        {!showNewForm && (
          <>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add New Borrower
            </Button>
          </>
        )}
      </div>

      {/* New Borrower Form */}
      {showNewForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add New Borrower</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select
                value={newBorrower.type}
                onValueChange={(val) => setNewBorrower({ ...newBorrower, type: val })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="entity">Business Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newBorrower.type === 'individual' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">First Name *</Label>
                  <Input
                    placeholder="John"
                    value={newBorrower.first_name}
                    onChange={(e) => setNewBorrower({ ...newBorrower, first_name: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Last Name</Label>
                  <Input
                    placeholder="Smith"
                    value={newBorrower.last_name}
                    onChange={(e) => setNewBorrower({ ...newBorrower, last_name: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Entity Name *</Label>
                <Input
                  placeholder="ABC Investments LLC"
                  value={newBorrower.entity_name}
                  onChange={(e) => setNewBorrower({ ...newBorrower, entity_name: e.target.value })}
                  className="text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newBorrower.email}
                  onChange={(e) => setNewBorrower({ ...newBorrower, email: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Phone</Label>
                <Input
                  placeholder="(555) 123-4567"
                  value={newBorrower.phone}
                  onChange={(e) => setNewBorrower({ ...newBorrower, phone: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Role *</Label>
              <Select
                value={newBorrower.role}
                onValueChange={(val) => setNewBorrower({ ...newBorrower, role: val })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Borrower</SelectItem>
                  <SelectItem value="co_borrower">Co-Borrower</SelectItem>
                  <SelectItem value="guarantor">Guarantor</SelectItem>
                  <SelectItem value="co_signer">Co-Signer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAddNew}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                Add Borrower
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}