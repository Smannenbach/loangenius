import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function PortalStatusTab({ loanFile }) {
  const timeline = [
    { stage: 'Application', status: 'completed', date: 'Submitted' },
    { stage: 'Processing', status: 'in-progress', date: 'In Progress' },
    { stage: 'Underwriting', status: 'pending', date: 'Upcoming' },
    { stage: 'Clear to Close', status: 'pending', date: 'Upcoming' },
    { stage: 'Closing', status: 'pending', date: 'Upcoming' },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Application Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={item.stage} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {item.status === 'completed' && (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                  {item.status === 'in-progress' && (
                    <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
                  )}
                  {item.status === 'pending' && (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                  )}
                  {idx < timeline.length - 1 && (
                    <div className={`w-1 h-8 mt-1 ${
                      item.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <p className="font-medium text-gray-900">{item.stage}</p>
                  <p className={`text-sm ${
                    item.status === 'completed' ? 'text-green-600' :
                    item.status === 'in-progress' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {item.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Upload Documents</p>
                <p className="text-sm text-blue-800 mt-1">
                  We still need a few documents to move forward. Please upload them in the Documents tab.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Key Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Est. Closing Date</span>
            <span className="font-medium">
              {loanFile?.closing_date ? new Date(loanFile.closing_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'TBD'}
            </span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-gray-600">Days to Closing</span>
            <span className="font-medium text-blue-600">
              {loanFile?.closing_date ? Math.max(0, Math.ceil((new Date(loanFile.closing_date) - new Date()) / (1000 * 60 * 60 * 24))) : '-'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}