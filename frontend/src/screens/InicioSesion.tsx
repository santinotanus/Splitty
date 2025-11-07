import React, { useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useAuth } from '../contexts/AuthContext';

export default function InicioSesion({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      console.log('✅ Login exitoso');
      // No navegamos manualmente, el AuthContext lo hace automáticamente

    } catch (err: any) {
      console.error('Login error:', err);

      let errorMessage = 'Ocurrió un error al iniciar sesión.';

      if (err.message === 'EMAIL_NOT_VERIFIED') {
        errorMessage = 'Por favor verifica tu correo electrónico antes de iniciar sesión.\n\nRevisa tu bandeja de entrada y haz clic en el enlace de verificación.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png" }}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.title}>Splitty</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor="#999999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('RestablecerContraseña')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.orContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>O continúa con</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={() => {}}>
              <Image
                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png" }}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createAccountContainer}>
            <Text style={styles.noAccountText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CrearCuenta')} disabled={loading}>
              <Text style={styles.createAccountText}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.bottomText}>Inicia sesión en tu cuenta</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6F4F1'
  },
  keyboardAvoidingView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'flex-start'
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  iconBackground: {
    backgroundColor: '#E6F4F1',
    borderRadius: 16,
    padding: 20
  },
  iconImage: {
    width: 40,
    height: 40,
    tintColor: '#033E30'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#033E30',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#0000001A',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    color: '#212121',
    marginBottom: 6
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#FFFFFF'
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#033E30'
  },
  loginButton: {
    backgroundColor: '#033E30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#555555'
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12
  },
  googleButtonText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600'
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  noAccountText: {
    fontSize: 12,
    color: '#555555'
  },
  createAccountText: {
    fontSize: 12,
    color: '#033E30'
  },
  bottomText: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    marginTop: 24
  }
});