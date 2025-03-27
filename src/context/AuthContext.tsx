"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { auth } from "../lib/firebase/client";
import { getUserData } from "../services/firebase/auth-service"

// Extend FirebaseUser without overriding its properties
type ExtendedUser = FirebaseUser & {
  id?: string
  role?: string
  companyId?: string | null
  name?: string
  isDeveloper?: boolean
  token?: string
  status?: "active" | "deleted"
}

interface AuthContextType {
  user: ExtendedUser | null
  loading: boolean
  setUser: (user: ExtendedUser | null) => void
  isEmailVerified: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  isEmailVerified: false,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 onAuthStateChanged detectó un cambio:", firebaseUser)

      if (!firebaseUser) {
        console.log("❌ No hay usuario autenticado.")
        setUser(null)
        setIsEmailVerified(false)
        setLoading(false)
        return
      }

      try {
        // Get token regardless of email verification status
        const token = await firebaseUser.getIdToken()
        console.log("✅ Token obtenido:", token)

        // Get user data from Firestore or minimal data from Firebase Auth
        const userData = await getUserData(firebaseUser)

        const newUser: ExtendedUser = {
          ...firebaseUser,
          token,
          id: userData?.id,
          role: userData?.role,
          companyId: userData?.companyId,
          name: userData?.name,
          isDeveloper: userData?.isDeveloper,
          status: userData?.status,
        }

        console.log("✅ Usuario final en AuthContext:", newUser)
        setUser(newUser)
        // Ensure we always set a boolean value
        setIsEmailVerified(newUser.emailVerified ?? false)
      } catch (error) {
        console.error("❌ Error obteniendo datos del usuario:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser,
    isEmailVerified,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)