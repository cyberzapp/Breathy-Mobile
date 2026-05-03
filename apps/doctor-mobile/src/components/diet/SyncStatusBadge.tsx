import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { dietPlanService } from '../../services/dietPlanService';
import { isOnline } from '../../services/offlineCacheService';

interface SyncStatusBadgeProps {
  onSyncComplete?: () => void;
}

export default function SyncStatusBadge({ onSyncComplete }: SyncStatusBadgeProps) {
  const c = useColors();
  const [status, setStatus] = useState<'synced' | 'pending' | 'offline' | 'syncing'>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const online = await isOnline();
    const count = await dietPlanService.getPendingCount();
    setPendingCount(count);

    if (!online) {
      setStatus('offline');
    } else if (count > 0) {
      setStatus('pending');
    } else {
      setStatus('synced');
    }
  };

  const handleSync = async () => {
    if (status === 'offline' || status === 'syncing') return;
    setStatus('syncing');
    try {
      await dietPlanService.syncPendingChanges();
      await checkStatus();
      onSyncComplete?.();
    } catch {
      await checkStatus();
    }
  };

  const config = {
    synced: { icon: 'checkmark-circle' as const, color: '#22c55e', label: 'Synced' },
    pending: { icon: 'sync-circle' as const, color: '#f59e0b', label: `${pendingCount} pending` },
    offline: { icon: 'cloud-offline' as const, color: '#ef4444', label: 'Offline' },
    syncing: { icon: 'sync' as const, color: '#3b82f6', label: 'Syncing...' },
  };

  const { icon, color, label } = config[status];

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: color + '18' }]}
      onPress={handleSync}
      disabled={status === 'syncing' || status === 'offline'}
      activeOpacity={0.7}
    >
      {status === 'syncing' ? (
        <ActivityIndicator size={12} color={color} />
      ) : (
        <Ionicons name={icon} size={14} color={color} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
