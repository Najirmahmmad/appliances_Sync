import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import OperatorDashboard from './OperatorDashboard';
import TechnicianDashboard from './TechnicianDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'operator':
        return <OperatorDashboard />;
      case 'technician':
        return <TechnicianDashboard />;
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No dashboard available for your role.</p>
          </div>
        );
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'operator':
        return 'Operator Dashboard';
      case 'technician':
        return 'Technician Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{getRoleTitle()}</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.username}!</p>
      </div>
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
