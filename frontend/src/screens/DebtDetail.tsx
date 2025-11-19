import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { uploadReceipt, uploadReceiptUrl } from '../api/balances';
import { useTheme } from '../contexts/ThemeContext';
import { createSettlement } from '../api/settlements';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: insets.top + 16,
    paddingBottom: 16,
    backgroundColor: colors.modalBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: insets.bottom + 24,
  },
  card: {
    backgroundColor: colors.modalBackground,
    borderRadius: 12,
    padding: isSmallDevice ? 14 : 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  amountCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.error,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: isSmallDevice ? 12 : 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ADEF',
    padding: isSmallDevice ? 12 : 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: colors.primaryText,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  receiptSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  uploadedContainer: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  uploadedLabel: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  uploadPlaceholder: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  uploadPlaceholderText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default function DebtDetail({ route, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  const { debt, grupoId } = route.params || {};
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(debt?.comprobanteUrl || null);
  const [localUri, setLocalUri] = useState<string | null>(null);

  const copyAndOpenMP = async () => {
    try {
      const clave = String(debt?.haciaUsuarioClave || '');
      if (!clave) return Alert.alert('Alias no disponible', 'No se encontró el alias del acreedor');
      await Clipboard.setStringAsync(clave);
      Alert.alert('Alias copiado', 'Se copió el alias al portapapeles. Abriendo Mercado Pago...');

      const mpSchemes = ['mercadopago://', 'mercadopago://home', 'mercadopago://open'];
      let opened = false;
      for (const scheme of mpSchemes) {
        try {
          const can = await Linking.canOpenURL(scheme);
          if (can) {
            await Linking.openURL(scheme);
            opened = true;
            break;
          }
        } catch (e) {
          // ignore
        }
      }
      if (!opened) {
        await Linking.openURL('https://www.mercadopago.com.ar');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo copiar el alias o abrir Mercado Pago.');
    }
  };

  const pickAndUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a las fotos');
        return;
      }

      const rawCloudName = Constants.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME;
      const rawUploadPreset = Constants.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET;
      const cloudName = typeof rawCloudName === 'string' ? rawCloudName : undefined;
      const uploadPreset = typeof rawUploadPreset === 'string' ? rawUploadPreset : undefined;
      if (!cloudName || !uploadPreset) {
        console.warn('Cloudinary config missing or invalid. CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET must be strings. Falling back to server-side upload.');
      }
      const wantBase64 = !(cloudName && uploadPreset);

      const result = await ImagePicker.launchImageLibraryAsync({
        base64: wantBase64,
        quality: 0.7,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      const uri = asset?.uri;
      if (!uri) return Alert.alert('Error', 'No se pudo leer la imagen');

      // Show local preview immediately
      setLocalUri(uri);

      setUploading(true);
      const filename = uri.split('/').pop();
      const deudorId = route.params?.deudorId;
      const acreedorId = debt?.haciaUsuario;

      // Server-side upload: always read base64 and send to backend
      try {
        console.log('Usando subida server-side: leyendo archivo como base64 y enviando al backend');
        const encoding = (FileSystem as any)?.EncodingType?.Base64 ?? 'base64';
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding });
        if (!base64) throw new Error('No se pudo leer la imagen (base64)');
        const resp = await uploadReceipt(grupoId, deudorId, acreedorId, filename, base64);
        createSettlement(grupoId, {
          desde_usuario: acreedorId,
          hacia_usuario: deudorId,
          importe: Number(debt?.importe || 0),
          fecha_pago: new Date().toISOString().slice(0, 10)
        });
        setUploadedUrl(resp?.url || null);
        Alert.alert('Comprobante subido', 'El comprobante se subió correctamente.');
      } catch (err: any) {
        console.error('upload error', err);
        const serverMessage = err?.response?.data?.error || err?.response?.data || err?.message;
        Alert.alert('Error al subir', String(serverMessage || 'No se pudo subir el comprobante.'));
      }
    } catch (e: any) {
      console.error('upload error', e);
      const serverMessage = e?.response?.data?.error || e?.response?.data || e?.message;
      Alert.alert('Error al subir', String(serverMessage || 'No se pudo subir el comprobante.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de la deuda</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto a pagar</Text>
          <Text style={styles.amount}>${Number(debt?.importe || 0).toFixed(2)}</Text>
        </View>

        {/* Debt Info Card */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Le debés a</Text>
            <Text style={styles.value}>{debt?.haciaUsuarioNombre || debt?.haciaUsuarioCorreo}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Alias / CVU</Text>
            <Text style={styles.value}>{debt?.haciaUsuarioClave || '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Motivo</Text>
            <Text style={styles.value}>{debt?.gastoDescripcion || 'Pago pendiente'}</Text>
          </View>
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>

          <TouchableOpacity style={styles.buttonSecondary} onPress={copyAndOpenMP}>
            <Feather name="dollar-sign" size={18} color={colors.primaryText} />
            <Text style={styles.buttonText}>Copiar alias y abrir Mercado Pago</Text>
          </TouchableOpacity>
        </View>

        {/* Receipt Section */}
        <View style={styles.receiptSection}>
          <Text style={styles.sectionTitle}>Comprobante de pago</Text>

          {uploadedUrl ? (
            <View style={styles.uploadedContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Feather name="check-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.success, fontWeight: '600' }}>
                  Comprobante subido
                </Text>
              </View>
              <Image source={{ uri: uploadedUrl }} style={styles.receiptImage} resizeMode="contain" />
            </View>
          ) : localUri ? (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Previsualización</Text>
              <Image source={{ uri: localUri }} style={styles.receiptImage} resizeMode="contain" />
              {uploading ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <TouchableOpacity style={styles.buttonPrimary} onPress={pickAndUpload}>
                  <Feather name="upload" size={18} color={colors.primaryText} />
                  <Text style={styles.buttonText}>Subir comprobante</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={pickAndUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.uploadPlaceholderText}>Subiendo...</Text>
                </>
              ) : (
                <>
                  <Feather name="upload-cloud" size={48} color={colors.textMuted} />
                  <Text style={styles.uploadPlaceholderText}>
                    Toca para seleccionar un comprobante{'\n'}de tu galería
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}