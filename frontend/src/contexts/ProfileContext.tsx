import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { updateProfile, onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage, db } from "../config/firebase";
import * as FileSystem from "expo-file-system/legacy";
import Constants from 'expo-constants';
import { uploadImageToCloudinaryUnsigned, getCurrentUser, updateUser } from "../api/client";

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

      // Server-side base64 upload (same as DebtDetail) — simpler and reliable
      try {
        let base64: string;
        if (uri.startsWith('data:')) {
          base64 = uri.split(',')[1];
        } else {
          base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        }

        console.log('📤 uploadProfileImage -> sending base64 to backend, length:', (base64 || '').length);
        await updateUser({ foto_data: base64 });

        const backendUser = await getCurrentUser();
        if (backendUser?.foto_url) {
          await AsyncStorage.setItem(`profileImage_${userId}`, backendUser.foto_url).catch(() => {});
          if (auth.currentUser) {
            try { await updateProfile(auth.currentUser, { photoURL: backendUser.foto_url }); } catch(e){ }
          }
          setProfileImageState(backendUser.foto_url);
          console.log('✅ Profile image uploaded via backend and persisted:', backendUser.foto_url);
          return;
        } else {
          console.warn('Backend did not return foto_url after upload');
        }
      } catch (serverErr) {
        console.error('Server-side upload failed:', serverErr);
        throw serverErr;
      }

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

      // STEP 2: Try loading from backend (preferred source for foto_url)
      try {
        const backendUser = await getCurrentUser();
        if (backendUser?.foto_url) {
          console.log('☁️ Loading profile image from backend foto_url');
          setProfileImageState(backendUser.foto_url);
          await AsyncStorage.setItem(`profileImage_${userId}`, backendUser.foto_url).catch(() => {});
          return;
        }
      } catch (backendErr) {
        console.warn('No se pudo cargar foto_url desde backend (non-fatal):', backendErr);
      }

      // STEP 3: Load from Firestore as last-resort fallback
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profileImage) {
            console.log('☁️ Loading profile image from Firestore (fallback)');
            setProfileImageState(data.profileImage);
            await AsyncStorage.setItem(`profileImage_${userId}`, data.profileImage).catch(() => {});
            return;
          }
        }
      } catch (firestoreError: any) {
        console.log('Firestore load warning (non-critical):', firestoreError?.message || firestoreError);
      }

      // Fallback to Firebase Auth photoURL if available
      if (auth.currentUser?.photoURL) {
        console.log('🔐 Loading profile image from Firebase Auth (final fallback)');
        setProfileImageState(auth.currentUser.photoURL);
        await AsyncStorage.setItem(`profileImage_${userId}`, auth.currentUser.photoURL).catch(() => {});
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

