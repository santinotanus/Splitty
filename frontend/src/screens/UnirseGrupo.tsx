// frontend/src/screens/UnirseGrupo.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUnirseGrupo } from '../viewmodels/useUnirseGrupo';

export default function UnirseGrupo({ navigation }: any) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinByInvite } = useUnirseGrupo();

  const handleJoinByToken = async () => {
    if (!token.trim()) {
      Alert.alert('Código requerido', 'Ingresá el código de invitación');
      return;
    }

    if (token.trim().length < 20) {
      Alert.alert('Código inválido', 'El código de invitación parece ser demasiado corto. Verificá el código.');
      return;
    }

    setLoading(true);
    try {
      await joinByInvite(token.trim());
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
      } else if (body?.error === 'INVALID_OR_EXPIRED_TOKEN') {
        Alert.alert('Código expirado', 'Este código de invitación ya expiró. Pedí uno nuevo al administrador del grupo.');
      } else if (body?.error === 'ALREADY_MEMBER') {
        Alert.alert('Ya sos miembro', 'Ya sos parte de este grupo.');
      } else if (body?.error === 'VALIDATION_ERROR' && Array.isArray(body?.issues)) {
        const issue = body.issues[0];
        if (issue?.code === 'too_small' && issue?.minimum) {
          Alert.alert('Código inválido', 'El código de invitación no tiene el formato esperado. Verificá el código.');
        } else {
          Alert.alert('Error', body?.message || body?.error || e?.message || 'Error al unir al grupo');
        }
      } else {
        Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al unir al grupo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      // Try expo-clipboard first
      const Clipboard = await import('expo-clipboard').catch(() => null);
      if (Clipboard) {
        const text = await Clipboard.default.getStringAsync();
        if (text) {
          setToken(text);
          Alert.alert('✓ Pegado', 'Código pegado desde el portapapeles');
          return;
        }
      }

      // Fallback to community clipboard
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

  return (
    <View style={styles.container}>
      {/* Header */}
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
        {/* Ilustración */}
        <View style={styles.illustration}>
          <View style={styles.illustrationCircle}>
            <Feather name="users" size={40} color="#033E30" />
          </View>
        </View>

        <Text style={styles.mainTitle}>Unite a un grupo</Text>
        <Text style={styles.mainSubtitle}>
          Pedile al administrador del grupo que te comparta el código de invitación
        </Text>

        {/* Card de ingreso */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Código de invitación</Text>
          <Text style={styles.cardSubtitle}>
            Ingresá o pegá el código que te compartieron
          </Text>

          <View style={styles.inputContainer}>
            <Feather name="link" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Pegá el código aquí"
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

          {/* Botón para pegar desde portapapeles */}
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
            onPress={handleJoinByToken}
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

        {/* Info adicional */}
        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#666" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            Los códigos de invitación expiran después de un tiempo. Si el tuyo no funciona, pedí uno nuevo.
          </Text>
        </View>

        {/* Ejemplo de código */}
        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>¿Cómo se ve un código?</Text>
          <View style={styles.exampleCodeBox}>
            <Text style={styles.exampleCode} selectable>
              eyJhbGciOiJIUzI1NiIsInR5...
            </Text>
          </View>
          <Text style={styles.exampleText}>
            El código puede ser un enlace completo o un texto largo como el ejemplo de arriba
          </Text>
        </View>
      </ScrollView>
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
  exampleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eee9'
  },
  exampleTitle: {
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 12,
    fontSize: 14
  },
  exampleCodeBox: {
    backgroundColor: '#f6f9f6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
    marginBottom: 8
  },
  exampleCode: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#033E30'
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  }
});