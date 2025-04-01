import React, { useState, useRef } from 'react'
import { Label } from "../../components/ui/Label"
import { Button } from "../../components/ui/Button"
import { Camera } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface ProductImageUploadProps {
  imageUrl: string
  altText: string
  onImageChange: (file: File | null, previewUrl: string | null) => Promise<void>
  isLoading: boolean
}

export default function ProductImageUpload({ imageUrl, altText, onImageChange, isLoading }: ProductImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(file, options)
        const objectUrl = URL.createObjectURL(compressedFile)
        setPreviewUrl(objectUrl)
        await onImageChange(compressedFile, objectUrl)
      } catch (error) {
        console.error('Error compressing image:', error)
        // Handle error (e.g., show a toast notification)
      }
    }
  }

  const handleChangeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="productImage">Product Image</Label>
      <div className="relative w-40 h-40 group">
        <img
          src={previewUrl || imageUrl}
          alt={altText}
          //fill
          sizes="(max-width: 160px) 100vw, 160px"
          className="object-cover rounded-md"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            onClick={handleChangeClick}
            variant="secondary"
            size="sm"
            className="text-gray-600 bg-opacity-70 hover:bg-opacity-100"
            type="button"
            disabled={isLoading}
          >
            <Camera className="w-4 h-4 mr-2 text-gray-600" />
            {isLoading ? 'Uploading...' : 'Change'}
          </Button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        id="productImage"
        name="productImage"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        disabled={isLoading}
      />
      {previewUrl && !isLoading && (
        <p className="text-sm text-green-600">New image selected.</p>
      )}
    </div>
  )
}