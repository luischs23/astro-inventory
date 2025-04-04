// src/components/Home.tsx
'use client';

import "../styles/global.css";
import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Store, Warehouse, FileText, Users, User, BookTemplate } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { HomeSkeleton } from './skeletons/HomeSkeleton';
import { withPermission } from './WithPermission';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User as FirebaseUser } from 'firebase/auth';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface UserProfile {
  id: string;
  name: string;
  surname: string;
  photo: string;
  role: string;
  isDeveloper?: boolean;
}

type MenuItem = {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  permissions: string[];
};

interface HomeProps {
  firebaseConfig: FirebaseConfig;
  companyId?: string;
  hasPermission?: (action: string) => boolean;
}

function HomeComponent({ firebaseConfig, companyId, hasPermission }: HomeProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null); // No usabas user, pero lo dejé funcional
  const [localCompanyId, setLocalCompanyId] = useState<string | null>(null); // Renombré para evitar confusión con prop
  const [companyName, setCompanyName] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const app: FirebaseApp = initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid);
      } else {
        setLoading(false);
        window.location.href = '/login';
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (companyId && userProfile?.isDeveloper) {
      fetchCompanyData(companyId);
    }
  }, [companyId, userProfile]);

  const fetchUserData = async (uid: string) => {
    try {
      const developerUserRef = doc(db, 'users', uid);
      const developerUserSnap = await getDoc(developerUserRef);

      if (developerUserSnap.exists()) {
        const developerData = developerUserSnap.data();
        setUserProfile({
          id: developerUserSnap.id,
          name: developerData.name || 'Developer',
          surname: developerData.surname || '',
          photo: developerData.photo || '',
          role: developerData.role || 'Developer',
          isDeveloper: true,
        });
        if (companyId) {
          fetchCompanyData(companyId);
        } else {
          setCompanyName('Developer Dashboard');
          setLoading(false);
        }
      } else {
        await fetchRegularUserData(uid);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const fetchRegularUserData = async (uid: string) => {
    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);

    for (const companyDoc of companiesSnapshot.docs) {
      const userQuery = query(
        collection(db, `companies/${companyDoc.id}/users`),
        where('uid', '==', uid)
      );
      const userQuerySnapshot = await getDocs(userQuery);

      if (!userQuerySnapshot.empty) {
        const userData = userQuerySnapshot.docs[0].data();
        setUserProfile({
          id: userQuerySnapshot.docs[0].id,
          name: userData.name || 'User',
          surname: userData.surname || '',
          photo: userData.photo || '',
          role: userData.role || 'User',
          isDeveloper: false,
        });
        setLocalCompanyId(companyDoc.id);
        await fetchCompanyData(companyDoc.id);
        break;
      }
    }
    setLoading(false);
  };

  const fetchCompanyData = async (id: string) => {
    try {
      const companyRef = doc(db, 'companies', id);
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        setCompanyName(companySnap.data().name);
        setLocalCompanyId(id);
      } else {
        console.error('Company not found');
        setCompanyName('Company Not Found');
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      setCompanyName('Error Fetching Company');
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuItem[] = localCompanyId
    ? [
        { name: 'Stores', icon: Store, href: `/companies/${localCompanyId}/store`, permissions: ['read', 'customer'] },
        { name: 'Warehouses', icon: Warehouse, href: `/companies/${localCompanyId}/warehouses`, permissions: ['read', 'customer'] },
        { name: 'Invoices', icon: FileText, href: `/companies/${localCompanyId}/invoices`, permissions: ['create'] },
        { name: 'Templates', icon: BookTemplate, href: `/companies/${localCompanyId}/templates`, permissions: ['ska'] },
        { name: 'Users', icon: Users, href: `/companies/${localCompanyId}/users`, permissions: ['create'] },
        { name: 'Profile', icon: User, href: `/companies/${localCompanyId}/profile`, permissions: ['read', 'customer'] },
      ]
    : [];

  const filteredMenuItems = hasPermission
    ? menuItems.filter((item) => item.permissions.some((permission) => hasPermission(permission)))
    : [];

  if (loading) {
    return <HomeSkeleton />;
  }

  if (userProfile?.isDeveloper && !companyId) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
            Select a Company
          </h2>
          <Button onClick={() => (window.location.href = '/companies')} className="w-full">
            Go to Companies
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-700">
      <header className="w-full p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-300">{companyName}</h1>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-2">
            <span className="text-gray-700 font-semibold dark:text-gray-300">Welcome,</span>
            <span className="text-gray-600 dark:text-gray-300">
              {userProfile ? `${userProfile.name} ${userProfile.surname}` : 'User'}
            </span>
          </div>
          {userProfile?.photo ? (
            <img
              src={userProfile.photo}
              alt="User"
              width={40}
              height={40}
              className="rounded-md object-cover cursor-pointer"
              onClick={() => (window.location.href = `/companies/${localCompanyId}/profile`)}
            />
          ) : (
            <div
              className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center cursor-pointer"
              onClick={() => (window.location.href = `/companies/${localCompanyId}/profile`)}
            >
              <User className="w-6 h-6 text-gray-600" />
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4">
        <Card className="w-full p-6 bg-white rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-left text-gray-800 dark:text-gray-300">
            Quick Commands
          </h2>
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
            {filteredMenuItems.map((item) => (
              <a href={item.href} key={item.name}>
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <item.icon className="w-8 h-8 mb-2" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              </a>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default withPermission(HomeComponent, ['read', 'customer']);