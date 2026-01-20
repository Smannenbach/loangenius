import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Shield, 
  Lock, 
  Key,
  Eye,
  AlertTriangle,
  Database,
  RefreshCw,
  Bell,
  CheckCircle,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SecurityPage() {
  const lastUpdated = "January 20, 2026";

  const sections = [
    {
      id: "auth",
      title: "Authentication & Access Control",
      icon: Key,
      items: [
        { label: "Single Sign-On", value: "Google SSO with MFA support" },
        { label: "Access Control", value: "Role-based (RBAC) with least privilege" },
        { label: "Organization Isolation", value: "Complete data separation between orgs" },
        { label: "Session Security", value: "30-min idle timeout, 8-hour absolute" }
      ],
      description: "Your team members can only access the data they need for their role. We don't use shared accounts, and every action is tied to an individual user."
    },
    {
      id: "encryption",
      title: "Encryption",
      icon: Lock,
      items: [
        { label: "In Transit", value: "TLS 1.2+ for all connections" },
        { label: "At Rest", value: "AES-256 for sensitive data" },
        { label: "Key Management", value: "Platform KMS with 90-day rotation" },
        { label: "What's Encrypted", value: "SSN, bank accounts, tax IDs, documents" }
      ],
      description: "Sensitive borrower data is encrypted both in storage and during transmission. Keys are managed securely and rotated regularly."
    },
    {
      id: "monitoring",
      title: "Monitoring & Logging",
      icon: Eye,
      items: [
        { label: "Event Logging", value: "Auth, access, changes, security events" },
        { label: "Alert Response", value: "24/7 automated monitoring" },
        { label: "Log Protection", value: "Immutable, no sensitive data logged" },
        { label: "Retention", value: "Per compliance requirements" }
      ],
      description: "We maintain comprehensive logging of security-relevant events while ensuring sensitive data never appears in logs."
    },
    {
      id: "vulnerability",
      title: "Vulnerability Management",
      icon: AlertTriangle,
      items: [
        { label: "Dependency Scanning", value: "Every build" },
        { label: "Critical Remediation", value: "24 hours" },
        { label: "High Remediation", value: "7 days" },
        { label: "Responsible Disclosure", value: "security@loangenius.io" }
      ],
      description: "We continuously scan for vulnerabilities and maintain strict SLAs for remediation based on severity."
    },
    {
      id: "backup",
      title: "Backup & Disaster Recovery",
      icon: Database,
      items: [
        { label: "Backup Frequency", value: "Daily full, 6-hour incremental" },
        { label: "RPO", value: "1 hour (max data loss)" },
        { label: "RTO", value: "4 hours (max downtime)" },
        { label: "Testing", value: "Weekly restore drills" }
      ],
      description: "Regular backups and tested recovery procedures ensure your data is protected against loss and we can restore operations quickly."
    },
    {
      id: "incident",
      title: "Incident Response",
      icon: Bell,
      items: [
        { label: "Framework", value: "NIST-based incident response" },
        { label: "Critical Notification", value: "Within 24 hours" },
        { label: "High Notification", value: "Within 72 hours" },
        { label: "Post-Incident", value: "Root cause analysis + improvements" }
      ],
      description: "We follow structured incident response procedures and commit to transparent communication when incidents affect your data."
    }
  ];

  const complianceFrameworks = [
    { name: "SOC 2 TSC", status: "Aligned", description: "Security, Availability, Confidentiality" },
    { name: "OWASP ASVS", status: "Level 2", description: "Application security verification" },
    { name: "NIST", status: "Following", description: "Incident response, PII protection" },
    { name: "GLBA", status: "Compliant", description: "Safeguards Rule" }
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
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Security Overview</h1>
          </div>
          <p className="text-lg text-slate-300">
            How LoanGenius protects your data with enterprise-grade security controls.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Last updated: {lastUpdated} • Version 1.0
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Note */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-900">
              <strong>Note:</strong> We align our security practices with SOC 2 Trust Services Criteria 
              but do not currently hold a SOC 2 Type II certification. We are building toward formal certification.
            </p>
          </CardContent>
        </Card>

        {/* Security Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <section.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-medium text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-600 text-sm mt-4">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance Frameworks */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Compliance Alignment</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {complianceFrameworks.map((framework, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{framework.name}</h3>
                      <p className="text-sm text-slate-600">{framework.description}</p>
                    </div>
                    <Badge 
                      variant={framework.status === "Level 2" ? "secondary" : "default"}
                      className="bg-green-100 text-green-800"
                    >
                      {framework.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mt-12">
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Found a Security Issue?</h3>
                <p className="text-slate-600 mb-4">
                  We appreciate responsible disclosure. Please contact us at:
                </p>
                <Button asChild>
                  <a href="mailto:security@loangenius.io">
                    <Mail className="h-4 w-4 mr-2" />
                    security@loangenius.io
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}