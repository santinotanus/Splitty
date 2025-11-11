import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { updateProfile, onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage, db } from "../config/firebase";
import * as FileSystem from "expo-file-system/legacy";

interface ProfileContextType {
  profileImage: string;
  setProfileImage: (uri: string) => void;
  uploadProfileImage: (uri: string, userId: string) => Promise<void>;
  loadProfileImage: (userId: string) => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const DEFAULT_PROFILE_IMAGE = "https://ui-avatars.com/api/?name=User&background=E6F4F1&color=033E30&size=200";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileImage, setProfileImageState] = useState<string>(DEFAULT_PROFILE_IMAGE);
  const [loading, setLoading] = useState(false);

  // Función para subir imagen a Firebase Storage y guardar URL en Firestore
  const uploadProfileImage = async (uri: string, userId: string) => {
    try {
      setLoading(true);

      // Read image as base64 (React Native compatible)
      let base64: string;
      
      // Si la URI ya viene con base64 (desde ImagePicker con base64: true), usarla directamente
      // Si no, leerla desde el archivo
      if (uri.startsWith('data:')) {
        // Ya es un data URI, extraer el base64
        base64 = uri.split(',')[1];
      } else {
        // Leer desde archivo
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
      }

      // Create reference in Storage
      const storageRef = ref(storage, `profile-images/${userId}.jpg`);

      // Upload image using uploadString with base64 format (avoids ArrayBuffer/Blob issues)
      // Usar 'base64' en lugar de 'data_url' para evitar problemas con Blob
      await uploadString(storageRef, base64, "base64");

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save URL in Firestore
      await setDoc(
        doc(db, "users", userId),
        {
          profileImage: downloadURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // Save also in AsyncStorage as local cache
      await AsyncStorage.setItem(`profileImage_${userId}`, downloadURL);

      // Also update Firebase Auth profile for consistency
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      // Update state (this will trigger re-render in all components using useProfile)
      setProfileImageState(downloadURL);

      console.log("✅ Profile image uploaded successfully:", downloadURL);
    } catch (error) {
      console.error("❌ Error uploading profile image:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar imagen desde Firestore o AsyncStorage
  const loadProfileImage = useCallback(async (userId: string) => {
    try {
      setLoading(true);

      // STEP 1: Try loading from AsyncStorage first (faster, works offline)
      try {
        const cachedImage = await AsyncStorage.getItem(`profileImage_${userId}`);
        if (cachedImage && cachedImage !== DEFAULT_PROFILE_IMAGE) {
          console.log("📦 Loading profile image from cache");
          setProfileImageState(cachedImage);
        }
      } catch (cacheError) {
        console.log("Cache read error (non-critical):", cacheError);
      }

      // STEP 2: Load from Firestore to ensure it's up to date
      // This is done in background, doesn't block UI
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profileImage) {
            console.log("☁️ Loading profile image from Firestore");
            setProfileImageState(data.profileImage);
            // Update cache for next time
            await AsyncStorage.setItem(`profileImage_${userId}`, data.profileImage).catch(() => {
              // Ignore cache write errors
            });
          }
        } else {
          // If no Firestore doc, try Firebase Auth photoURL as fallback
          if (auth.currentUser?.photoURL) {
            console.log("🔐 Loading profile image from Firebase Auth");
            setProfileImageState(auth.currentUser.photoURL);
            await AsyncStorage.setItem(`profileImage_${userId}`, auth.currentUser.photoURL).catch(() => {
              // Ignore cache write errors
            });
          }
        }
      } catch (firestoreError: any) {
        // The app uses long-polling fallback automatically, so these warnings don't affect functionality
        // We already loaded from cache in STEP 1, so the user sees their image immediately
        const errorCode = firestoreError?.code;
        const errorMessage = firestoreError?.message || "";

        // Only log unexpected errors (not connection/WebChannel issues)
        if (
          errorCode !== "unavailable" &&
          errorCode !== "cancelled" &&
          !errorMessage.includes("WebChannel") &&
          !errorMessage.includes("stream") &&
          !errorMessage.includes("transport")
        ) {
          console.log("⚠️ Firestore load warning (non-critical):", errorMessage);
        }

        // Keep cached image if Firestore fails - this is fine, we'll try again next time
      }

      console.log("✅ Profile image loaded successfully");
    } catch (error: any) {
      console.error("❌ Error loading profile image:", error?.message || error);
      // If there's an error, keep default image or cached image (already set in STEP 1)
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load profile image when user is authenticated
  useEffect(() => {
    const loadInitialProfileImage = async () => {
      if (auth.currentUser?.uid) {
        // Load immediately - this will load from cache first, then Firestore
        loadProfileImage(auth.currentUser.uid).catch((error) => {
          console.log("Auto-load profile image failed (non-critical):", error?.message || error);
        });
      }
    };

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        loadInitialProfileImage();
      } else {
        // Reset to default when user logs out
        setProfileImageState(DEFAULT_PROFILE_IMAGE);
      }
    });

    // Load immediately if user is already authenticated
    if (auth.currentUser?.uid) {
      loadInitialProfileImage();
    }

    return unsubscribe;
  }, [loadProfileImage]);

  const setProfileImage = (uri: string) => {
    setProfileImageState(uri);
  };

  return (
    <ProfileContext.Provider
      value={{
        profileImage,
        setProfileImage,
        uploadProfileImage,
        loadProfileImage,
        loading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

