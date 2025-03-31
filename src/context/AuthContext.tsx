// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase/client'; // Asegúrate de tener esta configuración

// Extender FirebaseUser con datos adicionales
type ExtendedUser = FirebaseUser & {
  id?: string;
  role?: string;
  companyId?: string | null;
  name?: string;
  isDeveloper?: boolean;
  token?: string;
  status?: 'active' | 'deleted';
};

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  setUser: (user: ExtendedUser | null) => void;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  isEmailVerified: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 onAuthStateChanged detectó un cambio:', firebaseUser);

      if (!firebaseUser) {
        console.log('❌ No hay usuario autenticado.');
        setUser(null);
        setIsEmailVerified(false);
        setLoading(false);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        console.log('✅ Token obtenido:', token);

        // Aquí podrías obtener datos adicionales desde Firestore si los necesitas
        const response = await fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: firebaseUser.uid }),
        });

        const userData = await response.json();

        const newUser: ExtendedUser = {
          ...firebaseUser,
          token,
          id: userData?.id || firebaseUser.uid,
          role: userData?.role,
          companyId: userData?.companyId,
          name: userData?.name,
          isDeveloper: userData?.role === 'developer',
          status: userData?.status || 'active',
        };

        console.log('✅ Usuario final en AuthContext:', newUser);
        setUser(newUser);
        setIsEmailVerified(newUser.emailVerified ?? false);
      } catch (error) {
        console.error('❌ Error obteniendo datos del usuario:', error);
        setUser({ ...firebaseUser, token: await firebaseUser.getIdToken() }); // Usuario mínimo
        setIsEmailVerified(firebaseUser.emailVerified ?? false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, isEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);