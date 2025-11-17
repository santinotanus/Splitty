import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { auth } from '../config/firebase';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { updateUser, getCurrentUser, checkClaveAvailable } from '../api/client';

export default function PantallaPerfil({ navigation }: any) {
  const { user } = useAuth();
  const { profileImage, setProfileImage, uploadProfileImage, loadProfileImage, loading: profileLoading } = useProfile();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [clavePago, setClavePago] = useState('');
  
  // Modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showClaveModal, setShowClaveModal] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newClave, setNewClave] = useState('');

  // Load user data
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Load from backend
      const backendUser = await getCurrentUser();
      setNombre(backendUser?.nombre || user.displayName || '');
      setClavePago(backendUser?.clave_pago || '');
      setEmail(user.email || '');
      
      // Load profile image from ProfileContext (Firestore + cache)
      await loadProfileImage(user.uid);
    } catch (error) {
      console.error('Error loading user data:', error);
      setNombre(user.displayName || '');
      setEmail(user.email || '');
      // Profile image will use default from ProfileContext
    }
  };

  const handleEditClave = () => {
    setNewClave(clavePago);
    setShowClaveModal(true);
  };

  const handleSaveClave = async () => {
    if (!newClave.trim()) {
      Alert.alert('Error', 'El Alias/CVU no puede estar vacío');
      return;
    }
    if (newClave.trim().length > 50) {
      Alert.alert('Error', 'El Alias/CVU no puede tener más de 50 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Check availability first
      try {
        const { available } = await checkClaveAvailable(newClave.trim());
        if (!available) {
          Alert.alert('Error', 'El Alias/CVU ya está en uso por otro usuario');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('No se pudo verificar disponibilidad del alias:', err);
        // let the server handle uniqueness
      }

      await updateUser({ clave_pago: newClave.trim() });
      setClavePago(newClave.trim());
      setShowClaveModal(false);
      Alert.alert('Éxito', 'Alias/CVU actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating clave_pago:', error);
      if (error.response?.status === 409) {
        Alert.alert('Error', 'El Alias/CVU ya está en uso por otro usuario');
      } else {
        Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el Alias/CVU');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto');
        return;
      }

      // Abrir selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Obtener base64 directamente para evitar problemas con Blob
      });

      if (!result.canceled && result.assets[0] && user?.uid) {
        const asset = result.assets[0];
        
        // KEY CHANGE: Update image immediately with local URI (what makes it work)
        setProfileImage(asset.uri);
        
        // Si ImagePicker devolvió base64, usarlo directamente; si no, usar la URI
        // ProfileContext manejará ambos casos
        const imageSource = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        
        // Upload to Firebase in background (doesn't block UI)
        // ProfileContext handles the upload and updates all components automatically
        uploadProfileImage(imageSource, user.uid).catch((error) => {
          console.error('Error uploading profile image:', error);
          // Image stays as local URI until upload succeeds
        });
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleEditName = () => {
    setNewName(nombre);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    
    setLoading(true);
    try {
      await updateUser({ nombre: newName.trim() });
      setNombre(newName.trim());
      setShowNameModal(false);
      Alert.alert('Éxito', 'Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating name:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmail = () => {
    setNewEmail(email);
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Error', 'Ingresa un correo electrónico válido');
      return;
    }
    Alert.alert(
      'Confirmar cambio',
      'Se enviará un email de verificación a la nueva dirección. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            setLoading(true);
            try {
              await updateEmail(auth.currentUser!, newEmail.trim());
              setEmail(newEmail.trim());
              setShowEmailModal(false);
              Alert.alert(
                'Email actualizado',
                'Se ha enviado un email de verificación. Por favor verifica tu nueva dirección de correo.'
              );
            } catch (error: any) {
              console.error('Error updating email:', error);
              let errorMessage = 'No se pudo actualizar el correo electrónico';
              if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Por seguridad, necesitas iniciar sesión nuevamente';
              } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este correo electrónico ya está en uso';
              }
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado');
      }

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      
      setShowPasswordModal(false);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating password:', error);
      let errorMessage = 'No se pudo actualizar la contraseña';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#033E30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profileLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#033E30" />
              </View>
            ) : (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profilePhoto}
              />
            )}
          </View>
          <TouchableOpacity 
            onPress={handleChangePhoto} 
            style={styles.changePhotoButton}
            disabled={profileLoading}
          >
            <Feather name="edit-2" size={14} color="#033E30" />
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <Text style={styles.sectionTitle}>Información personal</Text>

        {/* Full Name Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="user" size={20} color="#666" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Nombre completo</Text>
            <Text style={styles.cardValue}>{nombre}</Text>
          </View>
          <TouchableOpacity onPress={handleEditName} style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Email Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="mail" size={20} color="#666" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Correo electrónico</Text>
            <Text style={styles.cardValue}>{email}</Text>
          </View>
          <TouchableOpacity onPress={handleEditEmail} style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Alias / CVU Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="hash" size={20} color="#666" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Alias / CVU</Text>
            <Text style={styles.cardValue}>{clavePago || 'No establecido'}</Text>
          </View>
          <TouchableOpacity onPress={handleEditClave} style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Password Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="lock" size={20} color="#666" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Contraseña</Text>
            <Text style={styles.cardValue}>••••••••</Text>
          </View>
          <TouchableOpacity onPress={handleEditPassword} style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar nombre completo</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nombre completo"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Email Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar correo electrónico</Text>
            <TextInput
              style={styles.modalInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEmailModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar contraseña</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Contraseña actual"
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña"
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar nueva contraseña"
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Alias/CVU Modal */}
      <Modal
        visible={showClaveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClaveModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Alias / CVU</Text>
            <TextInput
              style={styles.modalInput}
              value={newClave}
              onChangeText={setNewClave}
              placeholder="Alias o CVU"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowClaveModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveClave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  changePhotoText: {
    color: '#033E30',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f6f9f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    color: '#033E30',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f9f7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f6f9f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f6f9f7',
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  modalButtonSave: {
    backgroundColor: '#033E30',
  },
  modalButtonTextCancel: {
    color: '#033E30',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextSave: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

