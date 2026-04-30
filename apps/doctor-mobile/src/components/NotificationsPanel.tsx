import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// NotificationsPanel — Floating dropdown from bell icon
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  APPOINTMENT_REQUEST: { name: 'calendar-outline', color: '#3b82f6' },
  APPOINTMENT_CANCELLED: { name: 'calendar-outline', color: '#ef4444' },
  PATIENT_MESSAGE: { name: 'chatbubble-outline', color: '#22c55e' },
  LAB_REPORT_UPLOADED: { name: 'person-outline', color: '#6366f1' },
  SYSTEM_ALERT: { name: 'alert-circle-outline', color: '#f59e0b' },
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ visible, onClose }: NotificationsPanelProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/api/notifications');
      const sortedData = (data as unknown as Notification[]).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(sortedData);
    } catch (error) {
      console.error('[Notifications] Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  // Real-time listener
  useEffect(() => {
    if (!visible) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('[Notifications] Mark as read failed:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('[Notifications] Mark all read failed:', error);
    }
  };

  const removeNotification = async (id: string) => {
    // Optimistic UI update (instantly remove from screen)
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiClient.delete(`/api/notifications/${id}`);
    } catch (error) {
      console.error('[Notifications] Delete failed:', error);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]); // Optimistic clear
    try {
      await apiClient.delete('/api/notifications/clear-all');
    } catch (error) {
      console.error('[Notifications] Clear all failed:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const icon = ICON_MAP[item.type] || { name: 'notifications-outline' as const, color: '#94a3b8' };

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
        onPress={() => {
          if (!item.is_read) markAsRead(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIconBox, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.created_at)}</Text>
        </View>

        {/* Action Column: Unread Dot + Delete Button */}
        <View style={styles.notifActions}>
          {!item.is_read && <View style={styles.unreadDot} />}
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => removeNotification(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { marginTop: insets.top + 56 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity onPress={clearAllNotifications}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#14b8a6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute',
    right: 12,
    width: Math.min(SCREEN_WIDTH - 24, 380),
    maxHeight: 480,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444', // Red color for delete action
  },
  list: {
    maxHeight: 400,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },

  // Notification Item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: '#f0fdfa',
    borderLeftWidth: 3,
    borderLeftColor: '#14b8a6',
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
    paddingRight: 6,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
  },
  notifDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  notifActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6',
    marginBottom: 8,
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
});