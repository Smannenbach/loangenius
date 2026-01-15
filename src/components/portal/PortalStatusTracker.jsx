import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';

export default function PortalStatusTracker({ sessionId }) {
  const { data: dealData = {}, isLoading } = useQuery({
    queryKey: ['portalStatus', sessionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('portalStatusTracker', {
        sessionId,
      });
      return response.data || {};
    },
    enabled: !!sessionId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const stageProgress = {
    inquiry: 10,
    application: 25,
    processing: 50,
    underwriting: 75,
    approved: 90,
    closing: 95,
    funded: 100,
  };

  const stageTimeline = [
    { key: 'inquiry', label: 'Application Started' },
    { key: 'application', label: 'Application Submitted' },
    { key: 'processing', label: 'Processing' },
    { key: 'underwriting', label: 'Underwriting' },
    { key: 'approved', label: 'Approved' },
    { key: 'closing', label: 'Closing' },
    { key: 'funded', label: 'Funded' },
  ];

  const progress = stageProgress[dealData.stage] || 0;

  const getStageStatus = (stageKey) => {
    const stageOrder = Object.keys(stageProgress);
    const currentIndex = stageOrder.indexOf(dealData.stage);
    const checkIndex = stageOrder.indexOf(stageKey);
    
    if (checkIndex < currentIndex) return 'completed';
    if (checkIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {progress}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-gray-600">
              Current Stage: <span className="font-semibold capitalize text-gray-900">{dealData.stage?.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Application Timeline</h3>
          <div className="space-y-3">
            {stageTimeline.map((stage, idx) => {
              const status = getStageStatus(stage.key);
              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'completed' ? 'bg-green-100' :
                      status === 'current' ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : status === 'current' ? (
                        <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-gray-300" />
                      )}
                    </div>
                    {idx < stageTimeline.length - 1 && (
                      <div className={`w-1 h-8 my-1 ${
                        status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className="pt-2 pb-4">
                    <p className={`font-medium text-sm ${
                      status === 'completed' || status === 'current' ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {stage.label}
                    </p>
                    {status === 'current' && dealData.stageUpdatedAt && (
                      <p className="text-xs text-blue-600 mt-1">
                        Started: {new Date(dealData.stageUpdatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-600 font-medium">Documents</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {dealData.documentsApproved || 0}/{dealData.documentsPending || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-600 font-medium">Days in Stage</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {dealData.daysInStage || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Current</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-600 font-medium">Total Days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {dealData.totalDays || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Since start</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {dealData.alerts && dealData.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 space-y-2">
            {dealData.alerts.map((alert, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">{alert.title}</p>
                  <p className="text-sm text-yellow-800">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}