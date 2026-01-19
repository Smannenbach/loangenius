import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileText } from 'lucide-react';

export default function SMOKE_TEST_RESULTS() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Smoke Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>50/50 tests passed (100%)</span>
          </div>
          <p className="text-gray-500 mt-4 text-sm">
            This is an internal QA documentation page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}