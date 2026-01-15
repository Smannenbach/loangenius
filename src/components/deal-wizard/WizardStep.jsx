import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WizardStep({ stepNumber, title, description, children, onNext, onPrev, isLastStep, isValid = true, loading = false }) {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {stepNumber}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-500">{description}</p>
          </div>
        </div>
      </div>

      <Card className="p-8">
        {children}
      </Card>

      <div className="flex justify-between gap-4">
        {stepNumber > 1 ? (
          <Button variant="outline" onClick={onPrev}>
            ← Previous
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={onNext}
          disabled={!isValid || loading}
          className="bg-blue-600 hover:bg-blue-500"
        >
          {isLastStep ? 'Create Deal' : 'Next →'}
        </Button>
      </div>
    </div>
  );
}