import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { sendTaraMessage, submitTaraFeedback, getTaraSessions, getTaraSessionHistory, updateDailyHealthMetrics, logFoodItem } from '../../services/patientService';
import * as Speech from 'expo-speech';

interface Message {
  id: string;
  role: 'user' | 'tara';
  text: string;
  feedback?: {
    context: string;
    prompt: string;
    logged?: boolean;
    choice?: string;
  };
  action_widget?: {
    metric: 'water' | 'steps' | 'sleep' | 'food';
    value: string | number;
    unit: string;
    confirmed?: boolean;
    nutrition?: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fats_g: number;
    };
  };
  isMedicalWarning?: boolean;
}

interface ChatSession {
  id: string;
  started_at: string;
  summary: string;
}

export default function TaraScreen() {
  const c = useColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const abortRef = useRef<boolean>(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const sidebarAnim = useRef(new Animated.Value(0)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await getTaraSessions();
      if (Array.isArray(res)) setSessions(res);
      else if (res && (res as any).data) setSessions((res as any).data);
    } catch (e) {
      console.warn("Could not fetch Tara sessions:", e);
    }
  };

  const loadSession = async (id: string) => {
    setSessionId(id);
    closeSidebar();
    setIsLoading(true);
    setMessages([]);
    try {
      const res = await getTaraSessionHistory(id);
      const hist = (res as any)?.data || res;
      if (Array.isArray(hist)) {
        const formattedHistory: Message[] = hist.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          text: msg.content
        }));
        setMessages(formattedHistory);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.warn("Could not load session", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([{
      id: 'welcome',
      role: 'tara',
      text: `Hey ${profile?.full_name?.split(' ')[0] || 'User'}! I'm Tara, your personal adaptive coach.\n\nI'm here to build micro-habits that actually fit your schedule, your local food options, and your budget—no heavy gym fees or complicated diets. How was your day? Are you feeling tired or ready for something simple?`
    }]);
    closeSidebar();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(true);
    Animated.spring(sidebarAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const closeSidebar = () => {
    Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true }).start(() => setIsSidebarOpen(false));
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();

    if (!sessionId && messages.length === 0) {
      startNewChat();
    }
  }, [profile]);

  const handleMicPress = async () => {
    try {
      const ExpoSpeechRecognition = require('expo-speech-recognition');
      const { ExpoSpeechRecognitionModule } = ExpoSpeechRecognition;

      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        return;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;

      setIsListening(true);

      ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        if (event.isFinal && event.results?.[0]?.transcript) {
          setMessage(event.results[0].transcript);
          setIsListening(false);
        }
      });

      ExpoSpeechRecognitionModule.addListener('end', () => setIsListening(false));
      ExpoSpeechRecognitionModule.addListener('error', () => setIsListening(false));

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
      });

      setTimeout(() => {
        if (isListening) {
          ExpoSpeechRecognitionModule.stop();
          setIsListening(false);
        }
      }, 10000);
    } catch (e) {
      console.warn("Speech recognition error", e);
      setIsListening(false);
    }
  };

  const handleListen = async (text: string, msgId: string) => {
    if (speakingMessageId === msgId) {
      Speech.stop();
      setSpeakingMessageId(null);
      return;
    }

    Speech.stop();
    setSpeakingMessageId(msgId);

    Speech.speak(text, {
      language: 'en-IN',
      pitch: 1.1,
      rate: 0.9,
      onDone: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
      onStopped: () => setSpeakingMessageId(null),
    });
  };

  const handleActionWidgetConfirm = async (msgId: string, widget: NonNullable<Message['action_widget']>) => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      if (widget.metric === 'food') {
        if (!widget.nutrition) throw new Error('Missing nutrition data for food');
        await logFoodItem({
          date: dateStr,
          food_name: String(widget.value),
          calories: widget.nutrition.calories,
          protein_g: widget.nutrition.protein_g,
          carbs_g: widget.nutrition.carbs_g,
          fats_g: widget.nutrition.fats_g
        });
      } else {
        const payload: any = {};
        if (widget.metric === 'water') payload.water_ml = Number(widget.value);
        if (widget.metric === 'steps') payload.steps_count = Number(widget.value);
        if (widget.metric === 'sleep') payload.sleep_minutes = Number(widget.value) * 60;

        await updateDailyHealthMetrics(dateStr, payload);
      }

      setMessages(prev => prev.map(m => {
        if (m.id === msgId && m.action_widget) {
          return { ...m, action_widget: { ...m.action_widget, confirmed: true } };
        }
        return m;
      }));
    } catch (e) {
      console.warn("Could not confirm widget metric", e);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    abortRef.current = false;
    const userMsgId = Date.now().toString();
    const newMsg: Message = { id: userMsgId, role: 'user', text: textToSend };

    setMessages(prev => [...prev, newMsg]);
    setMessage('');
    setIsLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await sendTaraMessage(textToSend, sessionId || undefined);

      if (abortRef.current) return;

      const data = (response as any)?.data || response;

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        fetchSessions();
      }

      const taraMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'tara',
        text: data.reply || "I'm right here with you, let's take a deep breath."
      };

      if (data.suggest_feedback) {
        taraMsg.feedback = {
          context: data.suggest_feedback.context,
          prompt: data.suggest_feedback.prompt
        };
      }

      if (data.action_widget) {
        taraMsg.action_widget = {
          metric: data.action_widget.metric,
          value: data.action_widget.value,
          unit: data.action_widget.unit
        };
        if (data.action_widget.nutrition) {
          taraMsg.action_widget.nutrition = {
            calories: Number(data.action_widget.nutrition.calories) || 0,
            protein_g: Number(data.action_widget.nutrition.protein_g) || 0,
            carbs_g: Number(data.action_widget.nutrition.carbs_g) || 0,
            fats_g: Number(data.action_widget.nutrition.fats_g) || 0
          };
        }
      }

      if (data.is_medical_warning) {
        taraMsg.isMedicalWarning = true;
      }

      setMessages(prev => [...prev, taraMsg]);
    } catch (e) {
      if (abortRef.current) return;
      console.warn(e);
      if (isLoading) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'tara',
          text: "I had a tiny hiccup connecting to the server. But don't worry, let's try again in a moment! I'm here."
        }]);
      }
    } finally {
      if (!abortRef.current) {
        setIsLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsLoading(false);
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === lastUserMsg.id);
        return prev.slice(0, idx);
      });
      setMessage(lastUserMsg.text);
    }
  };

  const handleEditMessage = (msg: Message) => {
    if (isLoading) return;
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx !== -1) {
      const sliced = messages.slice(0, idx);
      setMessages(sliced);
      setMessage(msg.text);
    }
  };

  const handleFeedback = async (msgId: string, context: string, action: 'accepted' | 'declined' | 'modified') => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId && m.feedback) {
          return { ...m, feedback: { ...m.feedback, logged: true, choice: action } };
        }
        return m;
      }));
      await submitTaraFeedback(context, action);
    } catch (e) {
      console.warn(e);
    }
  };

  const renderFeedbackCard = (msg: Message) => {
    if (!msg.feedback) return null;
    const { prompt, logged, choice, context } = msg.feedback;

    if (logged) {
      return (
        <View style={[styles.feedbackCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.feedbackPrompt, { color: c.text }]}>
            {choice === 'accepted' ? '✨ Awesome, logged!' : 'Got it, adjusting for you!'}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.feedbackCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.feedbackPrompt, { color: c.text }]}>{prompt}</Text>
        <View style={styles.feedbackActions}>
          <TouchableOpacity style={[styles.feedbackBtn, { backgroundColor: '#22ae9e', borderColor: '#22ae9e' }]} onPress={() => handleFeedback(msg.id, context, 'accepted')}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={[styles.feedbackBtnText, { color: '#fff' }]}>Yes, let's do it</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackBtn, { backgroundColor: 'transparent', borderColor: c.border }]} onPress={() => handleFeedback(msg.id, context, 'declined')}>
            <Ionicons name="close-circle" size={16} color={c.textSecondary} />
            <Text style={[styles.feedbackBtnText, { color: c.textSecondary }]}>Not for me</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderActionWidget = (item: Message) => {
    if (!item.action_widget) return null;
    const w = item.action_widget;

    return (
      <View style={[styles.feedbackCard, { backgroundColor: '#f0f9ff', borderColor: '#b9e6fe' }]}>
        <Text style={[styles.feedbackPrompt, { color: '#0284c7', fontWeight: 'bold', marginBottom: 6 }]}>
          Track {w.metric.charAt(0).toUpperCase() + w.metric.slice(1)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: '#fff', borderColor: '#e0f2fe', borderWidth: 1, marginRight: 8, height: 36, paddingVertical: 0 }]}
            defaultValue={String(w.value)}
            keyboardType={w.metric === 'food' ? "default" : "numeric"}
            editable={!w.confirmed}
            onChangeText={(text) => {
              if (!w.confirmed) {
                setMessages(prev => prev.map(m => m.id === item.id ? { ...m, action_widget: { ...m.action_widget!, value: text } } : m));
              }
            }}
          />
          <Text style={{ color: '#0284c7', fontWeight: '600' }}>{w.unit}</Text>
        </View>

        {w.metric === 'food' && w.nutrition && (
          <View style={{ backgroundColor: '#fff', padding: 8, borderRadius: 6, marginBottom: 12, borderColor: '#e0f2fe', borderWidth: 1 }}>
            <Text style={{ fontSize: 12, color: '#0369a1', fontWeight: 'bold', marginBottom: 4 }}>Estimated Nutrition</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>🔥 {w.nutrition.calories} kcal</Text>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>🥩 {w.nutrition.protein_g}g</Text>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>🌾 {w.nutrition.carbs_g}g</Text>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>🥑 {w.nutrition.fats_g}g</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={[styles.feedbackBtn, w.confirmed ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { backgroundColor: '#0284c7', borderColor: '#0284c7' }]}
          onPress={() => !w.confirmed && handleActionWidgetConfirm(item.id, w)}
          disabled={w.confirmed}
        >
          <Text style={[styles.feedbackBtnText, { color: '#fff' }]}>
            {w.confirmed ? "Logged Successfully ✓" : "Confirm & Log"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowTara]}>
        {!isUser && (
          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={require('../../../assets/tara/tara-profile.png')} style={{ width: 30, height: 30, borderRadius: 15 }} />
          </Animated.View>
        )}
        <View style={styles.messageContent}>
          <View style={[styles.bubble, { backgroundColor: isUser ? '#22ae9e' : '#fff', borderWidth: isUser ? 0 : 1, borderColor: '#e5e7eb' }]}>
            <Text style={[styles.messageText, { color: isUser ? '#fff' : c.text }]}>
              {item.text}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            {isUser && !isLoading && (
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEditMessage(item)}>
                <Ionicons name="pencil" size={14} color={c.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.editText, { color: c.textTertiary }]}>Edit & Re-send</Text>
              </TouchableOpacity>
            )}
            {!isUser && (
              <TouchableOpacity style={[styles.editBtn, { marginLeft: 0 }]} onPress={() => handleListen(item.text, item.id)}>
                <Ionicons name={speakingMessageId === item.id ? "volume-high" : "volume-medium"} size={14} color={speakingMessageId === item.id ? "#22ae9e" : c.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.editText, { color: speakingMessageId === item.id ? "#22ae9e" : c.textTertiary }]}>
                  {speakingMessageId === item.id ? "Listening..." : "Listen"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {item.isMedicalWarning && (
            <View style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="warning" size={16} color="#ef4444" style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 18 }}>
                <Text style={{ fontWeight: 'bold' }}>Medical Disclaimer: </Text>
                I am an AI coach, not a doctor. Because your symptoms sound serious, please consult a healthcare professional immediately.
              </Text>
            </View>
          )}

          {renderActionWidget(item)}
          {renderFeedbackCard(item)}
        </View>
      </View>
    );
  };

  const currentHour = new Date().getHours();
  let dynamicSuggestions: string[] = [];
  if (currentHour >= 5 && currentHour < 12) {
    dynamicSuggestions = [
      "Need a quick morning stretch 🌅",
      "Healthy local breakfast ideas 🍳",
      "Awkward physical bloating remedies 🤐",
      "Low budget exercise routines 🏃"
    ];
  } else if (currentHour >= 12 && currentHour < 17) {
    dynamicSuggestions = [
      "Feeling sleepy after lunch 😴",
      "Suggest Dal-Rice proportion swap 🍛",
      "Quick 5-min desk stretch 🧘",
      "Healthy evening snack ideas 🍏"
    ];
  } else {
    dynamicSuggestions = [
      "Tired after a long day, help wind down 🥱",
      "Late night craving healthy options 🌙",
      "Simple bed-time breathing 🛏️",
      "How to prepare for a good sleep 💤"
    ];
  }

  const sidebarTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0]
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: '#f9fafb',
            paddingTop: insets.top,
          }
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#fff', borderBottomColor: c.border, borderBottomWidth: 1 }]}>
          <View style={styles.headerInfo}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8, padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={c.text} />
            </TouchableOpacity>
            <Animated.View style={[styles.headerAvatar, { transform: [{ scale: pulseAnim }] }]}>
              <Image source={require('../../../assets/tara/tara-profile.png')} style={{ width: 36, height: 36, borderRadius: 18 }} />
            </Animated.View>
            <View>
              <Text style={[styles.headerTitle, { color: c.text }]}>Tara</Text>
              <Text style={[styles.headerSub, { color: '#22ae9e' }]}>● Online Coach</Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleSidebar} style={{ padding: 4 }}>
            <Ionicons name="menu" size={26} color={c.text} />
          </TouchableOpacity>
        </View>

        {/* Message Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? (
            <View style={styles.thinkingContainer}>
              <ActivityIndicator size="small" color="#22ae9e" />
              <Text style={[styles.thinkingText, { color: c.textSecondary }]}>Tara is typing...</Text>
            </View>
          ) : null}
        />

        {/* Starting Prompts suggestions */}
        {messages.length === 1 && !isLoading && (
          <View style={styles.suggestionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
              {dynamicSuggestions.map(p => (
                <TouchableOpacity key={p} style={[styles.suggestionChip, { backgroundColor: '#fff', borderColor: c.border }]} onPress={() => handleSend(p)}>
                  <Text style={[styles.suggestionText, { color: c.text }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={[
          styles.inputBar, {
            backgroundColor: '#fff',
            paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12)
          }]}>
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="Type a message or share an habit..."
            placeholderTextColor={c.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          {isLoading ? (
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#ef4444' }]} onPress={handleStop}>
              <Ionicons name="stop" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: isListening ? '#ef4444' : '#f3f4f6', marginRight: 8 }]}
                onPress={handleMicPress}
              >
                <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? '#fff' : c.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: message.trim() ? '#22ae9e' : '#f3f4f6' }]}
                onPress={() => handleSend(message)}
                disabled={!message.trim()}
              >
                <Ionicons name="send" size={18} color={message.trim() ? '#fff' : c.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <TouchableOpacity style={styles.sidebarOverlay} activeOpacity={1} onPress={closeSidebar} />
        )}
        <Animated.View style={[
          styles.sidebar,
          { backgroundColor: '#fff', borderLeftColor: c.border, paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: sidebarTranslateX }] }
        ]}>
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarTitle, { color: c.text }]}>Chat History</Text>
            <TouchableOpacity onPress={closeSidebar} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.newChatBtn, { borderColor: c.border }]} onPress={startNewChat}>
            <Ionicons name="add-circle-outline" size={20} color="#22ae9e" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
          <ScrollView style={styles.sessionList}>
            {sessions.map(s => (
              <TouchableOpacity key={s.id} style={[styles.sessionItem, sessionId === s.id && { backgroundColor: '#f0fdfa' }]} onPress={() => loadSession(s.id)}>
                <Ionicons name="chatbubble-outline" size={16} color={c.textSecondary} />
                <Text style={[styles.sessionText, { color: c.text }]} numberOfLines={1}>{s.summary}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#22ae9e' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  feed: { padding: 20, paddingBottom: 40 },
  messageRow: { flexDirection: 'row', gap: 12, marginBottom: 20, maxWidth: '85%' },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  rowTara: { alignSelf: 'flex-start' },
  avatarWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#22ae9e', alignSelf: 'flex-end' },
  messageContent: { flex: 1, gap: 8 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },

  editBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', paddingHorizontal: 8, marginTop: 2 },
  editText: { fontSize: 11, fontWeight: '600' },

  feedbackCard: { borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 4, gap: 10, width: '100%' },
  feedbackPrompt: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  feedbackActions: { flexDirection: 'column', gap: 8, width: '100%' },
  feedbackBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  feedbackBtnText: { fontSize: 13, fontWeight: '700' },

  thinkingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  thinkingText: { fontSize: 13, fontWeight: '600' },

  suggestionsContainer: { paddingBottom: 12 },
  suggestionsScroll: { paddingHorizontal: 20, gap: 8 },
  suggestionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4 },
  suggestionText: { fontSize: 13, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#f9fafb', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontWeight: '500', borderWidth: 1, borderColor: '#f3f4f6' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  sidebarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 },
  sidebar: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 280, borderLeftWidth: 1, zIndex: 20, shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sidebarTitle: { fontSize: 16, fontWeight: '700' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 12, justifyContent: 'center' },
  newChatText: { fontSize: 14, fontWeight: '700', color: '#22ae9e' },
  sessionList: { flex: 1, marginTop: 12 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20 },
  sessionText: { fontSize: 14, fontWeight: '500', flex: 1 }
});
