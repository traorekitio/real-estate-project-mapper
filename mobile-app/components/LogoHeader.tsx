import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { AppColors } from '@/constants/colors';

const { width } = Dimensions.get('window');

interface LogoHeaderProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  centered?: boolean;
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({
  size = 'medium',
  showText = false,
  centered = false,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          logo: 60,
          text: 16,
          container: { marginBottom: 8 },
        };
      case 'large':
        return {
          logo: 120,
          text: 24,
          container: { marginBottom: 16 },
        };
      case 'medium':
      default:
        return {
          logo: 80,
          text: 20,
          container: { marginBottom: 12 },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        centered && styles.centered,
      ]}
    >
      <Image
        source={require('@/assets/logos/logo.png')}
        style={{
          width: sizeStyles.logo,
          height: sizeStyles.logo,
          resizeMode: 'contain',
        }}
      />
      {showText && (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeStyles.text,
              marginTop: size === 'small' ? 4 : 8,
            },
          ]}
        >
          Maikiti
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    width: '100%',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Century Gothic',
    fontWeight: '600',
    color: AppColors.primary.main,
    textAlign: 'center',
  },
});
