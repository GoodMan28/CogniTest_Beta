
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Beaker, FileOutput, Settings, Library } from 'lucide-react';
import axios from 'axios';

const StudentSidebar = () => {
  const [institute, setInstitute] = useState<{ name: string; logoUrl?: string } | null>(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/v1/institute')
      .then(res => setInstitute(res.data))
      .catch(err => console.error('Failed to fetch institute for sidebar', err));
  }, []);

  const navItems = [
    { name: 'My Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'Custom Tests', path: '/student/custom-tests', icon: Beaker },
    { name: 'Mock Tests Library', path: '/student/tests', icon: Library },
    { name: 'My Reports', path: '/student/reports', icon: FileOutput },
    { name: 'Settings', path: '/student/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 bg-[#FAFAFA]">
      <div className="px-4 pt-6 pb-2">
        {institute?.logoUrl ? (
          <img src={(institute.logoUrl?.startsWith("data:") ? institute.logoUrl : `http://localhost:5000${institute.logoUrl}`)} alt={institute.name || 'Institute Logo'} className="w-full h-auto max-h-32 object-contain object-left" />
        ) : (
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{institute?.name || 'Loading...'}</h1>
        )}
        <p className="text-[13px] text-gray-500 mt-2">Student Portal</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/student'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors duration-150 text-[14px] ${isActive
                ? 'bg-gray-200 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default StudentSidebar;
