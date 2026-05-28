import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import ErrorModal from '../../components/ui/ErrorModal';
import SuccessModal from '../../components/ui/SuccessModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import {
  getPatientProfile,
  updatePatientProfile,
  getAvatarUploadUrl,
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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      setProfilePhotoUrl(data.profile_photo_url || null);
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
        setProfilePhotoUrl(storeProfile.profile_photo_url || null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
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
        profile_photo_url: profilePhotoUrl || undefined,
      });

      // Refresh the global auth store so HomeScreen reflects changes immediately
      await fetchProfile();
      
      setSuccessMessage('Profile updated successfully!');
    } catch (err: any) {
      console.error('[ProfileScreen] Failed to update profile:', err.message);
      setErrorMessage(err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setIsUploadingAvatar(true);
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop() || 'jpeg';
      const fileName = `${Date.now()}.${fileExt}`;
      const fileType = `image/${fileExt}`;

      // Get pre-signed URL from backend
      const uploadData: any = await getAvatarUploadUrl({
        fileName,
        fileType,
      });

      // Upload binary to Supabase Storage via pre-signed URL
      const uploadResult = await FileSystem.uploadAsync(uploadData.signedUrl, asset.uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': fileType,
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error('Failed to upload image to storage');
      }

      // Set public URL in state
      setProfilePhotoUrl(uploadData.profilePhotoUrl);
    } catch (error: any) {
      console.error('[ProfileScreen] Avatar upload error:', error);
      setErrorMessage(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
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
          <TouchableOpacity onPress={handleAvatarUpload} disabled={isUploadingAvatar}>
            <View>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: c.brandBg }]}>
                  <Text style={{ color: c.brand, fontSize: 32, fontWeight: '700' }}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}

              {isUploadingAvatar && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 40, justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}

              <View style={[styles.editAvatarButton, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="camera" size={16} color={c.text} />
              </View>
            </View>
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

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <SuccessModal
        visible={!!successMessage}
        message={successMessage || ''}
        onClose={() => setSuccessMessage(null)}
      />
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        isDestructive={true}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); signOut(); }}
      />
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
