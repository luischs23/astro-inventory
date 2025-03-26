import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, type User } from "firebase/auth"
import { auth, db } from "./firebase.config"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

interface UserData {
  id: string
  role: string
  name: string
  email: string
  companyId: string | null
  isDeveloper: boolean
  status: "active" | "deleted"
  emailVerified: boolean
}

// Create a new user in Firebase Auth and send verification email
export const createAuthUser = async (email: string, password: string, displayName: string) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update profile with display name
    await updateProfile(user, { displayName })

    // Send verification email
    await sendEmailVerification(user)

    return user
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

// Function to check if a user exists in any collection
export const findUserByEmail = async (email: string) => {
  try {
    // Check in root users collection (developers)
    const rootUsersQuery = query(collection(db, "users"), where("email", "==", email))
    const rootUsersSnapshot = await getDocs(rootUsersQuery)

    if (!rootUsersSnapshot.empty) {
      const userData = rootUsersSnapshot.docs[0].data()
      return {
        ...userData,
        id: rootUsersSnapshot.docs[0].id,
        isDeveloper: true,
        companyId: null,
      }
    }

    // Check in company users collections
    const companiesRef = collection(db, "companies")
    const companiesSnapshot = await getDocs(companiesRef)

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id
      const usersRef = collection(db, `companies/${companyId}/users`)
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data()
        return {
          ...userData,
          id: querySnapshot.docs[0].id,
          isDeveloper: false,
          companyId,
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error finding user:", error)
    throw error
  }
}

// Function to resend verification email
export const resendVerificationEmail = async (user: User) => {
  try {
    await sendEmailVerification(user)
    return true
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw error
  }
}

// Function to get user data from Firestore based on Firebase Auth user
export const getUserData = async (firebaseUser: User): Promise<UserData> => {
  try {
    // First check if user is a developer
    const developerUserRef = doc(db, "users", firebaseUser.uid)
    const developerUserSnap = await getDoc(developerUserRef)

    if (developerUserSnap.exists()) {
      const data = developerUserSnap.data()
      return {
        id: firebaseUser.uid,
        role: "developer",
        name: data.firstName + " " + data.lastName,
        email: firebaseUser.email || "",
        companyId: null,
        isDeveloper: true,
        status: "active",
        emailVerified: firebaseUser.emailVerified,
      }
    }

    // If not a developer, check company collections
    const companiesRef = collection(db, "companies")
    const companiesSnapshot = await getDocs(companiesRef)

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id
      const userDocRef = doc(db, `companies/${companyId}/users`, firebaseUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data()
        return {
          id: firebaseUser.uid,
          role: data.role,
          name: data.name + " " + (data.surname || ""),
          email: firebaseUser.email || "",
          companyId,
          isDeveloper: false,
          status: data.status || "active",
          emailVerified: firebaseUser.emailVerified,
        }
      }
    }

    // If no data found in Firestore, return minimal user data from Firebase Auth
    console.warn(`No user data found in Firestore for uid: ${firebaseUser.uid}`)
    return {
      id: firebaseUser.uid,
      role: "unknown",
      name: firebaseUser.displayName || "",
      email: firebaseUser.email || "",
      companyId: null,
      isDeveloper: false,
      status: "active",
      emailVerified: firebaseUser.emailVerified,
    }
  } catch (error) {
    console.error("Error getting user data:", error)
    throw error
  }
}