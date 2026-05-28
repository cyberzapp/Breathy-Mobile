import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

export interface Provider {
  id: string;
  shortId?: string;
  full_name: string;
  prefix?: string;
  specialty_name?: string;
  years_of_experience?: number;
  profile_photo_url?: string;
  organization_name?: string;
  organization_address?: string;
  organization_city?: string;
  video_consultation_fee?: number;
  is_booking_enabled: boolean;
  [key: string]: any;
}

interface Props {
  provider: Provider;
  onPress: () => void;
  onBookPress: () => void;
}

export const ProviderCard = ({ provider, onPress, onBookPress }: Props) => {
  const c = useColors();

  const firstLetter = provider.full_name?.trim()?.charAt(0)?.toUpperCase() || 'D';
  const hasPhoto = !!provider.profile_photo_url;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        {/* Avatar: Photo or first-letter placeholder like web */}
        {hasPhoto ? (
          <Image
            source={{ uri: provider.profile_photo_url }}
            style={[styles.image, { borderColor: '#e2e8f0' }]}
          />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: '#e0f2f1', borderColor: '#e2e8f0' }]}>
            <Text style={styles.placeholderText}>{firstLetter}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {provider.prefix || 'Dr.'} {provider.full_name}
          </Text>
          <Text style={[styles.specialty, { color: c.brand }]} numberOfLines={1}>
            {provider.specialty_name || 'Doctor'}
          </Text>
          {provider.years_of_experience != null && (
            <Text style={[styles.experience, { color: c.textSecondary }]}>
              {provider.years_of_experience} years experience
            </Text>
          )}
        </View>
      </View>

      {/* Clinic & Address — mirrors web DoctorCard L68-83 */}
      {(provider.organization_name || provider.organization_address) && (
        <View style={styles.clinicSection}>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color={c.textTertiary} />
            <Text style={[styles.clinicName, { color: c.text }]} numberOfLines={1}>
              {provider.organization_name}
            </Text>
          </View>
          {provider.organization_address && (
            <Text style={[styles.addressText, { color: c.textSecondary }]} numberOfLines={1}>
              {provider.organization_address}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* Stats row — video fee + booking badge */}
      <View style={styles.statsRow}>
        {provider.is_booking_enabled && provider.video_consultation_fee ? (
          <View style={[styles.feePill, { backgroundColor: '#f0fdfa' }]}>
            <Ionicons name="videocam-outline" size={14} color="#0d9488" />
            <Text style={styles.feeText}>₹{provider.video_consultation_fee} Video Fee</Text>
          </View>
        ) : null}

        {provider.is_booking_enabled && (
          <View style={[styles.feePill, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            <Text style={[styles.feeText, { color: '#059669' }]}>Bookable</Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.bookButton,
          { backgroundColor: provider.is_booking_enabled ? c.brand : c.cardAlt },
        ]}
        onPress={onBookPress}
        disabled={!provider.is_booking_enabled}
      >
        <Text
          style={[
            styles.bookButtonText,
            { color: provider.is_booking_enabled ? '#fff' : c.textTertiary },
          ]}
        >
          {provider.is_booking_enabled ? 'Book Appointment' : 'View Profile'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0d9488',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  specialty: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  experience: {
    fontSize: 12,
    marginTop: 3,
  },
  clinicSection: {
    marginTop: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    marginLeft: 20,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  feePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d9488',
  },
  bookButton: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
