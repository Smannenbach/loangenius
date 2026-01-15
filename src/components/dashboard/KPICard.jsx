import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KPICard({ title, value, previousValue, changePercent, trend, target, unit = '' }) {
  const isPositive = trend === 'up';
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{typeof value === 'number' && value > 1000 ? `$${(value / 1000000).toFixed(1)}M` : value}</div>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        {changePercent !== undefined && (
          <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {Math.abs(changePercent)}% {isPositive ? 'up' : 'down'}
            </span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        )}
        {target !== undefined && (
          <div className="mt-2 text-xs text-gray-500">
            Target: {target} (
            {value >= target ? <span className="text-green-600">+{value - target}</span> : <span className="text-red-600">{value - target}</span>}
            )
          </div>
        )}
      </CardContent>
    </Card>
  );
}