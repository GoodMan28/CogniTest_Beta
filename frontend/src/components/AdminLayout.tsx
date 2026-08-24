
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex-1 ml-[260px]">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
