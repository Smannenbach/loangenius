import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileCheck, Sparkles } from 'lucide-react';
import PreQualificationCheck from '@/components/onboarding/PreQualificationCheck';
import SmartDocumentCollector from '@/components/onboarding/SmartDocumentCollector';

const ONBOARDING_STEPS = [
  { id: 1, title: 'Pre-Qualification', icon: Sparkles },
  { id: 2, title: 'Document Upload', icon: FileCheck },
  { id: 3, title: 'Application', icon: CheckCircle2 }
];

export default function BorrowerOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [preQualResult, setPreQualResult] = useState(null);
  const [skipPreQual, setSkipPreQual] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email
  });

  const orgId = memberships[0]?.org_id || user?.org_id;

  const handlePreQualComplete = (result) => {
    setPreQualResult(result);
    
    // If passed or needs review, move to documents; if failed, show options
    if (result.prequalification?.status === 'passed' || result.prequalification?.status === 'needs_review') {
      setCurrentStep(2);
    }
  };

  const handlePreQualSkip = () => {
    setSkipPreQual(true);
    setCurrentStep(2);
  };

  const handleDocumentsComplete = () => {
    // Navigate to full application with portal mode enabled
    navigate(createPageUrl('LoanApplicationWizard?portal=true'));
  };

  const handleSkipDocuments = () => {
    // Skip directly to application
    navigate(createPageUrl('LoanApplicationWizard?portal=true'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-slate-800"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-sm">LG</span>
            </div>
            <span className="font-bold text-lg">Get Started with Your Loan</span>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((s, idx) => {
              const isActive = currentStep === s.id;
              const isComplete = currentStep > s.id || (s.id === 1 && (preQualResult || skipPreQual));
              const Icon = s.icon;
              
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      isActive ? 'bg-blue-600 text-white' :
                      isComplete ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs mt-1 whitespace-nowrap ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {s.title}
                    </span>
                  </div>
                  {idx < ONBOARDING_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-4 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                See if You Pre-Qualify
              </h1>
              <p className="text-gray-600">
                Get instant feedback on your loan eligibility in just 3 quick steps
              </p>
            </div>
            
            <PreQualificationCheck
              orgId={orgId}
              onComplete={handlePreQualComplete}
              onSkip={handlePreQualSkip}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Your Documents
              </h1>
              <p className="text-gray-600">
                Our AI will instantly analyze each document for completeness and compliance
              </p>
            </div>

            <SmartDocumentCollector
              orgId={orgId}
              dealId={null}
              borrowerId={null}
              onComplete={handleDocumentsComplete}
            />

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkipDocuments}
                className="text-gray-500"
              >
                Skip and upload later
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}