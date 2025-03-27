'use client'

import "../styles/global.css";
import React, { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Card, CardContent } from './ui/Card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/DropdownMenu"
import { ArrowLeft, MoreVertical, X, Pencil, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,} from "./ui/AlertDialog"
import { getApp, getApps, initializeApp } from "firebase/app";

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  imageUrl: string
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface CompanyManagementProps {
  firebaseConfig: FirebaseConfig;
}

function CompanyManagement({ firebaseConfig }: CompanyManagementProps) {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const app = getApp();
  const db = getFirestore(app);
  const storage = getStorage(app);

  const [companies, setCompanies] = useState<Company[]>([])
  const [newCompany, setNewCompany] = useState<Omit<Company, 'id' | 'imageUrl'>>({
    name: '',
    email: '',
    phone: '',
    address: '',
  })
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null)

  const handleCardClick = (companyId: string) => {
    window.location.href = `/companies/${companyId}/home`;
  }
    
  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'companies'))
      const fetchedCompanies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company))
      setCompanies(fetchedCompanies)
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError('Failed to fetch companies. Please try again later.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (editingCompany) {
      setEditingCompany({ ...editingCompany, [name]: value })
    } else {
      setNewCompany({ ...newCompany, [name]: value })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    const storageRef = ref(storage, `company-images/${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let imageUrl = ''
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      if (editingCompany) {
        const updatedCompany = { ...editingCompany, ...(imageUrl && { imageUrl }) }
        await updateDoc(doc(db, 'companies', editingCompany.id), updatedCompany)
        setEditingCompany(null)
      } else {
        const newCompanyData = { ...newCompany, imageUrl, createdAt: new Date() }
        await addDoc(collection(db, 'companies'), newCompanyData)
        setNewCompany({ name: '', email: '', phone: '', address: '' })
      }
      setIsPopupOpen(false)
      setImageFile(null)
      fetchCompanies()
    } catch (err) {
      console.error('Error saving company:', err)
      setError('Failed to save company. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsPopupOpen(true)
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteDoc(doc(db, 'companies', id))
      fetchCompanies()
      setDeleteConfirmOpen(false)
      setCompanyToDelete(null)
    } catch (err) {
      console.error('Error deleting company:', err)
      setError('Failed to delete company. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-blue-100 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Companies</h1>
        <div className='space-x-2'>
        
        <Button variant="secondary" onClick={() => {
          setEditingCompany(null)
          setNewCompany({ name: '', email: '', phone: '', address: '' })
          setIsPopupOpen(true)
        }}>
          + Add 
        </Button>
       
         </div>
      </header>

    <main className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Card 
            key={company.id} 
            className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => handleCardClick(company.id)}
          >
            <div className="flex">
              <div className="w-1/3">
                <img
                  src={company.imageUrl || '/placeholder.svg'} 
                  alt={company.name} 
                  width={100} 
                  height={100} 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="w-2/3 p-4 relative">
                <div className="absolute top-2 right-2 flex" onClick={(e) => e.stopPropagation()}>
                
                  <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0 mr-1" 
                    onClick={() => handleEdit(company)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0 mr-1" 
                    onClick={() => {
                      setCompanyToDelete(company.id)
                      setDeleteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
               
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button> 
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => window.location.href =`/companies/${company.id}/home`}>
                        Home
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href =`/companies/${company.id}/store`}>
                        Stores
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href =`/companies/${company.id}/warehouses`}>
                        Warehouses
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h2 className="font-bold mb-2">{company.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{company.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Phone: {company.phone}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{company.address}</p>
              </CardContent>
            </div>
          </Card> 
        ))}
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end items-start p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingCompany ? 'Edit Company' : 'Create New Company'}</h2>
                <Button variant="ghost" onClick={() => setIsPopupOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editingCompany ? editingCompany.name : newCompany.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={editingCompany ? editingCompany.email : newCompany.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={editingCompany ? editingCompany.phone : newCompany.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={editingCompany ? editingCompany.address : newCompany.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">Company Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingCompany}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : (editingCompany ? 'Update Company' : 'Create Company')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to delete the company? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => companyToDelete && handleDelete(companyToDelete)}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CompanyManagement;