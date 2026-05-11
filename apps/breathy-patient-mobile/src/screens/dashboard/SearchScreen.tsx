import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import apiClient from '../../lib/apiClient';
import { ProviderCard, Provider } from '../../components/search/ProviderCard';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';

export default function SearchScreen() {
  const c = useColors();
  const navigation = useNavigation<any>();
  const resolved = useThemeStore((s) => s.resolved);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get('/api/public/directory/search', {
        params: { q: searchQuery },
      }) as any;
      
      // The search directory endpoint usually returns { doctors: [], clinics: [] }
      // or a flattened list depending on the API. Replicating DoctorCard logic:
      setResults(data.doctors || []);
    } catch (err: any) {
      console.error('Search failed', err, { source: 'SearchScreen', query: searchQuery });
      setError('Could not complete search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const renderItem = ({ item }: { item: Provider }) => (
    <ProviderCard 
      provider={item} 
      onPress={() => {
        navigation.navigate('DoctorProfile', { doctorId: item.id });
      }}
      onBookPress={() => {
        navigation.navigate('BookingFlow', { doctorId: item.id });
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Find Doctors</Text>
        <View style={[styles.searchContainer, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="search" size={20} color={c.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Search specialties, doctors..."
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={c.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={c.error} />
          <Text style={[styles.errorText, { color: c.textSecondary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: c.brand }]} 
            onPress={() => fetchResults(query)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && results.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Searching for doctors...</Text>
        </View>
      ) : results.length === 0 && query.trim().length > 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No doctors found for "{query}"</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="medical-outline" size={48} color={c.brand} style={{ opacity: 0.5 }} />
          <Text style={[styles.welcomeText, { color: c.textSecondary }]}>
            Search by name, specialty, or clinic
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 200,
  },
});
