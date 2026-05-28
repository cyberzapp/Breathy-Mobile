import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { getMyTreatmentPlans } from '../../services/patientService';
import dayjs from 'dayjs';

const AccordionItem = ({ item, c }: { item: any; c: any }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const bodyStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expanded ? 1 : 0),
      maxHeight: withTiming(expanded ? 1000 : 0),
    };
  });

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.headerInfo}>
          <Text style={[styles.planTitle, { color: c.text }]}>{item.plan_title}</Text>
          <Text style={[styles.planDate, { color: c.textSecondary }]}>
            Started {dayjs(item.start_date).format('MMM D, YYYY')}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={c.textTertiary} />
      </TouchableOpacity>
      
      <Animated.View style={[styles.cardBody, bodyStyle]}>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        
        <View style={styles.doctorInfo}>
          {item.doctor?.profile_photo_url ? (
            <Image source={{ uri: item.doctor.profile_photo_url }} style={styles.doctorAvatar} />
          ) : (
            <View style={[styles.doctorAvatar, { backgroundColor: c.brandBg || '#e0f2f1', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: c.brand, fontSize: 18, fontWeight: '700' }}>
                {item.doctor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.doctorName, { color: c.text }]}>Dr. {item.doctor?.full_name}</Text>
            <Text style={[styles.clinicName, { color: c.textSecondary }]}>{item.clinic?.name || 'Clinic'}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Diagnosis & Description</Text>
          <Text style={[styles.sectionText, { color: c.textSecondary }]}>{item.description}</Text>
        </View>

        {item.progress_notes && item.progress_notes.length > 0 && (
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Progress Notes</Text>
            {item.progress_notes.map((note: any, idx: number) => (
              <View key={idx} style={[styles.noteBox, { backgroundColor: c.bg }]}>
                <Text style={[styles.noteDate, { color: c.textTertiary }]}>
                  {dayjs(note.date).format('MMM D, YYYY h:mm A')}
                </Text>
                <Text style={[styles.noteText, { color: c.textSecondary }]}>{note.note}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default function TreatmentPlansScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const response = await getMyTreatmentPlans();
      // Assume API returns data directly or inside data property
      const data = (response as any)?.data || response;
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load treatment plans', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Treatment Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={48} color={c.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Active Plans</Text>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>Your doctor will create a treatment plan if needed.</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 100)}>
              <AccordionItem item={item} c={c} />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  listContent: { padding: 16 },
  
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  planDate: {
    fontSize: 14,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  clinicName: {
    fontSize: 13,
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  noteBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
