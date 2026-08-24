
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Beaker, FileOutput, Settings } from 'lucide-react';

const StudentSidebar = () => {
  const navItems = [
    { name: 'My Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'Custom Tests', path: '/student/custom-tests', icon: Beaker },
    { name: 'My Reports', path: '/student/reports', icon: FileOutput },
    { name: 'Settings', path: '/student/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 bg-[#FAFAFA]">
      <div className="p-6 pb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">CogniTest</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Student Portal</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/student'}
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

export default StudentSidebar;
