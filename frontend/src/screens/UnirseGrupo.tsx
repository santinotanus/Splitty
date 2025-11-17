import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useUnirseGrupo } from '../viewmodels/useUnirseGrupo';

export default function UnirseGrupo({ navigation }: any) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinByInvite } = useUnirseGrupo();

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  const processingCode = useRef(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {

    if (processingCode.current) return;

    processingCode.current = true;

    setScanned(true);
    setShowScanner(false);
    setToken(data);

    // Auto-procesar el QR escaneado
    setTimeout(() => {
      handleJoinByToken(data);
    }, 500);
  };

  const handleJoinByToken = async (tokenToProcess?: string) => {
    const finalToken = tokenToProcess || token;

    if (!finalToken.trim()) {
      Alert.alert('Código requerido', 'Ingresá el código de invitación');
      return;
    }

    let groupId = '';
    let inviteId = '';

    try {
      if (finalToken.includes('splitty://') || finalToken.includes('groupId')) {
        const url = new URL(finalToken.replace('splitty://', 'https://'));
        groupId = url.searchParams.get('groupId') || '';
        inviteId = url.searchParams.get('inviteId') || '';
      } else {
        Alert.alert('Formato incorrecto', 'Por favor escaneá el QR o pedí el link completo');
        return;
      }

      if (!groupId || !inviteId) {
        Alert.alert('Link inválido', 'El link no tiene el formato correcto');
        return;
      }
    } catch (e) {
      Alert.alert('Link inválido', 'No se pudo procesar el link de invitación');
      return;
    }

    setLoading(true);
    try {
      await joinByInvite(groupId, inviteId);
      Alert.alert(
        '✓ ¡Éxito!',
        'Te uniste al grupo correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      console.error('joinByInvite error', e);
      const status = e?.response?.status;
      const body = e?.response?.data;

      if (status === 404 || body?.error === 'GROUP_NOT_FOUND') {
        Alert.alert('Grupo no existe', 'No se encontró un grupo con ese código de invitación. Verificá el código.');
      } else if (body?.error === 'INVITE_EXPIRED') {
        Alert.alert('Invitación expirada', 'Esta invitación ya expiró. Pedí una nueva.');
      } else if (body?.error === 'INVITE_NOT_FOUND') {
        Alert.alert('Invitación no encontrada', 'No se encontró esta invitación.');
      } else if (body?.error === 'INVITE_ALREADY_USED') {
        Alert.alert('Invitación usada', 'Esta invitación ya fue utilizada.');
      } else if (body?.error === 'ALREADY_MEMBER') {
        Alert.alert('Ya sos miembro', 'Ya sos parte de este grupo.');
      } else {
        Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al unir al grupo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const Clipboard = await import('expo-clipboard').catch(() => null);
      if (Clipboard) {
        const text = await Clipboard.default.getStringAsync();
        if (text) {
          setToken(text);
          Alert.alert('✓ Pegado', 'Código pegado desde el portapapeles');
          return;
        }
      }

      const RNClipboard = await import('@react-native-clipboard/clipboard').catch(() => null);
      if (RNClipboard) {
        const text = await RNClipboard.default.getString();
        if (text) {
          setToken(text);
          Alert.alert('✓ Pegado', 'Código pegado desde el portapapeles');
          return;
        }
      }

      Alert.alert('Info', 'No se pudo acceder al portapapeles');
    } catch (e) {
      console.error('Clipboard error:', e);
      Alert.alert('Error', 'No se pudo pegar desde el portapapeles');
    }
  };

  const openScanner = async () => {
    if (hasPermission === null) {
      await requestCameraPermission();
    }

    if (hasPermission === false) {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos acceso a la cámara para escanear códigos QR',
        [
          { text: 'Cancelar' },
          { text: 'Configuración', onPress: () => {
            // Abrir configuración de la app
          }}
        ]
      );
      return;
    }

    setScanned(false);
    setShowScanner(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#033E30" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Unirse a un Grupo</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.illustration}>
          <View style={styles.illustrationCircle}>
            <Feather name="users" size={40} color="#033E30" />
          </View>
        </View>

        <Text style={styles.mainTitle}>Unite a un grupo</Text>
        <Text style={styles.mainSubtitle}>
          Escaneá el código QR o pegá el link de invitación
        </Text>

        {/* Botón grande para escanear */}
        <TouchableOpacity
          style={styles.scanButtonLarge}
          onPress={openScanner}
          disabled={loading}
        >
          <View style={styles.scanIconCircle}>
            <Feather name="camera" size={32} color="#033E30" />
          </View>
          <Text style={styles.scanButtonTitle}>Escanear código QR</Text>
          <Text style={styles.scanButtonSubtitle}>
            Apuntá la cámara al código QR del grupo
          </Text>
        </TouchableOpacity>

        {/* Separador */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>O pegar link manualmente</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Link de invitación</Text>
          <Text style={styles.cardSubtitle}>
            Pegá el link que te compartieron
          </Text>

          <View style={styles.inputContainer}>
            <Feather name="link" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="splitty://join?groupId=..."
              value={token}
              onChangeText={setToken}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
            />
            {token.length > 0 && (
              <TouchableOpacity onPress={() => setToken('')} style={styles.clearButton}>
                <Feather name="x" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePasteFromClipboard}
            disabled={loading}
          >
            <Feather name="clipboard" size={16} color="#033E30" style={{ marginRight: 6 }} />
            <Text style={styles.pasteButtonText}>Pegar desde portapapeles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (loading || !token.trim()) && { opacity: 0.7 }]}
            onPress={() => handleJoinByToken()}
            disabled={loading || !token.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Unirse al grupo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#666" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            Los códigos de invitación expiran después de un tiempo. Si el tuyo no funciona, pedí uno nuevo.
          </Text>
        </View>
      </ScrollView>

      {/* Modal Scanner */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Escanear código QR</Text>
            <View style={{ width: 28 }} />
          </View>

          {hasPermission ? (
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                <Text style={styles.scannerInstruction}>
                  Centrá el código QR en el recuadro
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.noPermission}>
              <Feather name="camera-off" size={48} color="#666" />
              <Text style={styles.noPermissionText}>
                No tenemos permiso para usar la cámara
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4F1'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30'
  },
  scrollContent: {
    padding: 16,
    paddingTop: 32
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 24
  },
  illustrationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DFF4EA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#033E30',
    textAlign: 'center',
    marginBottom: 8
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16
  },
  scanButtonLarge: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#033E30',
    borderStyle: 'dashed'
  },
  scanIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DFF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  scanButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 8
  },
  scanButtonSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6eee9'
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6eee9'
  },
  cardTitle: {
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 4,
    fontSize: 16
  },
  cardSubtitle: {
    color: '#666',
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 18
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f6f9f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
    marginBottom: 12,
    paddingHorizontal: 12,
    minHeight: 80
  },
  inputIcon: {
    marginRight: 8,
    marginTop: 12
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#033E30',
    textAlignVertical: 'top'
  },
  clearButton: {
    padding: 8,
    marginTop: 8
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f9f6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
    marginBottom: 12
  },
  pasteButtonText: {
    color: '#033E30',
    fontWeight: '600',
    fontSize: 14
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#033E30',
    padding: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  infoText: {
    flex: 1,
    color: '#666',
    fontSize: 12,
    lineHeight: 16
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)'
  },
  closeButton: {
    padding: 4
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  },
  camera: {
    flex: 1
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff'
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4
  },
  scannerInstruction: {
    marginTop: 40,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  noPermissionText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center'
  }
});