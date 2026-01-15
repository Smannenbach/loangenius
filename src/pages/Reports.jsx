import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReportBuilder from '../components/reports/ReportBuilder';
import ReportResults from '../components/reports/ReportResults';

export default function Reports() {
  const [currentReport, setCurrentReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleGenerateReport = async (filters) => {
    setReportLoading(true);
    try {
      let functionName = 'generateProductionReport';
      if (filters.report_type === 'pipeline') functionName = 'generatePipelineReport';
      if (filters.report_type === 'funnel') functionName = 'generateConversionFunnel';
      if (filters.report_type === 'risk') functionName = 'generateBorrowerRiskAnalysis';

      const response = await base44.functions.invoke(functionName, {
        ...filters,
        org_id: user?.org_id || '',
      });

      setCurrentReport(response.data?.report);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">Generate detailed reports on production, pipeline, and risk metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ReportBuilder onGenerateReport={handleGenerateReport} />
        </div>

        <div className="lg:col-span-2">
          <ReportResults report={currentReport} loading={reportLoading} />
        </div>
      </div>
    </div>
  );
}