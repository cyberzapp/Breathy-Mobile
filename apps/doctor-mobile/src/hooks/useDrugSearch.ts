import { useState, useEffect, useMemo, useRef } from 'react';
import {
  searchDrugs,
  getFavoriteDrugs,
  cacheFavoriteDrugs,
  getCachedFavoriteDrugs,
  type DrugOption,
} from '../services/prescriptionService';
import { isFuzzyMatch } from '../utils/stringDiff';

// ---------------------------------------------------------------------------
// useDrugSearch — Hybrid drug autocomplete (local favorites + remote API)
// ---------------------------------------------------------------------------
// Exact port of the web's "SMART OFFLINE SEARCH" from PrescriptionPage.jsx:
//   1. On mount, load doctor's favorite drugs (most-used) and cache them
//   2. When user types, instantly filter favorites locally (isFuzzyMatch with 1 typo)
//   3. After 300ms debounce, also fire remote API search
//   4. Merge + deduplicate + rank results (exact → starts-with → contains)
// ---------------------------------------------------------------------------

export function useDrugSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [favorites, setFavorites] = useState<DrugOption[]>([]);
  const [remoteResults, setRemoteResults] = useState<DrugOption[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load favorites on mount
  useEffect(() => {
    (async () => {
      // Try cache first for instant load
      const cached = await getCachedFavoriteDrugs();
      if (cached.length > 0) {
        setFavorites(cached);
      }

      // Then refresh from API
      try {
        const live = await getFavoriteDrugs();
        if (Array.isArray(live) && live.length > 0) {
          setFavorites(live);
          await cacheFavoriteDrugs(live);
        }
      } catch {
        // Keep cached data
      }
    })();
  }, []);

  // Debounce search term (300ms — matches web's useDebounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Remote search on debounced term (matches web: enabled when >= 2 chars)
  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setRemoteResults([]);
      return;
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoadingRemote(true);
    searchDrugs(debouncedTerm, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setRemoteResults(Array.isArray(results) ? results : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRemoteResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRemote(false);
        }
      });

    return () => controller.abort();
  }, [debouncedTerm]);

  // Local filtering — exact match of web's localDrugOptions logic:
  // filter favorites by brand_name includes OR isFuzzyMatch with 1 typo tolerance
  const localResults = useMemo(() => {
    if (!searchTerm) return favorites;
    const lowSearch = searchTerm.toLowerCase();
    return favorites.filter(
      (d) =>
        d.brand_name?.toLowerCase().includes(lowSearch) ||
        isFuzzyMatch(d.brand_name, lowSearch, 1) // 1 typo allowed offline
    );
  }, [searchTerm, favorites]);

  // Merged + deduplicated + STRICT RANKED results — exact match of web's drugOptions logic
  const options = useMemo(() => {
    const combined =
      searchTerm.length < 2
        ? favorites
        : [...localResults, ...remoteResults];

    // Keep unique brand names
    const unique = combined.filter(
      (v, i, a) => a.findIndex((t) => t.brand_name === v.brand_name) === i
    );

    // FORCE strict ranking (exact port from web)
    if (searchTerm.length >= 2) {
      const lowerSearch = searchTerm.toLowerCase();
      unique.sort((a, b) => {
        const aName = a.brand_name.toLowerCase();
        const bName = b.brand_name.toLowerCase();

        // Exact match first
        if (aName === lowerSearch && bName !== lowerSearch) return -1;
        if (bName === lowerSearch && aName !== lowerSearch) return 1;

        // Starts-with next
        const aStarts = aName.startsWith(lowerSearch);
        const bStarts = bName.startsWith(lowerSearch);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        if (aStarts && bStarts) return aName.length - bName.length;

        // Alphabetical fallback
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
    favorites,
  };
}
