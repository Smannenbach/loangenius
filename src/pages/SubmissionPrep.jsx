import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Package, Send, Download, AlertCircle, Clock } from 'lucide-react';

const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('deal_id');

export default function SubmissionPrep() {
  const queryClient = useQueryClient();

  const { data: pkg } = useQuery({
    queryKey: ['submissionPkg', dealId],
    queryFn: async () => {
      const packages = await base44.entities.SubmissionPackage.filter({ deal_id: dealId });
      return packages?.[0];
    },
    enabled: !!dealId
  });

  const { data: exports } = useQuery({
    queryKey: ['exports', dealId],
    queryFn: () => base44.entities.ExportRun.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Mock submission to lender
      await new Promise(r => setTimeout(r, 1000));
      return { submitted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissionPkg', dealId] });
    }
  });

  if (!dealId) {
    return <div className="p-6 text-center text-red-600">Invalid deal ID</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Submission Preparation</h1>
          <p className="text-gray-600 mt-2">Ready to submit to lender</p>
        </div>

        <Tabs defaultValue="package">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="package">Package</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
            <TabsTrigger value="submit">Submit</TabsTrigger>
          </TabsList>

          {/* Package Tab */}
          <TabsContent value="package" className="space-y-4">
            {pkg ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{pkg.package_name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Generated: {new Date(pkg.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-green-600">{pkg.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Readiness Score</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {pkg.readiness_score}%
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Files Included</p>
                      <p className="text-2xl font-bold mt-1">{pkg.file_count}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Package Size</p>
                      <p className="text-2xl font-bold mt-1">
                        {(pkg.file_size_bytes / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>
                  </div>
                  <Button className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download Package
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-600">No submission package generated yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Loan Exports</CardTitle>
              </CardHeader>
              <CardContent>
                {exports && exports.length > 0 ? (
                  <div className="space-y-3">
                    {exports.map(exp => (
                      <div
                        key={exp.id}
                        className="p-3 border rounded flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {exp.export_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{exp.filename}</p>
                        </div>
                        <Badge
                          className={
                            exp.status === 'completed' ? 'bg-green-600' : 'bg-gray-500'
                          }
                        >
                          {exp.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No exports</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Tab */}
          <TabsContent value="submit" className="space-y-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Ready to Submit</p>
                    <p className="text-sm text-blue-800 mt-1">
                      All documents and conditions are ready. Submit to lender for final processing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submit to Lender</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {submitMutation.isPending ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Package to Lender
                </Button>
                <p className="text-xs text-gray-600 text-center">
                  This will notify the lender and complete your submission
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}