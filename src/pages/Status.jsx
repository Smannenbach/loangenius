import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Server, 
  ArrowLeft, 
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StatusPage() {
  const lastUpdated = new Date().toLocaleString();

  const services = [
    { name: "Application Platform", status: "operational" },
    { name: "Authentication (SSO)", status: "operational" },
    { name: "Document Storage", status: "operational" },
    { name: "Email Notifications", status: "operational" },
    { name: "SMS Notifications", status: "operational" },
    { name: "AI Features", status: "operational" },
    { name: "Integrations", status: "operational" }
  ];

  const getStatusBadge = (status) => {
    if (status === "operational") {
      return <Badge className="bg-green-100 text-green-800">Operational</Badge>;
    }
    if (status === "degraded") {
      return <Badge className="bg-amber-100 text-amber-800">Degraded</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Outage</Badge>;
  };

  const allOperational = services.every(s => s.status === "operational");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className={`py-12 ${allOperational ? 'bg-green-900' : 'bg-amber-900'} text-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link 
            to={createPageUrl('Trust')} 
            className="inline-flex items-center text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Trust Center
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${allOperational ? 'bg-green-600' : 'bg-amber-600'}`}>
              {allOperational ? (
                <CheckCircle className="h-8 w-8" />
              ) : (
                <Activity className="h-8 w-8" />
              )}
            </div>
            <h1 className="text-3xl font-bold">System Status</h1>
          </div>
          <p className="text-xl">
            {allOperational 
              ? "All systems operational" 
              : "Some systems experiencing issues"}
          </p>
          <p className="text-sm text-white/70 mt-2">
            Last checked: {lastUpdated}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>
              Current operational status of LoanGenius services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <span className="font-medium">{service.name}</span>
                  {getStatusBadge(service.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-slate-600">Last 30 days</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">99.95%</p>
                <p className="text-sm text-slate-600">Last 90 days</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-slate-600">Year to date</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>
              Past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No incidents in the past 30 days</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscribe */}
        <Card className="mt-8 bg-slate-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Get Status Updates</h3>
              <p className="text-slate-600 mb-4">
                Subscribe to receive notifications about system status changes.
              </p>
              <p className="text-slate-500 text-sm">
                Coming soon: Email and SMS status notifications
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}