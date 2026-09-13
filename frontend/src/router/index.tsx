import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Pages
const LoginPage = React.lazy(() => import("@/pages/Login"));
const RegisterPage = React.lazy(() => import("@/pages/Register"));
const ProfilePage = React.lazy(() => import("@/pages/Profile"));
const MainLayout = React.lazy(() => import("@/layouts/MainLayout"));
const DashboardPage = React.lazy(() => import("@/pages/Dashboard"));
const PatientsPage = React.lazy(() => import("@/pages/Patients"));
const ConsultationsPage = React.lazy(() => import("@/pages/Consultations"));
const EmrPage = React.lazy(() => import("@/pages/Emr"));
const ConferencesPage = React.lazy(() => import("@/pages/Conferences"));
const PatientHealthPage = React.lazy(
  () => import("@/pages/Health/PatientHealth"),
);
const HealthPage = React.lazy(() => import("@/pages/Health"));
const SocialPage = React.lazy(() => import("@/pages/Social"));
const AuditPage = React.lazy(() => import("@/pages/Audit"));
const AdminPage = React.lazy(() => import("@/pages/Admin"));

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user.roles?.includes("admin") ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

const Router: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          加载中...
        </div>
      }
    >
      <Routes>
        <Route path="/patient-health" element={<PatientHealthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="consultations" element={<ConsultationsPage />} />
          <Route path="emr" element={<EmrPage />} />
          <Route path="conferences" element={<ConferencesPage />} />
          <Route path="health" element={<HealthPage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default Router;
