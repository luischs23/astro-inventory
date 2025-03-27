"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { auth } from "../lib/firebase/client";

const AuthCheck = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("⏳ Iniciando verificación de usuario...");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 Detectado cambio en la autenticación:", firebaseUser);

      if (!firebaseUser) {
        console.log("❌ No hay usuario autenticado.");
        setUser(null);
      } else {
        console.log("✅ Usuario autenticado:", firebaseUser);
        const token = await firebaseUser.getIdToken();
        console.log("🔑 Token obtenido:", token);
        setUser({ ...firebaseUser, token });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Verificando usuario...</p>;

  return (
    <div>
      <h3>Estado de Autenticación</h3>
      {user ? (
        <pre>{JSON.stringify(user, null, 2)}</pre>
      ) : (
        <p>No hay usuario autenticado.</p>
      )}
    </div>
  );
};

export default AuthCheck;
