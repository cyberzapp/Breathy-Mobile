import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { getActiveSessions } from '../../services/chatService';

export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChats();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const sessions = await getActiveSessions();
      
      if (sessions && sessions.length > 0) {
        // 1. Calculate the date exactly one month ago
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const processedChats = sessions
          // 2. FILTER: Remove chats where the last message is older than 1 month
          .filter((session: any) => {
            if (!session.last_message_at) return true; // Keep new, empty chats
            return new Date(session.last_message_at) > oneMonthAgo;
          })
          // 3. SORT: Put the newest messages at the top
          .sort((a: any, b: any) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
          });

        setChats(processedChats);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('[ChatList] Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChatItem = ({ item }: any) => {
    const otherUserName = item?.other_user?.full_name || 'Patient';
    
    const timeString = item?.last_message_at 
      ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: c.border }]}
        onPress={() => navigation.navigate('ChatRoom', { 
          sessionId: item.session_id, 
          patientName: otherUserName 
        })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: c.card }]}>
          <Text style={[styles.avatarText, { color: c.brand }]}>
            {otherUserName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <Text style={[styles.patientName, { color: c.text }]}>{otherUserName}</Text>
            <Text style={[styles.timeText, { color: c.textTertiary }]}>{timeString}</Text>
          </View>
          <View style={styles.chatFooter}>
            {/* ✅ FIX: Added fallback string to prevent missing text crashes */}
            <Text style={[styles.lastMessage, { color: c.textSecondary }]} numberOfLines={1}>
              {item?.last_message || 'No messages yet.'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && chats.length === 0 ? (
        <ActivityIndicator size="large" color={c.brand} style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <Text style={[styles.emptyText, { color: c.textTertiary }]}>No active conversations.</Text>
      ) : (
        <FlatList
          data={chats}
          // ✅ FIX: Safe key extractor
          keyExtractor={(item, index) => item?.session_id?.toString() || index.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  patientName: { fontSize: 16, fontWeight: '600' },
  timeText: { fontSize: 12 },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, flex: 1, paddingRight: 10 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});