import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import NewDeal from './pages/NewDeal';
import DealDetail from './pages/DealDetail';
import Borrowers from './pages/Borrowers';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import Calculator from './pages/Calculator';
import QuoteGenerator from './pages/QuoteGenerator';
import AIAssistant from './pages/AIAssistant';
import Underwriting from './pages/Underwriting';
import Communications from './pages/Communications';
import Users from './pages/Users';
import Lenders from './pages/Lenders';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Pipeline": Pipeline,
    "Leads": Leads,
    "Deals": Deals,
    "NewDeal": NewDeal,
    "DealDetail": DealDetail,
    "Borrowers": Borrowers,
    "Documents": Documents,
    "Tasks": Tasks,
    "Calculator": Calculator,
    "QuoteGenerator": QuoteGenerator,
    "AIAssistant": AIAssistant,
    "Underwriting": Underwriting,
    "Communications": Communications,
    "Users": Users,
    "Lenders": Lenders,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};