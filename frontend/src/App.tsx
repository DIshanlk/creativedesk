import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpaceProvider } from './context/SpaceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Board from './pages/Board';
import Calendar from './pages/Calendar';
import TaskDetail from './pages/TaskDetail';
import Teams from './pages/Teams';
import People from './pages/People';
import Reports from './pages/Reports';
import Approvals from './pages/Approvals';
import Timeline from './pages/Timeline';
import Archived from './pages/Archived';
import Attachments from './pages/Attachments';
import Settings from './pages/Settings';
import Forms from './pages/Forms';
import Docs from './pages/Docs';
import MyWork from './pages/MyWork';
import Workload from './pages/Workload';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
    <SpaceProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
          <Route path="my-work" element={<MyWork />} />
          <Route path="list" element={<TaskList />} />
          <Route path="board" element={<Board />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="task/:id" element={<TaskDetail />} />
          <Route path="teams" element={<Teams />} />
          <Route path="people" element={<People />} />
          <Route path="reports" element={<Reports />} />
          
          <Route path="workload" element={<Workload />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="forms" element={<Forms />} />
          <Route path="docs" element={<Docs />} />
          <Route path="attachments" element={<Attachments />} />
          <Route path="archived" element={<Archived />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </SpaceProvider>
    </AuthProvider>
  );
}

export default App;
