import React, { useRef, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import {
  MapPin, ChevronDown, User, Search, Mic,
  Scan, Calendar, Shield, Activity, FileSearch,
  Stethoscope, Sparkles, ChevronRight, Clock, Award, Gift, Share2, Flame, Newspaper
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import OnboardingModal from '../../components/dashboard/OnboardingModal';

const { width } = Dimensions.get('window');

// Utility Components
function UtilityItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <TouchableOpacity style={styles.utilityItem} activeOpacity={0.7}>
      <View style={styles.utilityIconWrapper}>
        {icon}
      </View>
      <Text style={styles.utilityLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SpecialtyCard({ label, tag, type }: { label: string, tag: string, type: 'hot' | 'pop' }) {
  const isHot = type === 'hot';
  return (
    <TouchableOpacity style={styles.specialtyCard} activeOpacity={0.7}>
      <View style={styles.specialtyTag}>
        {isHot ? <Flame size={10} color="#ffffff" /> : <Sparkles size={10} color="#ffffff" />}
        <Text style={styles.specialtyTagText}>{tag}</Text>
      </View>
      <Text style={styles.specialtyLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const SearchBarContent = ({ navigation }: { navigation: any }) => (
  <View style={styles.searchInputWrapper}>
    <Search size={22} color="#22ae9e" style={{ marginLeft: 12 }} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search doctors, symptoms..."
      placeholderTextColor="rgba(34,174,158,0.5)"
      onFocus={() => navigation.navigate('Search')}
    />
    <View style={styles.searchRightIcons}>
      <TouchableOpacity>
        <Mic size={20} color="rgba(34,174,158,0.6)" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.scanButton}>
        <Scan size={20} color="#22ae9e" />
      </TouchableOpacity>
    </View>
  </View>
);

export default function HomeScreen({ navigation }: any) {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const needsOnboarding = useAuthStore((state) => state.needsOnboarding);
  const insets = useSafeAreaInsets();

  const lottieRef = useRef<LottieView>(null);
  const isFocused = useIsFocused();
  const interactTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pauseAnimation = () => {
    lottieRef.current?.pause();
    if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
  };

  const resumeAnimation = () => {
    if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
    interactTimeoutRef.current = setTimeout(() => {
      if (isFocused) {
        lottieRef.current?.play();
      }
    }, 500);
  };

  useEffect(() => {
    if (isFocused) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.pause();
    }
    return () => {
      if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
    };
  }, [isFocused]);

  // Scroll animation
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Sticky search bar style
  const STICKY_THRESHOLD = insets.top + 130;

  const stickyBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [STICKY_THRESHOLD, STICKY_THRESHOLD + 20],
      [0, 1],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [STICKY_THRESHOLD, STICKY_THRESHOLD + 20],
      [-10, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
      paddingTop: insets.top + 8,
    };
  });

  return (
    <View 
      style={styles.container}
      onTouchStart={pauseAnimation}
      onTouchEnd={resumeAnimation}
    >
      {needsOnboarding && <OnboardingModal />}

      {/* Sticky Search Header (Fades in when scrolled) */}
      <Animated.View style={[styles.stickySearchContainer, stickyBarStyle]} pointerEvents="box-none">
        <SearchBarContent navigation={navigation} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        onScrollBeginDrag={pauseAnimation}
        onMomentumScrollBegin={pauseAnimation}
        onMomentumScrollEnd={resumeAnimation}
        onScrollEndDrag={resumeAnimation}
      >
        {/* 1. HERO HEADER */}
        <LinearGradient
          colors={['#1b8c7f', '#22ae9e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroSection, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.locationWrapper}>
              <MapPin size={20} color="rgba(255,255,255,0.8)" />
              <View style={styles.locationTexts}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.homeText}>Home</Text>
                  <ChevronDown size={18} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.addressText} numberOfLines={1}>Noyakhali Colony, Palashi...</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileIcon}
              onPress={() => navigation.navigate('Profile')}
            >
              <User size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBanner}>
            <Text style={styles.heroBannerTitle}>
              CARE AT <Text style={{ color: '#ffffff' }}>YOUR</Text> FINGERTIPS
            </Text>
            <TouchableOpacity style={styles.bookNowBtn} onPress={() => navigation.navigate('Search')}>
              <Text style={styles.bookNowText}>Book now</Text>
              <ChevronRight size={16} color="#22ae9e" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.mainContent}>
          {/* In-Flow Search Bar */}
          <View style={styles.inFlowSearchContainer}>
            <SearchBarContent navigation={navigation} />
          </View>

          {/* Tara AI Card */}
          <View style={styles.taraCardWrapper}>
            <LinearGradient
              colors={['#1b8c7f', '#22ae9e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taraCard}
            >
              <View style={styles.taraCardBlur1} />
              <View style={styles.taraCardBlur2} />
              <View style={styles.taraCardContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.taraLabelRow}>
                    <Image source={require('../../../assets/lady_doctor_icon.png')} style={{ width: 16, height: 16, borderRadius: 8, marginRight: 4 }} />
                    <Text style={styles.taraLabelText}>TARA AI</Text>
                  </View>
                  <Text style={styles.taraTitle}>Your Personal Doctor</Text>
                  <Text style={styles.taraSubtitle}>Available 24/7 for instant consultations</Text>
                </View>
                <TouchableOpacity style={styles.taraChatBtn}>
                  <Text style={styles.taraChatText}>Chat</Text>
                  <ChevronRight size={16} color="#22ae9e" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Action Cards */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => navigation.navigate('Search')}>
              <View style={styles.actionCardBgIcon}>
                <Stethoscope size={90} color="rgba(34,174,158,0.08)" />
              </View>
              <View>
                <Text style={styles.actionCardTitle}>Book & Find{'\n'}a Doctor</Text>
                <Text style={styles.actionCardSubtitle}>2,000+ Specialists</Text>
              </View>
              <View style={styles.actionCardBtn}>
                <ChevronRight size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#22ae9e', alignItems: 'center', justifyContent: 'center' }]} activeOpacity={0.8}>
              <LottieView
                ref={lottieRef}
                source={require('../../../assets/Scanner.json')}
                loop
                style={{ position: 'absolute', width: 180, height: 180, opacity: 0.2 }}
                resizeMode="contain"
              />
              <Text style={[styles.actionCardTitle, { color: '#ffffff', textAlign: 'center', fontSize: 18 }]}>Scan & Join</Text>
              <Text style={[styles.actionCardSubtitle, { color: 'rgba(255,255,255,0.8)', textAlign: 'center' }]}>Join to Doctors Queue</Text>
            </TouchableOpacity>
          </View>

          {/* Utility Grid */}
          <View style={styles.utilityGrid}>
            <UtilityItem icon={<FileSearch size={20} color="#22ae9e" />} label="AI Report" />
            <UtilityItem icon={<Shield size={20} color="#22ae9e" />} label="Vault" />
            <UtilityItem icon={<Calendar size={20} color="#22ae9e" />} label="Visits" />
            <UtilityItem icon={<Newspaper size={20} color="#22ae9e" />} label="Feed" />
          </View>

          {/* Recent Activities */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITIES</Text>
          </View>
          <View style={styles.recentActivityCard}>
            <View style={styles.recentActivityLeft}>
              <View style={styles.recentActivityIcon}>
                <Clock size={20} color="#22ae9e" />
              </View>
              <View>
                <Text style={styles.recentDoctorName}>Dr. Sarah Jenkins</Text>
                <Text style={styles.recentDoctorDetails}>Dermatologist • 12 Oct, 10:00 AM</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.rebookBtn}>
              <Text style={styles.rebookText}>Rebook</Text>
            </TouchableOpacity>
          </View>

          {/* Find by Specialty */}
          <View style={styles.specialtySection}>
            <Text style={styles.specialtyHeaderTitle}>Find by Specialty</Text>
            <View style={styles.specialtyGrid}>
              <SpecialtyCard label="Gynecologist" tag="Trending" type="hot" />
              <SpecialtyCard label="Homoeopath" tag="Trending" type="hot" />
              <SpecialtyCard label="Cardiology" tag="Popular" type="pop" />
              <SpecialtyCard label="General Medicine" tag="Popular" type="pop" />
            </View>
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All Specialties</Text>
              <ChevronRight size={16} color="#22ae9e" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Footer Modules */}
          <View style={styles.footerSection}>
            <TouchableOpacity style={styles.privacyBtn}>
              <Shield size={18} color="rgba(34,174,158,0.7)" style={{ marginRight: 8 }} />
              <Text style={styles.privacyText}>Check our Privacy Policies</Text>
            </TouchableOpacity>

            <View style={styles.trustCard}>
              <View style={styles.trustCardGlowLeft} />
              <View style={styles.trustCardGlowRight} />

              <View style={styles.trustBlock}>
                <View style={styles.trustIconWrapper}>
                  <Award size={26} color="#22ae9e" />
                </View>
                <Text style={styles.trustTitle}>Trusted by 10,000+ Users</Text>
                <Text style={styles.trustSubtitle}>India's leading wellness platform</Text>
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(34,174,158,0.2)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dividerLine}
              />

              <View style={styles.trustBlock}>
                <View style={styles.referIconGroup}>
                  <View style={[styles.referIconSmall, { left: -16 }]}>
                    <User size={14} color="#22ae9e" />
                  </View>
                  <View style={[styles.referIconSmall, { right: -16, backgroundColor: 'rgba(34,174,158,0.2)' }]}>
                    <User size={14} color="#22ae9e" />
                  </View>
                  <View style={styles.referIconMain}>
                    <Gift size={28} color="#22ae9e" />
                  </View>
                </View>

                <Text style={styles.trustTitle}>Refer & Earn ₹500</Text>
                <Text style={[styles.trustSubtitle, { marginBottom: 20 }]}>Invite friends and unlock premium rewards</Text>

                <TouchableOpacity style={styles.shareBtn}>
                  <Share2 size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.shareBtnText}>Share with Friends</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fafa',
  },
  inFlowSearchContainer: {
    marginTop: -42, // Pull up to overlap the hero section
    marginBottom: 8,
    zIndex: 10,
  },
  stickySearchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,174,158,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#22ae9e',
    height: 40,
  },
  searchRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(34,174,158,0.2)',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 12,
  },
  scanButton: {
    backgroundColor: 'rgba(34,174,158,0.1)',
    padding: 6,
    borderRadius: 8,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTexts: {
    justifyContent: 'center',
  },
  homeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    width: 180,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBanner: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  heroBannerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  bookNowBtn: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bookNowText: {
    color: '#22ae9e',
    fontSize: 14,
    fontWeight: '700',
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  taraCardWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  taraCard: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    minHeight: 100,
    justifyContent: 'center',
  },
  taraCardBlur1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 64,
  },
  taraCardBlur2: {
    position: 'absolute',
    left: -20,
    bottom: -20,
    width: 96,
    height: 96,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 48,
  },
  taraCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taraLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  taraLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  taraTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  taraSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  taraChatBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  taraChatText: {
    color: '#22ae9e',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    height: 144,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  actionCardBgIcon: {
    position: 'absolute',
    right: -16,
    bottom: -16,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 20,
  },
  actionCardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  actionCardBtn: {
    backgroundColor: '#22ae9e',
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  utilityItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
  },
  utilityIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,174,158,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  utilityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  recentActivityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
  },
  recentActivityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recentActivityIcon: {
    backgroundColor: 'rgba(34,174,158,0.1)',
    padding: 12,
    borderRadius: 20,
  },
  recentDoctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  recentDoctorDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rebookBtn: {
    backgroundColor: 'rgba(34,174,158,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22ae9e',
  },
  specialtySection: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
  },
  specialtyHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  specialtyCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyTag: {
    position: 'absolute',
    top: -12,
    right: 8,
    backgroundColor: '#22ae9e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  specialtyTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
  },
  specialtyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  viewAllText: {
    color: '#22ae9e',
    fontSize: 14,
    fontWeight: '700',
  },
  footerSection: {
    gap: 16,
  },
  privacyBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  trustCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  trustCardGlowLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34,174,158,0.1)',
  },
  trustCardGlowRight: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34,174,158,0.1)',
  },
  trustBlock: {
    alignItems: 'center',
  },
  trustIconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.1)',
    marginBottom: 12,
  },
  trustTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  trustSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  dividerLine: {
    height: 1,
    width: '60%',
    alignSelf: 'center',
    marginVertical: 24,
  },
  referIconGroup: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: 80,
    height: 60,
  },
  referIconMain: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.1)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  referIconSmall: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(34,174,158,0.1)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 0,
  },
  shareBtn: {
    backgroundColor: '#22ae9e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#22ae9e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  }
});
