import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { ProviderCard, Provider } from '../../components/search/ProviderCard';
import * as short from 'short-uuid';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';
import { getTrendingSpecialties } from '../../services/patientService';
import { algoliasearch } from 'algoliasearch';
import { createTranslator } from 'short-uuid';

// ---------------------------------------------------------------------------
// Algolia Client — mirrors web's lib/algoliaClient.js
// ---------------------------------------------------------------------------
const ALGOLIA_APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_KEY = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_ONLY_KEY!;
const ALGOLIA_INDEX = process.env.EXPO_PUBLIC_ALGOLIA_INDEX_NAME || 'doctors';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const translator = createTranslator();

const HITS_PER_PAGE = 15;

// ---------------------------------------------------------------------------
// Algolia hit → Provider mapping (from web SearchClientPage.js + DoctorCard.js)
// objectID = profile_id (full UUID). Server expects shortId for API calls.
// ---------------------------------------------------------------------------
const mapHitToProvider = (hit: any): Provider => ({
  id: hit.objectID,                   // full UUID (profile_id)
  shortId: translator.fromUUID(hit.objectID), // shortId for API calls
  full_name: hit.full_name,
  prefix: hit.prefix,
  profile_photo_url: hit.profile_photo_url,
  specialty_name: hit.specialties?.join(', ') || 'Doctor',
  years_of_experience: hit.experience_years,
  organization_name: hit.organization_name,
  organization_address: hit.organization_address,
  organization_city: hit.organization_city,
  is_booking_enabled: hit.source === 'platform',
  video_consultation_fee: hit.video_consultation_fee,
  source: hit.source,
});

export default function SearchScreen() {
  const c = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const resolved = useThemeStore((s) => s.resolved);

  const initialQuery = route.params?.initialQuery || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Update query when route params change (e.g. from Voice Search or Quick Links)
  useEffect(() => {
    if (route.params?.initialQuery) {
      setQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  // Specialty filter chips
  const [trendingSpecialties, setTrendingSpecialties] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [bookingOnly, setBookingOnly] = useState(false);

  // Ref to avoid stale closures in loadMore
  const searchParamsRef = useRef({ query: '', filters: '' });

  // Load trending specialties on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getTrendingSpecialties();
        setTrendingSpecialties((data as unknown as any[]) || []);
      } catch (err) {
        console.warn('Failed to load trending specialties', err);
      }
    })();
  }, []);

  // Build Algolia filters string
  const algoliaFilters = useMemo(() => {
    const filters: string[] = [];
    if (selectedSpecialty) filters.push(`specialties:"${selectedSpecialty}"`);
    if (bookingOnly) filters.push('source:platform');
    return filters.join(' AND ');
  }, [selectedSpecialty, bookingOnly]);

  // Core Algolia search function
  const doSearch = useCallback(async (searchQuery: string, filters: string, page: number) => {
    const result = await searchClient.searchSingleIndex({
      indexName: ALGOLIA_INDEX,
      searchParams: {
        query: searchQuery,
        filters: filters || undefined,
        hitsPerPage: HITS_PER_PAGE,
        page,
      },
    });
    return {
      hits: result.hits.map(mapHitToProvider),
      nbHits: result.nbHits ?? 0,
      nbPages: result.nbPages ?? 1,
      page: result.page ?? 0,
    };
  }, []);

  // Initial search (page 0) on query/filter change
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      searchParamsRef.current = { query, filters: algoliaFilters };
      try {
        const { hits, nbHits, nbPages, page } = await doSearch(query, algoliaFilters, 0);
        setResults(hits);
        setTotalHits(nbHits);
        setCurrentPage(page);
        setHasMore(page + 1 < nbPages);
      } catch (err: any) {
        console.error('Algolia search failed', err);
        setError('Could not complete search. Please try again.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, algoliaFilters, doSearch]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const { hits, nbPages, page } = await doSearch(
        searchParamsRef.current.query,
        searchParamsRef.current.filters,
        nextPage
      );
      setResults(prev => [...prev, ...hits]);
      setCurrentPage(page);
      setHasMore(page + 1 < nbPages);
    } catch (err) {
      console.error('Load more failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage, doSearch]);

  const handleSpecialtyChipPress = (specialtyName: string) => {
    setSelectedSpecialty(prev => (prev === specialtyName ? null : specialtyName));
  };

  const getShortId = (id: string) => {
    if (!id) return '';
    if (id.length === 36 && id.includes('-')) {
      try { 
        const translator = (short as any).createTranslator ? (short as any).createTranslator() : (short as any).default();
        return translator.fromUUID(id); 
      } catch { return id; }
    }
    return id;
  };

  const renderItem = ({ item }: { item: Provider }) => {
    const finalId = item.shortId || getShortId(item.id) || item.objectID;
    return (
      <ProviderCard
        provider={item}
        onPress={() => navigation.navigate('DoctorProfile', { doctorId: finalId })}
        onBookPress={() => navigation.navigate('DoctorProfile', { doctorId: finalId })}
      />
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={c.brand} />
        <Text style={[styles.loadingMoreText, { color: c.textSecondary }]}>Loading more...</Text>
      </View>
    );
  };

  const hasActiveFilters = !!selectedSpecialty || bookingOnly;
  const showEmptyState = !isLoading && results.length === 0 && !query.trim() && !hasActiveFilters;
  const showNoResults = !isLoading && results.length === 0 && (query.trim().length > 0 || hasActiveFilters);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Find Doctors</Text>

        <View style={[styles.searchContainer, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="search" size={20} color={c.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Doctor, specialty, clinic..."
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
            autoFocus={true}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={c.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: bookingOnly ? c.brand : c.cardAlt, borderColor: bookingOnly ? c.brand : c.border }]}
              onPress={() => setBookingOnly(prev => !prev)}
            >
              <Ionicons name="calendar-outline" size={14} color={bookingOnly ? '#fff' : c.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, { color: bookingOnly ? '#fff' : c.textSecondary }]}>Online Booking</Text>
            </TouchableOpacity>

            {trendingSpecialties.map((spec: any) => {
              const isActive = selectedSpecialty === spec.name;
              return (
                <TouchableOpacity
                  key={spec.id || spec.name}
                  style={[styles.chip, { backgroundColor: isActive ? c.brand : c.cardAlt, borderColor: isActive ? c.brand : c.border }]}
                  onPress={() => handleSpecialtyChipPress(spec.name)}
                >
                  <Text style={[styles.chipText, { color: isActive ? '#fff' : c.textSecondary }]}>{spec.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Results count */}
      {!showEmptyState && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: c.textSecondary }]}>
            {isLoading ? 'Searching...' : `${totalHits} Doctors`}
          </Text>
        </View>
      )}

      {/* Content */}
      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={c.error} />
          <Text style={[styles.errorText, { color: c.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: c.brand }]} onPress={() => doSearch(query, algoliaFilters, 0)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && results.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Searching for doctors...</Text>
        </View>
      ) : showNoResults ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No doctors found{query ? ` for "${query}"` : ''}</Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={() => { setSelectedSpecialty(null); setBookingOnly(false); }}>
              <Text style={[styles.clearFilters, { color: c.brand }]}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : showEmptyState ? (
        <View style={styles.center}>
          <Ionicons name="medical-outline" size={48} color={c.brand} style={{ opacity: 0.5 }} />
          <Text style={[styles.welcomeText, { color: c.textSecondary }]}>Search by name, specialty, or clinic</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  filterRow: { marginTop: 4 },
  chipsContainer: { gap: 8, paddingRight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 8 },
  resultsCount: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  loadingText: { fontSize: 15, marginTop: 8 },
  errorText: { fontSize: 15, textAlign: 'center' },
  retryButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  welcomeText: { fontSize: 15, textAlign: 'center', maxWidth: 200 },
  clearFilters: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  footerLoader: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  loadingMoreText: { fontSize: 13 },
});
