import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { Heart, Send } from 'lucide-react-native';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function HealthHubWidget() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleRegister = () => {
    if (email) {
      Keyboard.dismiss();
      setRegistered(true);
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(300)} style={[styles.card, { backgroundColor: c.brandLight }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: c.brand }]}>
          <Heart color="#fff" size={24} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: c.brandDark }]}>Breathy Health Hub</Text>
          <Text style={[styles.subtitle, { color: c.brandDark }]}>Coming Soon</Text>
        </View>
      </View>
      
      {!registered ? (
        <View style={styles.content}>
          <Text style={[styles.desc, { color: c.brandDark }]}>
            A personal AI assistant and playful diet tracking. Register your interest for early access!
          </Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="Your email address" 
              placeholderTextColor={c.brandDark + '80'}
              style={[styles.input, { backgroundColor: '#fff', color: c.text }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable onPress={handleRegister} style={[styles.btn, { backgroundColor: c.brand }]}>
              <Send color="#fff" size={16} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.successText, { color: c.brandDark }]}>
            Thanks! We'll notify you when Health Hub is ready.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    padding: 12,
    borderRadius: 16,
    marginRight: 16,
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.8,
  },
  content: {
    marginTop: 4,
  },
  desc: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  }
});
