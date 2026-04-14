import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  setSyncing: (isSyncing: boolean) => void;
  setSyncSuccess: (timestamp: number) => void;
  setSyncError: (error: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  
  setSyncing: (isSyncing) => set({ isSyncing, syncError: null }),
  
  setSyncSuccess: (timestamp) => set({ 
    isSyncing: false, 
    lastSyncedAt: timestamp, 
    syncError: null 
  }),
  
  setSyncError: (error) => set({ 
    isSyncing: false, 
    syncError: error 
  }),
}));