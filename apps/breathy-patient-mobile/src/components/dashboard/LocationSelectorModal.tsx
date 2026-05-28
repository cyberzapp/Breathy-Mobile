import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

interface LocationOption {
  label: string;
  address: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationOption) => void;
}

export default function LocationSelectorModal({ visible, onClose, onSelect }: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode) {
        const address = [geocode.name, geocode.street, geocode.city, geocode.region]
          .filter(Boolean)
          .join(', ');
        onSelect({
          label: geocode.city || geocode.district || 'Current Location',
          address,
        });
      } else {
        onSelect({
          label: 'Current Location',
          address: `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`,
        });
      }
    } catch (e) {
      console.error('Location error:', e);
      setError('Could not get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const presetLocations: LocationOption[] = [
    { label: 'Home', address: 'Set your home address' },
    { label: 'Work', address: 'Set your work address' },
  ];

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView style={StyleSheet.absoluteFill} tint="dark" intensity={20} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        )}

        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose Location</Text>

          {/* Use Current Location */}
          <TouchableOpacity
            style={styles.currentLocationBtn}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
            activeOpacity={0.7}
          >
            <View style={styles.gpsIconWrapper}>
              {isLocating ? (
                <ActivityIndicator size="small" color="#22ae9e" />
              ) : (
                <Ionicons name="navigate" size={20} color="#22ae9e" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLocationTitle}>Use Current Location</Text>
              <Text style={styles.currentLocationSub}>Using GPS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Preset Locations */}
          <Text style={styles.sectionLabel}>SAVED PLACES</Text>
          {presetLocations.map((loc, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.locationRow}
              onPress={() => onSelect(loc)}
              activeOpacity={0.7}
            >
              <View style={styles.locationIconWrapper}>
                <Ionicons
                  name={loc.label === 'Home' ? 'home' : 'briefcase'}
                  size={18}
                  color="#64748b"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>{loc.label}</Text>
                <Text style={styles.locationAddress}>{loc.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: height * 0.65,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0fdfa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,174,158,0.2)',
    marginBottom: 8,
  },
  gpsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,174,158,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentLocationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22ae9e',
  },
  currentLocationSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locationIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  locationAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
