import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { updateProfile, onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, updateUser } from "../api/client";

interface ProfileContextType {
  profileImage: string;
  setProfileImage: (uri: string) => void;
  uploadProfileImage: (dataUriOrUri: string, userId: string) => Promise<void>;
  loadProfileImage: (userId: string) => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const DEFAULT_PROFILE_IMAGE = "https://ui-avatars.com/api/?name=User&background=E6F4F1&color=033E30&size=200";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileImage, setProfileImageState] = useState<string>(DEFAULT_PROFILE_IMAGE);
  const [loading, setLoading] = useState(false);

  const uploadProfileImage = async (dataUriOrUri: string, userId: string) => {
    try {
      setLoading(true);

      console.log('📤 uploadProfileImage called');
      console.log('   Input type:', dataUriOrUri.startsWith('data:') ? 'base64 data URI' : 'file URI');
      console.log('   Input length:', dataUriOrUri.length);

      let base64Data: string;

      // 🔥 FIX: Manejar tanto data URI como base64 plano
      if (dataUriOrUri.startsWith('data:')) {
        // Ya viene con el prefijo data:image/...;base64,
        console.log('✅ Input is already a data URI');
        base64Data = dataUriOrUri.split(',')[1]; // Extraer solo el base64
      } else if (dataUriOrUri.startsWith('file://') || dataUriOrUri.startsWith('/')) {
        // Es un URI de archivo, no debería pasar, pero por si acaso
        console.error('❌ Received file URI instead of base64:', dataUriOrUri.substring(0, 50));
        throw new Error('Expected base64 data, got file URI. Check PantallaPerfil.tsx');
      } else {
        // Asumimos que es base64 sin prefijo
        console.log('⚠️ Input is base64 without prefix');
        base64Data = dataUriOrUri;
      }

      console.log('📦 Base64 data length:', base64Data.length);
      console.log('📦 Approximate size:', (base64Data.length * 0.75 / 1024 / 1024).toFixed(2), 'MB');

      // 🔥 Enviar al backend
      console.log('📤 Sending to backend...');

      const updatedUser = await updateUser({ foto_data: base64Data });

      console.log('✅ Backend response received');
      console.log('   Has foto_url:', !!updatedUser?.foto_url);
      console.log('   foto_url:', updatedUser?.foto_url?.substring(0, 60) + '...');

      // Verificar que el backend devolvió la URL
      if (updatedUser?.foto_url) {
        console.log('✅ Got foto_url from backend');

        // Actualizar estado local
        setProfileImageState(updatedUser.foto_url);

        // Guardar en cache
        await AsyncStorage.setItem(`profileImage_${userId}`, updatedUser.foto_url);

        // Actualizar Firebase Auth profile
        if (auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, {
              photoURL: updatedUser.foto_url
            });
            console.log('✅ Firebase Auth photoURL updated');
          } catch (e) {
            console.warn('⚠️ Could not update Firebase Auth photoURL:', e);
          }
        }

        console.log('✅ Profile image uploaded and saved successfully');
        return;
      } else {
        // Fallback: refrescar usuario completo
        console.warn('⚠️ Backend did not return foto_url, fetching user data...');
        const backendUser = await getCurrentUser();

        if (backendUser?.foto_url) {
          console.log('✅ Got foto_url from getCurrentUser');
          setProfileImageState(backendUser.foto_url);
          await AsyncStorage.setItem(`profileImage_${userId}`, backendUser.foto_url);

          if (auth.currentUser) {
            try {
              await updateProfile(auth.currentUser, {
                photoURL: backendUser.foto_url
              });
            } catch (e) {
              console.warn('⚠️ Could not update Firebase Auth photoURL:', e);
            }
          }
          return;
        } else {
          throw new Error('Backend did not return foto_url after upload');
        }
      }

    } catch (error: any) {
      console.error("❌ Error uploading profile image:", error);
      console.error("   Error message:", error?.message);
      console.error("   Error response:", error?.response?.data);
      throw error;
    } finally {
      setLoading(false);
    }
  };

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

      // STEP 3: Fallback to Firebase Auth photoURL if available
      if (auth.currentUser?.photoURL) {
        console.log('🔐 Loading profile image from Firebase Auth (final fallback)');
        setProfileImageState(auth.currentUser.photoURL);
        await AsyncStorage.setItem(`profileImage_${userId}`, auth.currentUser.photoURL).catch(() => {});
      }

      console.log("✅ Profile image loaded successfully");
    } catch (error: any) {
      console.error("❌ Error loading profile image:", error?.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load profile image when user is authenticated
  useEffect(() => {
    const loadInitialProfileImage = async () => {
      if (auth.currentUser?.uid) {
        loadProfileImage(auth.currentUser.uid).catch((error) => {
          console.log("Auto-load profile image failed (non-critical):", error?.message || error);
        });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        loadInitialProfileImage();
      } else {
        setProfileImageState(DEFAULT_PROFILE_IMAGE);
      }
    });

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