import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  TouchableOpacity, FlatList, Linking, Dimensions,
} from 'react-native';
import WarningModal from '../../components/ui/WarningModal';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import {
  getDoctorPublicProfile, getDoctorAvailability, getDoctorBookingMetadata,
  getCalendarEvents, reserveVideoSlot,
} from '../../services/patientService';
import { addRecentDoctor } from '../../utils/recentDoctorsStore';
import * as short from 'short-uuid';

// Proper UUIDv4 generator for Supabase session locking
const generateUUIDv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate next 7 days
const generateDates = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

export default function DoctorProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const rawDoctorId = route.params?.doctorId;
  
  // Ensure doctorId is always a shortId to prevent backend UUID parsing crashes (409 Slot Taken error)
  const doctorId = useMemo(() => {
    if (!rawDoctorId) return null;
    if (rawDoctorId.length === 36 && rawDoctorId.includes('-')) {
      try { 
        const translator = (short as any).createTranslator ? (short as any).createTranslator() : (short as any).default();
        return translator.fromUUID(rawDoctorId); 
      } catch { return rawDoctorId; }
    }
    return rawDoctorId;
  }, [rawDoctorId]);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking widget state
  const [bookingType, setBookingType] = useState<'in-person' | 'video'>('in-person');
  const [dates] = useState(generateDates);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // In-person data
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  // Video data
  const [videoSlots, setVideoSlots] = useState<any[]>([]);
  const [videoFee, setVideoFee] = useState<number | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [slotWarning, setSlotWarning] = useState<string | null>(null);

  const selectedDate = dates[selectedDateIndex];

  useEffect(() => {
    if (!doctorId) { setError('Doctor ID is missing.'); setIsLoading(false); return; }
    (async () => {
      try {
        const data: any = await getDoctorPublicProfile(doctorId);
        setProfile(data);
        if (data) {
          addRecentDoctor({
            id: doctorId,
            name: data.full_name || 'Doctor',
            specialty: data.specialty_name || 'Specialist',
            viewedAt: Date.now()
          });
        }
      } catch (err) {
        setError('Failed to load doctor profile.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [doctorId]);

  // Fetch in-person sessions when date changes
  useEffect(() => {
    if (!doctorId || !selectedDate || bookingType !== 'in-person') return;
    (async () => {
      setIsSessionLoading(true);
      try {
        const data: any = await getDoctorBookingMetadata(doctorId, selectedDate);
        setSessions(data?.sessions || []);
      } catch { setSessions([]); }
      finally { setIsSessionLoading(false); }
    })();
  }, [doctorId, selectedDateIndex, bookingType]);

  // Fetch video slots when date changes
  useEffect(() => {
    if (!doctorId || !selectedDate || bookingType !== 'video') return;
    (async () => {
      setIsVideoLoading(true);
      try {
        const [avail, events]: any[] = await Promise.all([
          getDoctorAvailability(doctorId),
          getCalendarEvents({
            doctorId,
            startStr: new Date(selectedDate.getTime()).toISOString(),
            endStr: new Date(selectedDate.getTime() + 86400000 - 1).toISOString(),
          }),
        ]);
        setVideoFee(avail?.videoFee || null);
        const lockedSlots: string[] = avail?.lockedVideoSlots || [];
        const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
        const now = new Date();
        const slots: any[] = [];
        (avail?.videoSchedules || []).forEach((sched: any) => {
          if (sched.day_of_week !== dayOfWeek) return;
          const start = new Date(`${selectedDate.toDateString()} ${sched.start_time}`);
          const end = new Date(`${selectedDate.toDateString()} ${sched.end_time}`);
          for (let t = new Date(start); t < end; t.setMinutes(t.getMinutes() + 15)) {
            if (t < now) continue;
            const isBooked = (events || []).some((ev: any) => {
              const es = new Date(ev.start), ee = new Date(ev.end);
              return t >= es && t < ee;
            });
            const isLocked = lockedSlots.some((ls: string) => new Date(ls).getTime() === t.getTime());
            const h = t.getHours().toString().padStart(2, '0');
            const m = t.getMinutes().toString().padStart(2, '0');
            slots.push({ time: `${h}:${m}`, rawDate: new Date(t), isBooked, isLocked });
          }
        });
        setVideoSlots(slots);
      } catch { setVideoSlots([]); }
      finally { setIsVideoLoading(false); }
    })();
  }, [doctorId, selectedDateIndex, bookingType]);

  const handleBookInPerson = (session: any) => {
    navigation.navigate('BookingFlow', {
      doctorId,
      doctorName: profile?.full_name,
      startTime: session.predictedStartTime,
      organizationId: session.organization?.id,
      appointmentType: 'in-person',
      consultationFee: session.consultationFee,
    });
  };

  const sessionUuidsRef = useRef<{ [key: string]: string }>({});

  const handleBookVideo = async (slotTime: string) => {
    const [hours, minutes] = slotTime.split(':');
    const dt = new Date(selectedDate);
    dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const finalTime = dt.toISOString();
    
    // Reuse sessionUuid if we already generated one for this slot to prevent 409 self-conflicts
    let sessionUuid = sessionUuidsRef.current[finalTime];
    if (!sessionUuid) {
      sessionUuid = generateUUIDv4();
      sessionUuidsRef.current[finalTime] = sessionUuid;
    }

    try {
      await reserveVideoSlot({ doctorId, slotTime: finalTime, sessionUuid });
    } catch (error: any) {
      console.error('Reserve Slot Error:', error?.response?.data || error);
      setSlotWarning('Someone just started booking this slot! Please choose another time.');
      return;
    }
    navigation.navigate('BookingFlow', {
      doctorId,
      doctorName: profile?.full_name,
      startTime: finalTime,
      appointmentType: 'video',
      consultationFee: videoFee,
      sessionUuid,
    });
  };

  if (isLoading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.brand} /></View>;
  if (error || !profile) return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <Ionicons name="alert-circle-outline" size={48} color={c.error} />
      <Text style={[styles.errorText, { color: c.textSecondary }]}>{error}</Text>
      <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.card }]} onPress={() => navigation.goBack()}>
        <Text style={{ color: c.text }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // RPC get_doctor_profile returns a FLAT object (not nested)
  // Web's DoctorProfileClient.js accesses doctor.full_name, doctor.specialties, etc. directly
  const doc = profile;
  const specialties = profile.specialties || [];
  const clinics = profile.organizations || [];

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Doctor Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header — matches web DoctorProfileClient.js */}
        <View style={styles.profileSection}>
          {doc.profile_photo_url ? (
            <Image source={{ uri: doc.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>
                {doc.full_name?.trim()?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
          )}
          <Text style={[styles.name, { color: c.text }]}>Dr. {doc.full_name}</Text>

          {/* Qualifications */}
          {(profile.education || []).length > 0 && (
            <Text style={[styles.qualText, { color: c.textSecondary }]}>
              {profile.education.map((e: any) => e.degree).filter(Boolean).join(', ')}
            </Text>
          )}

          <Text style={[styles.specialtyText, { color: c.brand }]}>
            {specialties.map((s: any) => s.name).join(', ') || 'General Physician'}
          </Text>

          {doc.experience_years != null && (
            <Text style={[styles.expText, { color: c.textSecondary }]}>
              {doc.experience_years} Years Experience Overall
            </Text>
          )}

          {doc.registration_number && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.verifiedText}>Medical Registration Verified</Text>
            </View>
          )}

          <Text style={[styles.city, { color: c.textSecondary }]}>
            <Ionicons name="location-outline" size={14} /> {doc.city || 'India'}
          </Text>
        </View>

        {/* About */}
        {doc.about && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>About</Text>
            <Text style={[styles.bodyText, { color: c.textSecondary }]}>{doc.about}</Text>
          </View>
        )}

        {/* ============= BOOKING WIDGET (placed first like web) ============= */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {/* In-Person / Video Tabs */}
          <View style={[styles.tabRow, { backgroundColor: c.bg }]}>
            <TouchableOpacity
              style={[styles.tabBtn, bookingType === 'in-person' && { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
              onPress={() => setBookingType('in-person')}
            >
              <Ionicons name="business-outline" size={16} color={bookingType === 'in-person' ? c.brand : c.textSecondary} />
              <Text style={[styles.tabLabel, { color: bookingType === 'in-person' ? c.brand : c.textSecondary }]}>In-Clinic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, bookingType === 'video' && { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
              onPress={() => setBookingType('video')}
            >
              <Ionicons name="videocam-outline" size={16} color={bookingType === 'video' ? c.brand : c.textSecondary} />
              <Text style={[styles.tabLabel, { color: bookingType === 'video' ? c.brand : c.textSecondary }]}>Video</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker Strip */}
          <View style={styles.datePickerRow}>
            <TouchableOpacity onPress={() => setSelectedDateIndex(i => Math.max(0, i - 1))} disabled={selectedDateIndex === 0}>
              <Ionicons name="chevron-back" size={24} color={selectedDateIndex === 0 ? c.border : c.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[styles.dateText, { color: c.text }]}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={[styles.dateSubText, { color: c.textSecondary }]}>
                {bookingType === 'in-person'
                  ? sessions.length > 0 ? `${sessions.length} Sessions Available` : 'No Sessions'
                  : videoSlots.filter((s: any) => !s.isBooked && !s.isLocked).length > 0 ? `${videoSlots.filter((s: any) => !s.isBooked && !s.isLocked).length} Slots` : 'No Slots'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDateIndex(i => Math.min(dates.length - 1, i + 1))} disabled={selectedDateIndex === dates.length - 1}>
              <Ionicons name="chevron-forward" size={24} color={selectedDateIndex === dates.length - 1 ? c.border : c.text} />
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          {bookingType === 'in-person' ? (
            isSessionLoading ? <ActivityIndicator size="small" color={c.brand} style={{ marginVertical: 24 }} /> :
            sessions.length === 0 ? (
              <View style={styles.emptySlots}>
                <Ionicons name="business-outline" size={32} color={c.textTertiary} style={{ opacity: 0.5 }} />
                <Text style={{ color: c.textTertiary }}>No clinic sessions available.</Text>
              </View>
            ) : sessions.map((session: any) => (
              <SessionCard key={session.sessionId} session={session} selectedDate={selectedDate} c={c} onBook={() => handleBookInPerson(session)} />
            ))
          ) : (
            isVideoLoading ? <ActivityIndicator size="small" color={c.brand} style={{ marginVertical: 24 }} /> :
            videoSlots.length === 0 ? (
              <View style={styles.emptySlots}>
                <Ionicons name="videocam-outline" size={32} color={c.textTertiary} style={{ opacity: 0.5 }} />
                <Text style={{ color: c.textTertiary }}>No video slots available.</Text>
              </View>
            ) : (
              <>
                {videoFee && <Text style={[styles.feeTag, { color: c.textSecondary }]}>₹{videoFee} per consultation</Text>}
                <View style={styles.slotGrid}>
                  {(showAllSlots ? videoSlots : videoSlots.slice(0, 9)).map((slot: any) => (
                    <TouchableOpacity
                      key={slot.time}
                      disabled={slot.isBooked || slot.isLocked}
                      onPress={() => handleBookVideo(slot.time)}
                      style={[
                        styles.slotPill,
                        slot.isBooked ? { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' } :
                        slot.isLocked ? { backgroundColor: '#fff7ed', borderColor: '#fdba74' } :
                        { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' },
                      ]}
                    >
                      <Text style={[
                        styles.slotText,
                        slot.isBooked ? { color: '#9ca3af', textDecorationLine: 'line-through' } :
                        slot.isLocked ? { color: '#c2410c' } :
                        { color: '#0d9488' },
                      ]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {videoSlots.length > 9 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllSlots(prev => !prev)}
                  >
                    <Text style={[styles.showMoreText, { color: c.brand }]}>
                      {showAllSlots ? 'Show Less' : `Show All ${videoSlots.length} Slots`}
                    </Text>
                    <Ionicons name={showAllSlots ? 'chevron-up' : 'chevron-down'} size={16} color={c.brand} />
                  </TouchableOpacity>
                )}
              </>
            )
          )}
        </View>

        {/* ============ INFO SECTIONS ============ */}

        {/* Clinics / Hospitals */}
        {clinics.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={18} color={c.brand} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Clinics / Hospitals</Text>
            </View>
            {clinics.map((clinic: any) => {
              const avgFee = clinic.services?.length
                ? Math.round(clinic.services.reduce((a: number, s: any) => a + (s.fee || 0), 0) / clinic.services.length)
                : null;
              return (
                <TouchableOpacity 
                  key={clinic.id} 
                  style={[styles.clinicCard, { borderColor: c.border }]}
                  onPress={() => {
                    if (clinic.id) {
                      try {
                        const translator = (short as any).createTranslator ? (short as any).createTranslator() : (short as any).default();
                        const clinicShortId = translator.fromUUID(clinic.id);
                        navigation.navigate('ClinicProfile', { shortId: clinicShortId });
                      } catch (e) {
                        console.warn('Could not convert clinic UUID to shortId', e);
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.clinicName, { color: c.brand }]}>{clinic.name || 'Unnamed Clinic'}</Text>
                    <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                  </View>
                  <Text style={[styles.clinicAddr, { color: c.textSecondary }]}>{clinic.address || 'Address not available'}</Text>
                  {avgFee ? <Text style={[styles.clinicFee, { color: c.text }]}>Avg. Fee: ₹{avgFee}</Text> : null}
                  {clinic.contact_phone && (
                    <View style={styles.clinicContact}>
                      <Ionicons name="call-outline" size={14} color={c.textTertiary} />
                      <Text style={{ color: c.textSecondary, fontSize: 13 }}>{clinic.contact_phone}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Services Offered */}
        {(() => {
          const allServices: string[] = Array.from(new Set(clinics.flatMap((cl: any) => (cl.services || []).map((s: any) => s.service_name || s.name)).filter(Boolean))) as string[];
          if (allServices.length === 0) return null;
          return (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase-outline" size={18} color={c.brand} />
                <Text style={[styles.sectionTitle, { color: c.text }]}>Services Offered</Text>
              </View>
              <View style={styles.chipGrid}>
                {allServices.map((svc: string) => (
                  <View key={svc} style={[styles.serviceChip, { backgroundColor: c.bg }]}>
                    <Text style={[styles.serviceChipText, { color: c.text }]}>{svc}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Education & Specialization */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={18} color={c.brand} />
            <Text style={[styles.sectionTitle, { color: c.text }]}>Education & Specialization</Text>
          </View>
          {(profile.education || []).length > 0 ? (
            (profile.education || []).map((edu: any, i: number) => (
              <View key={edu.id || i} style={styles.eduItem}>
                <Text style={[styles.eduDegree, { color: c.text }]}>{edu.degree || 'N/A'}</Text>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  {edu.university || 'N/A'}{edu.year ? ` - ${edu.year}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 13, color: c.textSecondary }}>No education details available.</Text>
          )}
          {specialties.length > 0 && (
            <View style={[styles.specialtiesSection, { borderTopColor: c.border }]}>
              <Text style={[styles.subSectionTitle, { color: c.text }]}>Specialties</Text>
              <View style={styles.chipGrid}>
                {specialties.map((spec: any) => (
                  <View key={spec.id} style={[styles.serviceChip, { backgroundColor: '#f0fdfa' }]}>
                    <Text style={[styles.serviceChipText, { color: '#0d9488' }]}>{spec.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Registration Details */}
        {doc.registration_number && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={c.brand} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Registration Details</Text>
            </View>
            <View style={styles.regCard}>
              <Ionicons name="shield-checkmark" size={22} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>
                  {doc.registration_number} - {doc.council_name || 'N/A'} ({doc.registration_year || 'N/A'})
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669', marginTop: 2 }}>Verified by Breathy</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <WarningModal
        visible={!!slotWarning}
        title="Slot Taken"
        message={slotWarning || ''}
        onClose={() => setSlotWarning(null)}
      />
    </View>
  );
}

// --- Session Card (In-Person) — matches web BookingWidget.js SessionCard ---
function SessionCard({ session, selectedDate, c, onBook }: any) {
  const startStr = new Date(`${selectedDate.toDateString()} ${session.startTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = new Date(`${selectedDate.toDateString()} ${session.endTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const predictedStr = new Date(session.predictedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isDisabled = session.sessionStatus !== 'available';
  const clinicPhone = session.organization?.contact_phone;

  return (
    <View style={[styles.sessionCard, { borderColor: isDisabled ? '#e5e7eb' : '#99f6e4', opacity: isDisabled ? 0.9 : 1 }]}>
      {/* Header: Clinic name + time range */}
      <View style={styles.sessionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sessionClinic, { color: c.text }]}>
            <Ionicons name="business" size={14} color={c.brand} /> {session.organization?.name || 'Clinic Visit'}
          </Text>
          {session.organization?.address && (
            <Text style={[styles.sessionAddr, { color: c.textSecondary }]} numberOfLines={1}>{session.organization.address}</Text>
          )}
        </View>
        <Text style={[styles.sessionTime, { color: c.textSecondary }]}>{startStr} - {endStr}</Text>
      </View>

      {/* Token + Predicted Time row */}
      <View style={[styles.tokenRow, { backgroundColor: isDisabled ? '#f9fafb' : '#f0fdfa', borderColor: isDisabled ? '#e5e7eb' : '#ccfbf1' }]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.tokenLabel}>NEXT TOKEN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="ticket-outline" size={16} color={isDisabled ? '#9ca3af' : c.brand} />
            <Text style={[styles.tokenValue, { color: isDisabled ? '#9ca3af' : c.brand }]}>#{session.nextToken}</Text>
          </View>
        </View>
        <View style={[styles.tokenDivider, { backgroundColor: isDisabled ? '#d1d5db' : '#99f6e4' }]} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.tokenLabel}>PREDICTED TIME</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time-outline" size={16} color={isDisabled ? '#9ca3af' : c.brand} />
            <Text style={[styles.tokenValue, { color: isDisabled ? '#9ca3af' : c.brand, fontSize: 18 }]}>{predictedStr}</Text>
          </View>
        </View>
      </View>

      {/* Status messages — matches web L222-240 */}
      {session.sessionStatus === 'ended' ? (
        <View style={styles.statusBanner}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.statusText}>Session Ended</Text>
        </View>
      ) : session.sessionStatus === 'time_exceeded' ? (
        <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#c2410c" />
          <Text style={[styles.statusText, { color: '#c2410c' }]}>Online Booking Closed</Text>
        </View>
      ) : session.isOverbooked ? (
        <View style={[styles.statusBanner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
          <Text style={[styles.statusText, { color: '#dc2626' }]}>High demand. Expect delays.</Text>
        </View>
      ) : (
        <View style={styles.sessionMeta}>
          {session.avgWaitTime != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#0d9488" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0d9488' }}>Approx {session.avgWaitTime} min wait</Text>
            </View>
          )}
          {session.consultationFee != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Ionicons name="wallet-outline" size={14} color="#6b7280" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>₹{session.consultationFee}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action button — web L243-274: "Call Clinic" for time_exceeded, else "Book Token" */}
      {session.sessionStatus === 'time_exceeded' ? (
        clinicPhone ? (
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74' }]}
            onPress={() => Linking.openURL(`tel:${clinicPhone}`)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="call-outline" size={16} color="#9a3412" />
              <Text style={[styles.bookBtnText, { color: '#9a3412' }]}>Call Clinic to Book</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.bookBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' }]}>
            <Text style={[styles.bookBtnText, { color: '#c2410c', opacity: 0.6 }]}>No Phone Listed</Text>
          </View>
        )
      ) : (
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: isDisabled ? '#e5e7eb' : c.brand }]}
          onPress={onBook}
          disabled={isDisabled}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="ticket-outline" size={16} color={isDisabled ? '#9ca3af' : '#fff'} />
            <Text style={[styles.bookBtnText, { color: isDisabled ? '#9ca3af' : '#fff' }]}>
              {isDisabled ? 'Booking Closed' : `Book Token #${session.nextToken}`}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55, marginBottom: 12, borderWidth: 3, borderColor: '#e2e8f0' },
  avatarPlaceholder: { backgroundColor: '#e0f2f1', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 38, fontWeight: '700', color: '#0d9488' },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  qualText: { fontSize: 14, marginBottom: 4, textAlign: 'center' },
  specialtyText: { fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  expText: { fontSize: 13, marginBottom: 6 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#059669' },
  city: { fontSize: 14 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  subSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 24 },
  errorText: { marginTop: 12, fontSize: 16, textAlign: 'center' },
  backBtn: { marginTop: 20, padding: 12, borderRadius: 8 },
  // Clinic cards
  clinicCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  clinicName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  clinicAddr: { fontSize: 13, marginBottom: 4 },
  clinicFee: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  clinicContact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  // Service chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  serviceChipText: { fontSize: 13, fontWeight: '500' },
  // Education
  eduItem: { marginBottom: 10 },
  eduDegree: { fontSize: 14, fontWeight: '600' },
  specialtiesSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  // Registration
  regCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ecfdf5', padding: 14, borderRadius: 10 },
  // Booking widget
  tabRow: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dateText: { fontSize: 16, fontWeight: '700' },
  dateSubText: { fontSize: 12, marginTop: 2 },
  emptySlots: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  slotPill: { width: Math.floor((Dimensions.get('window').width - 32 - 16 - 20) / 3), paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  slotText: { fontSize: 14, fontWeight: '600' },
  feeTag: { fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, marginTop: 4 },
  showMoreText: { fontSize: 14, fontWeight: '600' },
  // Session card
  sessionCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sessionClinic: { fontSize: 15, fontWeight: '700' },
  sessionAddr: { fontSize: 12, marginTop: 2 },
  sessionTime: { fontSize: 11, fontWeight: '500', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  tokenLabel: { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5, marginBottom: 4 },
  tokenValue: { fontSize: 22, fontWeight: '800' },
  tokenDivider: { width: 1, height: 32 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  sessionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  bookBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { fontSize: 15, fontWeight: '700' },
});
