import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabaseClient';
import { decode } from 'base64-arraybuffer';
import short from 'short-uuid';
import { Logger } from '../utils/logger';

// INDUSTRY STANDARD: Import the pure native Skia component
import { SkiaSignaturePad, SignaturePadRef } from '../components/ui/SkiaSignaturePad';
import WarningModal from '../components/ui/WarningModal';
import ErrorModal from '../components/ui/ErrorModal';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to the New Native App',
    description: 'We have completely rebuilt the doctor dashboard to be faster, smoother, and fully native to your phone. Experience split-second patient loading and real-time waitlists.',
    icon: 'speedometer-outline',
    color: '#0ea5e9'
  },
  {
    id: '2',
    title: 'Advanced Prescription Settings',
    description: 'Manage your clinic locations, print styles, layout colors, and generic medication toggles directly from the new native settings module.',
    icon: 'document-text-outline',
    color: '#10b981'
  },
  {
    id: '3',
    title: 'Receptionist & Kiosk Control',
    description: 'Generate check-in QR codes for multiple branches and seamlessly issue or revoke front-desk access for your staff in one tap.',
    icon: 'qr-code-outline',
    color: '#f59e0b'
  },
  {
    id: '4',
    title: 'Set Your Digital Signature',
    description: 'Before you jump in, draw your official signature. This securely attaches to your digital prescriptions and invoices automatically.',
    icon: 'pencil-outline',
    color: '#8b5cf6',
    isSignature: true,
  }
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // UX TRICK: Lock the FlatList scroll when the user is actively drawing
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const signatureRef = useRef<SignaturePadRef>(null);
  
  const setHasSeenNativeOnboarding = useAppStore((s) => s.setHasSeenNativeOnboarding);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = () => {
    // If they skip, they enter the app without signing
    setHasSeenNativeOnboarding(true);
  };

  const handleConfirmSignature = async () => {
    // 1. Instantly grab the base64 from our Skia Canvas
    const base64Data = signatureRef.current?.getBase64();

    if (!base64Data) {
      setWarningMessage('Please draw a signature first.');
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // 2. Skia returns raw base64 (no data:image/png prefix), so we just generate the name and upload
      const fileName = `${user.id}_${short.generate()}.png`;
      
      const { data, error } = await supabase.storage
        .from('doctor-signatures')
        .upload(fileName, decode(base64Data), { contentType: 'image/png', upsert: true });

      if (error) throw error;

      // 3. Update doctor profile with signature path
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ signature_url: data.path })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 4. Finish onboarding
      setHasSeenNativeOnboarding(true);
    } catch (e) {
      Logger.error('Onboarding profile fetch failed', e, { source: 'OnboardingScreen' });
      setErrorMessage('Failed to save signature. You can try again later in Settings.');
      setHasSeenNativeOnboarding(true); // let them through anyway
    } finally {
      setIsUploading(false);
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    if (item.isSignature) {
      return (
        <View style={styles.slide}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={48} color={item.color} />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          
          <View style={styles.signatureContainer}>
             <View style={styles.signatureCanvasWrapper}>
               <SkiaSignaturePad
                  ref={signatureRef}
                  onDrawStart={() => setScrollEnabled(false)} // Prevents FlatList swipe
                  onDrawEnd={() => setScrollEnabled(true)}    // Re-enables FlatList swipe
               />
             </View>
             
             <TouchableOpacity style={styles.clearBtn} onPress={() => signatureRef.current?.clear()}>
               <Text style={styles.clearBtnText}>Clear Pad</Text>
             </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={80} color={item.color} />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 && (
           <TouchableOpacity onPress={handleSkip}>
             <Text style={styles.skipBtn}>Skip tour</Text>
           </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        scrollEnabled={scrollEnabled} // Controlled dynamically by Skia
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index.toString()}
              style={[
                styles.dot,
                currentIndex === index ? styles.dotActive : null
              ]}
            />
          ))}
        </View>

        {currentIndex === SLIDES.length - 1 ? (
          <TouchableOpacity 
             style={[styles.primaryBtn, { backgroundColor: '#8b5cf6' }]} 
             onPress={handleConfirmSignature}
             disabled={isUploading}
          >
            <Text style={styles.primaryBtnText}>{isUploading ? 'Saving...' : 'Save Signature & Enter'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
      <WarningModal
        visible={!!warningMessage}
        message={warningMessage || ''}
        onClose={() => setWarningMessage(null)}
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { height: 50, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 24, zIndex: 10 },
  skipBtn: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  slide: { width, alignItems: 'center', paddingHorizontal: 32, paddingTop: height * 0.05 },
  iconContainer: { width: 140, height: 140, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 },
  
  signatureContainer: { width: '100%', height: 200, marginTop: 30, position: 'relative' },
  signatureCanvasWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  clearBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, zIndex: 10 },
  clearBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  
  footer: { paddingHorizontal: 32, paddingBottom: 40, paddingTop: 20 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: '#14b8a6' },
  primaryBtn: { backgroundColor: '#14b8a6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  primaryBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' }
});