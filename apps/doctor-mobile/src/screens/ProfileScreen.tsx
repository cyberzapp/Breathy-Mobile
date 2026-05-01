import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store/authStore';
import { getProfileViewCount } from '../services/profileService';
import PersonalDetailsEditModal from '../components/profile/PersonalDetailsEditModal';
import EducationEditModal from '../components/profile/EducationEditModal';
import AwardsMembershipsEditModal from '../components/profile/AwardsMembershipsEditModal';
import ProfilePhotoEditor from '../components/profile/ProfilePhotoEditor';
import SuccessModal from '../components/ui/SuccessModal';
import ErrorModal from '../components/ui/ErrorModal';
import WarningModal from '../components/ui/WarningModal';
import { useColors } from '../hooks/useColors';
import { isOnline } from '../services/offlineCacheService';
import { Screen } from '../components/Screen';
// ---------------------------------------------------------------------------
// Interfaces for strict TypeScript safety
// ---------------------------------------------------------------------------
interface Organization {
  city?: string;
}

interface DoctorProfile {
  id: string;
  full_name: string;
  prefix?: string;
  about?: string;
  education?: any[];
  awards?: any[];
  memberships?: any[];
  registration_number?: string;
  council_id?: string;
  organizations?: Organization[];
  specialties?: { name: string }[];
  profile_photo_url?: string;
}

// ---------------------------------------------------------------------------
// Pure JS Base58 Encoder (Replaces 'short-uuid' dependency)
// ---------------------------------------------------------------------------
const FLICKR_BASE58 = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

const uuidToShortId = (uuid: string): string => {
  if (!uuid) return '';
  try {
    // Strip dashes and treat the hex UUID as a large number
    const hex = uuid.replace(/-/g, '');
    let num = BigInt('0x' + hex);
    let shortId = '';
    const base = BigInt(58);

    while (num > 0n) {
      const rem = Number(num % base);
      shortId = FLICKR_BASE58[rem] + shortId;
      num = num / base;
    }
    return shortId;
  } catch (e) {
    console.error('Failed to compress UUID:', e);
    return uuid; // Fallback
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const calculateProfileStrength = (profile: DoctorProfile | null): number => {
  if (!profile) return 0;
  let score = 0;
  if (profile.about) score += 25;
  if (profile.education && profile.education.length > 0) score += 25;
  if ((profile.awards && profile.awards.length > 0) || (profile.memberships && profile.memberships.length > 0)) score += 25;
  if (profile.registration_number) score += 25;
  return score;
};

const generatePublicProfileUrl = (profile: DoctorProfile): string => {
  if (!profile?.id || !profile.full_name) return '';

  const location = profile.organizations?.[0]?.city || 'india';
  const locationSlug = location.toLowerCase().replace(/\s+/g, '-');
  const nameSlug = `dr-${profile.full_name.toLowerCase().replace(/\s+/g, '-')}`;

  // Use our custom pure-JS shortener instead of short-uuid
  const shortId = uuidToShortId(profile.id);

  return `https://www.breathy.in/doctor/${locationSlug}/${nameSlug}/${shortId}`;
};

const BRAND = '#22ae9e';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Cast to our interface to fix 'any' types
  const profile = useAuthStore((s) => s.profileStatus) as DoctorProfile | null;
  const c = useColors();

  const [isEditing, setIsEditing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const profileStrength = calculateProfileStrength(profile);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      const online = await isOnline();
      if (!isMounted) return;

      setOffline(!online);

      if (online) {
        try {
          const data = await getProfileViewCount();
          if (isMounted) setViewCount((data as any)?.count ?? 0);
        } catch {
          if (isMounted) setViewCount(0);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false; // Prevents memory leaks if unmounted during fetch
    };
  }, []);

  const handleShare = async () => {
    if (!profile) return;
    try {
      const url = generatePublicProfileUrl(profile);
      const message = `Check out ${profile.prefix || 'Dr.'} ${profile.full_name}'s profile on Breathy!\n\n${url}`;

      await Share.share({
        message,
        url,
        title: `${profile.prefix || 'Dr.'} ${profile.full_name}`,
      });
    } catch (err) {
      console.error('[Profile] Share failed:', err);
      setErrorMessage('Could not open share menu.');
    }
  };

  const handlePreview = () => {
    navigation.navigate('SectionWebView', {
      title: 'Profile Preview',
      path: '/profile/preview',
    });
  };

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  const councilName = profile.council_id || '-';

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: c.bg }]}>
      {/* ─── Native Header with Back ─── */}
      <View style={[styles.screenHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: c.text }]}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Offline Banner */}
      {offline && (
        <View style={[styles.offlineBanner, { backgroundColor: c.warningBg, borderBottomColor: c.warning + '30' }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={c.warning} />
          <Text style={[styles.offlineText, { color: c.warning }]}>
            You are offline. Profile is read-only.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Profile Header Card ─── */}
        <View style={[styles.headerCard, { backgroundColor: c.card }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveModal('profilePhoto')}
          >
            {profile.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.doctorName}>
            {profile.prefix || 'Dr.'} {profile.full_name}
          </Text>
          <Text style={styles.specialties}>
            {profile.specialties?.map((s) => s.name).join(' • ') || 'Specialist'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={handlePreview} activeOpacity={0.7}>
              <Ionicons name="eye-outline" size={16} color="#64748b" />
              <Text style={styles.outlineBtnText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircleBtn} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={18} color={BRAND} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isEditing && styles.primaryBtnOutlined,
                offline && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (offline) {
                  setWarningMessage('Connect to the internet to edit your profile.');
                  return;
                }
                setIsEditing(!isEditing);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isEditing ? 'checkmark-outline' : 'create-outline'}
                size={16}
                color={isEditing ? BRAND : '#ffffff'}
              />
              <Text style={[styles.primaryBtnText, isEditing && styles.primaryBtnTextOutlined]}>
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. Analytics Row ─── */}
        <View style={styles.analyticsRow}>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsIconCircle}>
              <Ionicons name="eye-outline" size={22} color={BRAND} />
            </View>
            <View>
              <Text style={styles.analyticsValue}>
                {viewCount !== null ? viewCount : '…'}
              </Text>
              <Text style={styles.analyticsLabel}>Profile Views</Text>
            </View>
          </View>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.analyticsValue}>{profileStrength}%</Text>
              <Text style={styles.analyticsLabel}>Profile Strength</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${profileStrength}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ─── 3. About Me ─── */}
        <ProfileSection
          title="About Me"
          icon="person-outline"
          isEditing={isEditing}
          onEdit={() => setActiveModal('personal')}
        >
          <Text style={styles.sectionBodyText}>
            {profile.about || 'Add a bio...'}
          </Text>
        </ProfileSection>

        {/* ─── 4. Education & Qualifications ─── */}
        <ProfileSection
          title="Education & Qualifications"
          icon="school-outline"
          isEditing={isEditing}
          onEdit={() => setActiveModal('education')}
        >
          {profile.education && profile.education.length > 0 ? (
            profile.education.map((edu: any, i: number) => {
              const degStr = typeof edu.degree === 'object' ? (edu.degree?.label || edu.degree?.value || '') : (edu.degree || '');
              const uniStr = typeof edu.university === 'object' ? (edu.university?.label || edu.university?.value || '') : (edu.university || '');
              
              return (
                <View key={`edu-${i}`} style={styles.eduItem}>
                  <Text style={styles.eduDegree}>{degStr}</Text>
                  <Text style={styles.eduUniversity}>
                    {uniStr}{edu.passing_year ? `, ${edu.passing_year}` : ''}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.placeholderText}>Add your educational qualifications.</Text>
          )}
        </ProfileSection>

        {/* ─── 4.5. Specialties ─── */}
        <ProfileSection
          title="Specialties"
          icon="medical-outline"
          isEditing={isEditing}
          onEdit={() => setActiveModal('education')}
        >
          {profile.specialties && profile.specialties.length > 0 ? (
            <View style={styles.chipsContainer}>
              {profile.specialties.map((sp: any, idx: number) => (
                <View key={`spec-${idx}`} style={styles.chip}>
                  <Text style={styles.chipText}>{sp.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholderText}>Add your specialties.</Text>
          )}
        </ProfileSection>

        {/* ─── 5. Registration & ID ─── */}
        <ProfileSection
          title="Registration & ID"
          icon="document-text-outline"
          isEditing={isEditing}
          onEdit={() => {
            Linking.openURL('mailto:support@breathy.in?subject=Registration%20Update%20Request');
          }}
        >
          <KeyValueRow label="Registration Number" value={profile.registration_number} />
          <KeyValueRow label="Council" value={councilName} />
        </ProfileSection>

        {/* ─── 6. Awards & Memberships ─── */}
        <ProfileSection
          title="Awards & Memberships"
          icon="ribbon-outline"
          isEditing={isEditing}
          onEdit={() => setActiveModal('awards')}
        >
          {/* Awards */}
          {profile.awards && profile.awards.length > 0 ? (
            profile.awards.map((award: any, i: number) => (
              <KeyValueRow
                key={`award-${i}`}
                label={award.year_conferred?.toString() || 'Award'}
                value={award.award_name}
              />
            ))
          ) : (
            <Text style={styles.placeholderText}>No awards listed.</Text>
          )}

          {(profile.memberships && profile.memberships.length > 0) && <View style={styles.divider} />}

          {/* Memberships */}
          {profile.memberships && profile.memberships.length > 0 ? (
            profile.memberships.map((mem: any, i: number) => (
              <KeyValueRow
                key={`mem-${i}`}
                label="Membership"
                value={mem.association_name}
              />
            ))
          ) : (
            <Text style={styles.placeholderText}>No memberships listed.</Text>
          )}
        </ProfileSection>
      </ScrollView>

      {/* ─── Modals ─── */}
      {activeModal === 'profilePhoto' && (
        <ProfilePhotoEditor
          visible={true}
          onClose={() => setActiveModal(null)}
          onSuccess={(msg: string) => { setActiveModal(null); setSuccessMessage(msg); }}
          currentPhoto={profile.profile_photo_url}
        />
      )}
      {activeModal === 'personal' && (
        <PersonalDetailsEditModal
          visible={true}
          onClose={() => setActiveModal(null)}
          onSuccess={(msg: string) => { setActiveModal(null); setSuccessMessage(msg); }}
          profile={profile}
        />
      )}
      {activeModal === 'education' && (
        <EducationEditModal
          visible={true}
          onClose={() => setActiveModal(null)}
          onSuccess={(msg: string) => { setActiveModal(null); setSuccessMessage(msg); }}
          profile={profile}
        />
      )}
      {activeModal === 'awards' && (
        <AwardsMembershipsEditModal
          visible={true}
          onClose={() => setActiveModal(null)}
          onSuccess={(msg: string) => { setActiveModal(null); setSuccessMessage(msg); }}
          profile={profile}
        />
      )}

      {/* ─── Custom Success Modal ─── */}
      <SuccessModal
        visible={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        message={successMessage || ''}
      />
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ProfileSection({
  title,
  icon,
  isEditing,
  onEdit,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  isEditing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIconCircle}>
            <Ionicons name={icon} size={18} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {isEditing && (
          <TouchableOpacity onPress={onEdit} activeOpacity={0.7} style={styles.editIconBtn}>
            <Ionicons name="pencil" size={16} color={BRAND} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function KeyValueRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value || '-'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
  },
  screenTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  offlineText: { fontSize: 13, fontWeight: '500', flex: 1 },

  headerCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 42, fontWeight: '700', color: BRAND },
  cameraBadge: {
    position: 'absolute', bottom: 4, right: 4, width: 30, height: 30, borderRadius: 15,
    backgroundColor: BRAND, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#ffffff',
  },
  doctorName: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginTop: 16, textAlign: 'center' },
  specialties: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  iconCircleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: BRAND,
  },
  primaryBtnOutlined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: BRAND },
  primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  primaryBtnTextOutlined: { color: BRAND },

  analyticsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  analyticsCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  analyticsIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center',
  },
  analyticsValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  analyticsLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: BRAND, borderRadius: 4 },

  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0fdfa', justifyContent: 'center', alignItems: 'center',
  },
  sectionBody: { paddingLeft: 48 },
  sectionBodyText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  placeholderText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },

  eduItem: { marginBottom: 12 },
  eduDegree: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  eduUniversity: { fontSize: 13, color: '#64748b', marginTop: 2 },

  kvRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  kvLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500', flex: 1 },
  kvValue: { fontSize: 14, color: '#1e293b', fontWeight: '600', flex: 2, textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  chipText: { fontSize: 13, color: '#334155', fontWeight: '500' },
});