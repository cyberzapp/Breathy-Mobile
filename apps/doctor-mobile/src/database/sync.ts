import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useSyncStore } from '../store/syncStore';

const API_BASE_URL = 'https://breathy-backend-a6p5.onrender.com';


export async function syncDatabase() {
  const syncStore = useSyncStore.getState();
  
  // Prevent duplicate concurrent syncs
  if (syncStore.isSyncing) return;

  syncStore.setSyncing(true);
  console.log('🔄 [Sync Engine] Initiating Background Sync...');

  try {
    // 🔒 SECURE TOKEN INJECTION
    // Fetch the token freshly from secure device storage right before the network call
    const token = await SecureStore.getItemAsync('doctor_jwt');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    await synchronize({
      database,
      // 1. PULL: Fetch new data from the Node.js server
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        console.log(`📡 [Sync] Pulling changes since timestamp: ${lastPulledAt || 'Beginning of time'}`);
        
        const response = await axios.get(`${API_BASE_URL}/api/v1/sync`, {
          params: { 
            lastPulledAt: lastPulledAt || 0,
            schemaVersion
          },
          headers, // Injecting Auth
        });

        if (!response.data) {
          throw new Error('No data received from server');
        }

        const { changes, timestamp } = response.data;
        console.log(`📥 [Sync] Received changes from server at timestamp ${timestamp}`);
        
        return { changes, timestamp };
      },

      // 2. PUSH: Send local offline changes back to the Node.js server
      pushChanges: async ({ changes, lastPulledAt }) => {
        console.log('📤 [Sync] Pushing local offline changes to server...');
        
        await axios.post(`${API_BASE_URL}/api/v1/sync`, {
          changes,
          lastPulledAt,
        }, {
          headers, // Injecting Auth
        });
      },

      // Security & Performance configs
      sendCreatedAsUpdated: false, // Strict mode for creating vs updating
    });

    console.log('✅ [Sync Engine] Sync completed successfully!');
    syncStore.setSyncSuccess(Date.now()); // Update UI state to Success

  } catch (error: any) {
    console.error('Sync failed');
    
    
    // Update UI state to show an offline/error warning badge
    const errorMessage = error.response?.data?.message || error.message || 'Network disconnected';
    syncStore.setSyncError(errorMessage);
  }
}