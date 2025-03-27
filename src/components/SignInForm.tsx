// src/components/SignInForm.tsx
import { useState } from 'react';
import { initializeApp} from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import type { FormEvent } from 'react';
import type { Auth, User as FirebaseUser } from "firebase/auth";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Extendemos el tipo FirebaseUser para incluir el token y otros datos opcionales
interface ExtendedUser extends FirebaseUser {
  token?: string;
  isDeveloper?: boolean; // Ejemplo de dato que podrías usar para permisos
}

interface SignInFormProps {
  firebaseConfig: FirebaseConfig;
}

export default function SignInForm({ firebaseConfig }: SignInFormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);

  // Inicializar Firebase
  const app: FirebaseApp = initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Limpiar errores previos

    try {
      // Autenticar al usuario
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser: FirebaseUser = userCredential.user;

      // Verificar si el email está verificado
      const emailVerified = firebaseUser.emailVerified;
      setIsEmailVerified(emailVerified);

      if (!emailVerified) {
        setError('Por favor, verifica tu correo electrónico antes de continuar.');
        return;
      }

      // Obtener el token de autenticación
      const token = await firebaseUser.getIdToken();
      console.log('✅ Token obtenido:', token);

      // Crear un ExtendedUser con el token
      const extendedUser: ExtendedUser = {
        ...firebaseUser,
        token,
        // Aquí podrías añadir más datos como isDeveloper si los obtienes de otra fuente (Firestore, por ejemplo)
      };

      // Opcional: Llamar a una API con el token para obtener más datos del usuario
      // Ejemplo comentado:
      /*
      const response = await fetch('https://tu-api.com/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await response.json();
      extendedUser.isDeveloper = userData.isDeveloper;
      */

      console.log('✅ Usuario autenticado:', extendedUser);

      // Redirigir a /companies tras éxito
      window.location.href = '/companies';
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido');
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSignIn}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Iniciar Sesión</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isEmailVerified && <p style={{ color: 'green' }}>Email verificado</p>}
    </div>
  );
}