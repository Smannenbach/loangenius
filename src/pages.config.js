import AIAssistant from './pages/AIAssistant';
import AIOrchestrator from './pages/AIOrchestrator';
import AdminIntegrations from './pages/AdminIntegrations';
import Assumptions from './pages/Assumptions';
import BorrowerPortal from './pages/BorrowerPortal';
import Borrowers from './pages/Borrowers';
import Calculator from './pages/Calculator';
import Communications from './pages/Communications';
import Dashboard from './pages/Dashboard';
import DealDetail from './pages/DealDetail';
import DealWizard from './pages/DealWizard';
import Deals from './pages/Deals';
import Documents from './pages/Documents';
import LeadIntelligence from './pages/LeadIntelligence';
import Leads from './pages/Leads';
import Lenders from './pages/Lenders';
import Loans from './pages/Loans';
import NewDeal from './pages/NewDeal';
import Pipeline from './pages/Pipeline';
import QuoteGenerator from './pages/QuoteGenerator';
import Roadmap from './pages/Roadmap';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Underwriting from './pages/Underwriting';
import Users from './pages/Users';
import BorrowerPortalLogin from './pages/BorrowerPortalLogin';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AIOrchestrator": AIOrchestrator,
    "AdminIntegrations": AdminIntegrations,
    "Assumptions": Assumptions,
    "BorrowerPortal": BorrowerPortal,
    "Borrowers": Borrowers,
    "Calculator": Calculator,
    "Communications": Communications,
    "Dashboard": Dashboard,
    "DealDetail": DealDetail,
    "DealWizard": DealWizard,
    "Deals": Deals,
    "Documents": Documents,
    "LeadIntelligence": LeadIntelligence,
    "Leads": Leads,
    "Lenders": Lenders,
    "Loans": Loans,
    "NewDeal": NewDeal,
    "Pipeline": Pipeline,
    "QuoteGenerator": QuoteGenerator,
    "Roadmap": Roadmap,
    "Settings": Settings,
    "Tasks": Tasks,
    "Underwriting": Underwriting,
    "Users": Users,
    "BorrowerPortalLogin": BorrowerPortalLogin,
    "Reports": Reports,
    "AdminSettings": AdminSettings,
    "Contacts": Contacts,
    "ContactDetail": ContactDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};