import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AgentStatus({ agents = [] }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'offline': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Loader2 className="h-5 w-5 animate-spin text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Agent Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {agents.length === 0 ? (
            <p className="text-sm text-gray-600">All 22 agents operational</p>
          ) : (
            agents.map((agent, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(agent.status)}
                  <span className="text-sm font-medium">{agent.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">{agent.latency}</Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}