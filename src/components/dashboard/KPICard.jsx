import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KPICard({ title, value, previousValue, changePercent, trend, target, unit = '', isCurrency = false, isLoading = false }) {
  const isPositive = trend === 'up';
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const formatValue = (val) => {
    if (!val && val !== 0) return '—';
    if (isCurrency) {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
      return `$${val.toFixed(0)}`;
    }
    return val;
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{formatValue(value)}</div>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}