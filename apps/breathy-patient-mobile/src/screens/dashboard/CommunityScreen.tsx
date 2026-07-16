import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SQUAD_MEMBERS = [
  { id: '1', name: 'Alex', score: 98, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200' },
  { id: '2', name: 'Sarah', score: 85, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200' },
  { id: '3', name: 'You', score: 72, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200' },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('My Squad');

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#0f172a" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.tabsContainer}>
        {['My Squad', 'Global Challenges'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === 'My Squad' ? (
          <Animated.View entering={FadeInUp.springify()}>
            <LinearGradient colors={['#38bdf8', '#0284c7']} style={styles.squadBanner}>
              <View style={styles.squadBannerTop}>
                <View>
                  <Text style={styles.squadTitle}>Iron Builders</Text>
                  <Text style={styles.squadSub}>3 Members • Private</Text>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>Rank #12</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Macro Consistency</Text>
            
            {SQUAD_MEMBERS.map((member, i) => (
              <Animated.View key={member.id} entering={FadeInRight.delay(i*100).springify()} style={styles.memberCard}>
                <Image source={{uri: member.avatar}} style={styles.avatar} contentFit="cover" />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${member.score}%` }]} />
                  </View>
                </View>
                <Text style={styles.memberScore}>{member.score}%</Text>
              </Animated.View>
            ))}

            <TouchableOpacity style={styles.inviteBtn}>
              <Ionicons name="link" size={20} color="#0ea5e9" />
              <Text style={styles.inviteText}>Invite Friends</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.springify()}>
            <View style={styles.challengeCard}>
              <Image source={{uri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600'}} style={styles.challengeImg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.challengeOverlay}>
                <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
                <Text style={styles.challengeTitle}>Summer Shred 30-Day Challenge</Text>
                <Text style={styles.challengeUsers}>12,450 Participants</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#0f172a' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0f172a' },

  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  
  squadBanner: { padding: 24, borderRadius: 24, marginBottom: 24, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  squadBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  squadTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  squadSub: { fontSize: 14, color: '#e0f2fe', fontWeight: '600', marginTop: 4 },
  rankBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9' },
  memberInfo: { flex: 1, marginLeft: 16 },
  memberName: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  memberScore: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginLeft: 16, width: 45, textAlign: 'right' },

  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 16, backgroundColor: '#f0f9ff', marginTop: 12 },
  inviteText: { color: '#0ea5e9', fontSize: 16, fontWeight: '800', marginLeft: 8 },

  challengeCard: { height: 200, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  challengeImg: { ...StyleSheet.absoluteFillObject },
  challengeOverlay: { padding: 24 },
  liveBadge: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  liveText: { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  challengeTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  challengeUsers: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' }
});
