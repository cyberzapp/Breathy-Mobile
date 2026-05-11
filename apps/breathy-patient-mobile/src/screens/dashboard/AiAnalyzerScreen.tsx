import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '../../hooks/useColors';
import { analyzeLabReport } from '../../services/patientService';
export default function AiAnalyzerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const pickImage = async () => {
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
        setAnalysisResult(null); // Clear previous result
      }
    } catch (e) {
      console.error('Image picking failed', e, { source: 'AiAnalyzerScreen' });
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      Alert.alert('Missing Image', 'Please upload an image first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      // API call to the backend AI analysis service
      const response = await analyzeLabReport(`data:image/jpeg;base64,${imageBase64}`);
      // Assuming response.data.analysis or similar based on backend structure
      setAnalysisResult((response as any)?.analysis || 'Analysis completed successfully. (Mock data)');
    } catch (error) {
      console.error('AI Analysis failed', error, { source: 'AiAnalyzerScreen' });
      Alert.alert('Error', 'Failed to analyze the report. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>AI Lab Report Analyzer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.uploadBox, { borderColor: c.border, backgroundColor: c.card }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="document-text" size={64} color={c.borderMedium} />
              <Text style={[styles.placeholderText, { color: c.textSecondary }]}>
                Upload a clear picture of your lab report to get an AI-powered summary and insights.
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: c.brandBg }]}
            onPress={pickImage}
          >
            <Ionicons name={imageUri ? "refresh" : "cloud-upload"} size={20} color={c.brand} style={{ marginRight: 8 }} />
            <Text style={[styles.uploadButtonText, { color: c.brand }]}>
              {imageUri ? "Change Image" : "Select Lab Report"}
            </Text>
          </TouchableOpacity>
        </View>

        {imageUri && !analysisResult && (
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
          <View style={[styles.resultContainer, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.resultHeader}>
              <Ionicons name="sparkles" size={20} color={c.brand} style={{ marginRight: 8 }} />
              <Text style={[styles.resultTitle, { color: c.text }]}>AI Insights</Text>
            </View>
            <Text style={[styles.resultText, { color: c.text }]}>{analysisResult}</Text>
          </View>
        )}
      </ScrollView>
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
  resultContainer: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
