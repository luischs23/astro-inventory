'use client'

import "../styles/global.css";
import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getFirestore } from 'firebase/firestore'
import { ref, getDownloadURL, deleteObject, listAll, uploadBytesResumable, getStorage } from 'firebase/storage'
import { Button } from "../components/ui/Button"
import { Card, CardContent } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { ArrowLeft, MoreVertical, X, Pencil, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/AlertDialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/DropdownMenu"
import { WarehouseCardSkeleton } from '../components/skeletons/WarehouseCardSkeleton'
import { useToast } from "../components/ui/UseToast"
import imageCompression from 'browser-image-compression'
import { withPermission } from "../components/WithPermission"
import { getApp, getApps, initializeApp } from 'firebase/app'
import { Image } from 'astro:assets';

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  } 

interface Warehouse {
  id: string
  name: string
  address: string
  manager: string
  phone: string
  imageUrl: string
}

interface WarehousesPageProps {
  firebaseConfig: FirebaseConfig;
  companyId?: string;
  warehouseId?: string;
  hasPermission?: (action: string) => boolean;
}

function WarehousesPage({ firebaseConfig, companyId, warehouseId, hasPermission}: WarehousesPageProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', manager: '', phone: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [warehouseLimit, setWarehouseLimit] = useState<number | null>(null);
  const [inputLimit, setInputLimit] = useState("");
  const [loading, setLoading] = useState(true)
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null)
  const [, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      const app = getApp();
      const db = getFirestore(app);
      const storage = getStorage(app);
  
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true)
      try {
        const warehousesCollection = collection(db, `companies/${companyId}/warehouses`)
        const warehousesSnapshot = await getDocs(warehousesCollection)
        const warehousesList = warehousesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Warehouse[]
        
        // Simulate a delay to ensure the loading state is visible
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setWarehouses(warehousesList)
      } catch (err) {
        console.error('Error fetching warehouses:', err)
        setError('Failed to load warehouses. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchWarehouses()
  }, [companyId])

  useEffect(() => {
    if (isPopupOpen && popupRef.current) {
      popupRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isPopupOpen])

  useEffect(() => {
    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [])

   useEffect(() => {
      const fetchStoreLimit = async () => {
        const configRef = doc(db, `companies/${companyId}/config/warehouseConfig`);
  
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setWarehouseLimit(configSnap.data().limit);
        }
      };
    
      fetchStoreLimit();
    }, [companyId]);
  
    const handleSaveLimit = async () => {
      if (!inputLimit || isNaN(Number(inputLimit))) return;
    
      const configRef = doc(db, `companies/${companyId}/config/warehouseConfig`);
      await setDoc(configRef, { limit: Number(inputLimit) });
    
      setWarehouseLimit(Number(inputLimit));
      setInputLimit(""); // Limpiar el input después de guardar
    };
  

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/warehouse-images`)
    const fileList = await listAll(storageRef)
    const existingFiles = fileList.items.map(item => item.name)

    let uniqueName = originalName
    let counter = 1

    while (existingFiles.includes(uniqueName)) {
      const nameParts = originalName.split('.')
      const extension = nameParts.pop()
      const baseName = nameParts.join('.')
      uniqueName = `${baseName}${counter}.${extension}`
      counter++
    }

    return uniqueName
  }

  const uploadImageWithResumable = async (file: File) => {
    return new Promise<string>(async (resolve, reject) => {
      const uniqueFileName = await getUniqueFileName(file.name);
      const storageRef = ref(storage, `companies/${companyId}/warehouse-images/${uniqueFileName}`);
  
      const uploadTask = uploadBytesResumable(storageRef, file);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Subiendo: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error("Error al subir la imagen:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };
  

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(file, options)
        setImageFile(compressedFile)
        
        // Create a preview URL for the compressed image
        const previewUrl = URL.createObjectURL(compressedFile)
        setImagePreview(previewUrl)
      } catch (error) {
        console.error('Error compressing image:', error)
        toast({
          title: "Error",
          description: "Failed to compress image. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }
  }

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return

    setLoading(true)
    setError(null)

    try {
      const imageUrl = await uploadImageWithResumable(imageFile)
      const warehousesCollection = collection(db, `companies/${companyId}/warehouses`)
      const newWarehouseData = {
        ...newWarehouse,
        imageUrl,
        createdAt: new Date()
      }
      const docRef = await addDoc(warehousesCollection, newWarehouseData)
      setWarehouses(prevWarehouses => [...prevWarehouses, { id: docRef.id, ...newWarehouseData }])
      setIsPopupOpen(false)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Created",
        description: "The new warehouse has been successfully created.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error creating warehouse:', err)
      setError('Failed to create warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to create warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWarehouse) return

    setLoading(true)
    setError(null)

    try {
      const updatedData: Partial<Warehouse> = { ...newWarehouse };
      const warehouseRef = doc(db, `companies/${companyId}/warehouses`, editingWarehouse.id);
  
      if (imageFile) {
        setLoading(true);
  
        // 📌 Eliminar la imagen anterior si existe
        if (editingWarehouse.imageUrl) {
          try {
            const decodedUrl = decodeURIComponent(editingWarehouse.imageUrl);
            const oldImagePath = decodedUrl.split("/o/")[1].split("?")[0];
            const oldImageRef = ref(storage, oldImagePath);
            await deleteObject(oldImageRef);
          } catch (deleteError) {
            console.debug("Previous image not found or already deleted");
          }
        }
  
        // 📌 Subir la nueva imagen con `uploadBytesResumable`
        const imageUrl = await uploadImageWithResumable(imageFile);
        updatedData.imageUrl = imageUrl;
      }
  
      // 📌 Actualizar el documento en Firestore
      await updateDoc(warehouseRef, updatedData);
  
      // 📌 Obtener la data actualizada
      const updatedWarehouseDoc = await getDoc(warehouseRef);
      const updatedWarehouse = { id: updatedWarehouseDoc.id, ...updatedWarehouseDoc.data() } as Warehouse;
  
      // 📌 Actualizar estado
      setWarehouses(warehouses.map((warehouse) => (warehouse.id === editingWarehouse.id ? updatedWarehouse : warehouse)));

      setIsPopupOpen(false)
      setEditingWarehouse(null)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Updated",
        description: "The warehouse has been successfully updated.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error updating warehouse:', err)
      setError('Failed to update warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to update warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    setLoading(true)
    setError(null)

    try {
      await deleteDoc(doc(db, `companies/${companyId}/warehouses`, warehouse.id))

      if (warehouse.imageUrl) {
        const imageRef = ref(storage, warehouse.imageUrl)
        await deleteObject(imageRef)
      }
      setWarehouses(warehouses.filter(w => w.id !== warehouse.id))
      setIsPopupOpen(false)
      setEditingWarehouse(null)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Deleted",
        description: "The warehouse has been successfully deleted.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error deleting warehouse:', err)
      setError('Failed to delete warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to delete warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditPopup = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    setNewWarehouse({
      name: warehouse.name,
      address: warehouse.address,
      manager: warehouse.manager,
      phone: warehouse.phone,
    })
    setIsPopupOpen(true)
  }

  const handleCardClick = (warehouseId: string) => {
    setActiveWarehouseId(activeWarehouseId === warehouseId ? null : warehouseId)
  }

  const handleParesInventoryClick = (warehouseId: string) => {
    window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`
  }

  const handleShirtInventoryClick = (warehouseId: string) => {
    window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/shirt-inventory`
  }

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Warehouses</h1>
        {hasPermission && hasPermission('delete') && warehouses.length < (warehouseLimit || Infinity) && (
        <Button variant="secondary" onClick={() => setIsPopupOpen(true)}>
          + Add Warehouse
        </Button>
        )}
      </header> 
        {hasPermission && hasPermission("companies") && (
              <div className="flex items-center gap-2 mt-4 ml-4 mb-2 mr-2">
                <label className="text-white bg-teal-700 px-3 py-2 rounded-md">
                  Actual: {warehouseLimit !== null ? warehouseLimit : "No definido"}
                </label>
                <Input
                  type="number"
                  placeholder="Máximo de tiendas"
                  value={inputLimit}
                  onChange={(e) => setInputLimit(e.target.value)}
                  className="w-24"
                />
                <Button onClick={handleSaveLimit}>Guardar Límite</Button>
              </div>
              )}
        <main className="container mx-auto p-4 mb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(2)].map((_, index) => (
              <WarehouseCardSkeleton key={index} />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <p className="text-center mt-8">You dont have any warehouses yet. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((warehouse) => (
              <Card 
                key={warehouse.id} 
                className="overflow-hidden"
                onClick={() => handleCardClick(warehouse.id)}>
                <div className="flex">
                  <div className="w-1/3 relative pb-[33.33%]">
                    <img
                      src={warehouse.imageUrl} 
                      alt={warehouse.name}  
                      className="absolute object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="w-2/3 p-4 relative flex flex-col justify-start items-start gap-1">
                    <div className="absolute top-2 right-2 flex">
                    <DropdownMenu>
                    {activeWarehouseId === warehouse.id && (
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                           )}
                          <DropdownMenuContent className='mr-2'>
                          {hasPermission && hasPermission('update') && (
                            <DropdownMenuItem onClick={() => openEditPopup(warehouse)}>
                              <Pencil className="h-4 w-4 mr-2" />Update
                            </DropdownMenuItem>
                          )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                        {hasPermission && hasPermission('delete') && (
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the warehouse
                              <span className="font-semibold"> {warehouse.name} </span>
                              and remove the associated image from storage.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWarehouse(warehouse)} className="bg-red-600 dark:text-gray-200">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <DropdownMenuItem onClick={() => handleParesInventoryClick(warehouse.id)}>
                        Inventory
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShirtInventoryClick(warehouse.id)}>
                        Shirts
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    </div>
                    <h2 className="font-bold mb-2">{warehouse.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-200">{warehouse.address}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-200">Manager: {warehouse.manager}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-200">Phone: {warehouse.phone}</p>
                    
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start overflow-y-auto p-4">
          <div ref={popupRef} className="w-full max-w-md bg-white rounded-lg shadow-xl mt-20 mb-20">
          <Card className="max-h-[80vh] overflow-y-auto">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}</h2>
                <Button variant="ghost" onClick={() => {
                  setIsPopupOpen(false)
                  setEditingWarehouse(null)
                  setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
                  setImageFile(null)
                  if (imagePreview) {
                    URL.revokeObjectURL(imagePreview)
                    setImagePreview(null)
                  }
                }}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <form onSubmit={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse} className="space-y-4">
                <div>
                  <Label htmlFor="name">Warehouse Name</Label>
                  <Input
                    id="name"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newWarehouse.address}
                    onChange={(e) => setNewWarehouse({...newWarehouse, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    value={newWarehouse.manager}
                    onChange={(e) => setNewWarehouse({...newWarehouse, manager: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({...newWarehouse, phone: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">Warehouse Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingWarehouse}
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Warehouse preview"
                        width={100}
                        height={100}
                        className="rounded-md"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : (editingWarehouse ? 'Update Warehouse' : 'Create Warehouse')}
                </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default withPermission(WarehousesPage, ["read","customer"]);