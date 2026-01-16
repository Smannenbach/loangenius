import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Video, Book, Download, ExternalLink, 
  Calculator, HelpCircle, Phone, Mail, Clock
} from 'lucide-react';

const RESOURCES = [
  {
    category: 'Guides',
    items: [
      { title: 'DSCR Loan Guide', description: 'Learn how DSCR loans work', icon: Book, type: 'PDF' },
      { title: 'Document Checklist', description: 'Complete list of required documents', icon: FileText, type: 'PDF' },
      { title: 'Closing Process Explained', description: 'What to expect at closing', icon: Book, type: 'Article' }
    ]
  },
  {
    category: 'Tools',
    items: [
      { title: 'DSCR Calculator', description: 'Calculate your debt service coverage ratio', icon: Calculator, action: 'calculator' },
      { title: 'Loan Comparison Tool', description: 'Compare different loan options', icon: Calculator, action: 'compare' },
      { title: 'Affordability Calculator', description: 'See what you can afford', icon: Calculator, action: 'afford' }
    ]
  },
  {
    category: 'FAQs',
    items: [
      { title: 'What is a DSCR loan?', answer: 'A DSCR (Debt Service Coverage Ratio) loan is a type of mortgage for investment properties where qualification is based on the property\'s rental income rather than the borrower\'s personal income.' },
      { title: 'How long does approval take?', answer: 'Typical approval takes 2-3 weeks from complete application. Closing usually occurs 30-45 days after approval.' },
      { title: 'What credit score do I need?', answer: 'Most DSCR loans require a minimum credit score of 660-680. Higher scores may qualify for better rates.' },
      { title: 'Can I use rental income to qualify?', answer: 'Yes! DSCR loans specifically use the property\'s rental income (or market rent) to determine qualification.' }
    ]
  }
];

export default function PortalResources() {
  return (
    <div className="space-y-6">
      {/* Quick Contact */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Need Help?</h3>
              <p className="text-blue-100">Our team is here to assist you</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="gap-2">
                <Phone className="h-4 w-4" />
                Call Us
              </Button>
              <Button variant="outline" className="gap-2 border-white text-white hover:bg-white/10">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-blue-100 text-sm">
            <Clock className="h-4 w-4" />
            Available Mon-Fri 8am-6pm PST
          </div>
        </CardContent>
      </Card>

      {/* Guides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-blue-600" />
            Helpful Guides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RESOURCES[0].items.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            Calculators & Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RESOURCES[1].items.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-lg hover:border-green-300 transition-colors cursor-pointer">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3 mx-auto">
                  <item.icon className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-center">{item.title}</h4>
                <p className="text-sm text-gray-500 text-center mt-1">{item.description}</p>
                <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                  Open Tool
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {RESOURCES[2].items.map((faq, idx) => (
              <details key={idx} className="group border rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                  <span className="font-medium">{faq.title}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Video Tutorials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-600" />
            Video Tutorials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'How to Upload Documents', duration: '2:30' },
              { title: 'Understanding Your Loan Terms', duration: '4:15' },
              { title: 'The Closing Process', duration: '5:00' },
              { title: 'Using the Borrower Portal', duration: '3:45' }
            ].map((video, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="h-16 w-24 bg-gray-200 rounded flex items-center justify-center">
                  <Video className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{video.title}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {video.duration}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Watch
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}