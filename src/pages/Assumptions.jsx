import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Shield, Zap } from 'lucide-react';

export default function AssumptionsPage() {
  const assumptions = [
    {
      category: 'Data Model',
      icon: FileText,
      items: [
        'All business records require org_id for multi-tenant isolation',
        'Soft deletes via is_deleted flag (never hard delete loan data)',
        'SSN, DOB, EIN encrypted at field-level',
        'Audit log captures user, timestamp, action, before/after values',
      ]
    },
    {
      category: 'Security & Access',
      icon: Shield,
      items: [
        'Roles: admin, loan_officer, processor, underwriter, borrower_portal',
        'Borrower portal access via magic link (24h expiration, one-time use)',
        'All file access via signed URLs with 15-60 minute expiration',
        'RBAC enforced server-side on all endpoints',
      ]
    },
    {
      category: 'DSCR Calculations',
      icon: Zap,
      items: [
        'DSCR = Monthly Gross Rent / (P&I + Taxes + Insurance + HOA + Flood)',
        'P&I uses standard amortization formula: P × [r(1+r)^n] / [(1+r)^n - 1]',
        'Blanket loans: sum all property rents and expenses for single DSCR',
        'Calculated values stored on deal record with calculation_timestamp',
      ]
    },
    {
      category: 'Documents & Conditions',
      icon: AlertCircle,
      items: [
        'Document status flow: Pending → Requested → Received → Under Review → Approved/Rejected',
        'Conditions can be PTD (Prior-to-Docs), PTF (Prior-to-Funding), or Post-Closing',
        'Auto-reminders sent when docs approach expiration dates',
        'Document types tied to specific DSCR requirements (12 types defined)',
      ]
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Project Assumptions</h1>
        <p className="text-gray-500 mt-1">Design decisions and non-negotiable standards for LoanGenius</p>
      </div>

      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Last Updated:</strong> January 15, 2026 • <strong>Version:</strong> 1.0 (MVP)
        </p>
      </div>

      <div className="space-y-6">
        {assumptions.map((section, idx) => (
          <Card key={idx} className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-blue-600" />
                {section.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-200 mt-6 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Non-Negotiables (From PROMPT 0)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>✅ ONE CANONICAL DATA MODEL — All forms write to same fields; all exports generated from canonical data</p>
          <p>✅ DSCR-FIRST MVP — Purchase, Rate/Term Refi, Cash-Out Refi, Blanket shipped tonight</p>
          <p>✅ SECURITY IS NON-OPTIONAL — RBAC, audit logs, encryption at rest, signed URLs</p>
          <p>✅ LENDER-AGNOSTIC EXPORTS — No hardcoded lender names; configurable export profiles</p>
          <p>✅ NO GUESSING — Configurable admin settings or TODO markers for undefined fields</p>
        </CardContent>
      </Card>
    </div>
  );
}