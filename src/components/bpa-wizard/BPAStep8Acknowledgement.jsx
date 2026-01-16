import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenTool, AlertCircle, CheckCircle } from 'lucide-react';

const ACKNOWLEDGEMENT_TEXT = `
ACKNOWLEDGMENT AND AGREEMENT

Each of the undersigned specifically represents to Lender and to Lender's actual or potential agents, brokers, processors, attorneys, insurers, servicers, successors and assigns and agrees and acknowledges that:

(1) The information provided in this application is true and correct as of the date set forth opposite my signature and that any intentional or negligent misrepresentation of this information contained in this application may result in civil liability, including monetary damages, to any person who may suffer any loss due to reliance upon any misrepresentation that I have made on this application, and/or in criminal penalties including, but not limited to, fine or imprisonment or both under the provisions of Title 18, United States Code, Sec. 1001, et seq.;

(2) The loan requested pursuant to this application (the "Loan") will be secured by a mortgage or deed of trust on the property described in this application;

(3) The property will not be used for any illegal or prohibited purpose or use;

(4) All statements made in this application are made for the purpose of obtaining a residential mortgage loan;

(5) The property will be occupied as indicated in this application;

(6) The Lender, its servicers, successors or assigns may retain the original and/or an electronic record of this application, whether or not the Loan is approved;

(7) The Lender and its agents, brokers, insurers, servicers, successors, and assigns may continuously rely on the information contained in the application, and I am obligated to amend and/or supplement the information provided in this application if any of the material facts that I have represented herein should change prior to closing of the Loan;

(8) In the event that my payments on the Loan become delinquent, the Lender, its servicers, successors or assigns may, in addition to any other rights and remedies that it may have relating to such delinquency, report my name and account information to one or more consumer reporting agencies;

(9) Ownership of the Loan and/or administration of the Loan account may be transferred with such notice as may be required by law;

(10) Neither Lender nor its agents, brokers, insurers, servicers, successors or assigns has made any representation or warranty, express or implied, to me regarding the property or the condition or value of the property; and

(11) My transmission of this application as an "electronic record" containing my "electronic signature," as those terms are defined in applicable federal and/or state laws (excluding audio and video recordings), or my facsimile transmission of this application containing a facsimile of my signature, shall be as effective, enforceable and valid as if a paper version of this application were delivered containing my original written signature.

BORROWER'S CERTIFICATION AND AUTHORIZATION

The Borrower specifically acknowledges and agrees that: (1) the Loan will be secured by a first lien mortgage or deed of trust on a residential property; (2) the property will not be used for any illegal or prohibited purpose or use; (3) all statements made in this application are made for the purpose of obtaining the Loan; (4) occupation of the property will be as indicated in this application; (5) verification or reverification of any information contained in the application may be made at any time by the Lender, its agents, successors and assigns, either directly or through a credit reporting agency, from any source named in this application, and the original copy of this application will be retained by the Lender, even if the Loan is not approved.

WARNING: Intentional misrepresentation on a residential mortgage loan application is a federal crime. Anyone who knowingly makes a false statement or misrepresentation in this application, or who knowingly makes a false statement or misrepresentation to obtain a residential mortgage loan, may be subject to criminal penalties, including imprisonment and/or fines under federal law and the laws of the state where the property is located.
`;

export default function BPAStep8Acknowledgement({ formData, updateFormData, errors }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const hasCoApplicant = !!formData.co_applicant;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Acknowledgement & Signature</h3>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> Please read the acknowledgement and agreement carefully before signing. 
          You must scroll to the bottom to enable the agreement checkbox.
        </p>
      </div>

      {/* Acknowledgement Text */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <span className="text-sm font-medium">Acknowledgement and Agreement</span>
        </div>
        <ScrollArea className="h-64" onScrollCapture={handleScroll}>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {ACKNOWLEDGEMENT_TEXT}
          </div>
        </ScrollArea>
      </div>

      {/* Agreement Checkbox */}
      <div className={`p-4 rounded-lg border ${formData.acknowledgement_agreed ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="acknowledgement-agree"
            checked={formData.acknowledgement_agreed}
            onCheckedChange={(checked) => updateFormData({ acknowledgement_agreed: checked })}
            disabled={!hasScrolledToBottom}
          />
          <div>
            <Label 
              htmlFor="acknowledgement-agree" 
              className={`cursor-pointer ${!hasScrolledToBottom ? 'text-gray-400' : ''}`}
            >
              I have read and agree to the acknowledgement and agreement above
            </Label>
            {!hasScrolledToBottom && (
              <p className="text-xs text-gray-500 mt-1">
                Please scroll to the bottom of the agreement to enable this checkbox
              </p>
            )}
          </div>
        </div>
        {errors.acknowledgement_agreed && (
          <p className="text-red-500 text-sm flex items-center gap-1 mt-2">
            <AlertCircle className="h-3 w-3" /> {errors.acknowledgement_agreed}
          </p>
        )}
      </div>

      {/* Signatures */}
      <div className="space-y-6">
        {/* Primary Applicant Signature */}
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-semibold">
            Applicant Signature: {formData.applicant.first_name} {formData.applicant.last_name}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type Your Full Name to Sign <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Type your full legal name"
                value={formData.applicant_signature}
                onChange={(e) => updateFormData({ applicant_signature: e.target.value })}
                className={`font-signature text-lg ${errors.applicant_signature ? 'border-red-500' : ''}`}
                disabled={!formData.acknowledgement_agreed}
              />
              {errors.applicant_signature && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.applicant_signature}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.applicant_signature_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => updateFormData({ applicant_signature_date: e.target.value })}
                disabled={!formData.acknowledgement_agreed}
              />
            </div>
          </div>

          {formData.applicant_signature && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Signature captured
            </div>
          )}
        </div>

        {/* Co-Applicant Signature */}
        {hasCoApplicant && (
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-semibold">
              Co-Applicant Signature: {formData.co_applicant?.first_name} {formData.co_applicant?.last_name}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type Your Full Name to Sign</Label>
                <Input
                  placeholder="Type your full legal name"
                  value={formData.co_applicant_signature}
                  onChange={(e) => updateFormData({ co_applicant_signature: e.target.value })}
                  className="font-signature text-lg"
                  disabled={!formData.acknowledgement_agreed}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.co_applicant_signature_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateFormData({ co_applicant_signature_date: e.target.value })}
                  disabled={!formData.acknowledgement_agreed}
                />
              </div>
            </div>

            {formData.co_applicant_signature && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Co-applicant signature captured
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {formData.acknowledgement_agreed && formData.applicant_signature && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Application ready for submission</span>
          </div>
          <p className="text-sm text-green-600 mt-2">
            You have acknowledged the agreement and provided your signature. 
            Click "Next" to proceed to the final step.
          </p>
        </div>
      )}

      <style jsx global>{`
        .font-signature {
          font-family: 'Brush Script MT', cursive, sans-serif;
        }
      `}</style>
    </div>
  );
}