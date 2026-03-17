import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '@/constants/colors';
import { LogoHeader } from './LogoHeader';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  customActions?: React.ReactNode;
}

const { width } = Dimensions.get('window');

export const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = false,
  showBackButton = false,
  showHomeButton = false,
  customActions,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showLogo && <LogoHeader size="small" showText={false} />}
        {showBackButton && (
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>← Retour</Text>
          </TouchableOpacity>
        )}
        {showHomeButton && (
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={() => router.push('/(tabs)' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>🏠</Text>
          </TouchableOpacity>
        )}
      </View>

      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.rightSection}>
        {customActions}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.ui.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.ui.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },

  title: {
    flex: 2,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    textAlign: 'center',
  },

  buttonTouchable: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: AppColors.primary.light + '20',
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
  },
});
