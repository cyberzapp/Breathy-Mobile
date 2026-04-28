import { useState, useEffect, useMemo, useRef } from 'react';
import {
  searchMedicalTests,
  getFavoriteTests,
  cacheFavoriteTests,
  getCachedFavoriteTests,
  type TestOption,
} from '../services/prescriptionService';
import { isFuzzyMatch } from '../utils/stringDiff';

// ---------------------------------------------------------------------------
// useTestSearch — Hybrid medical test autocomplete (local + remote)
// ---------------------------------------------------------------------------
// Exact port of the web's investigation search logic from PrescriptionPage.jsx
// ---------------------------------------------------------------------------

export function useTestSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [favorites, setFavorites] = useState<TestOption[]>([]);
  const [remoteResults, setRemoteResults] = useState<TestOption[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load favorites on mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedFavoriteTests();
      if (cached.length > 0) setFavorites(cached);

      try {
        const live = await getFavoriteTests();
        if (Array.isArray(live) && live.length > 0) {
          setFavorites(live);
          await cacheFavoriteTests(live);
        }
      } catch {}
    })();
  }, []);

  // Debounce (300ms — matches web)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Remote search (enabled when >= 2 chars — matches web)
  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setRemoteResults([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoadingRemote(true);
    searchMedicalTests(debouncedTerm, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setRemoteResults(Array.isArray(results) ? results : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRemoteResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingRemote(false);
      });

    return () => controller.abort();
  }, [debouncedTerm]);

  // Local filtering — exact match of web's localInvestigationOptions:
  // isFuzzyMatch with 1 typo tolerance
  const localResults = useMemo(() => {
    if (!searchTerm) return favorites;
    const lowSearch = searchTerm.toLowerCase();
    return favorites.filter(
      (t) =>
        t.test_name?.toLowerCase().includes(lowSearch) ||
        isFuzzyMatch(t.test_name, lowSearch, 1)
    );
  }, [searchTerm, favorites]);

  // Merged + strict ranking — exact match of web's investigationOptions
  const options = useMemo(() => {
    const combined =
      searchTerm.length < 2
        ? favorites
        : [...localResults, ...remoteResults];

    const unique = combined.filter(
      (v, i, a) => a.findIndex((t) => t.test_name === v.test_name) === i
    );

    if (searchTerm.length >= 2) {
      const lowerSearch = searchTerm.toLowerCase();
      unique.sort((a, b) => {
        const aName = a.test_name.toLowerCase();
        const bName = b.test_name.toLowerCase();
        if (aName === lowerSearch && bName !== lowerSearch) return -1;
        if (bName === lowerSearch && aName !== lowerSearch) return 1;
        const aStarts = aName.startsWith(lowerSearch);
        const bStarts = bName.startsWith(lowerSearch);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        if (aStarts && bStarts) return aName.length - bName.length;
        return aName.localeCompare(bName);
      });
    }

    return unique;
  }, [searchTerm, favorites, localResults, remoteResults]);

  return {
    searchTerm,
    setSearchTerm,
    options,
    isLoading: isLoadingRemote,
  };
}
