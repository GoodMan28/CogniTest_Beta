
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';

const StudentLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] print:block print:bg-white">
      <StudentSidebar />
      <div className="flex-1 ml-64 print:ml-0 print:w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default StudentLayout;
