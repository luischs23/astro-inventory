'use client'

import "../styles/global.css";
import { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs, doc, updateDoc, getDoc, getFirestore } from 'firebase/firestore'
import { getAuth, type User } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import ReactCrop from 'react-image-crop'
import type { Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from "../components/ui/Button"
import { useToast } from "../components/ui/UseToast"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "../components/ui/AlertDialog"
import { ArrowLeft, Camera, ChevronRight, HelpCircle, Loader2, LogOut, RotateCw, Settings, Undo, UserIcon } from 'lucide-react'
import { ProfileSkeleton } from '../components/skeletons/ProfileSkeleton'
import { getApp, getApps, initializeApp } from 'firebase/app'

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface UserProfile {
id: string
name: string
surname: string
email: string
phone: string
cc: string
location: string
role: string
companyId: string
photo: string
}

interface ProfileProps {
    firebaseConfig: FirebaseConfig;
    companyId?: string;
  }

export default function ProfilePage({ firebaseConfig, companyId }: ProfileProps) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [, setCompanyName] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showUpdatePhotoDialog, setShowUpdatePhotoDialog] = useState(false)
    const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        })
    const [rotation, setRotation] = useState(0)
    const [previousRotation, setPreviousRotation] = useState(0)
    const imageRef = useRef<HTMLImageElement>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const lastConnection = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const { toast } = useToast()

    if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      const app = getApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);

useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
    setUser(user)
    if (user) {
        fetchUserProfile(user.uid)
        fetchCompanyName()
    } else {
        setLoading(false)
        window.location.href = '/signin'
    }
    })

    return () => unsubscribe()
}, [companyId])

const fetchCompanyName = async () => {
    if (!companyId) {
      throw new Error('Company ID is undefined')
    }
    try {
    const companyRef = doc(db, 'companies', companyId)
    const companySnap = await getDoc(companyRef)
    
    if (companySnap.exists()) {
        setCompanyName(companySnap.data().name)
    } else {
        console.error('Company not found')
        window.location.href = '/companies'
    }
    } catch (error) {
    console.error('Error fetching company:', error)
    toast({
        title: "Error",
        description: "Failed to fetch company information",
        variant: "destructive",
    })
    }
}

const fetchUserProfile = async (uid: string) => {
  try {
    // 1️⃣ Buscar en `companies/${params.companyId}/users`
    const userQuery = query(
      collection(db, `companies/${companyId}/users`),
      where('uid', '==', uid)
    );

    const userSnapshot = await getDocs(userQuery);

    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data() as UserProfile;
      setProfile({ ...userData, id: userSnapshot.docs[0].id });
      return; // ⬅️ Si encuentra al usuario aquí, detenemos la ejecución
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as UserProfile;
      setProfile({ ...userData, id: userSnap.id });
    } else {
      console.error('Usuario no encontrado en ninguna colección.');
      toast({
        title: 'Error',
        description: 'User profile not found in any collection',
        variant: 'destructive',
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    toast({
      title: 'Error',
      description: 'Failed to fetch user profile',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};


const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
        setNewPhotoFile(file)
        const objectUrl = URL.createObjectURL(file)
        setNewPhotoPreview(objectUrl)
    }
    }

const handleRotate = () => {
    setPreviousRotation(rotation)
    setRotation((prev) => (prev + 90) % 360)
    }

    const handleUndo = () => {
    setRotation(previousRotation)
    }

const getCroppedImg = async (
    image: HTMLImageElement,
    crop: Crop,
    rotation = 0
    ): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Set desired output size (e.g., 500x500 pixels)
    const outputSize = 500

    canvas.width = outputSize
    canvas.height = outputSize

    ctx.imageSmoothingQuality = 'high'

    const rotRad = (rotation * Math.PI) / 180

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rotRad)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    )

    ctx.restore()

    return new Promise((resolve) => {
        canvas.toBlob(
        (blob) => {
            if (!blob) {
            throw new Error('Canvas is empty')
            }
            resolve(blob)
        },
        'image/jpeg',
        0.8 // Adjust quality (0.8 = 80% quality)
        )
    })
    }

const handleCloseDialog = () => {
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    setRotation(0)
    setPreviousRotation(0)
    setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
})
}

const handleUpdatePhoto = async () => {
if (!user || !profile || !newPhotoFile || !imageRef.current) return

setIsUpdating(true)
try {
    const croppedImage = await getCroppedImg(imageRef.current, crop, rotation)
    const storageRef = ref(storage, `companies/${companyId}/profile/${profile.id}`)
    await uploadBytes(storageRef, croppedImage)
    const downloadURL = await getDownloadURL(storageRef)

    const userRef = doc(db, `companies/${companyId}/users`, profile.id)
    await updateDoc(userRef, {
    photo: downloadURL
    })

    setProfile({ ...profile, photo: downloadURL })
    setShowUpdatePhotoDialog(false)
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    setRotation(0)
    setPreviousRotation(0)
    toast({
    title: "Success",
    description: "Profile photo updated successfully",
    style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
    })
} catch (error) {
    console.error('Error updating profile photo:', error)
    toast({
    title: "Error",
    description: "Failed to update profile photo",
    variant: "destructive",
    })
} finally {
    setIsUpdating(false)
}
}

if (loading) {
    return <ProfileSkeleton />
}

if (!profile) {
    return <div>No profile found</div>
}

return (
    <div className="container mx-auto p-4 pb-20 bg-white dark:bg-gray-600">
        <div className="p-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="text-black dark:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span className="ml-2 text-lg text-black dark:text-white">Your profile</span>
    </div>
    <main className='mb-44'>
    <div className="flex flex-col items-center mt-4 mb-8 bg-white dark:bg-gray-600">
        <div className="relative">
          {profile.photo ? (
            <img 
              src={profile.photo}
              alt="Profile"
              width={120}
              height={120}
              className="rounded-full"
            />
          ) : (
            <div className="w-[120px] h-[120px] bg-gray-600 rounded-full flex items-center justify-center dark:bg-gray-400">
              <UserIcon className="w-16 h-16 " />
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-0 right-0 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-600"
            onClick={() => setShowUpdatePhotoDialog(true)}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
             <h2 className="mt-4 text-xl font-semibold text-black dark:text-white">{`${profile.name}`}</h2>
        </div>
          {/* Menu Items */}
      <div className="px-4 space-y-3">
        <Button
          variant="ghost"
          className="w-full bg-black/10 hover:bg-black/20 justify-between h-14 dark:bg-white/10"
          onClick={() => setShowSettingsDialog(true)}
        >
          <div className="flex items-center text-black dark:text-white">
            <Settings className="mr-2 h-5 w-5 " />
            <span>Ajustes</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          className="w-full bg-black/10 hover:bg-black/20 justify-between h-14 dark:bg-white/10"
        >
          <div className="flex items-center text-black dark:text-white">
            <HelpCircle className="mr-2 h-5 w-5" />
            <span>Ayuda</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute p-4 bg-white dark:bg-gray-600">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-400 mb-4"
          onClick={() => auth.signOut()}
        >
          <LogOut className="mr-2 h-5 w-5" />
          <span>Salir</span>
        </Button>
        <div className="text-sm text-gray-400 flex justify-between">
          <span>Última conexión {lastConnection}</span>
        </div>
      </div>
    <AlertDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información del perfil</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 text-black dark:text-gray-300">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Email</label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teléfono</label>
              <p className="text-sm">{profile.phone}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">C.C.</label>
              <p className="text-sm">{profile.cc}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Ubicación</label>
              <p className="text-sm">{profile.location}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rol</label>
              <p className="text-sm">{profile.role}</p>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    <AlertDialog 
        open={showUpdatePhotoDialog} 
        onOpenChange={(open) => {
          setShowUpdatePhotoDialog(open)
          if (!open) {
            handleCloseDialog()
          }
        }}
      >
    <AlertDialogContent className="text-white max-w-md">
        <AlertDialogHeader>
        <AlertDialogTitle>Edita la foto de tu perfil</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
        <div className="flex justify-center">
            {newPhotoPreview ? (
            <div className="relative w-full max-w-[300px] aspect-square">
                <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                className="max-h-[300px]"
                >
                 <img
                      ref={imageRef}
                      src={newPhotoPreview}
                      alt="New profile photo"
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className="max-w-full h-auto"
                    />
                </ReactCrop>
            </div>
            ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
            </div>
            )}
        </div>
        <div className="flex justify-center space-x-4">
            <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleRotate}
            >
            <RotateCw className="h-4 w-4  text-black dark:text-gray-400" />
            </Button>
            <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleUndo}
            >
            <Undo className="h-4 w-4 text-black dark:text-gray-400" />
            </Button>
        </div>
        <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
        />  
        {!newPhotoFile && (
            <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            >
            Choose Photo
            </Button>
        )}
        {newPhotoFile && (
            <Button
            onClick={handleUpdatePhoto}
            className="w-full"
            disabled={isUpdating}
            >
            {isUpdating ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
                </>
            ) : (
                'Ready'
            )}
            </Button>
        )}
        </div>
    </AlertDialogContent>
    </AlertDialog>
    </main>
    </div>
)
}