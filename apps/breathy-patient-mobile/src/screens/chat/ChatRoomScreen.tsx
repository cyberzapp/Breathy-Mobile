import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

export default function ChatRoomScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  
  const { sessionId, doctorName } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchMessages();

    const subscription = supabase
      .channel(`public:chat_messages:session_id=eq.${sessionId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}` 
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err) {
      console.error('Failed to load messages', err, { source: 'ChatRoomScreen' });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      // Optimistic update could go here
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: session?.user?.id,
          sender_type: 'patient',
          message_content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err, { source: 'ChatRoomScreen' });
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === session?.user?.id;
    return (
      <View style={[
        styles.messageBubble, 
        isMe ? [styles.myMessage, { backgroundColor: c.brand }] : [styles.theirMessage, { backgroundColor: c.card, borderColor: c.border }]
      ]}>
        <Text style={[styles.messageText, { color: isMe ? '#fff' : c.text }]}>
          {item.message_content}
        </Text>
        <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
          {dayjs(item.created_at).format('h:mm A')}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: c.bg }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Dr. {doctorName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom || 16 }]}>
        <TextInput
          style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={c.textTertiary}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: newMessage.trim() ? c.brand : c.borderMedium }]}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  listContent: { padding: 16, paddingBottom: 32 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 2,
  },
});
