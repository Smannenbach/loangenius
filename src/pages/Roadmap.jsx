import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Rocket, Milestone, Check, GitCommitHorizontal, CircleDot } from 'lucide-react';

export default function RoadmapPage() {
  const initialRoadmap = {
    mvp: [
      { id: 'pp0', title: 'Conventions + Architecture', criteria: 'Idempotency + outbox pattern working', completed: true },
      { id: 'pp1', title: 'Schema + Auth + RBAC', criteria: 'org_id on all tables, role enforcement', completed: true },
      { id: 'pp1.5', title: 'Gap Fill (Fees/Tasks/Conditions)', criteria: 'Term Sheet can be generated', completed: true },
      { id: 'pp2', title: 'DSCR Deal Creation', criteria: 'Create single + blanket deals', completed: true },
      { id: 'pp2.5', title: 'Calculators + Docs', criteria: 'DSCR stored, doc expirations tracked', completed: true },
      { id: 'pp3', title: 'PDF Generation', criteria: 'All 4 PDFs generate correctly', completed: true },
      { id: 'pp4', title: 'Communications', criteria: 'Email sends, logs stored', completed: true },
    ],
    phase1: [
      { id: 'pp5', title: 'MISMO Export', criteria: 'XML validates, conformance passes', completed: false },
      { id: 'pp6', title: 'FNM Export', criteria: 'No unresolved tokens', completed: false },
      { id: 'pp7', title: 'Borrower Portal', criteria: 'Magic link auth, uploads work', completed: false },
      { id: 'pp8', title: 'Integrations', criteria: 'Zapier/Twilio/SendGrid connected', completed: false },
      { id: 'pp9', title: 'AI Orchestration', criteria: 'Multi-provider fallback works', completed: true },
      { id: 'pp10', title: 'Google Sheets', criteria: 'Import/export idempotent', completed: false },
    ]
  };

  const [roadmap, setRoadmap] = useState(initialRoadmap);

  const toggleCompletion = (phase, id) => {
    setRoadmap(prev => ({
      ...prev,
      [phase]: prev[phase].map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const RoadmapSection = ({ title, items, phase }) => (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Milestone className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50/50">
            <Checkbox
              id={`${phase}-${item.id}`}
              checked={item.completed}
              onCheckedChange={() => toggleCompletion(phase, item.id)}
              className="mt-1 h-5 w-5"
            />
            <div className="flex-1">
              <label htmlFor={`${phase}-${item.id}`} className="font-medium text-gray-900 cursor-pointer">
                {item.title}
              </label>
              <p className="text-sm text-gray-500">{item.criteria}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="font-mono text-xs">{item.id.toUpperCase()}</Badge>
                {item.completed ? (
                  <Badge className="bg-green-100 text-green-700"><Check className="h-3 w-3 mr-1"/>Completed</Badge>
                ) : (
                  <Badge variant="secondary"><CircleDot className="h-3 w-3 mr-1"/>In Progress</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Rocket className="h-7 w-7 text-blue-600" />
          Application Roadmap
        </h1>
        <p className="text-gray-500 mt-1">Tracking progress for LoanGenius development.</p>
      </div>

      <div className="space-y-8">
        <RoadmapSection title="MVP (Tonight)" items={roadmap.mvp} phase="mvp" />
        <RoadmapSection title="Phase 1 (30 Days)" items={roadmap.phase1} phase="phase1" />
      </div>
    </div>
  );
}