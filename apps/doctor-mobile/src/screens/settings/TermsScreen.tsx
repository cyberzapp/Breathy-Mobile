// apps/doctor-mobile/src/screens/settings/TermsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../hooks/useColors';

export default function TermsScreen() {
  const navigation = useNavigation();
  const c = useColors();

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Policies & Terms</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.documentCard, { backgroundColor: c.card, borderColor: c.border }]}>
          
          <Text style={[styles.h1, { color: c.text }]}>Doctor Policies (Financial & Conduct)</Text>
          <Text style={[styles.paragraph, { color: c.textSecondary }]}>
            These are the rules and responsibilities for doctors on the platform.
          </Text>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Text style={[styles.h2, { color: c.text }]}>Fee Structure (Beta Program)</Text>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>•</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>In-Person Consultation: </Text>
              Breathy charges a 1% platform fee on the consultation amount after payment gateway charges are deducted.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>•</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>Video Consultation: </Text>
              Breathy charges a 2% platform fee to cover additional infrastructure costs.
            </Text>
          </View>
          <Text style={[styles.note, { color: c.textTertiary }]}>
            This is a special introductory rate and is subject to change after the beta period with 30 days' notice.
          </Text>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Text style={[styles.h2, { color: c.text }]}>Payout Schedule & Escrow</Text>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>•</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>2-Day Escrow Period: </Text>
              All payments are held by Breathy for a 48-hour period after the consultation is marked as complete. This is a mandatory holding period to protect against chargeback fraud.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>•</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>Weekly Payout Cycle: </Text>
              All cleared funds (payments for consultations completed more than 48 hours ago) as of Friday at 11:59 PM IST will be processed for payout.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>•</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>Payout Execution: </Text>
              The final payout amount will be transferred to the doctor's verified bank account on the following Sunday at approximately 12:30 AM IST.
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Text style={[styles.h2, { color: c.text }]}>Policy Violations & Financial Consequences</Text>
          <Text style={[styles.paragraph, { color: c.textSecondary, marginBottom: 8 }]}>
            <Text style={{ fontWeight: '700', color: c.text }}>Grounds for Deduction: </Text>
            A doctor will forfeit their share of a consultation fee for the following confirmed violations:
          </Text>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>-</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}><Text style={{ fontWeight: '600', color: c.text }}>Doctor No-Show:</Text> Failing to attend a scheduled appointment.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>-</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}><Text style={{ fontWeight: '600', color: c.text }}>Extreme Lateness:</Text> Arriving more than 10 minutes late for a 15-minute consultation.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>-</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}><Text style={{ fontWeight: '600', color: c.text }}>Last-Minute Cancellation:</Text> Cancelling an appointment within 12 hours for a non-emergency reason.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>-</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}><Text style={{ fontWeight: '600', color: c.text }}>Confirmed Patient Complaint:</Text> A dispute resolved in favor of the patient due to poor service or unprofessional conduct.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: c.text }]}>-</Text>
            <Text style={[styles.bulletText, { color: c.textSecondary }]}><Text style={{ fontWeight: '600', color: c.text }}>Platform Leakage:</Text> Actively directing a Breathy patient to an off-platform service for payment.</Text>
          </View>
          
          <Text style={[styles.paragraph, { color: c.textSecondary, marginTop: 12 }]}>
            <Text style={{ fontWeight: '700', color: c.text }}>Violation Notification Protocol: </Text>
            Upon confirmation of a violation, an automated notification will be sent to the doctor via Email, SMS, and WhatsApp. It will detail the specific incident, the policy violated, and the financial consequence.
          </Text>

          <Text style={[styles.paragraph, { color: c.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: c.text }}>Payout Invoice: </Text>
            Every payout will be accompanied by a detailed, itemized invoice sent via email. This invoice will clearly list all consultations, fees earned, any deductions with corresponding appointment IDs, and the final transferred amount.
          </Text>

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
  
  documentCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  divider: { height: 1, width: '100%', marginVertical: 20 },
  
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  note: { fontSize: 13, fontStyle: 'italic', marginTop: 12, lineHeight: 18 },
  
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 10 },
  bullet: { fontSize: 16, fontWeight: '800', marginRight: 8, marginTop: -2 },
  bulletText: { fontSize: 14, lineHeight: 22, flex: 1 },
});