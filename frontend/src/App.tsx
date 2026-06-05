import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MyPlans from './components/MyPlans';
import Approvals from './components/Approvals';
import ManagementDashboard from './components/ManagementDashboard';
import QCPanel from './components/QCPanel';
import PlanEditor from './components/PlanEditor';
import PlanSchedule from './components/PlanSchedule';
import Summary from './components/Summary';
import { useAppStore } from './store/useAppStore';
import { Plan } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './components/Login';
import Register from './components/Register';
import TeacherInfo from './components/TeacherInfo';
import Profile from './components/Profile';
import Settings from './components/Settings';

function App() {
  const { currentUser, plans, fetchPlans, initAuth, isLoading, theme, setTheme } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [authView, setAuthView] = useState<'login'|'register'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setTheme(theme);
    initAuth().finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPlans();
    }
  }, [currentUser]);

  if (isInitializing) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium">Đang tải...</p></div>;
  }

  if (!currentUser) {
    if (authView === 'login') {
      return <Login onSwitchToRegister={() => setAuthView('register')} />;
    } else {
      return <Register onSwitchToLogin={() => setAuthView('login')} />;
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <Dashboard onSelectPlan={(plan) => setSelectedPlan(plan)} />;
      case 'MY_PLANS':
        return <MyPlans onSelectPlan={(plan) => setSelectedPlan(plan)} />;
      case 'PLAN_SCHEDULE':
        return <PlanSchedule />;
      case 'APPROVALS':
        return <Approvals onSelectPlan={(plan) => setSelectedPlan(plan)} />;
      case 'MONITOR':
        return <ManagementDashboard />;
      case 'QC':
        return <QCPanel />;
      case 'SUMMARY':
        return <Summary onSelectPlan={(plan) => setSelectedPlan(plan)} />;
      case 'USERS':
        return <TeacherInfo onSelectPlan={(plan) => setSelectedPlan(plan)} />;
      case 'PROFILE':
        return <Profile />;
      case 'SETTINGS':
        return <Settings />;
      default:
        return <Dashboard onSelectPlan={(plan) => setSelectedPlan(plan)} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="relative">
        {renderContent()}

        {/* Modal Overlay for Editor */}
        <AnimatePresence>
          {selectedPlan && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 sm:p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-7xl h-full max-h-[90vh] overflow-hidden"
              >
                <div className="bg-white rounded-[2.5rem] h-full shadow-2xl flex flex-col">
                  <PlanEditor plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

export default App;
