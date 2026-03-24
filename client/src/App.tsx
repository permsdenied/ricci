import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import TagsPage from "@/pages/TagsPage";
import ChatsPage from "@/pages/ChatsPage";
import ChatPackagesPage from "@/pages/ChatPackagesPage";
import BroadcastsPage from "@/pages/BroadcastsPage";
import AdminsPage from "@/pages/AdminsPage";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
          <Route path="/tags" element={<ProtectedRoute><Layout><TagsPage /></Layout></ProtectedRoute>} />
          <Route path="/chats" element={<ProtectedRoute><Layout><ChatsPage /></Layout></ProtectedRoute>} />
          <Route path="/chat-packages" element={<ProtectedRoute><Layout><ChatPackagesPage /></Layout></ProtectedRoute>} />
          <Route path="/broadcasts" element={<ProtectedRoute><Layout><BroadcastsPage /></Layout></ProtectedRoute>} />
          <Route path="/admins" element={<ProtectedRoute><Layout><AdminsPage /></Layout></ProtectedRoute>} />
          <Route path="*" element={<div className="flex items-center justify-center h-screen"><div className="text-center"><h1 className="text-4xl font-bold">404</h1><p className="text-muted-foreground mt-2">Страница не найдена</p></div></div>} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}