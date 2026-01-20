import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Shield, 
  Lock, 
  Eye, 
  Server, 
  FileText, 
  Download, 
  Mail, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Building,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TrustCenter() {
  const lastUpdated = "January 20, 2026";
  
  const quickAnswers = [
    {
      question: "Are you SOC 2 compliant?",
      answer: "We align our security practices with SOC 2 Trust Services Criteria (Security, Availability, Confidentiality). We do not currently hold a SOC 2 Type II certification but are building toward formal audit."
    },
    {
      question: "How do you protect borrower PII?",
      answer: "Sensitive data (SSN, bank accounts, etc.) is encrypted at rest using AES-256. All data in transit uses TLS 1.2+. Access is controlled via role-based permissions with organization isolation."
    },
    {
      question: "How are incidents handled?",
      answer: "We follow NIST incident response guidelines. Critical incidents affecting your data are communicated within 24 hours. We conduct post-incident reviews and implement improvements."
    },
    {
      question: "Where is data stored?",
      answer: "Data is hosted in the United States on secure cloud infrastructure. Daily backups with geographic redundancy ensure data availability."
    }
  ];

  const sections = [
    {
      title: "Security Overview",
      description: "Learn about our security controls and practices",
      icon: Shield,
      link: "/Security",
      badge: null
    },
    {
      title: "Privacy Practices",
      description: "How we collect, use, and protect your data",
      icon: Eye,
      link: "/Privacy",
      badge: null
    },
    {
      title: "Subprocessors",
      description: "Third-party vendors that process data",
      icon: Building,
      link: "/Subprocessors",
      badge: "8 vendors"
    },
    {
      title: "System Status",
      description: "Current platform availability",
      icon: Server,
      link: "/Status",
      badge: "Operational"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold">Trust Center</h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl">
            Transparency about how LoanGenius protects your data and maintains security.
          </p>
          <p className="text-sm text-slate-400 mt-4">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Quick Answers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            Quick Answers
          </h2>
          <div className="grid gap-4">
            {quickAnswers.map((qa, index) => (
              <Card key={index} className="border-l-4 border-l-blue-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{qa.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{qa.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Navigation Sections */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Explore Our Practices
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sections.map((section, index) => (
              <Link key={index} to={createPageUrl(section.link.slice(1))}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <section.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      {section.badge && (
                        <Badge variant="secondary">{section.badge}</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Documentation Downloads */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Documentation
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Processing Agreement</CardTitle>
                <CardDescription>
                  GDPR-aligned DPA template for your review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/DPA_Template.md" download>
                    <Download className="h-4 w-4 mr-2" />
                    Download DPA Template
                  </a>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Packet</CardTitle>
                <CardDescription>
                  Complete security documentation package
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Request Security Packet
                </Button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Available to customers and qualified prospects
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Compliance Status */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Compliance Alignment
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">SOC 2 Aligned</h3>
                    <p className="text-sm text-slate-600">
                      Following Trust Services Criteria for Security, Availability, and Confidentiality
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">OWASP ASVS Level 2</h3>
                    <p className="text-sm text-slate-600">
                      Application security verified against industry standard
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">GLBA Compliant</h3>
                    <p className="text-sm text-slate-600">
                      Safeguards Rule requirements for financial data
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">SOC 2 Type II</h3>
                    <p className="text-sm text-slate-600">
                      Formal certification planned for future
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Questions about security?</h3>
                  <p className="text-slate-600">
                    Our team is happy to discuss our security practices.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <a href="mailto:security@loangenius.io">
                      <Mail className="h-4 w-4 mr-2" />
                      security@loangenius.io
                    </a>
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" asChild>
                    <a href="mailto:security@loangenius.io?subject=Security%20Issue%20Report">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report Issue
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}