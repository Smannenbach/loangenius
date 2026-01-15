import AIAssistant from './pages/AIAssistant';
import AIOrchestrator from './pages/AIOrchestrator';
import AdminAIProviders from './pages/AdminAIProviders';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminIntegrations from './pages/AdminIntegrations';
import AdminLoginHistory from './pages/AdminLoginHistory';
import AdminOrganization from './pages/AdminOrganization';
import AdminPortalPreview from './pages/AdminPortalPreview';
import AdminSettings from './pages/AdminSettings';
import AdminWebhooks from './pages/AdminWebhooks';
import Assumptions from './pages/Assumptions';
import BorrowerPortal from './pages/BorrowerPortal';
import BorrowerPortalHome from './pages/BorrowerPortalHome';
import BorrowerPortalLogin from './pages/BorrowerPortalLogin';
import Borrowers from './pages/Borrowers';
import Calculator from './pages/Calculator';
import CoborrowerPortal from './pages/CoborrowerPortal';
import Communications from './pages/Communications';
import ConsentManagement from './pages/ConsentManagement';
import ContactDetail from './pages/ContactDetail';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DealDetail from './pages/DealDetail';
import DealWizard from './pages/DealWizard';
import Deals from './pages/Deals';
import DocumentIntelligence from './pages/DocumentIntelligence';
import Documents from './pages/Documents';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import LeadIntelligence from './pages/LeadIntelligence';
import Leads from './pages/Leads';
import Lenders from './pages/Lenders';
import LoanApplication from './pages/LoanApplication';
import Loans from './pages/Loans';
import NewDeal from './pages/NewDeal';
import Pipeline from './pages/Pipeline';
import QuoteGenerator from './pages/QuoteGenerator';
import ReportBuilder from './pages/ReportBuilder';
import ReportViewer from './pages/ReportViewer';
import Reports from './pages/Reports';
import Roadmap from './pages/Roadmap';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Tasks from './pages/Tasks';
import Underwriting from './pages/Underwriting';
import Users from './pages/Users';
import ValidationDashboard from './pages/ValidationDashboard';
import UnderwritingChecklist from './pages/UnderwritingChecklist';
import SubmissionPrep from './pages/SubmissionPrep';
import Analytics from './pages/Analytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AIOrchestrator": AIOrchestrator,
    "AdminAIProviders": AdminAIProviders,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminIntegrations": AdminIntegrations,
    "AdminLoginHistory": AdminLoginHistory,
    "AdminOrganization": AdminOrganization,
    "AdminPortalPreview": AdminPortalPreview,
    "AdminSettings": AdminSettings,
    "AdminWebhooks": AdminWebhooks,
    "Assumptions": Assumptions,
    "BorrowerPortal": BorrowerPortal,
    "BorrowerPortalHome": BorrowerPortalHome,
    "BorrowerPortalLogin": BorrowerPortalLogin,
    "Borrowers": Borrowers,
    "Calculator": Calculator,
    "CoborrowerPortal": CoborrowerPortal,
    "Communications": Communications,
    "ConsentManagement": ConsentManagement,
    "ContactDetail": ContactDetail,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "DealDetail": DealDetail,
    "DealWizard": DealWizard,
    "Deals": Deals,
    "DocumentIntelligence": DocumentIntelligence,
    "Documents": Documents,
    "ExecutiveDashboard": ExecutiveDashboard,
    "LeadIntelligence": LeadIntelligence,
    "Leads": Leads,
    "Lenders": Lenders,
    "LoanApplication": LoanApplication,
    "Loans": Loans,
    "NewDeal": NewDeal,
    "Pipeline": Pipeline,
    "QuoteGenerator": QuoteGenerator,
    "ReportBuilder": ReportBuilder,
    "ReportViewer": ReportViewer,
    "Reports": Reports,
    "Roadmap": Roadmap,
    "Settings": Settings,
    "SuperAdmin": SuperAdmin,
    "Tasks": Tasks,
    "Underwriting": Underwriting,
    "Users": Users,
    "ValidationDashboard": ValidationDashboard,
    "UnderwritingChecklist": UnderwritingChecklist,
    "SubmissionPrep": SubmissionPrep,
    "Analytics": Analytics,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};