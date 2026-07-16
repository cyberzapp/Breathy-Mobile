import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn, SlideInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../hooks/useColors';

const { width } = Dimensions.get('window');

export default function WelcomeCarouselScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    // For now navigate to Login
    navigation.navigate('Login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {/* Welcome Image */}
        <Animated.View entering={FadeIn.duration(1000)} style={styles.animationContainer}>
          <Image
            source={require('../../../assets/welcome.png')}
            style={styles.animation}
            resizeMode="cover"
          />
        </Animated.View>
        
        <Animated.View entering={SlideInUp.duration(800).springify().delay(200)} style={styles.textContainer}>
          <Text style={[styles.title, { color: c.text }]}>{t('onboarding.welcomeTitle')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('onboarding.welcomeSubtitle')}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={SlideInUp.duration(800).springify().delay(400)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.brand }]}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('common.getStarted')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  animationContainer: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: width * 0.4,
    overflow: 'hidden',
  },
  animation: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.4,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
