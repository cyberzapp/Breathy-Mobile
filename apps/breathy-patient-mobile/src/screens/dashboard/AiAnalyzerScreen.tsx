import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import ErrorModal from '../../components/ui/ErrorModal';
import WarningModal from '../../components/ui/WarningModal';
import NotificationModal from '../../components/ui/NotificationModal';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '../../hooks/useColors';
import { analyzeLabReport, translateText, getAnalysisUsage } from '../../services/patientService';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function AiAnalyzerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 3, remaining: 3, isPremium: false });
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [originalResult, setOriginalResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Spanish', 'French'];

  const limitReached = usage.remaining <= 0;

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await getAnalysisUsage();
      // Server returns { used, limit, isPremium, remaining }
      const data = (res as any)?.data || res;
      if (data && typeof data.used === 'number') {
        setUsage({
          used: data.used,
          limit: data.limit,
          remaining: data.remaining,
          isPremium: data.isPremium || false,
        });
      }
    } catch (e) {
      console.log('Failed to fetch usage', e);
    }
  };

  const pickImage = async () => {
    if (limitReached) {
      showLimitReachedAlert();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
        setAnalysisResult(null);
        setOriginalResult(null);
        setSelectedLanguage('English');
      }
    } catch (e) {
      console.error('Image picking failed', e);
      setErrorMessage('Failed to pick image.');
    }
  };

  const showLimitReachedAlert = () => {
    setShowLimitModal(true);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setWarningMessage('Please upload an image first.');
      return;
    }

    if (limitReached) {
      showLimitReachedAlert();
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await analyzeLabReport(`data:image/jpeg;base64,${imageBase64}`);
      const data = (response as any)?.data || response;

      if (data?.analysis) {
        setAnalysisResult(data.analysis);
        setOriginalResult(data.analysis);
      } else {
        setAnalysisResult(data);
        setOriginalResult(data);
      }

      // Update usage from response if available
      if (data?.usage) {
        setUsage(prev => ({
          ...prev,
          used: data.usage.used,
          remaining: data.usage.remaining,
        }));
      } else {
        fetchUsage();
      }
    } catch (error: any) {
      // Handle 403 LIMIT_REACHED
      const errData = error?.response?.data;
      if (errData?.error === 'LIMIT_REACHED') {
        setUsage(prev => ({
          ...prev,
          used: errData.currentUsage || prev.limit,
          remaining: 0,
        }));
        showLimitReachedAlert();
      } else {
        console.error('AI Analysis failed', error);
        setErrorMessage('Failed to analyze the report. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!analysisResult) return;
    if (lang === selectedLanguage) return;

    if (lang === 'English') {
      // Restore original English result
      if (originalResult) {
        setAnalysisResult(originalResult);
        setSelectedLanguage('English');
      }
      return;
    }

    setIsTranslating(true);
    try {
      const textToTranslate = JSON.stringify(analysisResult);
      const res = await translateText(textToTranslate, lang);
      const data = (res as any)?.data || res;
      const translatedText = data?.translatedText || data;

      if (typeof translatedText === 'string') {
        try {
          setAnalysisResult(JSON.parse(translatedText));
        } catch {
          // If it can't be parsed, keep the original but show a message
          setNoticeMessage('Translation format issue. Showing partial results.');
        }
      }
      setSelectedLanguage(lang);
    } catch (error) {
      console.error('Translation failed', error);
      setErrorMessage('Failed to translate. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const renderMarker = (marker: any, index: number) => {
    const status = (marker.status || 'normal').toLowerCase();
    let color = '#22c55e';
    let bgColor = 'rgba(34, 197, 94, 0.1)';

    if (status === 'high' || status === 'critical') {
      color = '#ef4444';
      bgColor = 'rgba(239, 68, 68, 0.1)';
    } else if (status === 'low') {
      color = '#3b82f6';
      bgColor = 'rgba(59, 130, 246, 0.1)';
    }

    return (
      <View key={index} style={[styles.markerCard, { backgroundColor: bgColor, borderColor: color }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.markerName, { color }]}>{marker.markerName || marker.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusBadgeText}>{(marker.status || 'normal').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.markerValue, { color }]}>{marker.value} </Text>
        <Text style={[styles.markerRange, { color: c.textSecondary }]}>
          Ref. Range: {marker.referenceRange || marker.reference_range || '—'}
        </Text>
        {(marker.simplifiedExplanation || marker.interpretation) && (
          <Text style={[styles.markerInterpretation, { color: c.text }]}>
            {marker.simplifiedExplanation || marker.interpretation}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>AI Report Analyzer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Usage Tracker */}
        <View style={styles.usageContainer}>
          <View style={styles.usageTextRow}>
            <Text style={[styles.usageLabel, { color: c.textSecondary }]}>
              {usage.isPremium ? '⭐ Premium' : 'Free Plan'}
            </Text>
            <Text style={[styles.usageText, { color: limitReached ? '#ef4444' : c.textSecondary }]}>
              {usage.used}/{usage.limit} used this month
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: limitReached ? '#ef4444' : c.brand,
                  width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                },
              ]}
            />
          </View>
          {limitReached && (
            <TouchableOpacity style={styles.upgradeRow} onPress={showLimitReachedAlert}>
              <Ionicons name="lock-closed" size={14} color="#ef4444" />
              <Text style={styles.upgradeText}>Free limit reached — Tap to subscribe</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.uploadBox,
            {
              borderColor: limitReached ? '#d1d5db' : c.border,
              backgroundColor: limitReached ? 'rgba(0,0,0,0.02)' : c.card,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons
                name="document-text"
                size={64}
                color={limitReached ? '#d1d5db' : c.borderMedium}
              />
              <Text style={[styles.placeholderText, { color: limitReached ? '#9ca3af' : c.textSecondary }]}>
                {limitReached
                  ? 'Your free monthly limit has been reached. Subscribe to continue analysing reports.'
                  : 'Upload a clear picture of your lab report to get an AI-powered summary and insights.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.uploadButton,
              { backgroundColor: limitReached ? '#f3f4f6' : c.brandBg },
            ]}
            onPress={pickImage}
            disabled={limitReached}
          >
            <Ionicons
              name={limitReached ? 'lock-closed' : imageUri ? 'refresh' : 'cloud-upload'}
              size={20}
              color={limitReached ? '#9ca3af' : c.brand}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.uploadButtonText, { color: limitReached ? '#9ca3af' : c.brand }]}>
              {limitReached ? 'Limit Reached' : imageUri ? 'Change Image' : 'Select Lab Report'}
            </Text>
          </TouchableOpacity>
        </View>

        {imageUri && !analysisResult && !limitReached && (
          <TouchableOpacity
            style={[styles.analyzeButton, { backgroundColor: c.brand }]}
            onPress={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.analyzeText}>Analyze Report</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {analysisResult && (
          <Animated.View entering={FadeInUp}>
            {/* Translation Picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: selectedLanguage === lang ? c.brand : c.card,
                      borderColor: selectedLanguage === lang ? c.brand : c.border,
                    },
                  ]}
                  onPress={() => handleTranslate(lang)}
                  disabled={isTranslating || selectedLanguage === lang}
                >
                  <Text style={{ color: selectedLanguage === lang ? '#fff' : c.text, fontWeight: '600' }}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isTranslating ? (
              <ActivityIndicator size="large" color={c.brand} style={{ marginTop: 20 }} />
            ) : (
              <View style={[styles.resultContainer, { backgroundColor: c.card, borderColor: c.border }]}>
                {analysisResult.summary && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: c.brand }]}>📋 Summary</Text>
                    <Text style={[styles.sectionText, { color: c.text }]}>{analysisResult.summary}</Text>
                  </View>
                )}

                {analysisResult.keyMarkers && analysisResult.keyMarkers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: c.brand }]}>🔑 Key Markers</Text>
                    {analysisResult.keyMarkers.map((marker: any, idx: number) => renderMarker(marker, idx))}
                  </View>
                )}

                {analysisResult.otherMarkers && analysisResult.otherMarkers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: c.brand }]}>✅ Other Markers (Normal)</Text>
                    {analysisResult.otherMarkers.map((marker: any, idx: number) => renderMarker(marker, idx))}
                  </View>
                )}

                {analysisResult.nextSteps && analysisResult.nextSteps.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: c.brand }]}>📝 Next Steps</Text>
                    {analysisResult.nextSteps.map((step: string, idx: number) => (
                      <View key={idx} style={styles.bulletRow}>
                        <View style={[styles.bullet, { backgroundColor: c.brand }]} />
                        <Text style={[styles.sectionText, { color: c.text, flex: 1 }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {(analysisResult.disclaimer) && (
                  <View style={[styles.disclaimer, { backgroundColor: c.bg }]}>
                    <Ionicons name="warning" size={16} color={c.textSecondary} />
                    <Text style={[styles.disclaimerText, { color: c.textSecondary }]}>
                      {analysisResult.disclaimer}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <WarningModal
        visible={!!warningMessage}
        message={warningMessage || ''}
        onClose={() => setWarningMessage(null)}
      />
      <NotificationModal
        visible={!!noticeMessage}
        title="Notice"
        message={noticeMessage || ''}
        onClose={() => setNoticeMessage(null)}
      />
      <WarningModal
        visible={showLimitModal}
        title="🔒 Free Limit Reached"
        message={`You've used all ${usage.limit} free AI analyses this month.\n\nSubscribe to unlock unlimited access and continue monitoring your health.`}
        closeText="Got it"
        onClose={() => setShowLimitModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  usageContainer: { marginBottom: 16 },
  usageTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usageLabel: { fontSize: 12, fontWeight: '700' },
  usageText: { fontSize: 12, fontWeight: '600' },
  progressBarBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
  },
  upgradeText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 250,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  analyzeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  langScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  resultContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  markerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  markerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  markerValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 4,
  },
  markerRange: {
    fontSize: 12,
    marginBottom: 8,
  },
  markerInterpretation: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  disclaimer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
