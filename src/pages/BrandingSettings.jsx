import React from 'react';
import BrandingSettings from '../components/BrandingSettings';

export default function BrandingSettingsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Branding</h1>
        <p className="text-gray-500 mt-1">Customize your company's appearance on documents</p>
      </div>
      <BrandingSettings />
    </div>
  );
}