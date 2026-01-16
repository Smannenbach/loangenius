import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from 'lucide-react';

export default function TCPAConsent({ 
  checked, 
  onCheckedChange, 
  companyName = "LoanGenius",
  includeMarketing = true,
  error = false,
  className = ""
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`p-4 rounded-lg border ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-start gap-3">
          <Checkbox
            id="tcpa-consent"
            checked={checked}
            onCheckedChange={onCheckedChange}
            className={error ? 'border-red-500' : ''}
          />
          <label 
            htmlFor="tcpa-consent" 
            className="text-sm text-gray-700 leading-relaxed cursor-pointer"
          >
            <span className="font-medium">I consent to be contacted by {companyName}</span>
            {' '}and its affiliates at the telephone number and/or email address I have provided above, 
            including by automated telephone dialing system, pre-recorded message, 
            {includeMarketing && ' and/or marketing communications,'} 
            regarding mortgage-related products and services. 
            I understand that my consent is not required as a condition of purchasing any goods or services 
            and that I may revoke my consent at any time. Message and data rates may apply. 
            I have read and agree to the{' '}
            <a 
              href="#" 
              className="text-blue-600 hover:underline" 
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </a>
            {' '}and{' '}
            <a 
              href="#" 
              className="text-blue-600 hover:underline" 
              onClick={(e) => e.preventDefault()}
            >
              Terms of Service
            </a>.
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>You must accept the TCPA consent to continue</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 px-1">
        By checking this box, you are providing "written instructions" under the Fair Credit Reporting Act 
        authorizing {companyName} to obtain your credit report and other information from credit bureaus 
        and other sources.
      </p>
    </div>
  );
}

// Compact version for inline use
export function TCPAConsentCompact({ 
  checked, 
  onCheckedChange, 
  companyName = "LoanGenius",
  error = false 
}) {
  return (
    <div className={`flex items-start gap-2 ${error ? 'text-red-600' : ''}`}>
      <Checkbox
        id="tcpa-consent-compact"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`mt-0.5 ${error ? 'border-red-500' : ''}`}
      />
      <label 
        htmlFor="tcpa-consent-compact" 
        className="text-xs text-gray-600 leading-snug cursor-pointer"
      >
        I agree to receive calls/texts from {companyName} at the number provided. 
        Consent not required for purchase.{' '}
        <a href="#" className="text-blue-600 hover:underline">Terms</a> &{' '}
        <a href="#" className="text-blue-600 hover:underline">Privacy</a>.
      </label>
    </div>
  );
}