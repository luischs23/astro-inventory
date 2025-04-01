// src/components/withPermission.tsx
import { useEffect, useState } from 'react';

interface WithPermissionProps {
  hasPermission: (action: string) => boolean;
}

export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P & WithPermissionProps>,
  requiredPermissions: string[],
) {
  return function PermissionWrapper(props: P) {
    const [hasPermission, setHasPermission] = useState<(action: string) => boolean>(() => () => false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const token = localStorage.getItem('userToken');
      const storedPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');

      if (!token) {
        window.location.href = '/signin';
        return;
      }

      fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          permissions: requiredPermissions,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Error al verificar permisos');
          return res.json();
        })
        .then((data) => {
          if (data.authorized) {
            const userPermissions = data.permissions || [];
            setHasPermission(() => (action: string) => userPermissions.includes(action));
            setIsAuthorized(true);
          } else {
            window.location.href = '/unauthorized';
          }
        })
        .catch((error) => {
          window.location.href = '/unauthorized';
        })
        .finally(() => setLoading(false));
    }, []);

    return <WrappedComponent {...props} hasPermission={hasPermission} />;
  };
}