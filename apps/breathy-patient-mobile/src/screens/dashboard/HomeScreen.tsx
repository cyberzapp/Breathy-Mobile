import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../hooks/useColors';
import SearchDoctorAction from '../../components/dashboard/SearchDoctorAction';
import AiReportWidget from '../../components/dashboard/AiReportWidget';
import ConnectWidget from '../../components/dashboard/ConnectWidget';
import HealthHubWidget from '../../components/dashboard/HealthHubWidget';
import OnboardingModal from '../../components/dashboard/OnboardingModal';

// ---------------------------------------------------------------------------
// Profile Completion Card — mirrors web's ProfileCompletionCard
// ---------------------------------------------------------------------------
function ProfileCompletionCard({ profile, c }: { profile: any; c: any }) {
  if (!profile) return null;

  // Web formula: ((full_name ? 1 : 0) + (profile_photo_url ? 1 : 0) + 1) / 3 * 100
  // The +1 is for phone which is always filled (required for login)
  const filledCount =
    (profile.full_name ? 1 : 0) +
    (profile.profile_photo_url ? 1 : 0) +
    1; // phone always counted
  const percentage = Math.round((filledCount / 3) * 100);

  if (percentage === 100) return null; // Don't show if complete

  return (
    <View style={[styles.completionCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.completionHeader}>
        <View style={[styles.completionAvatar, { backgroundColor: c.brandBg }]}>
          <Text style={{ color: c.brand, fontSize: 20, fontWeight: '700' }}>
            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.completionTextContainer}>
          <Text style={[styles.completionTitle, { color: c.text }]}>
            Complete your profile
          </Text>
          <Text style={[styles.completionSubtitle, { color: c.textSecondary }]}>
            Personalize your Breathy experience
          </Text>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: c.brand, width: `${percentage}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: c.textSecondary }]}>
        {percentage}% Complete
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
export default function HomeScreen({ navigation }: any) {
  const { session, profile, needsOnboarding } = useAuthStore();
  const c = useColors();
  const insets = useSafeAreaInsets();

  // Use profile name if available, fall back to phone
  const displayName = profile?.full_name || session?.user?.phone || 'User';
  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Onboarding modal for new users */}
      {needsOnboarding && <OnboardingModal />}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.greeting, { color: c.textSecondary }]}>Hello,</Text>
            <Text style={[styles.userName, { color: c.text }]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: c.brandBg }]}>
            {profile?.profile_photo_url ? (
              <Text style={{ color: c.brand, fontWeight: '700', fontSize: 18 }}>{initial}</Text>
            ) : (
              <Text style={{ color: c.brand, fontWeight: '700', fontSize: 18 }}>{initial}</Text>
            )}
          </View>
        </View>

        {/* Profile Completion */}
        <ProfileCompletionCard profile={profile} c={c} />

        {/* Global Search */}
        <SearchDoctorAction onPress={() => navigation.navigate('Search')} />

        {/* Widgets Grid */}
        <AiReportWidget onPress={() => navigation.navigate('AiAnalyzer')} />
        <ConnectWidget onPress={() => navigation.navigate('Connect')} />
        <HealthHubWidget />
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile completion card
  completionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  completionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completionTextContainer: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  completionSubtitle: {
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
});
