import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/screens/Login";
import Onboarding from "@/screens/Onboarding";

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function ProtectedRoute({ children, allowedRole }: { children: ReactNode; allowedRole?: "parent" | "child" }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  if (allowedRole && profile?.role !== allowedRole)
    return <Navigate to={profile?.role === "parent" ? "/parent" : "/child"} replace />;
  return <>{children}</>;
}

export function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user && profile) {
    if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
    return <Navigate to={profile.role === "parent" ? "/parent" : "/child"} replace />;
  }
  return <Login />;
}

export function OnboardingRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || !profile) return <Navigate to="/" replace />;
  if (profile.onboarding_complete)
    return <Navigate to={profile.role === "parent" ? "/parent" : "/child"} replace />;
  return <Onboarding />;
}
