import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ 
  title, 
  value, 
  unit = '', 
  trend = 0, 
  icon: Icon,
  color = 'blue'
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200'
  };

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">{title}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {unit && <p className="text-sm text-gray-600">{unit}</p>}
            </div>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(trend)}% vs last period
              </div>
            )}
          </div>
          {Icon && (
            <div className={`h-12 w-12 rounded-lg bg-white flex items-center justify-center ${iconColors[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}