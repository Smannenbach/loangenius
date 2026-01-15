import React from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Card, CardContent } from '@/components/ui/card';

export default function ResponsiveTable({ columns, data, onRowClick }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row, i) => (
          <Card 
            key={i} 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="text-sm text-gray-600 font-medium">{col.header}</span>
                <span className="font-medium text-right">{row[col.key]}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-700">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr 
              key={i} 
              className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}