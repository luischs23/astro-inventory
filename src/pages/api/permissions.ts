import { NextResponse } from 'next/server';
import admin from '../../services/firebase/firebaseAdmin';

// Definición de permisos por rol
const rolePermissions: Record<string, string[]> = {
  developer: ["create", "read", "update", "delete", "ska", "companies","cus"],
  general_manager: ["create", "read", "update", "delete", "ska","cus"],
  warehouse_manager: ["create", "read", "update", "ska","customer"],
  warehouse_salesperson: ["read", "ska","cus"],
  pos_salesperson: ["read", "ska","cus"],
  skater: ["skater", "read","cus"],
  customer: ["customer","cus"],
};

// Función para verificar permisos
function checkPermissions(userRole: string, requiredPermissions: string[]): boolean {
  const userPermissions = rolePermissions[userRole] || [];
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

// Manejador de la solicitud POST
export async function POST(request: Request) {
  try {
    const { token, permissions } = await request.json();

    if (!token || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Token y permisos son requeridos' }, { status: 400 });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    let userRole = 'unknown';
    let userPermissions: string[] = [];

    // Buscar en 'users' (desarrolladores)
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      userRole = userData?.role || 'unknown';
      userPermissions = rolePermissions[userRole] || [];
    } else {
      // Buscar en subcolecciones de 'companies'
      const companiesSnapshot = await admin.firestore().collection('companies').get();
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const companyUserDoc = await admin.firestore()
          .collection(`companies/${companyId}/users`)
          .doc(uid)
          .get();

        if (companyUserDoc.exists) {
          const userData = companyUserDoc.data();
          userRole = userData?.role || 'unknown';
          userPermissions = rolePermissions[userRole] || [];
          break;
        }
      }
    }

    if (userRole === 'unknown') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const authorized = checkPermissions(userRole, permissions);

    // Devolver 'authorized' y los permisos del usuario
    return NextResponse.json({ authorized, permissions: userPermissions });
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}