import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../lib/apiClient';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useColors } from '../hooks/useColors';

// ---------------------------------------------------------------------------
// ReviewsScreen — Feedback & Reviews Tab
// ---------------------------------------------------------------------------
// Mirrors the web's FeedbackReviews.jsx. This is an online-only screen:
// when offline, we show a graceful "connect to internet" banner.
// ---------------------------------------------------------------------------

// Simple data fetching hook (Phase 2 will use React Query)
function useReviews() {
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get('/api/reviews/doctor');
        setReviews(data as unknown as any[]);
      } catch (err: any) {
        setError(err.message || 'Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { reviews, isLoading, error };
}

export default function ReviewsScreen() {
  const { isOnline } = useNetworkStatus();
  const { reviews, isLoading, error } = useReviews();
  const c = useColors();

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg =
      total > 0
        ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / total).toFixed(1)
        : '0.0';
    return { avg, total };
  }, [reviews]);

  // ── Offline Gate ──
  if (!isOnline) {
    return (
      <View style={[styles.offlineContainer, { backgroundColor: c.bg }]}>
        <Ionicons name="cloud-offline-outline" size={56} color={c.textTertiary} />
        <Text style={[styles.offlineTitle, { color: c.text }]}>Reviews Need Internet</Text>
        <Text style={[styles.offlineSubtitle, { color: c.textTertiary }]}>
          Please turn on your data connection or connect to Wi-Fi to view your
          patient reviews.
        </Text>
      </View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 10 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: c.text }]}>Feedback & Reviews</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <View style={[styles.statIconBox, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="star" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.statValue, { color: c.text }]}>{stats.avg}</Text>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>Rating</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <View style={[styles.statIconBox, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="chatbubbles-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={[styles.statValue, { color: c.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>Reviews</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <View style={[styles.statIconBox, { backgroundColor: '#f0fdfa' }]}>
            <Ionicons name="return-down-forward-outline" size={20} color="#14b8a6" />
          </View>
          <Text style={[styles.statValue, { color: c.text }]}>--</Text>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>Response</Text>
        </View>
      </View>

      {/* Reviews List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#cbd5e1" />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No reviews yet</Text>
          <Text style={[styles.emptySubtext, { color: c.textTertiary }]}>
            Patient reviews will appear here once they leave feedback.
          </Text>
        </View>
      ) : (
        reviews.map((review: any, index: number) => (
          <ReviewCard key={review.id || index} review={review} />
        ))
      )}
    </ScrollView>
  );
}

function ReviewCard({ review }: { review: any }) {
  const c = useColors();
  const patientName = review.patients?.full_name || 'Anonymous';
  const initial = patientName.charAt(0).toUpperCase();
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.reviewCard, { backgroundColor: c.card }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewLeft}>
          {review.patients?.profile_photo_url ? (
            <Image
              source={{ uri: review.patients.profile_photo_url }}
              style={styles.reviewAvatar}
            />
          ) : (
            <View style={[styles.reviewAvatarFallback, { backgroundColor: c.brandBg }]}>
              <Text style={[styles.reviewAvatarText, { color: c.brand }]}>{initial}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.reviewName, { color: c.text }]}>{patientName}</Text>
            <Text style={[styles.reviewDate, { color: c.textTertiary }]}>{date}</Text>
          </View>
        </View>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.rating ? 'star' : 'star-outline'}
              size={16}
              color={star <= review.rating ? '#f59e0b' : '#d1d5db'}
            />
          ))}
        </View>
      </View>
      {review.feedback_text && (
        <Text style={[styles.reviewText, { color: c.textSecondary }]}>"{review.feedback_text}"</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  // Reviews
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19 },
  reviewAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: { fontSize: 15, fontWeight: '700', color: '#0ea5e9' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  reviewDate: { fontSize: 11, color: '#94a3b8' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewText: {
    marginTop: 14,
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Offline
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8fafc',
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  offlineSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  // Empty / Error
  emptyBox: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  errorText: { fontSize: 13, color: '#ef4444', flex: 1 },
});
