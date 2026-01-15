import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

const stages = [
  { key: 'inquiry', label: 'Inquiry', progress: 10 },
  { key: 'application', label: 'Application', progress: 25 },
  { key: 'processing', label: 'Processing', progress: 50 },
  { key: 'underwriting', label: 'Underwriting', progress: 75 },
  { key: 'approved', label: 'Approved', progress: 90 },
  { key: 'closing', label: 'Closing', progress: 95 },
  { key: 'funded', label: 'Funded', progress: 100 },
];

export default function PortalProgressBar({ stage, progress, stageLabel }) {
  const currentStageIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {stages.map((s, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div key={s.key} className="text-center">
              <div className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all ${
                isCompleted
                  ? 'bg-green-100 text-green-600'
                  : isCurrent
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isCurrent ? (
                  <Clock className="h-5 w-5 animate-pulse" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <p className={`text-xs font-medium truncate ${
                isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current Stage Description */}
      {stageLabel && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Current Stage:</span> {stageLabel}
          </p>
        </div>
      )}
    </div>
  );
}