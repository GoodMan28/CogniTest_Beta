
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] print:block print:bg-white">
      <AdminSidebar />
      <div className="flex-1 ml-[260px] print:ml-0 print:w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
