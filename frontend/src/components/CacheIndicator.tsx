import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNetwork } from '../contexts/NetworkContext';

interface CacheIndicatorProps {
  visible: boolean;
  onRefresh?: () => void;
  message?: string;
}

export default function CacheIndicator({ 
  visible, 
  onRefresh, 
  message = 'Datos guardados localmente' 
}: CacheIndicatorProps) {
  const { colors } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();
  const isOnline = isConnected && isInternetReachable;

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.successLight }]}>
      <View style={styles.content}>
        <Feather name="database" size={14} color={colors.success} />
        <Text style={[styles.text, { color: colors.success }]}>
          {message}
        </Text>
        {isOnline && onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.button}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Actualizar
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
});
