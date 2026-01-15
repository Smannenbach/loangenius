import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, CheckSquare, Activity } from 'lucide-react';
import MISMOPreflightReport from '../components/MISMOPreflightReport';
import DealCalculator from '../components/deal-wizard/DealCalculator';

export default function DealMobile() {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('id');

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => base44.entities.Deal.get(dealId)
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!deal) return <div className="p-4">Deal not found</div>;

  return (
    <div className="p-4 pb-20">
      <div className="mb-4">
        <h1 className="text-xl font-bold">{deal.deal_number}</h1>
        <p className="text-gray-600 text-sm">${(deal.loan_amount || 0).toLocaleString()}</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Docs</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">${(deal.loan_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rate:</span>
                <span className="font-medium">{deal.interest_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term:</span>
                <span className="font-medium">{deal.loan_term_months} months</span>
              </div>
            </CardContent>
          </Card>
          {deal.properties && <DealCalculator deal={deal} properties={deal.properties} />}
        </TabsContent>

        <TabsContent value="documents" className="mt-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">No documents uploaded yet</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">No tasks assigned</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-3">
          <MISMOPreflightReport dealId={dealId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}