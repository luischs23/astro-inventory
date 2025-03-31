// src/pages/api/permissions.ts
import type { APIRoute } from 'astro';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { app } from '../../lib/firebase/server';

export const prerender = false; // Esto asegura que la ruta sea dinámica

const auth = getAuth(app);
const db = getFirestore(app);

const rolePermissions: Record<string, string[]> = {
  developer: ["create", "read", "update", "delete", "ska", "companies","cus"],
  general_manager: ["create", "read", "update", "delete", "ska","cus"],
  warehouse_manager: ["create", "read", "update", "ska","customer"],
  warehouse_salesperson: ["read", "ska","cus"],
  pos_salesperson: ["read", "ska","cus"],
  skater: ["skater", "read","cus"],
  customer: ["customer","cus"],
};

function checkPermissions(userRole: string, requiredPermissions: string[]): boolean {
  const userPermissions = rolePermissions[userRole] || [];
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📥 Solicitud recibida en /api/permissions');
    const { token, permissions } = await request.json();
    console.log('Datos recibidos:', { token, permissions });

    if (!token || !permissions || !Array.isArray(permissions)) {
      console.log('❌ Token o permisos inválidos');
      return new Response(JSON.stringify({ error: 'Token y permisos son requeridos' }), {
        status: 400,
      });
    }

    console.log('🔍 Verificando token...');
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    console.log('✅ Token verificado, UID:', uid);

    let userRole = 'unknown';
    let userPermissions: string[] = [];

    console.log('🔍 Buscando usuario en Firestore...');
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      userRole = userData?.role || 'unknown';
      userPermissions = rolePermissions[userRole] || [];
      console.log('✅ Usuario encontrado en "users":', { uid, role: userRole });
    } else {
      console.log('ℹ️ Usuario no encontrado en "users", buscando en subcolecciones de "companies"...');
      // Buscar en subcolecciones de 'companies'
      const companiesSnapshot = await db.collection('companies').get();
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        console.log(`🔍 Revisando subcolección "companies/${companyId}/users"...`);
        const companyUserDoc = await db
          .collection(`companies/${companyId}/users`)
          .doc(uid)
          .get();

        if (companyUserDoc.exists) {
          const userData = companyUserDoc.data();
          userRole = userData?.role || 'unknown';
          userPermissions = rolePermissions[userRole] || [];
          console.log('✅ Usuario encontrado en subcolección:', { uid, companyId, role: userRole });
          break; // Salir del bucle una vez que encontramos al usuario
        }
      }
    }

    if (userRole === 'unknown') {
      console.log('❌ Usuario no encontrado en ninguna colección');
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
    }

    const authorized = checkPermissions(userRole, permissions);
    console.log('✅ Permisos verificados:', { authorized, permissions: userPermissions });

    return new Response(JSON.stringify({ authorized, permissions: userPermissions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error verificando permisos:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
    });
  }
};