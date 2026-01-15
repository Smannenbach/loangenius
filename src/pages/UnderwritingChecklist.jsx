import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, AlertCircle, FileText, Zap, Loader2 } from 'lucide-react';

const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('deal_id');

export default function UnderwritingChecklist() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('conditions');

  const { data: deal } = useQuery({
    queryKey: ['underwritingDeal', dealId],
    queryFn: () => base44.entities.Deal.get(dealId),
    enabled: !!dealId
  });

  const { data: conditions } = useQuery({
    queryKey: ['conditions', dealId],
    queryFn: () => base44.entities.Condition.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: requirements } = useQuery({
    queryKey: ['docRequirements', dealId],
    queryFn: () => base44.entities.DealDocumentRequirement.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: pkg } = useQuery({
    queryKey: ['submissionPackage', dealId],
    queryFn: async () => {
      const packages = await base44.entities.SubmissionPackage.filter({ deal_id: dealId });
      return packages?.[0];
    },
    enabled: !!dealId
  });

  const updateConditionMutation = useMutation({
    mutationFn: ({ conditionId, status, notes }) =>
      base44.functions.invoke('updateConditionStatus', {
        condition_id: conditionId,
        status,
        reviewer_notes: notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions', dealId] });
    }
  });

  const generatePackageMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('generateSubmissionPackage', {
        deal_id: dealId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissionPackage', dealId] });
    }
  });

  if (!dealId) {
    return <div className="p-6 text-center text-red-600">Invalid deal ID</div>;
  }

  const approvedConditions = conditions?.filter(c => c.status === 'approved').length || 0;
  const totalConditions = conditions?.length || 0;
  const completedDocs = requirements?.filter(r => r.status === 'approved').length || 0;
  const totalDocs = requirements?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Underwriting Checklist</h1>
          <p className="text-gray-600 mt-2">{deal?.deal_name || 'Deal'}</p>
        </div>

        {/* Readiness Score */}
        {pkg && (
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Submission Readiness</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">{pkg.readiness_score}%</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm"><span className="font-medium">{completedDocs}</span> of {totalDocs} documents</p>
                  <p className="text-sm"><span className="font-medium">{approvedConditions}</span> of {totalConditions} conditions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conditions" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="submission" className="gap-2">
              <Zap className="h-4 w-4" />
              Submission
            </TabsTrigger>
          </TabsList>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Underwriting Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conditions && conditions.length > 0 ? (
                  conditions.map(cond => (
                    <div key={cond.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          {cond.status === 'approved' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium">{cond.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{cond.description}</p>
                          </div>
                        </div>
                        <Badge
                          variant={cond.status === 'approved' ? 'default' : 'secondary'}
                          className={cond.status === 'approved' ? 'bg-green-600' : ''}
                        >
                          {cond.status}
                        </Badge>
                      </div>

                      {cond.status !== 'approved' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateConditionMutation.mutate({
                                conditionId: cond.id,
                                status: 'approved'
                              })
                            }
                            className="gap-1"
                            disabled={updateConditionMutation.isPending}
                          >
                            {updateConditionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            Reject
                          </Button>
                          <Button size="sm" variant="outline">
                            Waive
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No conditions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requirements && requirements.length > 0 ? (
                  requirements.map(req => (
                    <div
                      key={req.id}
                      className="p-3 border rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {['approved', 'uploaded'].includes(req.status) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{req.name}</p>
                          <p className="text-xs text-gray-600">{req.category}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          req.status === 'approved' ? 'default' : 'secondary'
                        }
                        className={
                          req.status === 'approved' ? 'bg-green-600' : ''
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No requirements</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submission Tab */}
          <TabsContent value="submission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prepare for Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pkg ? (
                  <>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-900">Package Ready</p>
                      <p className="text-sm text-green-800 mt-1">
                        {pkg.file_count} documents included
                      </p>
                    </div>
                    <Button className="w-full gap-2">
                      <FileText className="h-4 w-4" />
                      Download Package
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Generate a submission package with all required documents and exports.
                    </p>
                    <Button
                      onClick={() => generatePackageMutation.mutate()}
                      disabled={generatePackageMutation.isPending}
                      className="w-full gap-2"
                    >
                      {generatePackageMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Generate Package
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}