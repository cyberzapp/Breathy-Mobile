import React, { useEffect, useState } from 'react';
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
import { getDoctorPublicProfile } from '../../services/patientService';
export default function DoctorProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  
  const { doctorId } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) {
      setError("Doctor ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getDoctorPublicProfile(doctorId);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load doctor profile', err, { source: 'DoctorProfileScreen', doctorId });
        setError("Failed to load doctor profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [doctorId]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.error} />
        <Text style={[styles.errorText, { color: c.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: c.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: c.text }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { doctor, specialties, clinics } = profile;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Doctor Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: doctor.profile_photo_url || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
          />
          <Text style={[styles.name, { color: c.text }]}>Dr. {doctor.full_name}</Text>
          <Text style={[styles.specialties, { color: c.brand }]}>
            {specialties?.map((s: any) => s.name).join(', ') || 'General Physician'}
          </Text>
          <Text style={[styles.city, { color: c.textSecondary }]}>
            <Ionicons name="location-outline" size={14} /> {doctor.city || 'Location unavailable'}
          </Text>
        </View>

        {/* About */}
        {doctor.about && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>About</Text>
            <Text style={[styles.bodyText, { color: c.textSecondary }]}>{doctor.about}</Text>
          </View>
        )}

        {/* Clinics */}
        {clinics && clinics.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Available at</Text>
            {clinics.map((clinic: any) => (
              <View key={clinic.id} style={[styles.clinicRow, { borderBottomColor: c.border }]}>
                <Ionicons name="business" size={20} color={c.textTertiary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clinicName, { color: c.text }]}>{clinic.name}</Text>
                  <Text style={[styles.clinicAddress, { color: c.textSecondary }]}>{clinic.address}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20, backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: c.brand }]}
          onPress={() => navigation.navigate('BookingFlow', { doctorId })}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  specialties: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  city: { fontSize: 14 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  bodyText: { fontSize: 15, lineHeight: 24 },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clinicName: { fontSize: 16, fontWeight: '600' },
  clinicAddress: { fontSize: 14, marginTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  errorText: { marginTop: 12, fontSize: 16, textAlign: 'center' },
  backButton: { marginTop: 20, padding: 12, borderRadius: 8 },
});
