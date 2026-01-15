import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Home, Briefcase, Users, Settings } from 'lucide-react';

export default function MobileBottomNav() {
  const navItems = [
    { icon: Home, label: 'Home', path: 'Dashboard' },
    { icon: Briefcase, label: 'Pipeline', path: 'Pipeline' },
    { icon: Users, label: 'Contacts', path: 'Contacts' },
    { icon: Settings, label: 'Settings', path: 'Settings' }
  ];

  return (
     <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden safe-area-inset z-40 shadow-lg">
       <div className="flex justify-around">
         {navItems.map((item) => {
           const Icon = item.icon;
           return (
             <Link
               key={item.path}
               to={createPageUrl(item.path)}
               className="flex flex-col items-center justify-center flex-1 py-3 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors touch-target"
             >
               <Icon className="w-5 h-5" />
               <span className="text-xs mt-1 font-medium">{item.label}</span>
             </Link>
           );
         })}
       </div>
     </nav>
   );
}