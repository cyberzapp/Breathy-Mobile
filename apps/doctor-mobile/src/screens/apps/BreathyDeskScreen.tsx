import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getOrganizations, type Organization } from '../../services/organizationService';
import { useColors } from '../../hooks/useColors';

// ---------------------------------------------------------------------------
// BreathyDeskScreen — Practice Management (Phase 2A)
// ---------------------------------------------------------------------------
// Native replica of the web's BreathyDesk.jsx.
// Shows list of doctor's practice locations (organizations).
// "Add New Location" and "Manage" open WebViews for the complex forms.
// ---------------------------------------------------------------------------

export default function BreathyDeskScreen() {
  const navigation = useNavigation<any>();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const c = useColors();
  const BRAND = c.brand;

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrganizations();
        setOrganizations(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top']} style={[styles.center, { backgroundColor: c.bg }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: c.text }]}>Breathy Desk</Text>
            <Text style={[styles.pageSubtitle, { color: c.textTertiary }]}>
              Manage your practice locations, services, fees, and more.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('SectionWebView', {
                title: 'Add New Location',
                path: '/apps/breathy-desk/new',
              })
            }
          >
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Section Label */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Your Locations</Text>

        {/* Organization Cards */}
        {organizations.length > 0 ? (
          organizations.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[styles.orgCard, { backgroundColor: c.card }]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SectionWebView', {
                  title: org.name,
                  path: `/apps/breathy-desk/${org.id}`,
                })
              }
            >
              <View style={[styles.orgIconBox, { backgroundColor: c.cardAlt }]}>
                <Ionicons name="business-outline" size={22} color="#64748b" />
              </View>
              <View style={styles.orgInfo}>
                <Text style={[styles.orgName, { color: c.text }]} numberOfLines={1}>
                  {org.name}
                </Text>
                <Text style={[styles.orgAddress, { color: c.textTertiary }]} numberOfLines={1}>
                  {org.address || 'No address added'}
                </Text>
              </View>
              <View style={styles.manageButton}>
                <Text style={styles.manageText}>Manage</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#cbd5e1" />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No locations found</Text>
            <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
              Get started by adding your first practice location.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  errorText: { marginTop: 12, fontSize: 14, color: '#ef4444', textAlign: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  pageSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 220 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#22ae9e', // Hardcoded fallback for BRAND
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 14,
  },

  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  orgIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  orgAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manageText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
});