import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

export interface Provider {
  id: string;
  full_name: string;
  prefix?: string;
  specialty_name?: string;
  years_of_experience?: number;
  profile_photo_url?: string;
  organization_name?: string;
  organization_address?: string;
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
  const placeholderUrl = `https://placehold.co/100x100/${c.brand.replace('#', '')}/${c.textInverse.replace('#', '')}?text=${firstLetter}`;
  const imageUrl = provider.profile_photo_url || placeholderUrl;

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.image, { backgroundColor: c.cardAlt }]} 
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: c.text }]}>
            {provider.prefix || 'Dr.'} {provider.full_name}
          </Text>
          <Text style={[styles.specialty, { color: c.brand }]}>
            {provider.specialty_name || 'General Physician'}
          </Text>
          {provider.years_of_experience != null && (
            <Text style={[styles.experience, { color: c.textSecondary }]}>
              {provider.years_of_experience} years experience
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <View style={styles.details}>
        {provider.organization_name && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color={c.textTertiary} />
            <Text style={[styles.detailText, { color: c.textSecondary }]} numberOfLines={1}>
              {provider.organization_name}
            </Text>
          </View>
        )}
        <View style={styles.statsRow}>
          {provider.is_booking_enabled && provider.video_consultation_fee && (
            <View style={styles.statItem}>
              <Ionicons name="videocam-outline" size={14} color={c.textTertiary} />
              <Text style={[styles.statText, { color: c.textSecondary }]}>
                ₹{provider.video_consultation_fee} Fee
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.bookButton, 
          { backgroundColor: provider.is_booking_enabled ? c.brand : c.cardAlt }
        ]} 
        onPress={onBookPress}
        disabled={!provider.is_booking_enabled}
      >
        <Text style={[
          styles.bookButtonText, 
          { color: provider.is_booking_enabled ? '#fff' : c.textTertiary }
        ]}>
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
    gap: 16,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  specialty: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  experience: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  details: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  bookButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
