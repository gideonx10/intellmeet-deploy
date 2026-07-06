import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function NotFoundRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}
