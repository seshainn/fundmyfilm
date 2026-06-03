import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const { accessToken, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="p-6 text-center">
        Loading...
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}