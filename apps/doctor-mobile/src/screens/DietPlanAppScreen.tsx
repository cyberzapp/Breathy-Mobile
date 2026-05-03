import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { dietPlanService, DietPlan } from '../services/dietPlanService';
import { syncFoodsFromServer } from '../services/foodDatabaseService';
import DietBuilderModal from '../components/diet/DietBuilderModal';
import SharePlanModal from '../components/diet/SharePlanModal';
import SyncStatusBadge from '../components/diet/SyncStatusBadge';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import ErrorModal from '../components/ui/ErrorModal';
import { Logger } from '../utils/logger';

type TabType = 'templates' | 'archived';

export default function DietPlanAppScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [archivedPlans, setArchivedPlans] = useState<DietPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isBuilderVisible, setIsBuilderVisible] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<DietPlan | null>(null);

  // Actions Modals
  const [planToShare, setPlanToShare] = useState<DietPlan | null>(null);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<DietPlan | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Sync food database on first launch (background, non-blocking)
    syncFoodsFromServer().catch(() => {});
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [activePlans, archivedResult] = await Promise.all([
        dietPlanService.getDietPlans(),
        dietPlanService.getArchivedDietPlans(),
      ]);
      setPlans(activePlans);
      setArchivedPlans(archivedResult);
    } catch (e) {
      Logger.error('Failed to load diet plans', e, { source: 'DietPlanAppScreen' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (plan: DietPlan) => {
    try {
      setIsLoading(true);
      await dietPlanService.duplicateDietPlan(plan.id);
      loadData();
    } catch (e) {
      Logger.error('Failed to duplicate plan', e, { source: 'DietPlanAppScreen' });
      setErrorMessage('Failed to duplicate plan');
      setIsLoading(false);
    }
  };

  const handleToggleArchive = async (plan: DietPlan) => {
    try {
      setIsLoading(true);
      await dietPlanService.updateDietPlan(plan.id, { is_archived: !plan.is_archived });
      loadData();
    } catch (e) {
      Logger.error('Failed to update archive status', e, { source: 'DietPlanAppScreen' });
      setErrorMessage('Failed to update plan archive status');
      setIsLoading(false);
    }
  };

  const handleTogglePin = async (plan: DietPlan) => {
    try {
      // Optimistic update for pinning since it changes ordering
      const updatedPlans = plans.map(p => p.id === plan.id ? { ...p, is_pinned: !p.is_pinned } : p);
      // Re-sort local list to reflect pin
      updatedPlans.sort((a, b) => {
        if (a.is_pinned === b.is_pinned) return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        return a.is_pinned ? -1 : 1;
      });
      setPlans(updatedPlans);

      await dietPlanService.updateDietPlan(plan.id, { is_pinned: !plan.is_pinned });
    } catch (e) {
      Logger.error('Failed to pin plan', e, { source: 'DietPlanAppScreen' });
      setErrorMessage('Failed to pin plan');
      loadData(); // Revert on fail
    }
  };

  const confirmDelete = (plan: DietPlan) => {
    setPlanToDelete(plan);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!planToDelete) return;
    setDeleteModalVisible(false);
    try {
      setIsLoading(true);
      await dietPlanService.deleteDietPlan(planToDelete.id);
      loadData();
    } catch (e) {
      Logger.error('Failed to delete plan', e, { source: 'DietPlanAppScreen' });
      setErrorMessage('Failed to delete plan');
      setIsLoading(false);
    }
  };

  const renderTab = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && { borderBottomColor: c.brand }]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, { color: isActive ? c.brand : c.textSecondary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPlanCard = ({ item }: { item: DietPlan }) => {
    const totalMeals = item.meals?.length || 0;
    const dailyCalories = item.meals?.reduce((sum, meal) =>
      sum + meal.items.reduce((itemSum, fItem) => itemSum + (parseInt(fItem.calories) || 0), 0), 0
    ) || 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => {
          setSelectedPlanForEdit(item);
          setIsBuilderVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>{item.plan_name}</Text>
            {item.is_template && (
              <View style={[styles.badge, { backgroundColor: c.brandBg, marginLeft: 8 }]}>
                <Text style={[styles.badgeText, { color: c.brand }]}>Template</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => handleTogglePin(item)} style={{ padding: 4 }}>
            <Ionicons name={item.is_pinned ? "pin" : "pin-outline"} size={20} color={item.is_pinned ? c.brand : c.textTertiary} />
          </TouchableOpacity>
        </View>

        {item.labels && item.labels.length > 0 && (
          <View style={styles.labelsContainer}>
            {item.labels.map((lbl, idx) => (
              <View key={idx} style={[styles.labelTag, { backgroundColor: c.bg }]}>
                <Text style={[styles.labelText, { color: c.textSecondary }]}>{lbl}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardMeta}>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>{totalMeals} Meals/Day</Text>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>~{dailyCalories} kcal</Text>
        </View>

        <View style={[styles.cardActions, { borderTopColor: c.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(item)}>
            <Ionicons name="copy-outline" size={18} color={c.textSecondary} />
            <Text style={[styles.actionText, { color: c.textSecondary }]}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            setPlanToShare(item);
            setIsShareVisible(true);
          }}>
            <Ionicons name="share-outline" size={18} color={c.textSecondary} />
            <Text style={[styles.actionText, { color: c.textSecondary }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleArchive(item)}>
            <Ionicons name="archive-outline" size={18} color={c.textSecondary} />
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{item.is_archived ? 'Restore' : 'Archive'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Diet Plans</Text>
          <SyncStatusBadge onSyncComplete={loadData} />
        </View>
        <View style={styles.tabsContainer}>
          {renderTab('templates', 'Templates & Active')}
          {renderTab('archived', 'Archived')}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'templates' ? plans : archivedPlans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="nutrition-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {activeTab === 'templates' ? 'No diet plans found. Create a template to get started.' : 'No archived plans.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {!isLoading && activeTab === 'templates' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.brand, bottom: insets.bottom + 24 }]}
          onPress={() => {
            setSelectedPlanForEdit(null);
            setIsBuilderVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>New Template</Text>
        </TouchableOpacity>
      )}

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Diet Plan"
        message={`Are you sure you want to delete "${planToDelete?.plan_name}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={executeDelete}
      />

      <DietBuilderModal
        visible={isBuilderVisible}
        initialPlan={selectedPlanForEdit}
        onClose={() => setIsBuilderVisible(false)}
        onSuccess={loadData}
      />

      <SharePlanModal
        visible={isShareVisible}
        plan={planToShare}
        onClose={() => setIsShareVisible(false)}
      />

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  labelTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardMeta: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  metaText: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    gap: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
