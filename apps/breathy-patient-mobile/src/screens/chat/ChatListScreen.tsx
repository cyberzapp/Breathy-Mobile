import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

export default function ChatListScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:chat_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, payload => {
        fetchSessions(); // Brute force refresh for simplicity, could optimize
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSessions = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          updated_at,
          doctor_id,
          doctors ( full_name, profile_photo_url )
        `)
        .eq('patient_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load chat sessions', err, { source: 'ChatListScreen' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.sessionItem, { borderBottomColor: c.border }]}
      onPress={() => navigation.navigate('ChatRoom', { sessionId: item.id, doctorName: item.doctors?.full_name })}
    >
      {item.doctors?.profile_photo_url ? (
        <Image 
          source={{ uri: item.doctors.profile_photo_url }} 
          style={styles.avatar} 
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.brandBg || '#e0f2f1', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: c.brand, fontSize: 20, fontWeight: '700' }}>
            {item.doctors?.full_name?.charAt(0)?.toUpperCase() || 'D'}
          </Text>
        </View>
      )}
      <View style={styles.sessionInfo}>
        <Text style={[styles.doctorName, { color: c.text }]}>Dr. {item.doctors?.full_name}</Text>
        <Text style={[styles.lastUpdated, { color: c.textSecondary }]}>
          {dayjs(item.updated_at).format('MMM D, h:mm A')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No active chats</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  listContent: { paddingBottom: 20 },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
  },
});
