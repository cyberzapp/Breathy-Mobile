import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useColors } from '../../hooks/useColors';
import { DietPlan } from '../../services/dietPlanService';

interface SharePlanModalProps {
  visible: boolean;
  plan: DietPlan | null;
  onClose: () => void;
}

export default function SharePlanModal({ visible, plan, onClose }: SharePlanModalProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateHTML = (plan: DietPlan) => {
    const brandColor = '#10b981';
    
    let mealsHTML = '';
    
    if (plan.meals && plan.meals.length > 0) {
      plan.meals.forEach(meal => {
        let itemsHTML = '';
        meal.items.forEach(item => {
          itemsHTML += `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="display: flex; justify-content: space-between;">
                <strong>${item.name}</strong>
                <span>${item.quantity}</span>
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                ${item.calories} kcal | P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fat}g
              </div>
              ${item.notes ? `<div style="font-size: 12px; color: #888; font-style: italic; margin-top: 4px;">Note: ${item.notes}</div>` : ''}
            </div>
          `;
        });

        mealsHTML += `
          <div style="margin-bottom: 24px; background: #fafafa; border-radius: 8px; border: 1px solid #eaeaea; overflow: hidden;">
            <div style="background: ${brandColor}; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; font-size: 16px;">${meal.meal_type}</h3>
              <span style="font-size: 14px;">${meal.time}</span>
            </div>
            <div style="padding: 8px;">
              ${itemsHTML}
            </div>
          </div>
        `;
      });
    } else {
      mealsHTML = '<p>No meals added to this plan yet.</p>';
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; padding: 20px; color: #333; }
            h1 { color: ${brandColor}; margin-bottom: 8px; }
            .header-info { color: #666; margin-bottom: 30px; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section-title { border-bottom: 2px solid ${brandColor}; padding-bottom: 8px; margin-bottom: 16px; color: #222; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
            .meta-box { background: #f9f9f9; padding: 16px; border-radius: 8px; border: 1px solid #eee; }
            .meta-box h4 { margin: 0 0 8px 0; color: #555; font-size: 12px; text-transform: uppercase; }
            .meta-box p { margin: 0; font-weight: bold; color: #222; }
          </style>
        </head>
        <body>
          <h1>${plan.plan_name}</h1>
          <div class="header-info">Generated on ${new Date().toLocaleDateString()}</div>
          
          <div class="meta-grid">
            <div class="meta-box">
              <h4>Primary Goals</h4>
              <p>${plan.goals || 'Not specified'}</p>
            </div>
            <div class="meta-box">
              <h4>Dietary Restrictions</h4>
              <p>${plan.dietary_restrictions?.join(', ') || 'None'}</p>
            </div>
          </div>

          ${plan.notes ? `
            <div class="section">
              <h2 class="section-title">Doctor's Notes</h2>
              <p style="white-space: pre-wrap;">${plan.notes}</p>
            </div>
          ` : ''}

          <div class="section">
            <h2 class="section-title">Meal Plan</h2>
            ${mealsHTML}
          </div>
          
          <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #999;">
            Powered by Breathy
          </div>
        </body>
      </html>
    `;
  };

  const handleSharePDF = async () => {
    if (!plan) return;
    
    try {
      setIsGenerating(true);
      const html = generateHTML(plan);
      
      const { uri } = await Print.printToFileAsync({ html });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Share ${plan.plan_name}`,
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate or share PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!plan) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: c.bg, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Share Diet Plan</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.planInfo, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="nutrition" size={40} color={c.brand} style={{ marginBottom: 12 }} />
              <Text style={[styles.planName, { color: c.text }]}>{plan.plan_name}</Text>
              <Text style={[styles.planMeta, { color: c.textSecondary }]}>
                {plan.meals?.length || 0} Meals | {plan.is_template ? 'Template' : 'Active Plan'}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.shareOption, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={handleSharePDF}
              disabled={isGenerating}
            >
              <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="document-text" size={24} color="#ef4444" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: c.text }]}>Export as PDF</Text>
                <Text style={[styles.optionDesc, { color: c.textTertiary }]}>Share via WhatsApp, Email, or save to device</Text>
              </View>
              {isGenerating ? (
                <ActivityIndicator size="small" color={c.brand} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareOption, { backgroundColor: c.card, borderColor: c.border, opacity: 0.5 }]}
              disabled={true}
            >
              <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="link" size={24} color="#6366f1" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: c.text }]}>Send Patient Link</Text>
                <Text style={[styles.optionDesc, { color: c.textTertiary }]}>Assign directly to patient app (Coming Soon)</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  planInfo: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  planMeta: {
    fontSize: 14,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
  },
});
