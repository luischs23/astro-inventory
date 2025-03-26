import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  try {
    // Try to read from serviceAccountKey.json
    let serviceAccount;
    const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
    
    if (fs.existsSync(keyPath)) {
      console.log("📄 Loading service account from file:", keyPath);
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log("🔑 Loading service account from environment variable");
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      throw new Error("No Firebase service account credentials found");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    throw error; // Re-throw to fail fast if Firebase Admin can't be initialized
  }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();
export default admin; // Exporta admin por defecto