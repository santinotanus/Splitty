import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useAmigos } from '../viewmodels/useAmigos';

export default function EscanearAmigo({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const processing = useRef(false);
  const { addFriend } = useAmigos();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing.current) return;

    processing.current = true;
    setScanned(true);

    // Formato esperado: "splitty:user:UUID" o simplemente el UUID
    let friendId = data;

    // Limpieza del formato
    if (data.startsWith('splitty:user:')) {
      friendId = data.replace('splitty:user:', '');
    }

    try {
      Alert.alert(
        'Amigo detectado',
        '¿Enviar solicitud de amistad?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              processing.current = false;
            }
          },
          {
            text: 'Agregar',
            onPress: async () => {
              try {
                await addFriend(friendId);
                Alert.alert('¡Listo!', 'Solicitud enviada correctamente', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } catch (error: any) {
                const msg = error?.response?.data?.error || 'No se pudo agregar';

                if (msg === 'ALREADY_FRIENDS') {
                  Alert.alert('Aviso', 'Ya son amigos');
                } else if (msg === 'PENDING_REQUEST_EXISTS') {
                  Alert.alert('Aviso', 'Ya hay una solicitud pendiente');
                } else if (msg === 'CANNOT_REQUEST_SELF') {
                  Alert.alert('Error', 'No podés agregarte a vos mismo');
                } else {
                   Alert.alert('Error', 'Código inválido o usuario no encontrado');
                }

                // Permitir escanear de nuevo tras el error
                setScanned(false);
                processing.current = false;
              }
            }
          }
        ]
      );
    } catch (e) {
      setScanned(false);
      processing.current = false;
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#033E30" /></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20 }}>Sin acceso a la cámara</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#033E30', fontWeight: 'bold' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Escanear QR de Amigo</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          <Text style={styles.instructions}>
            Apuntá al código QR que aparece en el perfil de tu amigo
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', paddingVertical: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 8 },
  instructions: { color: '#fff', textAlign: 'center', fontSize: 16, paddingHorizontal: 40 },
  scanFrame: {
    width: 260, height: 260, alignSelf: 'center', position: 'relative',
    justifyContent: 'center', alignItems: 'center'
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#fff', borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }
});