import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Pipeline": Pipeline,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};