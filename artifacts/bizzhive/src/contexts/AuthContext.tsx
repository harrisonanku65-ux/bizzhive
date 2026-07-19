import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLogin, useRegister, useLogout } from "@workspace/api-client-react";
import type { AuthUser } from "@workspace/api-client-react";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBuyer: boolean;
  isSeller: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: "buyer" | "seller";
  phone?: string;
  vendorName?: string;
  vendorBio?: string;
  vendorLocation?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {}
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginMutation.mutateAsync({ data: { email, password } });
    setUser(data);
  };

  const register = async (data: RegisterData) => {
    const result = await registerMutation.mutateAsync({ data });
    setUser(result);
  };

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        window.location.href = "/";
      }
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isBuyer: user?.role === "buyer",
      isSeller: user?.role === "seller",
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
