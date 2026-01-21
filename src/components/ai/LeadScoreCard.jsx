import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Target, AlertCircle, Mail, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadScoreCard({ lead, onAction }) {
  // AI Scoring Logic
  const calculateScore = () => {
    let score = 0;
    let factors = [];

    // Completeness (0-30 points)
    const hasEmail = lead.home_email || lead.work_email;
    const hasPhone = lead.mobile_phone || lead.home_phone;
    const hasProperty = lead.property_street && lead.property_city && lead.property_state;
    const hasFinancials = lead.loan_amount && lead.estimated_value;
    
    if (hasEmail) { score += 10; factors.push('Has email'); }
    if (hasPhone) { score += 10; factors.push('Has phone'); }
    if (hasProperty) { score += 5; factors.push('Property details'); }
    if (hasFinancials) { score += 5; factors.push('Financial info'); }

    // Engagement (0-30 points)
    if (lead.status === 'qualified') { score += 30; factors.push('Qualified lead'); }
    else if (lead.status === 'contacted') { score += 15; factors.push('Contacted'); }
    else if (lead.status === 'new') { score += 5; factors.push('New lead'); }

    // Financial Strength (0-40 points)
    if (lead.fico_score >= 720) { score += 20; factors.push('Excellent credit'); }
    else if (lead.fico_score >= 680) { score += 15; factors.push('Good credit'); }
    else if (lead.fico_score >= 640) { score += 10; factors.push('Fair credit'); }
    
    if (lead.loan_amount >= 500000) { score += 10; factors.push('High loan amount'); }
    else if (lead.loan_amount >= 300000) { score += 5; factors.push('Medium loan amount'); }

    const ltv = lead.loan_amount && lead.estimated_value 
      ? (lead.loan_amount / lead.estimated_value) * 100 
      : 0;
    if (ltv > 0 && ltv <= 80) { score += 10; factors.push('Good LTV'); }

    return { score: Math.min(score, 100), factors };
  };

  const { score, factors } = calculateScore();

  // AI Conversion Probability
  const conversionProbability = (() => {
    if (score >= 80) return { value: 75, label: 'High', color: 'text-green-600 bg-green-50' };
    if (score >= 60) return { value: 50, label: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    return { value: 25, label: 'Low', color: 'text-gray-600 bg-gray-50' };
  })();

  // AI Follow-up Suggestions
  const followUpSuggestions = [];
  
  if (!lead.home_email && !lead.work_email) {
    followUpSuggestions.push({
      action: 'Get email address',
      channel: 'phone',
      priority: 'high',
      message: 'Call to capture email for follow-up communication'
    });
  }
  
  if (lead.status === 'new') {
    followUpSuggestions.push({
      action: 'Initial contact',
      channel: 'email',
      priority: 'high',
      message: `Hi ${lead.first_name}, thank you for your interest in a ${lead.loan_type || 'loan'}. I'd love to discuss your financing needs. When would be a good time to chat?`
    });
  }
  
  if (lead.status === 'contacted' && score >= 60) {
    followUpSuggestions.push({
      action: 'Send quote',
      channel: 'email',
      priority: 'high',
      message: `Hi ${lead.first_name}, based on our conversation, I've prepared a detailed quote for your ${lead.property_city} property. The rate is competitive and I think you'll be pleased. Can we schedule a call to review?`
    });
  }
  
  if (lead.loan_type === 'DSCR' && lead.monthly_rental_income) {
    const dscr = (lead.monthly_rental_income * 12) / ((lead.loan_amount * 0.07) / 12);
    if (dscr >= 1.25) {
      followUpSuggestions.push({
        action: 'Highlight strong DSCR',
        channel: 'email',
        priority: 'medium',
        message: `Hi ${lead.first_name}, great news! Your rental income shows a strong DSCR ratio, which should help us get you excellent terms. Let's move forward with pre-approval.`
      });
    }
  }

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <MessageSquare className="h-3 w-3" />;
      case 'phone': return <Phone className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Lead Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Score */}
        <div className={`p-4 rounded-lg border ${getScoreColor()}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Lead Score</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-lg text-gray-500 mb-1">/100</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {factors.slice(0, 3).map((factor, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        </div>

        {/* Conversion Probability */}
        <div className={`p-4 rounded-lg ${conversionProbability.color}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Conversion Probability</span>
            <Target className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{conversionProbability.value}%</span>
            <Badge variant="outline" className="font-medium">
              {conversionProbability.label}
            </Badge>
          </div>
        </div>

        {/* Follow-up Suggestions */}
        {followUpSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              Suggested Actions
            </div>
            {followUpSuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(suggestion.channel)}
                    <span className="text-sm font-medium">{suggestion.action}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={suggestion.priority === 'high' ? 'border-red-200 text-red-700' : 'border-gray-200'}
                  >
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 italic">"{suggestion.message}"</p>
                <Button 
                  size="sm" 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white h-7"
                  onClick={() => {
                    navigator.clipboard.writeText(suggestion.message);
                    toast.success('Message copied to clipboard!');
                    if (onAction) onAction(suggestion);
                  }}
                >
                  Use This Message
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}