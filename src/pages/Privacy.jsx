import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Eye, 
  ArrowLeft, 
  Shield,
  Database,
  Clock,
  UserCheck,
  FileText,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const lastUpdated = "January 20, 2026";

  const sections = [
    {
      title: "Data We Collect",
      icon: Database,
      items: [
        "Borrower information (name, contact, SSN, financial data)",
        "Property information",
        "Loan application details",
        "Documents you upload",
        "Usage data for platform improvement"
      ]
    },
    {
      title: "How We Use Data",
      icon: FileText,
      items: [
        "Process loan applications",
        "Communicate with borrowers and parties",
        "Comply with regulatory requirements",
        "Improve our services (aggregated/anonymized)",
        "Prevent fraud and security threats"
      ]
    },
    {
      title: "Data Protection",
      icon: Shield,
      items: [
        "Encryption at rest and in transit",
        "Role-based access controls",
        "Regular security testing",
        "Vendor security requirements",
        "Employee security training"
      ]
    },
    {
      title: "Data Retention",
      icon: Clock,
      items: [
        "Funded loans: 7 years (regulatory)",
        "Denied applications: 3 years",
        "Unconverted leads: 2 years",
        "Audit logs: 7 years",
        "Secure deletion after retention period"
      ]
    },
    {
      title: "Your Rights",
      icon: UserCheck,
      items: [
        "Access your personal data",
        "Request correction of errors",
        "Request deletion (where permitted)",
        "Opt out of marketing",
        "Data portability"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link 
            to={createPageUrl('Trust')} 
            className="inline-flex items-center text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Trust Center
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Eye className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Privacy Practices</h1>
          </div>
          <p className="text-lg text-slate-300">
            How we collect, use, and protect your personal information.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Summary */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Privacy Summary</h3>
            <p className="text-blue-800">
              LoanGenius processes personal data to facilitate loan origination services. 
              We collect only what's necessary, protect it with strong security controls, 
              retain it per regulatory requirements, and respect your privacy rights.
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <section.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Regulatory Compliance */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Regulatory Compliance</CardTitle>
            <CardDescription>
              LoanGenius supports compliance with applicable privacy and financial regulations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">GLBA</h4>
                <p className="text-sm text-slate-600">Gramm-Leach-Bliley Act privacy requirements</p>
              </div>
              <div>
                <h4 className="font-medium">CCPA/CPRA</h4>
                <p className="text-sm text-slate-600">California privacy rights</p>
              </div>
              <div>
                <h4 className="font-medium">FCRA</h4>
                <p className="text-sm text-slate-600">Fair Credit Reporting Act</p>
              </div>
              <div>
                <h4 className="font-medium">State Laws</h4>
                <p className="text-sm text-slate-600">Various state privacy requirements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Agreement */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Data Processing Agreement</CardTitle>
            <CardDescription>
              For customers who need a formal DPA for compliance purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Our DPA template includes GDPR Article 28 compliant terms covering data processing 
              scope, security measures, subprocessors, and data subject rights.
            </p>
            <Button variant="outline" asChild>
              <Link to={createPageUrl('Trust')}>
                Request DPA
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mt-8 bg-slate-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Privacy Questions or Requests?</h3>
              <p className="text-slate-600 mb-4">
                Contact our privacy team for questions or to exercise your rights.
              </p>
              <Button asChild>
                <a href="mailto:privacy@loangenius.io">
                  <Mail className="h-4 w-4 mr-2" />
                  privacy@loangenius.io
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}