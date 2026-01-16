import React from 'react';
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const STAGES = [
  { id: 'inquiry', label: 'Inquiry', description: 'Initial contact' },
  { id: 'application', label: 'Application', description: 'Completing forms' },
  { id: 'processing', label: 'Processing', description: 'Document review' },
  { id: 'underwriting', label: 'Underwriting', description: 'Loan analysis' },
  { id: 'approved', label: 'Approved', description: 'Conditional approval' },
  { id: 'closing', label: 'Closing', description: 'Final paperwork' },
  { id: 'funded', label: 'Funded', description: 'Loan complete' }
];

export default function PortalApplicationStatus({ deal }) {
  if (!deal) return null;

  const currentStageIdx = STAGES.findIndex(s => s.id === deal.stage);
  const progress = currentStageIdx >= 0 ? Math.round(((currentStageIdx + 1) / STAGES.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Overall Progress</span>
          <span className="text-blue-600 font-semibold">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Stage Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const isComplete = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isPending = idx > currentStageIdx;

            return (
              <div key={stage.id} className="relative flex items-start gap-4 pl-10">
                <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  isComplete ? 'bg-green-500' :
                  isCurrent ? 'bg-blue-600 ring-4 ring-blue-100' :
                  'bg-gray-200'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : isCurrent ? (
                    <Clock className="h-3 w-3 text-white" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                  )}
                </div>
                <div className={`flex-1 ${isPending ? 'opacity-50' : ''}`}>
                  <p className={`font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-900'}`}>
                    {stage.label}
                  </p>
                  <p className="text-sm text-gray-500">{stage.description}</p>
                </div>
                {isCurrent && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loan Details Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <div>
          <p className="text-xs text-gray-500">Loan Amount</p>
          <p className="font-semibold">${(deal.loan_amount || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Interest Rate</p>
          <p className="font-semibold">{deal.interest_rate || 0}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Loan Type</p>
          <p className="font-semibold">{deal.loan_product || 'DSCR'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Purpose</p>
          <p className="font-semibold">{deal.loan_purpose || 'Purchase'}</p>
        </div>
      </div>
    </div>
  );
}