import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Building, 
  ArrowLeft, 
  Download,
  Mail,
  Bell,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SubprocessorsPage() {
  const lastUpdated = "January 20, 2026";

  const subprocessors = [
    {
      vendor: "Base44",
      purpose: "Platform hosting",
      dataCategories: "All application data",
      region: "United States",
      lastReviewed: "Jan 2026",
      tier: "High"
    },
    {
      vendor: "Google Cloud",
      purpose: "SSO Authentication",
      dataCategories: "User identity, email",
      region: "United States, Global",
      lastReviewed: "Jan 2026",
      tier: "High"
    },
    {
      vendor: "SendGrid (Twilio)",
      purpose: "Email delivery",
      dataCategories: "Email addresses, content",
      region: "United States",
      lastReviewed: "Jan 2026",
      tier: "Medium"
    },
    {
      vendor: "Twilio",
      purpose: "SMS notifications",
      dataCategories: "Phone numbers, content",
      region: "United States",
      lastReviewed: "Jan 2026",
      tier: "Medium"
    },
    {
      vendor: "OpenAI",
      purpose: "AI-assisted processing",
      dataCategories: "Query content (no PII)",
      region: "United States",
      lastReviewed: "Jan 2026",
      tier: "Medium"
    },
    {
      vendor: "Anthropic",
      purpose: "AI-assisted processing",
      dataCategories: "Query content (no PII)",
      region: "United States",
      lastReviewed: "Jan 2026",
      tier: "Medium"
    },
    {
      vendor: "Google Workspace",
      purpose: "Document integrations",
      dataCategories: "Connected data",
      region: "United States, Global",
      lastReviewed: "Jan 2026",
      tier: "Medium"
    },
    {
      vendor: "Cloudflare",
      purpose: "CDN, DNS, DDoS protection",
      dataCategories: "Traffic metadata",
      region: "Global",
      lastReviewed: "Jan 2026",
      tier: "Low"
    }
  ];

  const getTierBadge = (tier) => {
    const colors = {
      High: "bg-red-100 text-red-800",
      Medium: "bg-amber-100 text-amber-800",
      Low: "bg-green-100 text-green-800"
    };
    return <Badge className={colors[tier]}>{tier} Risk</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link 
            to={createPageUrl('Trust')} 
            className="inline-flex items-center text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Trust Center
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Subprocessors</h1>
          </div>
          <p className="text-lg text-slate-300">
            Third-party service providers that process data on our behalf.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button variant="outline" asChild>
            <a href="/subprocessors.csv" download>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:dpa@loangenius.io?subject=Subscribe%20to%20Subprocessor%20Updates">
              <Bell className="h-4 w-4 mr-2" />
              Subscribe to Updates
            </a>
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Subprocessors</CardTitle>
            <CardDescription>
              All vendors that may process customer data as part of LoanGenius services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Data Categories</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Risk Tier</TableHead>
                    <TableHead>Last Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subprocessors.map((sp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{sp.vendor}</TableCell>
                      <TableCell>{sp.purpose}</TableCell>
                      <TableCell className="text-slate-600">{sp.dataCategories}</TableCell>
                      <TableCell>{sp.region}</TableCell>
                      <TableCell>{getTierBadge(sp.tier)}</TableCell>
                      <TableCell>{sp.lastReviewed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Data Categories Explanation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Data Categories Explained</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">All application data</h4>
                <p className="text-sm text-slate-600">Complete data stored in the platform</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">User identity</h4>
                <p className="text-sm text-slate-600">Name, email for authentication</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Email addresses, content</h4>
                <p className="text-sm text-slate-600">Recipient addresses and message bodies</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Query content (no PII)</h4>
                <p className="text-sm text-slate-600">Text sent to AI services (we avoid PII in AI queries)</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Traffic metadata</h4>
                <p className="text-sm text-slate-600">IP addresses, request headers (anonymized)</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Connected data</h4>
                <p className="text-sm text-slate-600">Data from integrated services (Sheets, Calendar)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Notification */}
        <Card className="mt-8 bg-slate-50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Subprocessor Change Notification</h3>
                <p className="text-slate-600 text-sm">
                  We notify customers 30 days before material changes to our subprocessor list. 
                  Subscribe to receive email notifications.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="mailto:dpa@loangenius.io?subject=Subscribe%20to%20Subprocessor%20Updates">
                  <Mail className="h-4 w-4 mr-2" />
                  Subscribe
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="mt-8 text-center text-slate-600">
          <p>
            Questions about our subprocessors?{" "}
            <a href="mailto:privacy@loangenius.io" className="text-blue-600 hover:underline">
              privacy@loangenius.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}