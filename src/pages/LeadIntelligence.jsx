import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, BarChart3, Target, Brain } from 'lucide-react';

export default function LeadIntelligence() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
          <Brain className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Lead Intelligence</h1>
        <Badge className="bg-green-100 text-green-700 mb-4">Coming Soon</Badge>
        <p className="text-gray-500">Predictive analytics and lead scoring powered by AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-gray-900">Lead Scoring</p>
            <p className="text-sm text-gray-500 mt-1">AI-powered conversion prediction</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <p className="font-medium text-gray-900">Trend Analysis</p>
            <p className="text-sm text-gray-500 mt-1">Market insights and patterns</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium text-gray-900">Forecasting</p>
            <p className="text-sm text-gray-500 mt-1">Pipeline predictions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">This feature is currently in development.</p>
          <p className="text-sm text-gray-400">
            Advanced analytics will help you identify the best leads, predict conversion rates, and optimize your sales process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}