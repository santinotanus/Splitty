import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

interface HeaderProps {
  navigation: any;
  balance?: number;
}

export default function Header({ navigation, balance = 0 }: HeaderProps) {
  const { user } = useAuth();
  const { profileImage, loadProfileImage } = useProfile();
  const insets = useSafeAreaInsets();
  const balanceFormatted = Math.abs(balance).toFixed(2);
  const balanceSign = balance > 0 ? '+' : balance < 0 ? '-' : '';
  const balanceColor = balance > 0 ? '#0A8F4A' : balance < 0 ? '#D9534F' : '#666';
  const isPositive = balance > 0;

  // Load profile image when user changes
  useEffect(() => {
    if (user?.uid) {
      loadProfileImage(user.uid);
    }
  }, [user?.uid]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Tu balance</Text>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceAmount, { color: balanceColor }]}>
            ${balanceFormatted}
          </Text>
          {isPositive && (
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>A favor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            // Placeholder for theme toggle
          }}
        >
          <Feather name="sun" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => {
            // Navigate to profile screen from nested navigators
            // Since we're inside Tab > Stack > Screen, we need to go to root navigator
            try {
              // Get the root navigator by traversing up the navigation tree
              let rootNav = navigation;
              while (rootNav?.getParent()) {
                rootNav = rootNav.getParent();
              }
              
              // Use CommonActions to navigate at root level
              if (rootNav) {
                rootNav.dispatch(
                  CommonActions.navigate({
                    name: 'PantallaPerfil',
                  })
                );
              }
            } catch (error) {
              console.error('Navigation error:', error);
              // Fallback: try multiple navigation approaches
              try {
                navigation.getParent()?.getParent()?.navigate('PantallaPerfil');
              } catch {
                navigation.getParent()?.navigate('PantallaPerfil');
              }
            }
          }}
          style={styles.profileButton}
        >
          <Image 
            source={{ uri: profileImage }} 
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#E6F4F1',
  },
  balanceSection: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A8F4A',
  },
  balanceBadge: {
    backgroundColor: '#DFF4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  balanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A8F4A',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
});

