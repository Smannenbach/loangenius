import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import NewDeal from './pages/NewDeal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Pipeline": Pipeline,
    "Leads": Leads,
    "Deals": Deals,
    "NewDeal": NewDeal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};