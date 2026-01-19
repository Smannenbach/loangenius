import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Package, Info, CheckCircle } from 'lucide-react';

export default function MISMOExportModeSelector({ value, onChange, onExport, isExporting }) {
  const exportModes = [
    {
      id: 'GENERIC_MISMO_34',
      pack_id: 'PACK_A_GENERIC_MISMO_34_B324',
      name: 'Generic MISMO 3.4 B324',
      description: 'Standard MISMO v3.4 Build 324 export for broad compatibility',
      icon: Package,
      strictness: 'Standard',
      use_cases: [
        'General lender submissions',
        'Cross-platform compatibility',
        'LOS system imports',
        'Portfolio management'
      ],
      features: [
        'Core MISMO 3.4 schema compliance',
        'LG extension support',
        'Broad lender acceptance'
      ]
    },
    {
      id: 'DU_ULAD_STRICT',
      pack_id: 'PACK_B_DU_ULAD_STRICT_34_B324',
      name: 'DU/ULAD Strict',
      description: 'Fannie Mae DU specification with ULAD extensions and wrapper validation',
      icon: Shield,
      strictness: 'Strict',
      use_cases: [
        'Fannie Mae DU submissions',
        'ULAD data exchange',
        'GSE-compliant exports',
        'AUS integration'
      ],
      features: [
        'DU wrapper schema validation',
        'ULAD extension compliance',
        'Stricter conditionality rules',
        'GSE-ready format'
      ]
    }
  ];

  const selectedMode = exportModes.find(m => m.id === value) || exportModes[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Select Export Mode
          </CardTitle>
          <CardDescription>
            Choose the validation schema pack and compliance level for your export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={value} onValueChange={onChange}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = value === mode.id;
                
                return (
                  <label
                    key={mode.id}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={mode.id} id={mode.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="font-semibold text-gray-900">{mode.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{mode.description}</p>
                        
                        <div className="mb-3">
                          <Badge className={
                            mode.strictness === 'Strict' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-green-100 text-green-700'
                          }>
                            {mode.strictness} Validation
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-gray-700">Use Cases:</div>
                          {mode.use_cases.slice(0, 2).map((useCase, idx) => (
                            <div key={idx} className="text-xs text-gray-600">• {useCase}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Selected Mode Details */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Selected: {selectedMode.name}</p>
              <p className="text-sm text-blue-800">Features included:</p>
              <ul className="mt-2 space-y-1">
                {selectedMode.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-blue-700 flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Pack ID:</strong> <code className="bg-gray-100 px-1 rounded">{selectedMode.pack_id}</code></div>
              <div><strong>Validation:</strong> {selectedMode.strictness}</div>
              <div className="flex items-center gap-1">
                <strong>Metadata Recording:</strong> 
                <Badge variant="outline" className="text-xs">
                  Mode + Pack Hash + Profile Version
                </Badge>
              </div>
            </div>
          </div>

          {onExport && (
            <Button
              onClick={onExport}
              disabled={isExporting}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 gap-2"
            >
              {isExporting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Exporting...</>
              ) : (
                <>Export with {selectedMode.name}</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}