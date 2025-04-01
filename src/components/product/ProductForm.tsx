'use client'

import "../../styles/global.css";
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ref, listAll, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage'
import { addDoc, collection, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore'
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Label } from "../../components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select"
import { Switch } from "../../components/ui/Switch"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card"
import { useToast } from "../../components/ui/UseToast"
import { ProductFormSkeleton } from '../skeletons/ProductFormSkeleton'
import { Skeleton } from '../ui/Skeleton'
import imageCompression from 'browser-image-compression'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/AlertDialog"
import { ArrowLeft, PlusCircle, Edit, Trash, Check } from 'lucide-react'
import { Textarea } from '../ui/TextArea'
import { getApp, getApps, initializeApp } from "firebase/app";
import { withPermission } from "../../components/WithPermission";

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

type Gender = 'Dama' | 'Hombre' | 'Niño';

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface SizeInputs {
  [key: string]: SizeInput
}

interface ProductFormData {
  brand: string
  reference: string
  color: string
  gender: Gender
  sizes: SizeInputs
  total: number
  total2: number
  comments: string
  image: File | null 
  imageUrl: string
  baseprice: string
  saleprice: string
  exhibition: { [store: string]: string }
  barcode: string
}

interface ProductFormComponentProps {
  companyId?: string
  warehouseId?: string
  firebaseConfig: FirebaseConfig;
}

interface CustomBrand {
  id: string
  name: string
}

const ProductFormComponent: React.FC<ProductFormComponentProps> = ({ firebaseConfig, companyId, warehouseId }) => {
  const { toast } = useToast()
  const [isBox, setIsBox] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    sizes: {},
    total: 0,
    total2: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: '',
    saleprice: '',
    exhibition: {},
    barcode:'',
  })
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState('')
  const [dateString, setDateString] = useState('')
  const [boxNumber, setBoxNumber] = useState(1)
  const [, setSizeNumber] = useState(1)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalSizesCount, setTotalSizesCount] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [customBrands, setCustomBrands] = useState<CustomBrand[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [editedBrandName, setEditedBrandName] = useState('')

  if (!getApps().length) {
          initializeApp(firebaseConfig);
        }
        const app = getApp();
        const db = getFirestore(app);
        const storage = getStorage(app);

  useEffect(() => {
    const fetchLastBarcode = async () => {
      const warehousesRef = collection(db, `companies/${companyId}/warehouses`)
      const warehousesSnapshot = await getDocs(warehousesRef)
      
      let lastGlobalBoxNumber = 0

      for (const warehouseDoc of warehousesSnapshot.docs) {
        const productsRef = collection(warehouseDoc.ref, 'products')
        const q = query(productsRef, orderBy('createdAt', 'desc'), limit(1))
        const productSnapshot = await getDocs(q)

        if (!productSnapshot.empty) {
          const lastProduct = productSnapshot.docs[0].data()
          const lastBarcode = lastProduct.barcode || ''
          
          if (lastBarcode) {
            const lastBoxNumber = parseInt(lastBarcode.slice(6, 12))
            lastGlobalBoxNumber = Math.max(lastGlobalBoxNumber, lastBoxNumber)
          }
        }
      }

      // Set the box number to the next available number
      setBoxNumber(lastGlobalBoxNumber + 1)

      updateDateString()
    }

    fetchLastBarcode()
  }, [companyId])

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const fetchCustomBrands = async () => {
      const brandsRef = collection(db, `companies/${companyId}/brands/shoes/items`)
      const brandsSnapshot = await getDocs(brandsRef)
      const brands = brandsSnapshot.docs.map(doc => ({id: doc.id, name: doc.data().name}))
      setCustomBrands(brands)
    }
    fetchCustomBrands()
  }, [companyId])

  const total = useMemo(() => {
    return Object.values(formData.sizes).reduce((sum, size) => sum + size.quantity, 0)
  }, [formData.sizes])

  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const updateDateString = useCallback(() => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    setDateString(`${year}${month}${day}`)
  }, [])

  const incrementBoxNumber = useCallback(() => {
    setBoxNumber(prevNumber => {
      const nextNumber = prevNumber + 1
      return nextNumber > 999999 ? 1 : nextNumber
    })
  }, [])

  const fetchWarehouseDetails = useCallback(async () => {
    if (!companyId || !warehouseId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
    try {
      const warehouseDocRef = doc(db, `companies/${companyId}/warehouses`, warehouseId)
      const warehouseDocSnap = await getDoc(warehouseDocRef)
      if (warehouseDocSnap.exists()) {
        const warehouseData = warehouseDocSnap.data()
        setWarehouseName(warehouseData?.name || 'Unnamed Warehouse')
      } else {
        console.error('Warehouse document does not exist')
        setWarehouseName('Unknown Warehouse')
      }
    } catch (error) {
      console.error('Error fetching warehouse details:', error)
      setWarehouseName('Error Loading Warehouse Name')
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouseDetails()
  }, [fetchWarehouseDetails])

  const generateBarcode = useCallback((productNumber: number) => {
    const boxString = boxNumber.toString().padStart(6, '0')
    const productString = productNumber.toString().padStart(2, '0')
    return `${dateString}${boxString}${productString}`
  }, [dateString, boxNumber])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'baseprice' || name === 'saleprice') {
      const formattedValue = formatNumber(value)
      setFormData((prev) => ({ ...prev, [name]: formattedValue }))
    } else if (name === 'total2') {
      const numericValue = parseInt(value) 
      setFormData((prev) => ({ ...prev, total2: numericValue, total: numericValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSizeChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0

    setFormData((prev) => {
      const newSizes = { ...prev.sizes }
      let newTotalSizesCount = totalSizesCount

      // Remove sizes that are set to 0
      if (quantity === 0) {
        if (newSizes[size]) {
          newTotalSizesCount -= newSizes[size].quantity
          delete newSizes[size]
        }
      } else {
        // Add or update sizes
        if (!newSizes[size]) {
          newSizes[size] = { quantity: 0, barcodes: [] }
        }

        // Adjust the total count
        newTotalSizesCount += quantity - (newSizes[size].quantity || 0)

        // Generate new barcodes
        newSizes[size].barcodes = Array.from({ length: quantity }, (_, index) => {
          const productNumber = newTotalSizesCount - quantity + index + 1
          return generateBarcode(productNumber)
        })

        newSizes[size].quantity = quantity
      }

      setTotalSizesCount(newTotalSizesCount)

      return { ...prev, sizes: newSizes }
    })
  }


  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(file, options)
        setFormData((prev) => ({ ...prev, image: compressedFile }))
        setImageError('')
        
        // Create a preview URL for the compressed image
        const previewUrl = URL.createObjectURL(compressedFile)
        setImagePreview(previewUrl)
      } catch (error) {
        console.error('Error compressing image:', error)
        setImageError('Error compressing image. Please try again.')
      }
    }
  }

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/products`)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
  
    if (!formData.image) {
      setImageError("Please upload an image for the product.");
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Generar un nombre único para la imagen
      const uniqueFileName = await getUniqueFileName(formData.image.name);
      const imagePath = `companies/${companyId}/warehouses/${warehouseId}/products/${uniqueFileName}`;
  
      // Referencia en Firebase Storage
      const storageRef = ref(storage, imagePath);
  
      // Iniciar la subida con reanudación automática
      const uploadTask = uploadBytesResumable(storageRef, formData.image);
  
      // Escuchar el estado de la subida
      await new Promise((resolve, reject) => {
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
            // Obtener la URL de la imagen subida
            const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(imageUrl);
          }
        );
      });
  
      const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
  
      // Crear el objeto con los datos del producto
      const productData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        sizes: isBox
          ? {}
          : Object.fromEntries(Object.entries(formData.sizes).filter(([, sizeData]) => sizeData.quantity > 0)),
        total,
        total2: formData.total2,
        comments: formData.comments,
        imageUrl, // URL de Firebase Storage
        baseprice: parseInt(formData.baseprice.replace(/\./g, "")),
        saleprice: parseInt(formData.saleprice.replace(/\./g, "")),
        exhibition: formData.exhibition,
        createdAt: serverTimestamp(),
        warehouseId,
        barcode: generateBarcode(0),
        isBox,
      };
  
      // Guardar los datos en Firestore
      await addDoc(collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`), productData);
  
      // Actualizar estados y limpiar datos
      incrementBoxNumber();
      setSizeNumber(1);
      updateDateString();
  
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
  
      // Mostrar mensaje de éxito
      toast({
        title: "Product Added",
        description: "The product has been successfully added to the inventory.",
        duration: 500,
        variant: "destructive",
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      });
  
      window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`;
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        duration: 1000,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBrand = async () => {
    if (newBrand && !customBrands.some(brand => brand.name === newBrand)) {
      try {
        const docRef = await addDoc(collection(db, `companies/${companyId}/brands/shoes/items`), { name: newBrand })
        setCustomBrands([...customBrands, { id: docRef.id, name: newBrand }])
        setFormData(prev => ({ ...prev, brand: newBrand }))
        setNewBrand('')
        toast({
          title: "Brand Added",
          description: `${newBrand} has been added to the brands list.`,
          duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error('Error adding brand:', error)
        toast({
          title: "Error",
          description: "Failed to add brand. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }
  }

  const handleEditBrand = async (brandId: string, newName: string) => {
    try {
      await updateDoc(doc(db, `companies/${companyId}/brands/shoes/items`, brandId), { name: newName })
      setCustomBrands(customBrands.map(brand => 
        brand.id === brandId ? { ...brand, name: newName } : brand
      ))
      setEditingBrandId(null)
      setEditedBrandName('')
      toast({
        title: "Brand Updated",
        description: `Brand has been updated to ${newName}.`,
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error('Error updating brand:', error)
      toast({
        title: "Error",
        description: "Failed to update brand. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const handleDeleteBrand = async (brandId: string) => {
    try {
      await deleteDoc(doc(db, `companies/${companyId}/brands/shoes/items`, brandId))
      setCustomBrands(customBrands.filter(brand => brand.id !== brandId))
      toast({
        title: "Brand Deleted",
        description: "The brand has been successfully deleted.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error('Error deleting brand:', error)
      toast({
        title: "Error",
        description: "Failed to delete brand. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const sizeInputs = useMemo(() => {
    switch (formData.gender) {
      case 'Dama':
        return ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40'];
      case 'Hombre':
        return ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45'];
      case 'Niño':
        return ['T-28', 'T-29', 'T-30', 'T-31', 'T-32', 'T-33', 'T-34', 'T-35'];
      default:
        return [];
    }
  }, [formData.gender]);

    if (loading) {
      return (
        <div className="min-h-screen bg-blue-100 dark:bg-gray-600">
          <header className="bg-teal-600 text-white p-4 flex items-center">
            <Skeleton className="h-6 w-6 mr-2" />
            <Skeleton className="h-8 w-48 mr-2 flex-grow" />
            <Skeleton className="h-10 w-32" />
          </header>
          <main className="container mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(1)].map((_, index) => (
                <ProductFormSkeleton key={index} />
              ))}
            </div>
          </main>
        </div>
      )
    }

  return (
    <div className='min-h-screen bg-blue-100 dark:bg-gray-600 pb-16'>
    <header className="bg-teal-600 text-white p-3 flex items-center sticky top-0 z-20">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">New {warehouseName}</h1>
    </header>
    <main className="container mx-auto p-4">
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className='m-2'>
        <CardTitle className="flex items-center justify-between">
          <span>{isBox ? 'Add New Box' : 'Add New Pairs'}</span>
          <div className="flex items-center space-x-2">
            <span>Pairs</span>
            <Switch
              checked={isBox}
              onCheckedChange={setIsBox}
            />
            <span>Box</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className='m-2'>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-grow">
              <Label htmlFor="brand">Brand</Label>
              <Select name="brand" onValueChange={(value: string) => setFormData((prev) => ({ ...prev, brand: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {customBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="mt-6">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Enter
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Add New Brand</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newBrand" className="text-right">
                          Brand Name
                        </Label>
                        <Input
                          id="newBrand"
                          value={newBrand}
                          onChange={(e) => setNewBrand(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setNewBrand('')}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAddBrand}>
                        Add Brand
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="mt-6">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Edit or Delete Brands</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="max-h-[300px] overflow-y-auto">
                      {customBrands.map((brand) => (
                        <div key={brand.id} className="flex items-center justify-between py-2">
                          {editingBrandId === brand.id ? (
                            <Input
                              value={editedBrandName}
                              onChange={(e) => setEditedBrandName(e.target.value)}
                              className="mr-2"
                            />
                          ) : (
                            <span>{brand.name}</span>
                          )}
                          <div  className="flex space-x-2">
                            {editingBrandId === brand.id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBrand(brand.id, editedBrandName)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingBrandId(brand.id)
                                  setEditedBrandName(brand.name)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBrand(brand.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
          </div>
          <div className='lg:grid lg:grid-cols-2 lg:gap-4'>
          <div className="">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" value={formData.reference} onChange={handleInputChange} />
          </div>
          <div className="">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" value={formData.color} onChange={handleInputChange} />
          </div>
          </div>
          <div className='lg:grid lg:grid-cols-2 lg:gap-4'>
          <div>
            <Label htmlFor="comments">Comments</Label>
            <Textarea id="comments" name="comments" value={formData.comments} onChange={handleInputChange} className="w-full min-h-[40px] max-h-60 resize-y overflow-auto"/>
          </div>
          <div className="flex items-center space-x-2 pt-4">
          <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: Gender) => setFormData((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dama">Dama</SelectItem>
                <SelectItem value="Hombre">Hombre</SelectItem>
                <SelectItem value="Niño">Niño</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          {!isBox && (
          <div className="grid grid-cols-3 gap-4">
            {sizeInputs.map((size) => (
              <div key={size}>
                <Label htmlFor={size}>{size}</Label>
                <Input
                  id={size}
                  type="number"
                  value={formData.sizes[size]?.quantity || ''}
                  onChange={(e) => handleSizeChange(size, e.target.value)}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                value={total}
                readOnly
              />
            </div>
          </div>
          )}
          {isBox && (
            <div>
              <Label htmlFor="total2">Total Pairs</Label>
              <Input
                id="total2"
                name="total2"
                type="number"
                value={formData.total2 || ''}
                onChange={handleInputChange}
              />
            </div>
          )}
          <div>
            <Label htmlFor="image">Image</Label>
            <Input 
              id="image" 
              name="image" 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              required
              className='w-1/2'
            />
          </div>
          {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Product preview"
                width={200}
                height={200}
                //objectFit="cover"
                className="rounded-md"
              />
            </div>
          )}
          <div className='flex items-center space-x-4'>
            <div>
              <Label htmlFor="baseprice">Base Price</Label>
              <Input
                id="baseprice"
                name="baseprice"
                type="text"
                value={formData.baseprice}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="saleprice">Sale Price</Label>
              <Input
                id="saleprice"
                name="saleprice"
                type="text"
                value={formData.saleprice}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${isBox ? 'Box' : 'Product'}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </main>
    </div>
  )
}


export default withPermission(ProductFormComponent, ["create"]);