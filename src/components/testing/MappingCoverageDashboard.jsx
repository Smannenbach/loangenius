import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Filter,
  MapPin,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

// Complete mapping registry for Business Purpose Application fields
const FIELD_MAPPINGS = [
  // Deal Core Fields
  { category: 'Deal', field: 'deal_number', label: 'Deal Number', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:DealNumber', enumRules: null, sample: 'LG-202401-0001' },
  { category: 'Deal', field: 'loan_product', label: 'Loan Product', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/LOAN_IDENTIFIERS/LOAN_IDENTIFIER/LoanIdentifier', enumRules: 'DSCR|Bridge|Commercial|...', sample: 'DSCR' },
  { category: 'Deal', field: 'loan_purpose', label: 'Loan Purpose', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/TERMS_OF_LOAN/LoanPurposeType', enumRules: 'Purchase|Refinance|CashOutRefinance', sample: 'Purchase' },
  { category: 'Deal', field: 'occupancy_type', label: 'Occupancy Type', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/TERMS_OF_LOAN/PropertyUsageType', enumRules: 'Investment|PrimaryResidence|SecondHome', sample: 'Investment' },
  { category: 'Deal', field: 'property_type', label: 'Property Type', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyEstateType', enumRules: 'FeeSimple|Leasehold', sample: 'FeeSimple' },
  { category: 'Deal', field: 'loan_amount', label: 'Loan Amount', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/TERMS_OF_LOAN/NoteAmount', enumRules: null, sample: '500000' },
  { category: 'Deal', field: 'interest_rate', label: 'Interest Rate', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/TERMS_OF_LOAN/NoteRatePercent', enumRules: null, sample: '7.5' },
  { category: 'Deal', field: 'loan_term_months', label: 'Loan Term (Months)', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/MATURITY/LoanMaturityPeriodCount', enumRules: null, sample: '360' },
  { category: 'Deal', field: 'amortization_type', label: 'Amortization Type', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/AMORTIZATION/AMORTIZATION_RULE/AmortizationType', enumRules: 'Fixed|ARM|InterestOnly', sample: 'Fixed' },
  { category: 'Deal', field: 'is_interest_only', label: 'Interest Only', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:IsInterestOnly', enumRules: null, sample: 'true' },
  { category: 'Deal', field: 'interest_only_period_months', label: 'IO Period (Months)', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:InterestOnlyPeriodMonths', enumRules: null, sample: '60' },
  { category: 'Deal', field: 'is_arm', label: 'Is ARM', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:IsARM', enumRules: null, sample: 'false' },
  { category: 'Deal', field: 'arm_index', label: 'ARM Index', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:ARMIndex', enumRules: null, sample: 'SOFR' },
  { category: 'Deal', field: 'arm_margin', label: 'ARM Margin', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:ARMMargin', enumRules: null, sample: '2.75' },
  { category: 'Deal', field: 'is_bridge', label: 'Is Bridge', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:IsBridge', enumRules: null, sample: 'false' },
  { category: 'Deal', field: 'bridge_exit_strategy', label: 'Bridge Exit Strategy', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:BridgeExitStrategy', enumRules: 'Sale|Refi|Other', sample: 'Sale' },
  { category: 'Deal', field: 'appraised_value', label: 'Appraised Value', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_VALUATIONS/.../PropertyValuationAmount', enumRules: null, sample: '625000' },
  { category: 'Deal', field: 'purchase_price', label: 'Purchase Price', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/SALES_CONTRACTS/.../SalesContractAmount', enumRules: null, sample: '600000' },
  { category: 'Deal', field: 'ltv', label: 'LTV', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/LOAN_TO_VALUE/LoanToValueRatioPercent', enumRules: null, sample: '80.00' },
  { category: 'Deal', field: 'dscr', label: 'DSCR', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:DSCR', enumRules: null, sample: '1.25' },
  { category: 'Deal', field: 'monthly_pitia', label: 'Monthly PITIA', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:MonthlyPITIA', enumRules: null, sample: '3500' },
  { category: 'Deal', field: 'prepay_penalty_type', label: 'Prepay Penalty Type', status: 'extension', xpath: 'DEAL/EXTENSION/OTHER/LG:PrepayPenaltyType', enumRules: null, sample: '3-2-1' },
  { category: 'Deal', field: 'stage', label: 'Stage', status: 'unmapped', xpath: null, enumRules: null, sample: null },
  { category: 'Deal', field: 'status', label: 'Status', status: 'unmapped', xpath: null, enumRules: null, sample: null },

  // Borrower Fields
  { category: 'Borrower', field: 'first_name', label: 'First Name', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/NAME/FirstName', enumRules: null, sample: 'John' },
  { category: 'Borrower', field: 'middle_name', label: 'Middle Name', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/NAME/MiddleName', enumRules: null, sample: 'A' },
  { category: 'Borrower', field: 'last_name', label: 'Last Name', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/NAME/LastName', enumRules: null, sample: 'Smith' },
  { category: 'Borrower', field: 'suffix', label: 'Suffix', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/NAME/SuffixName', enumRules: 'Jr|Sr|I|II|III', sample: 'Jr' },
  { category: 'Borrower', field: 'email', label: 'Email', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_EMAIL/ContactPointEmailValue', enumRules: null, sample: 'john@example.com' },
  { category: 'Borrower', field: 'home_phone', label: 'Home Phone', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_TELEPHONE[ContactPointTelephoneValue]', enumRules: null, sample: '555-555-1234' },
  { category: 'Borrower', field: 'cell_phone', label: 'Cell Phone', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_TELEPHONE[ContactPointTelephoneValue]', enumRules: null, sample: '555-555-5678' },
  { category: 'Borrower', field: 'ssn_encrypted', label: 'SSN (Encrypted)', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/TAXPAYER_IDENTIFIERS/TAXPAYER_IDENTIFIER/TaxpayerIdentifierValue', enumRules: 'PII-MASKED', sample: '***-**-1234' },
  { category: 'Borrower', field: 'dob_encrypted', label: 'DOB (Encrypted)', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/INDIVIDUAL/CONTACT_POINTS/.../BirthDate', enumRules: 'PII-MASKED', sample: '****-**-**' },
  { category: 'Borrower', field: 'marital_status', label: 'Marital Status', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/BORROWER_DETAIL/MaritalStatusType', enumRules: 'Married|Unmarried|Separated', sample: 'Married' },
  { category: 'Borrower', field: 'citizenship_status', label: 'Citizenship Status', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/CitizenshipResidencyType', enumRules: 'USCitizen|PermanentResident|...', sample: 'USCitizen' },
  { category: 'Borrower', field: 'current_address_street', label: 'Current Street', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ADDRESSES/ADDRESS/AddressLineText', enumRules: null, sample: '123 Main St' },
  { category: 'Borrower', field: 'current_address_city', label: 'Current City', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ADDRESSES/ADDRESS/CityName', enumRules: null, sample: 'Los Angeles' },
  { category: 'Borrower', field: 'current_address_state', label: 'Current State', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ADDRESSES/ADDRESS/StateCode', enumRules: 'US State Codes', sample: 'CA' },
  { category: 'Borrower', field: 'current_address_zip', label: 'Current ZIP', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ADDRESSES/ADDRESS/PostalCode', enumRules: null, sample: '90210' },
  { category: 'Borrower', field: 'credit_score_est', label: 'Credit Score', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/CREDIT_SCORES/CREDIT_SCORE/CreditScoreValue', enumRules: null, sample: '720' },
  { category: 'Borrower', field: 'housing_status', label: 'Housing Status', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/RESIDENCES/RESIDENCE/BorrowerResidencyType', enumRules: 'Own|Rent|RentFree', sample: 'Own' },
  { category: 'Borrower', field: 'ghl_contact_id', label: 'GHL Contact ID', status: 'unmapped', xpath: null, enumRules: null, sample: null },
  { category: 'Borrower', field: 'is_deleted', label: 'Is Deleted', status: 'unmapped', xpath: null, enumRules: null, sample: null },

  // Property Fields
  { category: 'Property', field: 'address_street', label: 'Street Address', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText', enumRules: null, sample: '456 Oak Ave' },
  { category: 'Property', field: 'address_unit', label: 'Unit', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressUnitIdentifier', enumRules: null, sample: 'Unit 2B' },
  { category: 'Property', field: 'address_city', label: 'City', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName', enumRules: null, sample: 'Beverly Hills' },
  { category: 'Property', field: 'address_state', label: 'State', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode', enumRules: 'US State Codes', sample: 'CA' },
  { category: 'Property', field: 'address_zip', label: 'ZIP Code', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode', enumRules: null, sample: '90210' },
  { category: 'Property', field: 'county', label: 'County', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CountyName', enumRules: null, sample: 'Los Angeles' },
  { category: 'Property', field: 'property_type', label: 'Property Type', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyEstateType', enumRules: 'SFR|Condo|Townhouse|...', sample: 'SingleFamily' },
  { category: 'Property', field: 'number_of_units', label: 'Number of Units', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/FinancedUnitCount', enumRules: null, sample: '1' },
  { category: 'Property', field: 'year_built', label: 'Year Built', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:YearBuilt', enumRules: null, sample: '1985' },
  { category: 'Property', field: 'sqft', label: 'Square Footage', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:SquareFootage', enumRules: null, sample: '2500' },
  { category: 'Property', field: 'lot_sqft', label: 'Lot Size', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:LotSquareFootage', enumRules: null, sample: '7500' },
  { category: 'Property', field: 'beds', label: 'Bedrooms', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Bedrooms', enumRules: null, sample: '4' },
  { category: 'Property', field: 'baths', label: 'Bathrooms', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Bathrooms', enumRules: null, sample: '2.5' },
  { category: 'Property', field: 'stories', label: 'Stories', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Stories', enumRules: null, sample: '2' },
  { category: 'Property', field: 'pool', label: 'Has Pool', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:HasPool', enumRules: null, sample: 'true' },
  { category: 'Property', field: 'hoa_name', label: 'HOA Name', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:HOAName', enumRules: null, sample: 'Sunset HOA' },
  { category: 'Property', field: 'hoa_monthly', label: 'HOA Monthly', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/HOUSING_EXPENSES/HOUSING_EXPENSE[HousingExpenseType="HomeownersAssociationDuesAndCondominiumFees"]/HousingExpensePaymentAmount', enumRules: null, sample: '350' },
  { category: 'Property', field: 'gross_rent_monthly', label: 'Gross Rent', status: 'extension', xpath: 'PROPERTY/EXTENSION/OTHER/LG:GrossRentMonthly', enumRules: null, sample: '4500' },
  { category: 'Property', field: 'taxes_monthly', label: 'Taxes Monthly', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/HOUSING_EXPENSES/HOUSING_EXPENSE[HousingExpenseType="RealEstateTax"]/HousingExpensePaymentAmount', enumRules: null, sample: '500' },
  { category: 'Property', field: 'insurance_monthly', label: 'Insurance Monthly', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/HOUSING_EXPENSES/HOUSING_EXPENSE[HousingExpenseType="HomeownersInsurance"]/HousingExpensePaymentAmount', enumRules: null, sample: '150' },
  { category: 'Property', field: 'estimated_value', label: 'Estimated Value', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_VALUATIONS/.../PropertyValuationAmount', enumRules: null, sample: '625000' },
  { category: 'Property', field: 'apn', label: 'APN', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/ParcelIdentifier', enumRules: null, sample: '1234-567-890' },
  { category: 'Property', field: 'legal_description', label: 'Legal Description', status: 'mapped', xpath: 'DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/LEGAL_DESCRIPTIONS/LEGAL_DESCRIPTION/LegalDescriptionText', enumRules: null, sample: 'Lot 5 Block 3...' },
  { category: 'Property', field: 'is_deleted', label: 'Is Deleted', status: 'unmapped', xpath: null, enumRules: null, sample: null },

  // Fees
  { category: 'Fees', field: 'origination_fee', label: 'Origination Fee', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/DOCUMENT_SPECIFIC_DATA_SETS/.../INTEGRATED_DISCLOSURE_SECTION_SUMMARY[IntegratedDisclosureSectionType="OriginationCharges"]', enumRules: null, sample: '5000' },
  { category: 'Fees', field: 'appraisal_fee', label: 'Appraisal Fee', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/FEES/FEE[FeeType="AppraisalFee"]/FeeActualTotalAmount', enumRules: null, sample: '650' },
  { category: 'Fees', field: 'title_fee', label: 'Title Fee', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/FEES/FEE[FeeType="TitleFee"]/FeeActualTotalAmount', enumRules: null, sample: '1200' },
  { category: 'Fees', field: 'processing_fee', label: 'Processing Fee', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/FEES/FEE[FeeType="ProcessingFee"]/FeeActualTotalAmount', enumRules: null, sample: '995' },
  { category: 'Fees', field: 'underwriting_fee', label: 'Underwriting Fee', status: 'mapped', xpath: 'DEAL/LOANS/LOAN/FEES/FEE[FeeType="UnderwritingFee"]/FeeActualTotalAmount', enumRules: null, sample: '895' },

  // Assets
  { category: 'Assets', field: 'account_type', label: 'Account Type', status: 'mapped', xpath: 'DEAL/ASSETS/ASSET/ASSET_DETAIL/AssetType', enumRules: 'CheckingAccount|SavingsAccount|...', sample: 'CheckingAccount' },
  { category: 'Assets', field: 'bank_name', label: 'Bank Name', status: 'mapped', xpath: 'DEAL/ASSETS/ASSET/ASSET_HOLDER/NAME/FullName', enumRules: null, sample: 'Chase Bank' },
  { category: 'Assets', field: 'account_balance', label: 'Account Balance', status: 'mapped', xpath: 'DEAL/ASSETS/ASSET/ASSET_DETAIL/AssetCashOrMarketValueAmount', enumRules: null, sample: '50000' },

  // Declarations
  { category: 'Declarations', field: 'outstanding_judgments', label: 'Outstanding Judgments', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/OutstandingJudgmentsIndicator', enumRules: 'Y|N', sample: 'N' },
  { category: 'Declarations', field: 'bankruptcy_past_7_years', label: 'Bankruptcy (7 yrs)', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/BankruptcyIndicator', enumRules: 'Y|N', sample: 'N' },
  { category: 'Declarations', field: 'foreclosure_past_7_years', label: 'Foreclosure (7 yrs)', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/PropertyForeclosedPastSevenYearsIndicator', enumRules: 'Y|N', sample: 'N' },
  { category: 'Declarations', field: 'party_to_lawsuit', label: 'Party to Lawsuit', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/PartyToLawsuitIndicator', enumRules: 'Y|N', sample: 'N' },
  { category: 'Declarations', field: 'us_citizen', label: 'US Citizen', status: 'mapped', xpath: 'DEAL/PARTIES/PARTY/ROLES/ROLE/BORROWER/DECLARATION/DECLARATION_DETAIL/CitizenshipResidencyType', enumRules: 'USCitizen|...', sample: 'USCitizen' },
];

export default function MappingCoverageDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = useMemo(() => {
    return [...new Set(FIELD_MAPPINGS.map((f) => f.category))];
  }, []);

  const filteredMappings = useMemo(() => {
    return FIELD_MAPPINGS.filter((m) => {
      const matchesSearch =
        m.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.xpath && m.xpath.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, filterStatus, filterCategory]);

  const stats = useMemo(() => {
    const total = FIELD_MAPPINGS.length;
    const mapped = FIELD_MAPPINGS.filter((m) => m.status === 'mapped').length;
    const extension = FIELD_MAPPINGS.filter((m) => m.status === 'extension').length;
    const unmapped = FIELD_MAPPINGS.filter((m) => m.status === 'unmapped').length;
    return {
      total,
      mapped,
      extension,
      unmapped,
      coveragePercent: Math.round(((mapped + extension) / total) * 100),
    };
  }, []);

  const exportMappings = () => {
    const csv = [
      ['Category', 'Field', 'Label', 'Status', 'XPath', 'Enum Rules', 'Sample'].join(','),
      ...FIELD_MAPPINGS.map((m) =>
        [
          m.category,
          m.field,
          m.label,
          m.status,
          m.xpath || '',
          m.enumRules || '',
          m.sample || '',
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mismo-mapping-coverage.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Mapping coverage exported');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'mapped':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'extension':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unmapped':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'mapped':
        return <Badge className="bg-green-100 text-green-700">MISMO</Badge>;
      case 'extension':
        return <Badge className="bg-yellow-100 text-yellow-700">Extension</Badge>;
      case 'unmapped':
        return <Badge className="bg-red-100 text-red-700">Unmapped</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Mapping Coverage Dashboard
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Complete field mapping status for Business Purpose Application
            </p>
          </div>
          <Button variant="outline" onClick={exportMappings} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Fields</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700">{stats.mapped}</p>
            <p className="text-sm text-gray-500">Mapped to MISMO</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.extension}</p>
            <p className="text-sm text-gray-500">Via Extension</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-700">{stats.unmapped}</p>
            <p className="text-sm text-gray-500">Unmapped</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.coveragePercent}%</p>
            <p className="text-sm text-gray-500">Coverage</p>
          </div>
        </div>

        <Progress value={stats.coveragePercent} className="h-2" />

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fields, XPath..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="mapped">Mapped to MISMO</option>
              <option value="extension">Via Extension</option>
              <option value="unmapped">Unmapped</option>
            </select>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Field</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">XPath</th>
                <th className="text-left p-3 font-medium">Enum Rules</th>
                <th className="text-left p-3 font-medium">Sample</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((m, idx) => (
                <tr
                  key={`${m.category}-${m.field}`}
                  className={`border-b hover:bg-gray-50 ${
                    m.status === 'unmapped' ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="p-3">
                    <Badge variant="outline">{m.category}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(m.status)}
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{m.field}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{getStatusBadge(m.status)}</td>
                  <td className="p-3">
                    {m.xpath ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded block max-w-xs truncate" title={m.xpath}>
                        {m.xpath}
                      </code>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {m.enumRules ? (
                      <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {m.enumRules}
                      </code>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {m.sample ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{m.sample}</code>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Showing {filteredMappings.length} of {FIELD_MAPPINGS.length} fields
        </p>
      </CardContent>
    </Card>
  );
}