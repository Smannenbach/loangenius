import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BrandingPreview({ branding }) {
  if (!branding) return null;

  const buttonStyle = {
    rounded: '0.5rem',
    sharp: '0',
    pill: '9999px'
  }[branding.button_style];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-6 text-gray-900">Portal Preview</h3>

      {/* Portal Header */}
      <div 
        className="rounded-t-lg p-6 text-white mb-6"
        style={{ backgroundColor: branding.primary_color }}
      >
        <div className="flex items-center gap-3 mb-4">
          {branding.logo_dark_url ? (
            <img src={branding.logo_dark_url} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded bg-white/20 flex items-center justify-center text-sm font-bold">
              LG
            </div>
          )}
          <h2 className="text-xl font-bold">Loan Portal</h2>
        </div>
        <p className="text-sm opacity-90">{branding.welcome_message}</p>
      </div>

      {/* Sample Content */}
      <div className="space-y-4 mb-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle 
              className="text-base"
              style={{ color: branding.text_color }}
            >
              Your Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Bank Statement', 'Tax Return', 'ID Verification'].map((doc) => (
                <div key={doc} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                  <span style={{ color: branding.text_color }}>{doc}</span>
                  <Button 
                    size="sm"
                    style={{ 
                      backgroundColor: branding.primary_color,
                      borderRadius: buttonStyle
                    }}
                  >
                    Upload
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Palette Display */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase">Color Palette</p>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Primary', color: branding.primary_color },
            { label: 'Secondary', color: branding.secondary_color },
            { label: 'Accent', color: branding.accent_color },
            { label: 'BG', color: branding.background_color },
            { label: 'Text', color: branding.text_color },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div 
                className="h-12 rounded mb-2 border border-gray-200"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-xs text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Font Display */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Typography</p>
        <p style={{ fontFamily: branding.font_heading, color: branding.text_color }} className="text-lg font-bold mb-2">
          Heading Font: {branding.font_heading}
        </p>
        <p style={{ fontFamily: branding.font_body, color: branding.text_color }} className="text-sm">
          Body Font: {branding.font_body}
        </p>
      </div>
    </div>
  );
}