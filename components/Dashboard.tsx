import React from 'react';
import { Session } from '@supabase/supabase-js';
import WebCLI from './WebCLI';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  return (
    <div className="bg-black text-white min-h-screen w-full flex flex-col">
      <WebCLI session={session} />
    </div>
  );
};

export default Dashboard;
