import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getPublicClinicProfile } from '../../services/patientService';
import ErrorModal from '../../components/ui/ErrorModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as short from 'short-uuid';

const translator = (short as any).createTranslator ? (short as any).createTranslator() : ((short as any).default ? (short as any).default() : (short as any)());

export default function ClinicProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const { shortId } = route.params || {};

  const [clinic, setClinic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!shortId) {
      setErrorMessage('Clinic ID not provided.');
      navigation.goBack();
      return;
    }
    fetchClinicProfile();
  }, [shortId]);

  const fetchClinicProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getPublicClinicProfile(shortId);
      setClinic(data);
    } catch (error) {
      console.error('Failed to load clinic profile', error, { source: 'ClinicProfileScreen' });
      setErrorMessage('Could not load clinic profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  if (!clinic) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={[styles.errorText, { color: c.textSecondary }]}>Clinic not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} bounces={false}>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {clinic.cover_image ? (
            <Image 
              source={{ uri: clinic.cover_image }} 
              style={styles.coverImage} 
            />
          ) : (
            <LinearGradient
              colors={['#1b8c7f', '#22ae9e', '#2dd4bf']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            >
              <View style={styles.coverPattern}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={[styles.patternCircle, {
                    width: 60 + i * 20,
                    height: 60 + i * 20,
                    borderRadius: 30 + i * 10,
                    top: 20 + (i % 3) * 50,
                    left: 30 + (i % 4) * 70,
                    opacity: 0.08 + i * 0.02,
                  }]} />
                ))}
              </View>
            </LinearGradient>
          )}
          {/* Back Button Overlay */}
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 10 }]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.logoContainer, { borderColor: c.border }]}>
            {clinic.logo_url ? (
              <Image 
                source={{ uri: clinic.logo_url }} 
                style={styles.logo} 
              />
            ) : (
              <View style={[styles.logo, { backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="business" size={36} color="#22ae9e" />
              </View>
            )}
          </View>
          
          <Text style={[styles.clinicName, { color: c.text }]}>{clinic.name}</Text>
          <Text style={[styles.clinicType, { color: c.brand }]}>
            {clinic.specialties?.join(', ') || 'General Practice'}
          </Text>

          <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={c.textSecondary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: c.text }]}>
                {clinic.address}, {clinic.city}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={c.textSecondary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: c.text }]}>
                {clinic.working_hours || '9:00 AM - 5:00 PM'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={c.textSecondary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: c.text }]}>
                {clinic.phone_number || 'Not available'}
              </Text>
            </View>
          </View>

          {clinic.is_directory_entry && (
            <View style={{ marginTop: 16, padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', borderStyle: 'dashed' }}>
              <Text style={{ color: '#1e40af', fontWeight: '600', marginBottom: 12 }}>Is this your clinic?</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '500' }}>Claim This Clinic</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>About</Text>
          <Text style={[styles.aboutText, { color: c.textSecondary }]}>
            {clinic.description || 'A state-of-the-art medical facility dedicated to providing the highest quality care to our patients.'}
          </Text>

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Doctors at this Location</Text>
          {(!clinic.doctors || clinic.doctors.length === 0) ? (
            <View style={{ padding: 24, backgroundColor: c.card, borderRadius: 12, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.textSecondary, textAlign: 'center' }}>No doctors currently listed for this location.</Text>
            </View>
          ) : (
            clinic.doctors.map((doc: any, index: number) => {
              const finalId = translator.fromUUID(doc.profile_id);
              return (
                <TouchableOpacity 
                  key={index}
                  style={[styles.doctorCard, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => navigation.navigate('DoctorProfile', { doctorId: finalId })}
                >
                {doc.profile_photo_url ? (
                  <Image 
                    source={{ uri: doc.profile_photo_url }} 
                    style={styles.doctorAvatar} 
                  />
                ) : (
                  <View style={[styles.doctorAvatar, { backgroundColor: c.brandBg || '#e0f2f1', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: c.brand, fontSize: 20, fontWeight: '700' }}>
                      {doc.full_name?.charAt(0)?.toUpperCase() || 'D'}
                    </Text>
                  </View>
                )}
                <View style={styles.doctorInfo}>
                  <Text style={[styles.doctorName, { color: c.text }]}>{doc.prefix || 'Dr.'} {doc.full_name}</Text>
                  <Text style={[styles.doctorSpec, { color: c.textSecondary }]}>
                    {doc.specialty || doc.primary_specialty || 'Doctor'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
              </TouchableOpacity>
              );
            })
          )}

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Location</Text>
          <View style={{ height: 200, backgroundColor: c.card, borderRadius: 12, borderColor: c.border, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="map-outline" size={48} color={c.textTertiary} />
            <Text style={{ color: c.textSecondary, marginTop: 8 }}>Map data unavailable</Text>
          </View>
        </View>
      </ScrollView>


      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  coverContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    marginTop: -40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  clinicName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  clinicType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    width: 24,
    marginRight: 12,
  },
  infoText: {
    fontSize: 15,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  doctorSpec: {
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  bookButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  coverPattern: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});
