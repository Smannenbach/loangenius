import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, HelpCircle, FileText, Video, Download, 
  ChevronDown, ChevronUp, ExternalLink, PlayCircle
} from 'lucide-react';

const FAQS = [
  {
    category: 'Application Process',
    questions: [
      {
        q: 'What is a DSCR loan?',
        a: 'DSCR (Debt Service Coverage Ratio) loans are designed for real estate investors. Instead of verifying personal income, lenders qualify you based on the rental income the property generates. The DSCR ratio compares the property\'s monthly rental income to its monthly debt obligations (PITIA).'
      },
      {
        q: 'How long does the approval process take?',
        a: 'Typical DSCR loan approval takes 14-21 business days from complete application submission. This includes document review (3-5 days), underwriting (5-7 days), appraisal (7-10 days), and final approval. You can expedite by uploading all required documents promptly.'
      },
      {
        q: 'What credit score do I need?',
        a: 'Most DSCR lenders require a minimum credit score of 620-680, though some programs accept scores as low as 600. Higher credit scores typically qualify for better interest rates and terms.'
      }
    ]
  },
  {
    category: 'Documents & Requirements',
    questions: [
      {
        q: 'Why do I need to provide bank statements?',
        a: 'Bank statements (typically 2 most recent months) verify you have adequate reserves. Most DSCR loans require 6-12 months of PITIA (Principal, Interest, Taxes, Insurance, Association fees) in liquid reserves to ensure you can handle any vacancy or maintenance issues.'
      },
      {
        q: 'What if my property is vacant?',
        a: 'For vacant properties, we use the market rent (determined by comparable properties or appraisal) to calculate DSCR. You may need to provide a lease agreement or market analysis showing expected rental income.'
      },
      {
        q: 'Do I need to provide tax returns?',
        a: 'No! That\'s the beauty of DSCR loans - we don\'t require personal tax returns or W2s. We qualify based on the property\'s rental income, not your personal income. However, if vesting in an LLC, we may need the LLC\'s organizational documents.'
      },
      {
        q: 'What are LLC documents and why are they needed?',
        a: 'If purchasing or refinancing in an LLC name, you\'ll need: (1) Articles of Organization, (2) EIN Letter from IRS, (3) Operating Agreement showing members and ownership percentages, and (4) Certificate of Good Standing. These verify the LLC is properly formed and you have authority to act on its behalf.'
      }
    ]
  },
  {
    category: 'Loan Terms',
    questions: [
      {
        q: 'What is LTV and why does it matter?',
        a: 'LTV (Loan-to-Value) is the loan amount divided by the property value, expressed as a percentage. For example, a $400,000 loan on a $500,000 property is 80% LTV. Most DSCR loans allow up to 80% LTV for purchases and 75% for refinances. Lower LTV typically means better rates.'
      },
      {
        q: 'Can I do interest-only payments?',
        a: 'Yes, many DSCR loans offer interest-only (IO) periods, typically 5-10 years. During the IO period, you only pay interest (lower payments), then the loan amortizes over the remaining term. This maximizes cash flow for investors.'
      },
      {
        q: 'What are prepayment penalties?',
        a: 'Many DSCR loans include prepayment penalties (e.g., 5-4-3-2-1 means 5% penalty in year 1, 4% in year 2, etc.). This protects the lender\'s expected yield. Some loans offer "no prepay" at a slightly higher rate. Discuss options with your loan officer.'
      }
    ]
  },
  {
    category: 'Property & Income',
    questions: [
      {
        q: 'What DSCR ratio do I need?',
        a: 'Most lenders require a minimum DSCR of 1.0 to 1.25. A DSCR of 1.25 means the property generates $1.25 in rent for every $1 of debt payment (25% cushion). Some "no ratio" DSCR programs exist with lower or no minimum DSCR, but typically have higher rates.'
      },
      {
        q: 'Can I use future rental income if the property is currently vacant?',
        a: 'Yes, we use market rent from the appraisal or comparable rent data. If you have a signed lease ready to start after closing, that can strengthen your application. The key is demonstrating realistic rental income potential.'
      }
    ]
  }
];

const RESOURCES = [
  {
    title: 'DSCR Loan Guide (PDF)',
    description: 'Complete guide to DSCR lending, qualification, and process',
    type: 'PDF',
    icon: FileText,
    url: '#'
  },
  {
    title: 'How to Calculate DSCR',
    description: 'Step-by-step video tutorial on DSCR calculations',
    type: 'Video',
    icon: Video,
    url: '#'
  },
  {
    title: 'Document Checklist',
    description: 'Downloadable checklist of all required documents',
    type: 'Checklist',
    icon: Download,
    url: '#'
  },
  {
    title: 'LLC Formation Guide',
    description: 'How to set up an LLC for investment properties',
    type: 'Article',
    icon: BookOpen,
    url: '#'
  }
];

function FAQSection({ faqs }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const toggleQuestion = (categoryIdx, questionIdx) => {
    const key = `${categoryIdx}-${questionIdx}`;
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {faqs.map((faqGroup, catIdx) => (
        <Card key={catIdx}>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleCategory(faqGroup.category)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {faqGroup.category}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{faqGroup.questions.length}</Badge>
                {expandedCategory === faqGroup.category ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedCategory === faqGroup.category && (
            <CardContent className="space-y-2">
              {faqGroup.questions.map((item, qIdx) => {
                const key = `${catIdx}-${qIdx}`;
                const isExpanded = expandedQuestions.has(key);
                
                return (
                  <div key={qIdx} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleQuestion(catIdx, qIdx)}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="font-medium text-sm text-gray-900">{item.q}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pl-9">
                        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

export default function PortalEducationResources() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Learning Center</h2>
              <p className="text-gray-600 text-sm">
                Everything you need to know about DSCR loans and the application process
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Helpful Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RESOURCES.map((resource, idx) => {
              const Icon = resource.icon;
              return (
                <div 
                  key={idx}
                  className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
                  onClick={() => {
                    if (resource.url !== '#') window.open(resource.url, '_blank');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {resource.title}
                        </h4>
                        {resource.type === 'Video' && (
                          <PlayCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{resource.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          Frequently Asked Questions
        </h3>
        <FAQSection faqs={FAQS} />
      </div>

      {/* Contact Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <MessageSquare className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Still have questions?</h4>
              <p className="text-sm text-gray-600 mb-3">
                Our loan team is here to help! Send us a secure message through the Messages tab 
                or call us directly.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Schedule Call
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}