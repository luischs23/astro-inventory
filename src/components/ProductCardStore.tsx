import React from 'react'
import { Card, CardContent } from "../components/ui/Card"
import { Timestamp } from 'firebase/firestore'

interface ProductWithBarcode {
  id: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  imageUrl: string
  addedAt?: Timestamp | Date
  isBox?: boolean
  total2: number
}

interface ProductCardProps {
  product: ProductWithBarcode
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const formatDate = (date: Timestamp | Date | undefined) => {
    if (!date) return null 
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString()
    }
    if (date instanceof Date) {
      return date.toLocaleString()
    }
    return 'Invalid Date'
  }

  const formattedDate = formatDate(product.addedAt)
 
  return (
    <Card className="w-full">
      <CardContent className="p-2 flex items-center justify-between w-full">
        <div className="flex-1 text-left">
          <h3 className="font-semibold">{product.brand} - {product.reference}</h3>
          <p>Color: {product.color}</p>
          <p>{product.isBox ? 'Box' : 'Size'}: {product.isBox ? product.total2 : product.size}</p>
          <p>Barcode: {product.barcode}</p>
          {formattedDate && <p className='text-sm text-gray-500 dark:text-gray-300'>Added: {formattedDate}</p>}
        </div>
        <div className="w-24 h-24 relative shrink-0 ml-auto overflow-hidden">
          <img
            src={product.imageUrl}
            alt={`${product.brand} ${product.reference}`}
            className="w-full h-full object-cover rounded-md"
          />
        </div>
      </CardContent>
    </Card>
  )  
}

export default ProductCard