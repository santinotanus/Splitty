import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type AlertState = { visible: boolean; message: string };
let setGlobalState: ((s: AlertState) => void) | null = null;

export function showInlineAlert(message: string, timeout = 3000) {
  if (!setGlobalState) return;
  setGlobalState({ visible: true, message });
  setTimeout(() => setGlobalState && setGlobalState({ visible: false, message: '' }), timeout);
}

export default function InlineAlertHost() {
  const { colors } = useTheme();
  const [state, setState] = useState<AlertState>({ visible: false, message: '' });
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    setGlobalState = setState;
    return () => { setGlobalState = null; };
  }, []);

  useEffect(() => {
    if (state.visible) {
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [state.visible]);

  if (!state.visible) return null;

  return (
    <Modal visible transparent animationType="none">
      <View style={{ flex: 1, justifyContent: 'flex-start' }} pointerEvents="box-none">
        <Animated.View style={{
          marginTop: 40,
          marginHorizontal: 16,
          padding: 12,
          borderRadius: 10,
          backgroundColor: colors.primary,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
        }}>
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>{state.message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
