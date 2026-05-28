import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scanFoodImage, logFoodItem } from '../../services/patientService';
import dayjs from 'dayjs';

const { width, height } = Dimensions.get('window');

export default function FoodScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [CameraView, setCameraView] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const CameraModule = require('expo-camera');
        const { Camera } = CameraModule;
        setCameraView(() => CameraModule.CameraView || Camera);
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (e) {
        console.warn('Camera not available', e);
        setHasPermission(false);
      }
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 0.5,
        base64: false,
      });
      setCapturedImage(photo.uri);
      analyzeImage(photo.uri);
    } catch (e) {
      console.warn('Failed to take picture', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const analyzeImage = async (uri: string) => {
    try {
      setIsAnalyzing(true);
      const response = await scanFoodImage(uri);
      if (response) {
        setResult(response);
      }
    } catch (e) {
      console.error('Failed to analyze image', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogMeal = async () => {
    if (!result) return;
    try {
      await logFoodItem({
        date: dayjs().format('YYYY-MM-DD'),
        food_name: result.food_name || 'Unknown Food',
        calories: result.calories || 0,
        protein_g: result.protein_g || 0,
        carbs_g: result.carbs_g || 0,
        fats_g: result.fats_g || 0,
        image_url: null,
      });
      navigation.goBack();
    } catch (e) {
      console.error('Failed to log meal', e);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
  };

  if (hasPermission === null) return <View style={styles.container} />;
  if (hasPermission === false) return <Text style={{ marginTop: 100, textAlign: 'center' }}>No access to camera</Text>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Viewfinder */}
      <View style={styles.cameraContainer}>
        {!capturedImage ? (
          CameraView && (
            <View style={styles.camera}>
              <CameraView 
                style={StyleSheet.absoluteFillObject} 
                ref={(ref: any) => setCameraRef(ref)}
              />
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.scanFrame} />
              </View>
            </View>
          )
        ) : (
          <Image source={{ uri: capturedImage }} style={styles.camera} />
        )}
      </View>

      {/* Controls or Results */}
      {!capturedImage ? (
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom || 24 }]}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={isCapturing}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.resultSheet, { paddingBottom: insets.bottom || 24 }]}>
          {isAnalyzing ? (
            <View style={styles.analyzingState}>
              <ActivityIndicator size="large" color="#22ae9e" />
              <Text style={styles.analyzingText}>Analyzing food...</Text>
            </View>
          ) : result ? (
            <View style={styles.resultContent}>
              <Text style={styles.resultTitle}>{result.food_name || 'Unknown Food'}</Text>
              
              <View style={styles.macrosRow}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{result.calories}</Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{result.protein_g}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{result.carbs_g}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{result.fats_g}g</Text>
                  <Text style={styles.macroLabel}>Fats</Text>
                </View>
              </View>
              
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logBtn} onPress={handleLogMeal}>
                  <Text style={styles.logBtnText}>Log Meal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.analyzingState}>
              <Text style={{ color: '#EF4444' }}>Failed to analyze image.</Text>
              <TouchableOpacity onPress={handleRetake} style={{ marginTop: 16 }}>
                <Text style={{ color: '#22ae9e', fontWeight: 'bold' }}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: width * 0.75,
    height: width * 0.75,
    borderWidth: 2,
    borderColor: '#22ae9e',
    borderRadius: 24,
    backgroundColor: 'transparent',
    shadowColor: '#22ae9e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  bottomControls: {
    backgroundColor: '#000',
    paddingTop: 24,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  resultSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  analyzingState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    marginTop: 16,
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '500',
  },
  resultContent: {
    
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  macroLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  retakeBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 16,
  },
  logBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22ae9e',
    alignItems: 'center',
  },
  logBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
