import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import {
  getPatientProfile,
  updatePatientProfile,
} from '../../services/patientService';

// ---------------------------------------------------------------------------
// ProfileScreen — Full profile management, mirrors web's ProfileClient.js
// ---------------------------------------------------------------------------
// Key fixes from previous version:
//   1. Fetch profile via backend API (not direct Supabase with wrong field)
//   2. Save profile via backend API (not direct Supabase write)
//   3. Added all fields the web profile page has
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const storeProfile = useAuthStore((state) => state.profile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const signOut = useAuthStore((state) => state.signOut);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State — mirrors web's profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Use the backend API — same endpoint as web's getPatientProfile()
      const data = await getPatientProfile() as any;
      
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setPhone(data.phone_no || session?.user?.phone || '');
      setDateOfBirth(data.date_of_birth || '');
      setGender(data.gender || '');
      setBloodGroup(data.blood_group || '');
      setCity(data.city || '');
    } catch (err: any) {
      console.error('[ProfileScreen] Failed to load profile:', err.message);
      // Fall back to store data if API fails
      if (storeProfile) {
        setFullName(storeProfile.full_name || '');
        setEmail(storeProfile.email || '');
        setPhone(storeProfile.phone_no || session?.user?.phone || '');
        setDateOfBirth(storeProfile.date_of_birth || '');
        setGender(storeProfile.gender || '');
        setBloodGroup(storeProfile.blood_group || '');
        setCity(storeProfile.city || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }

    setIsSaving(true);
    try {
      // Route through Express backend — same as web's updatePatientProfile()
      await updatePatientProfile({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        blood_group: bloodGroup || undefined,
        city: city.trim() || undefined,
      });

      // Refresh the global auth store so HomeScreen reflects changes immediately
      await fetchProfile();
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      console.error('[ProfileScreen] Failed to update profile:', err.message);
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: c.brandBg }]}>
            <Text style={{ color: c.brand, fontSize: 32, fontWeight: '700' }}>
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="camera" size={16} color={c.text} />
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Personal Information</Text>

          <Text style={[styles.label, { color: c.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={c.textTertiary}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={email}
            onChangeText={setEmail}
            placeholder="john@example.com"
            placeholderTextColor={c.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { color: c.textTertiary, borderColor: c.border, backgroundColor: c.bg }]}
            value={phone}
            editable={false}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Date of Birth</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.textTertiary}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Gender</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={gender}
            onChangeText={setGender}
            placeholder="Male / Female / Other"
            placeholderTextColor={c.textTertiary}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Blood Group</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g. O+, A-, B+"
            placeholderTextColor={c.textTertiary}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>City</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            placeholderTextColor={c.textTertiary}
            autoCapitalize="words"
          />
        </View>

        {/* My Health Section */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 16 }]}>My Health</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: c.border }]}
            onPress={() => navigation.navigate('HealthRecords')}
          >
            <Ionicons name="folder-outline" size={24} color={c.text} style={{ marginRight: 16 }} />
            <Text style={[styles.menuItemText, { color: c.text }]}>Medical Records</Text>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: c.border }]}
            onPress={() => navigation.navigate('Prescriptions')}
          >
            <Ionicons name="medical-outline" size={24} color={c.text} style={{ marginRight: 16 }} />
            <Text style={[styles.menuItemText, { color: c.text }]}>Prescriptions</Text>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('AiAnalyzer')}
          >
            <Ionicons name="scan-outline" size={24} color={c.text} style={{ marginRight: 16 }} />
            <Text style={[styles.menuItemText, { color: c.text }]}>AI Report Analyzer</Text>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: c.brand }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={c.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: c.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: '800' },
  scrollContent: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
    flex: 1,
    fontWeight: '600',
  },
});
