import NetInfo from '@react-native-community/netinfo';
import { storage } from './storage';
import apiClient from './apiClient';

const SYNC_QUEUE_KEY = 'offline_sync_queue';

type SyncAction = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  timestamp: number;
};

class NetworkManager {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;

  constructor() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;
      
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  // Add an action to the queue when offline
  public async queueAction(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', payload: any) {
    if (this.isOnline) {
      // If online, execute immediately
      return this.executeRequest(endpoint, method, payload);
    }

    // Offline -> push to MMKV encrypted queue
    const queueJson = storage.getString(SYNC_QUEUE_KEY) || '[]';
    const queue: SyncAction[] = JSON.parse(queueJson);
    
    queue.push({
      id: Date.now().toString(),
      endpoint,
      method,
      payload,
      timestamp: Date.now()
    });

    storage.set(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[NetworkManager] Action queued for offline sync: ${endpoint}`);
  }

  // Process the queue when network returns
  private async processSyncQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const queueJson = storage.getString(SYNC_QUEUE_KEY) || '[]';
    let queue: SyncAction[] = JSON.parse(queueJson);

    if (queue.length === 0) {
      this.isSyncing = false;
      return;
    }

    console.log(`[NetworkManager] Processing ${queue.length} offline actions...`);

    const failedQueue: SyncAction[] = [];

    for (const action of queue) {
      try {
        await this.executeRequest(action.endpoint, action.method, action.payload);
        console.log(`[NetworkManager] Successfully synced action ${action.id}`);
      } catch (e) {
        console.warn(`[NetworkManager] Failed to sync action ${action.id}, will retry later`, e);
        failedQueue.push(action);
      }
    }

    // Update the queue with any items that failed
    storage.set(SYNC_QUEUE_KEY, JSON.stringify(failedQueue));
    this.isSyncing = false;
  }

  private async executeRequest(endpoint: string, method: string, payload: any) {
    if (method === 'POST') return apiClient.post(endpoint, payload);
    if (method === 'PUT') return apiClient.put(endpoint, payload);
    if (method === 'DELETE') return apiClient.delete(endpoint, { data: payload });
  }

  public getIsOnline() {
    return this.isOnline;
  }
}

export const networkManager = new NetworkManager();
