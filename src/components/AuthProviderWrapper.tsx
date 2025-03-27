import { AuthProvider } from "../context/AuthContext";

const AuthProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export default AuthProviderWrapper;
