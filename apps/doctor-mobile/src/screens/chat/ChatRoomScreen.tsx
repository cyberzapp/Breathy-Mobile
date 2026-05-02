import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { getMessagesForSession, postMessage } from '../../services/chatService';
import { supabase } from '../../lib/supabaseClient';
import { Logger } from '../../utils/logger';

export default function ChatRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const { sessionId, patientName } = route.params;
  
  // ✅ FIX: Explicitly typed as any[]
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // ✅ FIX: Explicitly typed FlatList ref
  const flatListRef = useRef<FlatList<any>>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        // ✅ FIX: Safe fallbacks to prevent undefined height crashes
        toValue: e?.endCoordinates?.height || 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  useEffect(() => {
    fetchHistoricalMessages();

    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchHistoricalMessages = async () => {
    try {
      const data = await getMessagesForSession(sessionId);
      setMessages(data || []);
    } catch (error) {
      Logger.error('Chat history fetch failed', error, { source: 'ChatRoomScreen' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const textToSend = inputText.trim();
    setInputText(''); 
    
    try {
      await postMessage(sessionId, textToSend);
    } catch (error) {
      Logger.error('Message send failed', error, { source: 'ChatRoomScreen' });
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item?.sender_id === currentUserId;
    const timeString = item?.created_at 
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View style={[
          styles.messageBubble, 
          isMe ? { backgroundColor: c.brand, borderBottomRightRadius: 4 } : { backgroundColor: c.card, borderBottomLeftRadius: 4 }
        ]}>
          {/* ✅ FIX: Added fallback string */}
          <Text style={{ color: isMe ? '#ffffff' : c.text, fontSize: 15 }}>
            {item?.message_content || ''}
          </Text>
          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
            {timeString}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>{patientName || 'Chat'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        
        {loading ? (
          <View style={styles.centerLoad}>
            <ActivityIndicator size="large" color={c.brand} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            // ✅ FIX: Safe key extractor
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            // ✅ FIX: Strict safety checks before scrolling
            onContentSizeChange={() => {
              if (messages && messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onLayout={() => {
              if (messages && messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        <View style={[
          styles.inputContainer, 
          { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 12) }
        ]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: c.bg, color: c.text }]}
            placeholder="Type a message..."
            placeholderTextColor={c.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? c.brand : c.border }]} 
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingTop: 24, gap: 12, flexGrow: 1, justifyContent: 'flex-end' },
  messageWrapper: { flexDirection: 'row', width: '100%', marginBottom: 12 },
  messageWrapperLeft: { justifyContent: 'flex-start' },
  messageWrapperRight: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  messageTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, marginRight: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
});