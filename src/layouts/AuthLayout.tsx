import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Outlet />
    </div>
  );
};

export default AuthLayout;