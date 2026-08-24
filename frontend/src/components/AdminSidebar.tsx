
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, BarChart2, FileOutput, Database, Settings } from 'lucide-react';

const AdminSidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Tests', path: '/admin/tests', icon: FileText },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { name: 'Reports', path: '/admin/reports', icon: FileOutput },
    { name: 'Question Bank', path: '/admin/questions', icon: Database },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 bg-[#FAFAFA]">
      <div className="p-6 pb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">CogniTest</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Enterprise Admin</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors duration-150 text-[14px] ${
                isActive
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

export default AdminSidebar;
