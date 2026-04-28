import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../hooks/useColors';

const FAQS = [
  { q: "How do I add a new receptionist?", a: "Go to Settings > Receptionists and tap 'Add New Staff'. Enter their details to generate login credentials." },
  { q: "When are payouts processed?", a: "Funds are held in escrow for 48 hours. Cleared funds as of Friday 11:59 PM IST are paid out on Sunday." },
  { q: "How does the offline mode work?", a: "Your local database syncs automatically. If you lose internet, you can still view appointments and add walk-in patients. Data will sync once you reconnect." },
];

const FEATURES = [
  { icon: 'videocam-outline', title: 'Video Consultations', desc: 'Secure, high-quality telehealth.' },
  { icon: 'document-text-outline', title: 'Smart EMR', desc: 'AI-assisted clinical note taking.' },
  { icon: 'pencil-outline', title: 'Freehand Canvas', desc: 'Write prescriptions naturally with Apple Pencil or Stylus.' },
];

export default function HelpScreen() {
  const navigation = useNavigation();
  const c = useColors();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleContact = () => {
    Linking.openURL('mailto:suman@breathy.in?subject=Doctor%20Support%20Request');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Contact Support Card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
          <View style={styles.contactHeader}>
            <View style={[styles.iconBox, { backgroundColor: c.brandBg }]}>
              <Ionicons name="mail-outline" size={24} color={c.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Need direct assistance?</Text>
              <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>We usually respond within 2-4 hours.</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={handleContact} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Email suman@breathy.in</Text>
          </TouchableOpacity>
        </View>

        {/* How to Use / Features */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Platform Features</Text>
        <View style={[styles.card, { backgroundColor: c.card, padding: 0, overflow: 'hidden' }]}>
          {FEATURES.map((feat, i) => (
            <View key={i} style={[styles.featureRow, i !== FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
              <View style={[styles.featIcon, { backgroundColor: c.cardAlt }]}>
                <Ionicons name={feat.icon as any} size={20} color={c.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featTitle, { color: c.text }]}>{feat.title}</Text>
                <Text style={[styles.featDesc, { color: c.textTertiary }]}>{feat.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQs */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 10 }]}>Frequently Asked Questions</Text>
        <View style={{ gap: 10 }}>
          {FAQS.map((faq, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <TouchableOpacity 
                key={i} 
                style={[styles.faqCard, { backgroundColor: c.card }]} 
                activeOpacity={0.7}
                onPress={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQ, { color: c.text, flex: 1 }]}>{faq.q}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.textTertiary} />
                </View>
                {isExpanded && (
                  <View style={[styles.faqBody, { borderTopColor: c.border }]}>
                    <Text style={[styles.faqA, { color: c.textSecondary }]}>{faq.a}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  
  card: { borderRadius: 16, padding: 16, marginBottom: 20 },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, marginLeft: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  featIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  featDesc: { fontSize: 13, lineHeight: 18 },

  faqCard: { borderRadius: 14, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  faqQ: { fontSize: 15, fontWeight: '600', paddingRight: 16, lineHeight: 20 },
  faqBody: { padding: 16, paddingTop: 0 },
  faqA: { fontSize: 14, lineHeight: 22 },
});