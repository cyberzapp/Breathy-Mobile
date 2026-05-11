import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getPublicClinicProfile } from '../../services/patientService';
export default function ClinicProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const { shortId } = route.params || {};

  const [clinic, setClinic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shortId) {
      Alert.alert('Error', 'Clinic ID not provided.');
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
      Alert.alert('Error', 'Could not load clinic profile.');
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
          <Image 
            source={{ uri: clinic.cover_image || 'https://via.placeholder.com/600x300' }} 
            style={styles.coverImage} 
          />
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
            <Image 
              source={{ uri: clinic.logo_url || 'https://via.placeholder.com/100' }} 
              style={styles.logo} 
            />
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

          <Text style={[styles.sectionTitle, { color: c.text }]}>About</Text>
          <Text style={[styles.aboutText, { color: c.textSecondary }]}>
            {clinic.description || 'A state-of-the-art medical facility dedicated to providing the highest quality care to our patients.'}
          </Text>

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Our Doctors</Text>
          {clinic.doctors?.map((doc: any, index: number) => (
            <TouchableOpacity 
              key={index}
              style={[styles.doctorCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => navigation.navigate('DoctorProfile', { doctorId: doc.id })}
            >
              <Image 
                source={{ uri: doc.profile_photo_url || 'https://via.placeholder.com/50' }} 
                style={styles.doctorAvatar} 
              />
              <View style={styles.doctorInfo}>
                <Text style={[styles.doctorName, { color: c.text }]}>Dr. {doc.full_name}</Text>
                <Text style={[styles.doctorSpec, { color: c.textSecondary }]}>
                  {doc.specialty}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Book Appointment CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20, backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: c.brand }]}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.bookButtonText}>View Availability</Text>
        </TouchableOpacity>
      </View>
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
});
