import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Bell } from 'lucide-react';

export default function ErrorTest() {
  const [shouldThrow, setShouldThrow] = useState(false);

  // This will trigger the ErrorBoundary when shouldThrow is true
  if (shouldThrow) {
    throw new Error('Test error triggered intentionally for ErrorBoundary verification');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Error & Toast Testing Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Toast Tests (Sonner)</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => toast.success('Success toast works!')}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                Success Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => toast.error('Error toast works!')}
                className="gap-2"
              >
                <XCircle className="h-4 w-4 text-red-600" />
                Error Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => toast.info('Info toast works!')}
                className="gap-2"
              >
                <Bell className="h-4 w-4 text-blue-600" />
                Info Toast
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3 text-red-600">Error Boundary Test</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click the button below to intentionally throw an error. 
              The ErrorBoundary should catch it and display a friendly error UI with a "Copy Debug Details" button.
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setShouldThrow(true)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Trigger Error Boundary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}