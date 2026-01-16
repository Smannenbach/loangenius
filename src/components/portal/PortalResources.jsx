import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Video, HelpCircle, Download, ExternalLink } from 'lucide-react';

export default function PortalResources() {
  const resources = [
    {
      category: 'Loan Basics',
      items: [
        { title: 'Understanding DSCR Loans', type: 'guide', icon: BookOpen },
        { title: 'Document Checklist', type: 'pdf', icon: FileText },
        { title: 'Timeline: What to Expect', type: 'guide', icon: BookOpen },
      ]
    },
    {
      category: 'Video Tutorials',
      items: [
        { title: 'How to Upload Documents', type: 'video', icon: Video },
        { title: 'Understanding Your Quote', type: 'video', icon: Video },
        { title: 'Portal Navigation Guide', type: 'video', icon: Video },
      ]
    },
    {
      category: 'FAQs',
      items: [
        { title: 'What is DSCR?', type: 'faq', icon: HelpCircle },
        { title: 'How long does approval take?', type: 'faq', icon: HelpCircle },
        { title: 'What documents are required?', type: 'faq', icon: HelpCircle },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Resource Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            Find helpful guides, videos, and answers to common questions about your loan application process.
          </p>
        </CardContent>
      </Card>

      {resources.map((section, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="text-lg">{section.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="gap-1">
                      {item.type === 'pdf' ? (
                        <>
                          <Download className="h-3 w-3" />
                          Download
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3" />
                          View
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}