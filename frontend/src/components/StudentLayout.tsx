
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';

const StudentLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <StudentSidebar />
      <div className="flex-1 ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default StudentLayout;
