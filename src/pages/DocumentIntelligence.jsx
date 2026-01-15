import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

export default function DocumentIntelligence() {
  const [selectedDeal, setSelectedDeal] = useState(null);

  const { data: deals = [] } = useQuery({
    queryKey: ['dealsWithIntelligence'],
    queryFn: () => base44.entities.Deal.list()
  });

  const { data: intelligence = [] } = useQuery({
    queryKey: ['documentIntelligence', selectedDeal],
    queryFn: () => selectedDeal 
      ? base44.entities.DocumentIntelligence.filter({ deal_id: selectedDeal })
      : [],
    enabled: !!selectedDeal
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['documentAnalyses', selectedDeal],
    queryFn: () => selectedDeal
      ? base44.entities.DocumentAnalysis.filter({ deal_id: selectedDeal })
      : [],
    enabled: !!selectedDeal
  });

  const getPriorityIcon = (priority) => {
    if (priority === 'CRITICAL') return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (priority === 'HIGH') return <AlertCircle className="h-5 w-5 text-orange-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getPriorityColor = (priority) => {
    if (priority === 'CRITICAL') return 'destructive';
    if (priority === 'HIGH') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-8">
        <Lightbulb className="h-8 w-8 text-yellow-600" />
        <h1 className="text-3xl font-bold">Document Intelligence</h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Analyses</p>
            <p className="text-3xl font-bold mt-2">{analyses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Issues Found</p>
            <p className="text-3xl font-bold mt-2 text-orange-600">{intelligence.filter(i => !i.is_resolved).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Critical Items</p>
            <p className="text-3xl font-bold mt-2 text-red-600">{intelligence.filter(i => i.priority === 'CRITICAL').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-3xl font-bold mt-2 text-green-600">{intelligence.filter(i => i.is_resolved).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analyses">Document Analyses</TabsTrigger>
          <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {deals.slice(0, 9).map(deal => (
                  <Button
                    key={deal.id}
                    variant={selectedDeal === deal.id ? 'default' : 'outline'}
                    onClick={() => setSelectedDeal(deal.id)}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">Deal #{deal.id?.slice(0, 6)}</p>
                      <p className="text-xs text-gray-600">{deal.borrower_name}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedDeal && (
            <div className="space-y-4">
              {intelligence.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
                    <p className="text-gray-600">No intelligence items for this deal</p>
                  </CardContent>
                </Card>
              ) : (
                intelligence.map(item => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getPriorityIcon(item.priority)}
                          <div>
                            <h3 className="font-bold text-lg">{item.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          {item.is_resolved && <Badge variant="outline">Resolved</Badge>}
                        </div>
                      </div>

                      {item.recommendations && item.recommendations.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-900 mb-2">Recommendations:</p>
                          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            {item.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!item.is_resolved && (
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" className="bg-blue-600">Review</Button>
                          <Button size="sm" variant="outline">Dismiss</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Analyses Tab */}
        <TabsContent value="analyses" className="space-y-4">
          {selectedDeal ? (
            analyses.length === 0 ? (
              <Card>
                <CardContent className="pt-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No analyses run for this deal yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analyses.map(analysis => (
                  <Card key={analysis.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{analysis.document_type}</h3>
                          <p className="text-sm text-gray-600 mt-1">{analysis.analysis_type}</p>
                          <div className="mt-3 flex gap-2">
                            <Badge variant={analysis.status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {analysis.status}
                            </Badge>
                            {analysis.confidence_score && (
                              <Badge variant="outline">
                                Confidence: {Math.round(analysis.confidence_score * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-gray-600">Select a deal to view analyses</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Extracted Data Tab */}
        <TabsContent value="extracted" className="space-y-4">
          {selectedDeal ? (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['BORROWER_INFO', 'PROPERTY_INFO', 'FINANCIAL_DATA', 'INCOME_DATA'].map(type => (
                    <div key={type} className="p-4 border rounded">
                      <h4 className="font-medium mb-2">{type.replace(/_/g, ' ')}</h4>
                      <Button size="sm" variant="outline">View & Approve</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-gray-600">Select a deal to view extracted data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}