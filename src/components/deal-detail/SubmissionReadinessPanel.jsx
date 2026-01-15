import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function SubmissionReadinessPanel({ dealId }) {
  const [showPackageModal, setShowPackageModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: readiness, isLoading } = useQuery({
    queryKey: ['readiness', dealId],
    queryFn: () => base44.functions.invoke('calculateReadinessScore', {
      org_id: 'default',
      deal_id: dealId
    }).then(r => r.data)
  });

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateSubmissionPackage', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', dealId] });
      setShowPackageModal(false);
    }
  });

  if (isLoading) return <div className="p-4">Loading readiness...</div>;

  const getStatusColor = (status) => {
    if (status === 'Ready') return 'bg-green-100 text-green-900';
    if (status === 'Almost Ready') return 'bg-yellow-100 text-yellow-900';
    return 'bg-red-100 text-red-900';
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Submission Readiness</p>
              <p className="text-4xl font-bold">{readiness?.score}%</p>
            </div>
            <div className="w-32 h-32">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="60" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeDasharray={`${(readiness?.score / 100) * 377} 377`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Badge className={getStatusColor(readiness?.status)}>
                    {readiness?.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {readiness?.can_submit && (
            <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                  <Zap className="h-4 w-4" />
                  Generate Submission Package
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Submission Package</DialogTitle>
                </DialogHeader>
                <GeneratePackageForm
                  dealId={dealId}
                  onSubmit={(data) => generateMutation.mutate(data)}
                  isLoading={generateMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {readiness?.categories && Object.entries(readiness.categories).map(([category, data]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base flex justify-between items-center">
              {category}
              <span className="text-sm text-slate-600">
                {data.passed}/{data.total} Complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.items?.map(item => (
                <div key={item.item_key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {item.status === 'Passed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{item.display_name}</span>
                  </div>
                  <Badge variant={item.status === 'Passed' ? 'default' : 'destructive'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Blocking Issues */}
      {readiness?.blocking_issues?.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-900">
              Blocking Issues ({readiness.blocking_issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readiness.blocking_issues.map((issue, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">{issue.display_name}</p>
                  <p className="text-red-700">{issue.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {readiness?.warnings?.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base text-yellow-900">
              Warnings ({readiness.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readiness.warnings.map((warning, i) => (
              <div key={i} className="text-sm text-yellow-800">
                {warning.display_name}: {warning.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GeneratePackageForm({ dealId, onSubmit, isLoading }) {
  const [packageName, setPackageName] = React.useState('Full Package');
  const [packageType, setPackageType] = React.useState('Full_Package');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Package Name</label>
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Package Type</label>
        <select
          value={packageType}
          onChange={(e) => setPackageType(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="Full_Package">Full Package (Docs + Exports)</option>
          <option value="Documents_Only">Documents Only</option>
          <option value="Exports_Only">Exports Only</option>
        </select>
      </div>

      <Button
        onClick={() => onSubmit({
          org_id: 'default',
          deal_id: dealId,
          package_name: packageName,
          package_type: packageType
        })}
        disabled={isLoading}
        className="w-full"
      >
        Generate Package
      </Button>
    </div>
  );
}