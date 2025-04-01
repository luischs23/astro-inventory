"use client"

import "../../styles/global.css";
import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, limit, getFirestore } from "firebase/firestore"
import { ref, getDownloadURL, deleteObject, listAll, uploadBytesResumable, getStorage } from "firebase/storage"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Switch } from "../../components/ui/Switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select"
import { Card, CardContent } from "../../components/ui/Card"
import { Label } from "../../components/ui/Label"
import Barcode from "react-barcode"
import { PlusIcon, Trash2Icon, RotateCcwIcon, ArrowLeft, PrinterIcon, CopyIcon } from "lucide-react"
import { useToast } from "../../components/ui/UseToast"
import { ProductFormSkeleton } from "../skeletons/ProductFormSkeleton"
import ProductImageUpload from "../ui/ProductImageUpload"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "../ui/AlertDialog"
import { Skeleton } from "../ui/Skeleton"
import { saveAs } from "file-saver"
import { Textarea } from "../ui/TextArea"
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

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Store {
  id: string
  name: string
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  comments: string
  gender: "Dama" | "Hombre" | "Niño"
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
  total2: number
  baseprice: string
  saleprice: string
  exhibition: { [storeId: string]: { size: string; barcode: string } }
  isBox: boolean
  barcode: string
}

interface UpdateProductProps {
  companyId?: string
  productId?: string
  warehouseId?: string
  firebaseConfig: FirebaseConfig;
}

interface BarcodeData {
  barcode: string
  brand: string
  reference: string
  color: string
  size: string
}

const damaSizes = ["T-35", "T-36", "T-37", "T-38", "T-39", "T-40"]
const hombreSizes = ["T-40", "T-41", "T-42", "T-43", "T-44", "T-45"]
const niñoSizes = ["T-28", "T-29", "T-30", "T-31", "T-32", "T-33", "T-34", "T-35"]

function UpdateProduct({ firebaseConfig, companyId, warehouseId, productId }: UpdateProductProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [isBox, setIsBox] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const [newSize, setNewSize] = useState("")
  const [newQuantity, setNewQuantity] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState("")
  const [exhibitionBarcode, setExhibitionBarcode] = useState("")
  const { toast } = useToast()
  const [, setLastBarcode] = useState("")
  const [, setBoxNumber] = useState(0)
  const [, setProductNumber] = useState(0)
  const [, setLastProductNumber] = useState(0)
  const [productBoxNumber, setProductBoxNumber] = useState(0)
  const [lastUsedProductNumbers, setLastUsedProductNumbers] = useState<{ [key: string]: number }>({})
  const [updateEnabled, setUpdateEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [customBrands, setCustomBrands] = useState<{ id: string; name: string }[]>([])

  if (!getApps().length) {
              initializeApp(firebaseConfig);
            }
            const app = getApp();
            const db = getFirestore(app);
            const storage = getStorage(app);

  const formatNumber = useCallback((value: string): string => {
    const number = value.replace(/[^\d]/g, "")
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }, [])

  const parseFormattedNumber = (value: string): number => {
    return Number.parseInt(value.replace(/\./g, ""), 10)
  }

  useEffect(() => {
    const fetchProduct = async () => {
        if (!companyId || !warehouseId || !productId) {
            console.error('companyId or storeId is undefined');
            setLoading(false);
            return;
          }
      try {
        const productDoc = await getDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productId))
        if (productDoc.exists()) {
          const productData = productDoc.data() as Omit<Product, "id">
          setProduct({
            id: productDoc.id,
            ...productData,
            sizes: productData.sizes || {},
            exhibition: productData.exhibition || {},
            baseprice: formatNumber(productData.baseprice.toString()),
            saleprice: formatNumber(productData.saleprice.toString()),
          })
          setIsBox(productData.isBox)

          // Initialize lastUsedProductNumbers
          const lastUsedNumbers: { [key: string]: number } = {}
          Object.values(productData.sizes).forEach((size) => {
            size.barcodes.forEach((barcode) => {
              const boxNumber = barcode.slice(6, 12)
              const productNumber = Number.parseInt(barcode.slice(12))
              lastUsedNumbers[boxNumber] = Math.max(lastUsedNumbers[boxNumber] || 0, productNumber)
            })
          })
          setLastUsedProductNumbers(lastUsedNumbers)

          // Find the last product number for this specific product
          const lastBarcode = Object.values(productData.sizes)
            .flatMap((size) => size.barcodes)
            .sort((a, b) => b.localeCompare(a))[0]

          if (lastBarcode) {
            setProductBoxNumber(Number.parseInt(lastBarcode.slice(6, 12)))
            setLastProductNumber(Number.parseInt(lastBarcode.slice(12)))
          }
        } else {
          console.error("Product not found")
        }
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchStores = async () => {
      const storesSnapshot = await getDocs(collection(db, `companies/${companyId}/stores`))
      const storesList = storesSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
      setStores(storesList)
    }

    const fetchLastBarcode = async () => {
      try {
        const productsRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`)
        const q = query(productsRef, orderBy("createdAt", "desc"), limit(1))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const lastProduct = querySnapshot.docs[0].data()
          const sizes = lastProduct.sizes as Record<string, { barcodes: string[] }>
          const lastBarcode = Object.values(sizes)
            .flatMap((size) => size.barcodes)
            .sort()
            .pop()

          if (lastBarcode) {
            setLastBarcode(lastBarcode)
            const boxNum = Number.parseInt(lastBarcode.slice(6, 12))
            const prodNum = Number.parseInt(lastBarcode.slice(12))
            setBoxNumber(boxNum)
            setProductNumber(prodNum)
          }
        }
      } catch (error) {
        console.error("Error fetching last barcode:", error)
      }
    }

    fetchProduct()
    fetchStores()
    fetchLastBarcode()
  }, [companyId, warehouseId, productId, formatNumber])

  useEffect(() => {
    const fetchCustomBrands = async () => {
      const brandsRef = collection(db, `companies/${companyId}/brands`)
      const brandsSnapshot = await getDocs(brandsRef)
      const brands = brandsSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
      setCustomBrands(brands)
    }
    fetchCustomBrands()
  }, [companyId])

  // Update the handleCopyBarcode function
  const handleCopyBarcode = (e: React.MouseEvent, barcode: string) => {
    e.preventDefault() // Prevent form submission
    navigator.clipboard
      .writeText(barcode)
      .then(() => {
        toast({
          title: "Barcode Copied",
          description: "The barcode has been copied to clipboard.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Error",
          description: "Failed to copy barcode. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      })
  }

  // Update the handlePrintBarcode function with this updated version
  const handlePrintBarcode = useCallback(
    async (barcode: string, brand: string, reference: string, color: string, size: string) => {
      try {
        const labelData = [{ barcode, brand, reference, color, size }]

        const response = await fetch("/api/generate-label-excel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ barcodes: labelData }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate Excel file")
        }

        const blob = await response.blob()
        saveAs(blob, `barcodes_${barcode}.csv`)

        toast({
          title: "Excel Generated",
          description: "The barcode data has been saved in an Excel file.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error("Error generating Excel:", error)
        toast({
          title: "Error",
          description: "Failed to generate Excel. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  // Update the handlePrintBox function
  const handlePrintBox = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault() // Prevent form submission
      if (product && isBox) {
        const boxData = [
          {
            barcode: product.barcode,
            brand: product.brand,
            reference: product.reference,
            color: product.color,
            total: product.total2,
          },
        ]

        try {
          const response = await fetch("/api/generate-label-excel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ barcodes: boxData }),
          })

          if (!response.ok) {
            throw new Error("Failed to generate CSV file")
          }

          const blob = await response.blob()
          saveAs(blob, `box_${product.barcode}.csv`)

          toast({
            title: "CSV Generated",
            description: "The box data has been saved in a CSV file.",
            duration: 1000,
            style: {
              background: "#4CAF50",
              color: "white",
              fontWeight: "bold",
            },
          })
        } catch (error) {
          console.error("Error generating CSV:", error)
          toast({
            title: "Error",
            description: "Failed to generate CSV. Please try again.",
            duration: 1000,
            variant: "destructive",
          })
        }
      }
    },
    [product, isBox, toast],
  )

  const handlePrintMultipleBarcodes = useCallback(
    async (barcodeData: BarcodeData[]) => {
      try {
        const response = await fetch("/api/generate-label-excel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ barcodes: barcodeData }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate CSV file")
        }

        const blob = await response.blob()
        saveAs(blob, `barcodes_${product?.barcode}.csv`)

        toast({
          title: "CSV Generated",
          description: "The barcode data has been saved in a CSV file.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error("Error generating CSV:", error)
        toast({
          title: "Error",
          description: "Failed to generate CSV. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      }
    },
    [toast, product?.barcode],
  )

  const handlePrintAllBarcodes = useCallback(
    async (size: string) => {
      if (product) {
        const { brand, reference, color } = product
        const sizeWithoutPrefix = size.replace("T-", "")
        const barcodes = product.sizes[size].barcodes

        // Construimos un array con toda la información
        const barcodeData = barcodes.map((barcode) => ({
          barcode,
          brand,
          reference,
          color,
          size: sizeWithoutPrefix,
        }))

        await handlePrintMultipleBarcodes(barcodeData)

        toast({
          title: "All Barcodes Printed",
          description: `All barcodes for size ${size} have been sent to the printer.`,
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      }
    },
    [product, handlePrintMultipleBarcodes, toast],
  )

  const handlePrintAllSizes = useCallback(async () => {
    if (product) {
      const { brand, reference, color } = product
      const barcodeData: BarcodeData[] = []

      // Recorremos todas las tallas y barcodes
      for (const [size, sizeData] of Object.entries(product.sizes)) {
        const sizeWithoutPrefix = size.replace("T-", "")
        sizeData.barcodes.forEach((barcode) => {
          barcodeData.push({
            barcode,
            brand,
            reference,
            color,
            size: sizeWithoutPrefix,
          })
        })
      }

      await handlePrintMultipleBarcodes(barcodeData)

      toast({
        title: "All Sizes Printed",
        description: "All barcodes for all sizes have been sent to the printer.",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    }
  }, [product, handlePrintMultipleBarcodes, toast])

  const availableSizes = useMemo(() => {
    if (!product) return []
    switch (product.gender) {
      case "Dama":
        return damaSizes.filter((size) => !product.sizes[size] || product.sizes[size].barcodes.length === 0)
      case "Hombre":
        return hombreSizes.filter((size) => !product.sizes[size] || product.sizes[size].barcodes.length === 0)
      case "Niño":
        return niñoSizes.filter((size) => !product.sizes[size] || product.sizes[size].barcodes.length === 0)
      default:
        return []
    }
  }, [product])

  const sortedSizes = useMemo(() => {
    if (!product) return []
    return Object.entries(product.sizes)
      .filter(([, sizeData]) => sizeData.barcodes.length > 0)
      .sort(([a], [b]) => {
        const aNum = Number.parseInt(a.split("-")[1])
        const bNum = Number.parseInt(b.split("-")[1])
        return aNum - bNum
      })
      .map(([size]) => size)
  }, [product])

  const availableStores = useMemo(() => {
    if (!product) return []
    return stores.filter((store) => !product.exhibition[store.id])
  }, [product, stores])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
  
    if (name === "baseprice" || name === "saleprice") {
      const formattedValue = formatNumber(value);
      setProduct((prev) => (prev ? { ...prev, [name]: formattedValue } : null));
    } else {
      setProduct((prev) => (prev ? { ...prev, [name]: value } : null));
    }
  
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.style.height = "40px"; // Reinicia la altura
      e.target.style.height = `${e.target.scrollHeight}px`; // Ajusta la altura al contenido
    }
  };  

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/products`)
    const fileList = await listAll(storageRef)
    const existingFiles = fileList.items.map((item) => item.name)

    let uniqueName = originalName
    let counter = 1

    while (existingFiles.includes(uniqueName)) {
      const nameParts = originalName.split(".")
      const extension = nameParts.pop()
      const baseName = nameParts.join(".")
      uniqueName = `${baseName}${counter}.${extension}`
      counter++
    }

    return uniqueName
  }

  const handleImageChange = async (file: File | null, previewUrl: string | null): Promise<void> => {
    if (file) {
      setNewImageFile(file)
      setPreviewImageUrl(previewUrl)
    } else {
      setNewImageFile(null)
      setPreviewImageUrl(null)
    }
  }

  const generateBarcode = useCallback(() => {
    const date = new Date()
    const dateString = date.toISOString().slice(2, 10).replace(/-/g, "")
    const boxString = productBoxNumber.toString().padStart(6, "0")
    const lastUsedNumber = lastUsedProductNumbers[boxString] || 0
    const newProductNumber = (lastUsedNumber % 99) + 1
    const productString = newProductNumber.toString().padStart(2, "0")

    setLastUsedProductNumbers((prev) => ({
      ...prev,
      [boxString]: newProductNumber,
    }))
    return `${dateString}${boxString}${productString}`
  }, [productBoxNumber, lastUsedProductNumbers])

  const handleAddSize = async () => {
    if (newSize && newQuantity > 0 && product) {
      const newBarcodes: string[] = []
      const lastUsedBarcode =
        Object.values(product.sizes)
          .flatMap((size) => size.barcodes)
          .sort((a, b) => b.localeCompare(a))[0] || product.barcode
      let currentBoxNumber = Number.parseInt(lastUsedBarcode.slice(6, 12))
      let currentProductNumber = Number.parseInt(lastUsedBarcode.slice(12))

      for (let i = 0; i < newQuantity; i++) {
        currentProductNumber++
        if (currentProductNumber > 99) {
          currentBoxNumber++
          currentProductNumber = 1
        }
        const date = new Date()
        const dateString = date.toISOString().slice(2, 10).replace(/-/g, "")
        const boxString = currentBoxNumber.toString().padStart(6, "0")
        const productString = currentProductNumber.toString().padStart(2, "0")
        newBarcodes.push(`${dateString}${boxString}${productString}`)
      }

      const updatedProduct = {
        ...product,
        sizes: {
          ...product.sizes,
          [newSize]: { quantity: newQuantity, barcodes: newBarcodes },
        },
        total: product.total + newQuantity,
      }

      try {
        await updateDoc(
          doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id),
          updatedProduct,
        )
        setProduct(updatedProduct)
        setProductBoxNumber(currentBoxNumber)
        setLastProductNumber(currentProductNumber)
        setNewSize("")
        setNewQuantity(0)

        toast({
          title: "Size Added",
          description: `Size ${newSize} has been added to the inventory.`,
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error("Error adding size:", error)
        toast({
          title: "Error",
          description: "Failed to add size. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      }
    }
  }

  const handleDeleteBarcode = (size: string, barcodeToDelete: string) => {
    if (product) {
      setProduct((prev) => {
        if (!prev) return null
        const updatedBarcodes = prev.sizes[size].barcodes.filter((barcode) => barcode !== barcodeToDelete)
        const updatedSizes = { ...prev.sizes }
        if (updatedBarcodes.length === 0) {
          delete updatedSizes[size]
        } else {
          updatedSizes[size] = {
            ...updatedSizes[size],
            quantity: updatedBarcodes.length,
            barcodes: updatedBarcodes,
          }
        }
        return {
          ...prev,
          sizes: updatedSizes,
          total: Object.values(updatedSizes).reduce((sum, size) => sum + size.quantity, 0),
        }
      })
    }
  }

  const handleAddBarcode = (size: string) => {
    if (product) {
      const newBarcode = generateBarcode()
      setProduct((prev) => {
        if (!prev) return null
        const updatedSizes = { ...prev.sizes }
        updatedSizes[size] = {
          ...updatedSizes[size],
          quantity: updatedSizes[size].quantity + 1,
          barcodes: [...updatedSizes[size].barcodes, newBarcode],
        }
        return {
          ...prev,
          sizes: updatedSizes,
          total: prev.total + 1,
        }
      })
    }
  }

  const handleAddExhibition = async () => {
    if (product && selectedStore && exhibitionBarcode) {
      const size = Object.entries(product.sizes).find(([, sizeData]) =>
        sizeData.barcodes.includes(exhibitionBarcode),
      )?.[0]

      if (size) {
        const updatedSizes = { ...product.sizes }
        updatedSizes[size] = {
          ...updatedSizes[size],
          quantity: updatedSizes[size].quantity - 1,
          barcodes: updatedSizes[size].barcodes.filter((b) => b !== exhibitionBarcode),
        }

        const updatedProduct = {
          ...product,
          sizes: updatedSizes,
          total: product.total - 1,
          exhibition: {
            ...product.exhibition,
            [selectedStore]: { size, barcode: exhibitionBarcode },
          },
        }

        try {
          // Update the product in the warehouses/products subcollection
          await updateDoc(
            doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id),
            updatedProduct,
          )

          setProduct(updatedProduct)
          setSelectedStore("")
          setExhibitionBarcode("")

          toast({
            title: "Added to Exhibition",
            description: `Product added to exhibition in ${stores.find((s) => s.id === selectedStore)?.name}.`,
            duration: 1000,
            style: {
              background: "#2196F3",
              color: "white",
              fontWeight: "bold",
            },
          })
        } catch (error) {
          console.error("Error adding to exhibition:", error)
          toast({
            title: "Error",
            description: "Failed to add product to exhibition. Please try again.",
            duration: 1000,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Invalid Barcode",
          description: "The entered barcode does not match any product size.",
          duration: 1000,
          variant: "destructive",
        })
      }
    }
  }

  const handleReturnFromExhibition = async (storeId: string) => {
    if (product) {
      const exhibitionItem = product.exhibition[storeId]
      if (exhibitionItem) {
        const { size, barcode } = exhibitionItem

        const updatedProduct = {
          ...product,
          sizes: {
            ...product.sizes,
            [size]: {
              quantity: (product.sizes[size]?.quantity || 0) + 1,
              barcodes: [...(product.sizes[size]?.barcodes || []), barcode],
            },
          },
          total: product.total + 1,
          exhibition: Object.fromEntries(Object.entries(product.exhibition).filter(([key]) => key !== storeId)),
        }

        // Update local state
        setProduct(updatedProduct)

        toast({
          title: "Returned from Exhibition",
          description: "Product has been returned from exhibition. Remember to save changes.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || isSubmitting) return;
  
    setIsSubmitting(true);
    try {
      const updatedSizes = Object.fromEntries(
        Object.entries(product.sizes).filter(([, sizeData]) => sizeData.quantity > 0)
      );
  
      const updatedProduct = {
        ...product,
        sizes: updatedSizes,
        total: Object.values(updatedSizes).reduce((sum, size) => sum + size.quantity, 0),
        baseprice: parseFormattedNumber(product.baseprice),
        saleprice: parseFormattedNumber(product.saleprice),
        isBox: isBox && product.total !== product.total2,
      };
  
      // 📌 Si hay una nueva imagen, subimos la imagen con `uploadBytesResumable`
      if (newImageFile) {
        setImageLoading(true);
        try {
          // Eliminar la imagen anterior si existe
          if (product.imageUrl) {
            try {
              const decodedUrl = decodeURIComponent(product.imageUrl);
              const oldImagePath = decodedUrl.split("/o/")[1].split("?")[0];
              const oldImageRef = ref(storage, oldImagePath);
              await deleteObject(oldImageRef);
            } catch (deleteError) {
              console.debug("Previous image not found or already deleted");
            }
          }
  
          // Generar un nombre único para la imagen nueva
          const uniqueFileName = await getUniqueFileName(newImageFile.name);
          const imagePath = `companies/${companyId}/warehouses/${warehouseId}/products/${uniqueFileName}`;
  
          // Crear referencia de almacenamiento
          const storageRef = ref(storage, imagePath);
  
          // Subir la imagen con reanudación automática
          const uploadTask = uploadBytesResumable(storageRef, newImageFile);
  
          // Monitorear la subida y obtener la URL al finalizar
          const imageUrl: string = await new Promise<string>((resolve, reject) => {
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
  
          // Guardamos la nueva URL en el objeto `updatedProduct`
          updatedProduct.imageUrl = imageUrl;
        } catch (error) {
          console.error("Error al subir nueva imagen:", error);
        } finally {
          setImageLoading(false);
        }
      }
  
      // 📌 Guardamos los cambios en Firestore
      await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id), updatedProduct);
  
      // Actualizar estado del producto con los precios formateados
      setProduct({
        ...updatedProduct,
        baseprice: formatNumber(updatedProduct.baseprice.toString()),
        saleprice: formatNumber(updatedProduct.saleprice.toString()),
      });
  
      setNewImageFile(null);
      setPreviewImageUrl(null);
  
      toast({
        title: "Product Updated",
        description: "The product has been successfully updated.",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      });
  
      window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`;
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        duration: 1000,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the onClick handlers for the copy and print buttons

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

  if (!product) {
    return <div>Product not found</div>
  }

  const isUpdateEnabled = !updateEnabled || (updateEnabled && product.total === product.total2)

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-600 pb-16">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Update {isBox ? "Box" : "Product"}</h1>
        {isBox && (
          <div className="flex items-center space-x-2">
            <Switch checked={updateEnabled} onCheckedChange={setUpdateEnabled} id="update-enabled" />
            <Label htmlFor="update-enabled">{updateEnabled ? "Update Enabled" : "Update Disabled"}</Label>
          </div>
        )}
      </header>
      <main className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="m-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Select
                    name="brand"
                    value={product.brand}
                    onValueChange={(value) => setProduct((prev) => (prev ? { ...prev, brand: value } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {customBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.name}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference">Reference</Label>
                  <Input id="reference" name="reference" value={product.reference} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" value={product.color} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea id="comments" name="comments" value={product.comments} onChange={handleInputChange} className="w-full min-h-[40px] max-h-60 resize-y overflow-auto"/>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <Label htmlFor="barcode">Barcode</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="barcode" name="barcode" value={product.barcode} disabled className="flex-grow" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => handleCopyBarcode(e, product.barcode)}
                        className="flex-shrink-0"
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      {isBox && (
                        <div>
                          <Button onClick={(e) => handlePrintBox(e)}>Print Box</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              {updateEnabled && (
                <div>
                  <Label>Sizes</Label>
                  <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortedSizes.map((size) => (
                      <div key={size}>
                        <Label htmlFor={size}>{size}</Label>
                        <Input id={size} type="number" value={product.sizes[size].quantity} readOnly />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="mt-2 w-full">
                              Barcodes
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {product.brand} {product.reference} Size {size}
                              </AlertDialogTitle>
                              <AlertDialogDescription></AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid grid-cols-1">
                              {product.sizes[size].barcodes.map((barcode, index) => (
                                <div key={index} className="flex border rounded items-center justify-center space-x-2">
                                  <p className="mb-2">{size}</p>
                                  <div className="flex flex-col items-center justify-center">
                                    <Barcode value={barcode} width={1} height={30} fontSize={12} />
                                  </div>
                                  <div className="space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleCopyBarcode(e, barcode)
                                      }}
                                    >
                                      <CopyIcon className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handlePrintBarcode(
                                          barcode,
                                          product.brand,
                                          product.reference,
                                          product.color,
                                          size.replace("T-", ""),
                                        )
                                      }}
                                    >
                                      <PrinterIcon className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteBarcode(size, barcode)}
                                    >
                                      <Trash2Icon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-center space-x-2">
                              <Button onClick={() => handleAddBarcode(size)}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Add Barcode
                              </Button>
                              <Button onClick={() => handlePrintAllBarcodes(size)}>
                                <PrinterIcon className="w-4 h-4 mr-2" /> Print All
                              </Button>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {updateEnabled && (
                <div className="flex flex-wrap gap-2">
                  <Select value={newSize} onValueChange={setNewSize}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select new size" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder=""
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number.parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Button type="button" onClick={handleAddSize}>
                    Add Size
                  </Button>
                </div>
              )}
              {updateEnabled && (
                <div className="flex flex-wrap space-x-2">
                  <div >
                    <Label htmlFor="total">Total</Label>
                    <Input id="total" name="total" value={product.total} readOnly/>
                  </div>
                  {isBox && (
                    <div>
                      <Label htmlFor="total2">Total Init</Label>
                      <Input id="total2" name="total" value={product.total2} readOnly />
                    </div>
                  )}
                  <Button type="button" onClick={handlePrintAllSizes} className="mt-6">
                    <PrinterIcon className="w-4 h-4 mr-2" /> Print All Sizes
                  </Button>
                </div>
              )}
              {/* Exhibition */}
              {updateEnabled && (
                <div>
                  <Label>Exhibition</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Barcode"
                      value={exhibitionBarcode}
                      onChange={(e) => setExhibitionBarcode(e.target.value)}
                      className="w-36"
                    />
                    <Button type="button" onClick={handleAddExhibition}>
                      Add to Exh
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {product &&
                      product.exhibition &&
                      Object.entries(product.exhibition).map(([storeId, exhibitionData]) => {
                        const storeName = stores.find((s) => s.id === storeId)?.name || storeId
                        return (
                          <div
                            key={storeId}
                            className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded"
                          >
                            <span>
                              {storeName}: {exhibitionData.size} - Bc: {exhibitionData.barcode}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => handleReturnFromExhibition(storeId)}>
                              <RotateCcwIcon className="w-4 h-4 mr-2" />
                              Return
                            </Button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
              {/* Image and Pricing */}
              <div className="grid grid-cols-1 gap-4">
                <ProductImageUpload
                  imageUrl={previewImageUrl || product?.imageUrl || "/placeholder.svg"}
                  altText={`${product?.brand} ${product?.reference}`}
                  onImageChange={handleImageChange}
                  isLoading={imageLoading}
                />
                <div className="flex space-x-4">
                  <div>
                    <Label htmlFor="baseprice">Base Price</Label>
                    <Input
                      id="baseprice"
                      name="baseprice"
                      type="text"
                      value={product.baseprice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleprice">Sale Price</Label>
                    <Input
                      id="saleprice"
                      name="saleprice"
                      type="text"
                      value={product.saleprice}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={(isBox && !isUpdateEnabled) || isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
export default withPermission(UpdateProduct, ["create"]);