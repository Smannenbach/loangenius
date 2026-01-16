import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from 'lucide-react';

export default function Step6Review({ data, onNext, onPrev, loading, isEditMode }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          6
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
          <p className="text-gray-600 mt-1">Review your application before submitting</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Loan Details */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Loan Type:</span>
                <p className="font-medium text-gray-900">{data.loanType}</p>
              </div>
              <div>
                <span className="text-gray-600">Loan Purpose:</span>
                <p className="font-medium text-gray-900">{data.loanPurpose}</p>
              </div>
              <div>
                <span className="text-gray-600">Loan Amount:</span>
                <p className="font-medium text-gray-900">${parseFloat(data.loanAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Interest Rate:</span>
                <p className="font-medium text-gray-900">{data.interestRate}%</p>
              </div>
              <div>
                <span className="text-gray-600">Loan Term:</span>
                <p className="font-medium text-gray-900">{data.loanTermMonths / 12} years</p>
              </div>
              <div>
                <span className="text-gray-600">Rate Type:</span>
                <p className="font-medium text-gray-900">{data.rateType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Properties ({data.properties?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.properties?.map((prop, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{prop.address_street}</p>
                <p className="text-sm text-gray-600">
                  {prop.address_city}, {prop.address_state} {prop.address_zip}
                </p>
                <p className="text-xs text-gray-500 mt-1">{prop.property_type}</p>
              </div>
            )) || <p className="text-sm text-gray-500">No properties added</p>}
          </CardContent>
        </Card>

        {/* Borrowers */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Borrowers ({data.borrowers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.borrowers?.map((borrower, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">
                  {borrower.first_name} {borrower.last_name}
                </p>
                <p className="text-sm text-gray-600">{borrower.email}</p>
                <p className="text-xs text-gray-500 mt-1">{borrower.party_type}</p>
              </div>
            )) || <p className="text-sm text-gray-500">No borrowers added</p>}
          </CardContent>
        </Card>

        {/* Income & Expenses */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Income & Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current Rent:</span>
                <p className="font-medium text-gray-900">${parseFloat(data.currentLeaseRent || 0).toLocaleString()}/mo</p>
              </div>
              <div>
                <span className="text-gray-600">Market Rent:</span>
                <p className="font-medium text-gray-900">${parseFloat(data.marketRent || 0).toLocaleString()}/mo</p>
              </div>
              <div>
                <span className="text-gray-600">Annual Taxes:</span>
                <p className="font-medium text-gray-900">${parseFloat(data.annualPropertyTaxes || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Annual Insurance:</span>
                <p className="font-medium text-gray-900">${parseFloat(data.annualHomeInsurance || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} disabled={loading}>
          ← Previous
        </Button>
        <Button 
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isEditMode ? 'Save Changes' : 'Create Deal'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}