import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useColors } from '../../hooks/useColors';
import { Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
];

export default function LanguageSelectionScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
  };

  const handleContinue = () => {
    navigation.navigate('WelcomeCarousel');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{t('onboarding.languageTitle')}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('onboarding.languageSubtitle')}</Text>
      </Animated.View>

      <View style={styles.listContainer}>
        {LANGUAGES.map((lang, index) => {
          const isSelected = language === lang.code;
          return (
            <Animated.View
              key={lang.code}
              entering={FadeInDown.duration(500).delay(300 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.languageCard,
                  { 
                    backgroundColor: isSelected ? c.brandBg : c.card,
                    borderColor: isSelected ? c.brand : c.border,
                  }
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[styles.nativeLabel, { color: c.text }]}>{lang.nativeLabel}</Text>
                  <Text style={[styles.label, { color: c.textSecondary }]}>{lang.label}</Text>
                </View>
                {isSelected && (
                  <Animated.View entering={FadeInDown.duration(300)}>
                    <Check size={24} color={c.brand} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.duration(600).delay(800)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.brand }]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  nativeLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
  },
  footer: {
    marginTop: 'auto',
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
