import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { uploadReceipt, uploadReceiptUrl } from '../api/balances';

export default function DebtDetail({ route, navigation }: any) {
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
        allowsEditing: true,
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
      <View style={styles.card}>
        <Text style={styles.title}>Detalle de la deuda</Text>

        <Text style={styles.label}>Acreedor</Text>
        <Text style={styles.value}>{debt?.haciaUsuarioNombre || debt?.haciaUsuarioCorreo}</Text>

        <Text style={styles.label}>Alias / CVU</Text>
        <Text style={styles.value}>{debt?.haciaUsuarioClave || '—'}</Text>

        <Text style={styles.label}>Importe</Text>
        <Text style={[styles.value, { color: '#B00020', fontSize: 22 }]}>${Number(debt?.importe || 0).toFixed(2)}</Text>

        <Text style={styles.label}>Motivo</Text>
        <Text style={styles.value}>{debt?.gastoDescripcion || 'Pago pendiente'}</Text>

        <View style={{ height: 12 }} />

        <TouchableOpacity style={styles.mpButton} onPress={copyAndOpenMP}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Copiar alias y abrir Mercado Pago</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        {uploadedUrl ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#666', marginBottom: 8 }}>Comprobante subido</Text>
            <Image source={{ uri: uploadedUrl }} style={{ width: 200, height: 200, borderRadius: 8 }} />
          </View>
        ) : localUri ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#666', marginBottom: 8 }}>Previsualización</Text>
            <Image source={{ uri: localUri }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickAndUpload}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cargar comprobante</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickAndUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Cargar comprobante</Text>
            )}
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4F1', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e6eee9' },
  title: { fontSize: 18, fontWeight: '700', color: '#033E30', marginBottom: 12 },
  label: { color: '#666', fontSize: 12, marginTop: 8 },
  value: { fontSize: 16, fontWeight: '700', color: '#033E30' },
  uploadButton: { marginTop: 12, backgroundColor: '#033E30', padding: 12, borderRadius: 8, alignItems: 'center' },
  mpButton: { marginTop: 8, backgroundColor: '#00ADEF', padding: 12, borderRadius: 8, alignItems: 'center' }
});
