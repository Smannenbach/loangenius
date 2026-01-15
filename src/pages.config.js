import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import NewDeal from './pages/NewDeal';
import DealDetail from './pages/DealDetail';
import Borrowers from './pages/Borrowers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Pipeline": Pipeline,
    "Leads": Leads,
    "Deals": Deals,
    "NewDeal": NewDeal,
    "DealDetail": DealDetail,
    "Borrowers": Borrowers,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};