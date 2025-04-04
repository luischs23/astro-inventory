// src/components/SignInForm.tsx
import { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { FormEvent } from 'react';
import type { Auth, User as FirebaseUser } from 'firebase/auth';

interface FirebaseConfig { 
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface ExtendedUser extends FirebaseUser {
  token: string;
  permissions?: string[];
  companyId?: string;
  isDeveloper?: boolean;
}

interface SignInFormProps {
  firebaseConfig: FirebaseConfig;
}

export default function SignInForm({ firebaseConfig }: SignInFormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const app: FirebaseApp = initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser: FirebaseUser = userCredential.user;

      const emailVerified = firebaseUser.emailVerified;
      setIsEmailVerified(emailVerified);

      if (!emailVerified) {
        setError('Por favor, verifica tu correo electrónico antes de continuar.');
        setLoading(false);
        return;
      }

      const token = await firebaseUser.getIdToken();

      // Llamada al endpoint de permisos
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          permissions: ['read'], // Permisos requeridos
        }),
      });

      const responseBody = await response.text();

      if (!response.ok) {
        const errorData = JSON.parse(responseBody);
        throw new Error(errorData.error || 'Error al verificar permisos');
      }

      const { authorized, permissions, role, companyId } = JSON.parse(responseBody);

      if (!authorized) {
        setError('No tienes permiso para acceder a esta aplicación.');
        setLoading(false);
        return;
      }

      // Determinar si el usuario es developer basado en el rol
      const isDeveloper = role === 'developer';

      // Validar companyId solo para no developers
      if (!isDeveloper && !companyId) {
        throw new Error('Usuario no asociado a ninguna compañía');
      }

      const extendedUser: ExtendedUser = {
        ...firebaseUser,
        token,
        permissions,
        isDeveloper,
        companyId, // Puede ser undefined para developers
      }; 

      localStorage.setItem('userToken', token);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
      localStorage.setItem('isDeveloper', JSON.stringify(isDeveloper));
      if (companyId) localStorage.setItem('companyId', companyId);

      // Lógica de redirección
      if (isDeveloper) {
        window.location.href = '/companies'; // Developers van a /companies
      } else {
        window.location.href = `/companies/${companyId}/home`; // No developers van a su companyId/home
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-[400px] shadow-lg bg-white rounded-lg p-6">
        <form onSubmit={handleSignIn} className="space-y-6 w-full py-6">
          <div className="space-y-4">
            <div className="text-2xl font-bold text-center">Welcome Back</div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-500 text-center">{error}</div>}
          {isEmailVerified && !error && (
            <div className="text-sm text-green-500 text-center">Verificado</div>
          )}

          <button
            type="submit"
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                  ></path>
                </svg>
                <span>Logging in...</span>
              </div>
            ) : (
              'Log In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}