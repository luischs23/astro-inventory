import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/* Verifica que las variables de entorno estén definidas */
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_CLIENT_ID",
  "FIREBASE_AUTH_URI",
  "FIREBASE_TOKEN_URI",
  "FIREBASE_AUTH_CERT_URL",
  "FIREBASE_CLIENT_CERT_URL",
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`❌ Falta la variable de entorno: ${envVar}`);
  }
}

/* Configuración del servicio */
const serviceAccount = {
  type: "service_account",
  project_id: import.meta.env.FIREBASE_PROJECT_ID,
  private_key_id: import.meta.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: import.meta.env.FIREBASE_CLIENT_EMAIL,
  client_id: import.meta.env.FIREBASE_CLIENT_ID,
  auth_uri: import.meta.env.FIREBASE_AUTH_URI,
  token_uri: import.meta.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: import.meta.env.FIREBASE_AUTH_CERT_URL,
  client_x509_cert_url: import.meta.env.FIREBASE_CLIENT_CERT_URL,
} as Record<string, string>;

/* Inicializa Firebase Admin si no está ya inicializado */
const app = !getApps().length ? initializeApp({ credential: cert(serviceAccount) }) : getApp();

/* Exportar Firestore y Auth */
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export { app };
