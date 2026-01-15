import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';

export default function AmortizationSchedule({ loanAmount, rate, termYears }) {
  const [expanded, setExpanded] = useState(false);
  
  const generateSchedule = () => {
    const monthlyRate = rate / 100 / 12;
    const termMonths = termYears * 12;
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    let balance = loanAmount;
    const schedule = [];

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      // Only show every 12th month for annual view
      if (i % 12 === 0) {
        schedule.push({
          year: Math.ceil(i / 12),
          month: i,
          payment: monthlyPayment.toFixed(2),
          principal: principalPayment.toFixed(2),
          interest: interestPayment.toFixed(2),
          balance: Math.max(0, balance).toFixed(2),
        });
      }
    }

    return schedule;
  };

  const schedule = generateSchedule();

  if (!schedule.length) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-gray-900">Amortization Schedule</h3>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Year</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Payment</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Principal</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Interest</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">{row.year}</td>
                  <td className="text-right py-2 px-2">${parseFloat(row.payment).toLocaleString()}</td>
                  <td className="text-right py-2 px-2 text-green-600">${parseFloat(row.principal).toLocaleString()}</td>
                  <td className="text-right py-2 px-2 text-red-600">${parseFloat(row.interest).toLocaleString()}</td>
                  <td className="text-right py-2 px-2 font-semibold">${parseFloat(row.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}