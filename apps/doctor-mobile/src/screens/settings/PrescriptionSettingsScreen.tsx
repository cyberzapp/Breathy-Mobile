import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  getPrescriptionStyle, updatePrescriptionStyle,
  getPrescriptionLocations, listTemplates, deleteTemplate,
  deletePrescriptionLocation, setDefaultPrescriptionLocation,
  addPrescriptionLocation, parseGmapsUrl, uploadPrescriptionLogo,
  getSignatureUrl, updateDoctorProfile
} from '../../services/settingsService';

import { supabase } from '../../lib/supabaseClient';
import { decode } from 'base64-arraybuffer';
import { useColors } from '../../hooks/useColors';
import KeyboardAwareModal from '../../components/ui/KeyboardAwareModal';
import SuccessModal from '../../components/ui/SuccessModal';

// INDUSTRY STANDARD: Import our pure native Skia component
import { SkiaSignaturePad, SignaturePadRef } from '../../components/ui/SkiaSignaturePad';

const COLOR_PRESETS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#334155'];
const FONT_SIZES = [
  { label: 'Small (8px)', value: 8 },
  { label: 'Medium (10px)', value: 10 },
  { label: 'Large (12px)', value: 12 },
];

export default function PrescriptionSettingsScreen() {
  const navigation = useNavigation();
  const c = useColors();
  const [loading, setLoading] = useState(true);
  
  // UX TRICK: Dynamically lock the scroll view when drawing
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [styleData, setStyleData] = useState<any>({});
  const [selectedColor, setSelectedColor] = useState('#0d9488');
  const [fontSize, setFontSize] = useState(10);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showPoweredBy, setShowPoweredBy] = useState(true);
  const [defaultAdvice, setDefaultAdvice] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoLocalUri, setLogoLocalUri] = useState<string | null>(null);
  const [savingStyle, setSavingStyle] = useState(false);
  const [showGenerics, setShowGenerics] = useState(true);
  const [newVariable, setNewVariable] = useState('');

  const [locations, setLocations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Type the ref for our custom Skia component
  const signatureRef = useRef<SignaturePadRef>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationData, setLocationData] = useState({
    location_label: '', clinic_name: '', address_line_1: '',
    city: '', state: '', pincode: '', phone_number: '', email: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [styleRes, locs, tmpls, sigUrl]: any[] = await Promise.all([
        getPrescriptionStyle(),
        getPrescriptionLocations(),
        listTemplates(),
        getSignatureUrl(),
      ]);

      const style = styleRes || {};
      setStyleData(style);
      setSelectedColor(style.primary_color || '#0d9488');
      setFontSize(style.font_size || 10);
      setShowWatermark(style.show_watermark !== false);
      setShowPoweredBy(style.show_powered_by !== false);
      setDefaultAdvice(style.default_advice || '');
      if (style.logo_url) {
        const { data } = supabase.storage.from('doctor-logos').getPublicUrl(style.logo_url);
        setLogoPreview(data.publicUrl);
      }

      setLocations(Array.isArray(locs) ? locs : []);
      setTemplates(Array.isArray(tmpls) ? tmpls : (tmpls?.templates || []));
      setSignatureUrl(sigUrl || null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: doc } = await supabase.from('doctors').select('show_generic_names').eq('id', user.id).single();
        setShowGenerics(doc?.show_generic_names !== false);
      }
    } catch (e) {
      console.error('[PrescriptionSettings] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStyle = async () => {
    setSavingStyle(true);
    try {
      let uploadedLogoPath = styleData?.logo_url || null;

      if (logoLocalUri) {
        uploadedLogoPath = await uploadPrescriptionLogo(logoLocalUri);
      }
      if (!logoPreview && styleData?.logo_url) {
        uploadedLogoPath = null;
      }

      const payload = {
        logo_url: uploadedLogoPath,
        primary_color: selectedColor,
        font_size: fontSize,
        show_watermark: showWatermark,
        show_powered_by: showPoweredBy,
        default_advice: defaultAdvice,
      };

      await updatePrescriptionStyle(payload);
      setStyleData({ ...styleData, ...payload });
      setLogoLocalUri(null);
      setSuccessMessage('Template style saved!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save style.');
    } finally {
      setSavingStyle(false);
    }
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoLocalUri(result.assets[0].uri);
      setLogoPreview(result.assets[0].uri);
    }
  };

  const handleGenericToggle = async (val: boolean) => {
    setShowGenerics(val);
    try {
      await updateDoctorProfile({ show_generic_names: val });
    } catch (e) {
      setShowGenerics(!val);
      console.error(e);
    }
  };

  const handleDeleteLocation = (id: string, label: string) => {
    Alert.alert('Delete Location', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deletePrescriptionLocation(id); setLocations(p => p.filter(l => l.id !== id)); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPrescriptionLocation(id);
      setLocations(p => p.map(l => ({ ...l, is_default: l.id === id })));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleSaveLocation = async () => {
    if (!locationData.location_label || !locationData.clinic_name || !locationData.address_line_1) {
      return Alert.alert('Missing Fields', 'Please provide Label, Clinic Name, and Address.');
    }
    setIsSavingLocation(true);
    try {
      await addPrescriptionLocation(locationData);
      setSuccessMessage('Location saved!');
      
      setShowAddLocationModal(false);
      setLocationData({ location_label: '', clinic_name: '', address_line_1: '', city: '', state: '', pincode: '', phone_number: '', email: '' });
      
      const locs: any = await getPrescriptionLocations();
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save location.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    Alert.alert('Delete Template', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteTemplate(id); setTemplates(p => p.filter(t => t.id !== id)); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  // Triggered by our custom Skia component
  const handleSignatureSave = async () => {
    // Imperatively fetch the base64 image from Skia Canvas
    const base64Data = signatureRef.current?.getBase64();
    
    if (!base64Data) {
      Alert.alert('Error', 'Please draw a signature first.');
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const uniqueString = Math.random().toString(36).substring(2, 10);
      const fileName = `${user.id}_${uniqueString}.png`;

      const { data, error } = await supabase.storage
        .from('doctor-signatures')
        .upload(fileName, decode(base64Data), { contentType: 'image/png', upsert: true });
      if (error) throw error;

      await supabase.from('doctors').update({ signature_url: data.path }).eq('id', user.id);

      const newUrl = await getSignatureUrl();
      setSignatureUrl(newUrl);
      setShowSignaturePad(false);
      setSuccessMessage('Signature saved!');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Failed to save signature.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#14b8a6" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Prescription Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Controlled ScrollView */}
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled} // Dynamically locks when drawing!
      >
        {/* CARD 1: Prescription Locations */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons name="business-outline" size={20} color="#14b8a6" />
              <Text style={[styles.cardTitle, { color: c.text }]}>Prescription Locations</Text>
            </View>
            <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowAddLocationModal(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addNewBtnText}>Add New</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>Manage the clinic locations that appear on your printed prescriptions.</Text>

          {locations.length === 0 && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.alertBannerText}>Action Required: Please add at least one location to generate prescriptions.</Text>
            </View>
          )}

          {locations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={36} color="#cbd5e1" />
              <Text style={styles.emptyText}>No locations saved yet.</Text>
            </View>
          ) : (
            locations.map((loc: any) => (
              <View key={loc.id} style={styles.locationItem}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.locLabel}>{loc.location_label || 'Untitled'}</Text>
                    {loc.is_default && <View style={styles.defaultBadge}><Ionicons name="star" size={10} color="#92400e" /><Text style={styles.defaultBadgeText}>Default</Text></View>}
                  </View>
                  <Text style={styles.locClinic}>{loc.clinic_name}</Text>
                  <Text style={styles.locAddress}>{loc.address_line_1}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {!loc.is_default && (
                    <TouchableOpacity onPress={() => handleSetDefault(loc.id)} style={styles.iconBtn}><Ionicons name="star-outline" size={20} color="#f59e0b" /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDeleteLocation(loc.id, loc.location_label)} style={styles.iconBtn}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* CARD 2: Digital Signature */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pencil-outline" size={20} color="#14b8a6" />
            <Text style={styles.cardTitle}>Digital Signature</Text>
          </View>
          <Text style={styles.cardSubtitle}>This signature appears on all prescriptions and invoices.</Text>

          {!signatureUrl && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.alertBannerText}>Action Required: Please set up your digital signature.</Text>
            </View>
          )}

          <View style={styles.signaturePreview}>
            {signatureUrl ? (
              <Image source={{ uri: signatureUrl }} style={styles.signatureImage} resizeMode="contain" />
            ) : (
              <Text style={{ color: '#94a3b8', fontSize: 14 }}>No signature set</Text>
            )}
          </View>

          {showSignaturePad ? (
            <View style={styles.signaturePadContainer}>
              <Text style={styles.signaturePadLabel}>Draw your signature below:</Text>
              
              {/* NATIVE SKIA CANVAS IMPLEMENTATION */}
              <View style={styles.signatureCanvasWrapper}>
                <SkiaSignaturePad 
                  ref={signatureRef} 
                  onDrawStart={() => setScrollEnabled(false)} 
                  onDrawEnd={() => setScrollEnabled(true)} 
                />
              </View>

              <View style={styles.sigActions}>
                <TouchableOpacity onPress={() => signatureRef.current?.clear()} style={styles.clearSigBtn}>
                  <Text style={styles.clearSigText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSignaturePad(false)} style={styles.cancelSigBtn}>
                  <Text style={styles.cancelSigText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveSigBtn} 
                  onPress={handleSignatureSave} 
                  disabled={isUploading}
                >
                  {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveSigText}>Save Signature</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.updateSigBtn} onPress={() => setShowSignaturePad(true)}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.updateSigBtnText}>{signatureUrl ? 'Update Signature' : 'Create Signature'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CARD 3: Template Customization */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="color-palette-outline" size={20} color="#14b8a6" />
            <Text style={styles.cardTitle}>Template Customization</Text>
          </View>
          <Text style={styles.cardSubtitle}>Personalize prescriptions with your logo, brand color, and font.</Text>

          <View style={styles.logoSection}>
            <Text style={styles.sectionLabel}>Clinic Logo</Text>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                {logoPreview ? (
                  <Image source={{ uri: logoPreview }} style={{ width: 80, height: 80 }} resizeMode="contain" />
                ) : (
                  <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                )}
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickLogo}>
                  <Text style={styles.uploadBtnText}>{logoPreview ? 'Change Logo' : 'Upload Logo'}</Text>
                </TouchableOpacity>
                {logoPreview && (
                  <TouchableOpacity onPress={() => { setLogoPreview(null); setLogoLocalUri(null); }}>
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                )}
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>PNG/JPG, max 2MB</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionLabel}>Brand Color</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchActive]}
                  onPress={() => setSelectedColor(c)}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionLabel}>Font Size</Text>
            <View style={styles.fontSizeRow}>
              {FONT_SIZES.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.fontSizeBtn, fontSize === f.value && styles.fontSizeBtnActive]}
                  onPress={() => setFontSize(f.value)}
                >
                  <Text style={[styles.fontSizeBtnText, fontSize === f.value && styles.fontSizeBtnTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Show Breathy Watermark</Text>
              <Text style={styles.toggleDesc}>Faint logo in the center of the prescription.</Text>
            </View>
            <Switch value={showWatermark} onValueChange={setShowWatermark} trackColor={{ false: '#e2e8f0', true: '#14b8a6' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Show 'Powered by Breathy' Footer</Text>
              <Text style={styles.toggleDesc}>Adds "Powered by BreathyEMR" to the footer.</Text>
            </View>
            <Switch value={showPoweredBy} onValueChange={setShowPoweredBy} trackColor={{ false: '#e2e8f0', true: '#14b8a6' }} />
          </View>

          <View style={styles.divider} />

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionLabel}>Default Advice / Instructions</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              Auto-added to all prescriptions. Use [variable] for dynamic fields.
            </Text>
            <TextInput
              style={styles.adviceInput}
              value={defaultAdvice}
              onChangeText={setDefaultAdvice}
              placeholder="e.g. Diet [calories] Kcal/Day & Exercise [duration] min everyday."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
              <TextInput
                style={{ flex: 1, height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, fontSize: 13 }}
                placeholder="New variable (e.g. duration)"
                value={newVariable}
                onChangeText={setNewVariable}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#14b8a6', paddingHorizontal: 16, height: 40, borderRadius: 8, justifyContent: 'center' }}
                onPress={() => {
                  if (newVariable.trim()) {
                    setDefaultAdvice((prev) => prev ? `${prev} [${newVariable.trim()}]` : `[${newVariable.trim()}]`);
                    setNewVariable('');
                  }
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveStyleBtn} onPress={handleSaveStyle} disabled={savingStyle}>
            {savingStyle ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveStyleBtnText}>Save Style Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* CARD 4: Saved Templates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color="#14b8a6" />
            <Text style={styles.cardTitle}>Saved Templates ({templates.length})</Text>
          </View>
          <Text style={styles.cardSubtitle}>Manage your saved templates for common diagnoses.</Text>

          {templates.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={36} color="#cbd5e1" />
              <Text style={styles.emptyText}>No templates saved yet.</Text>
            </View>
          ) : (
            templates.map((t: any) => (
              <View key={t.id} style={styles.templateItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{t.template_name || 'Untitled'}</Text>
                  <Text style={styles.templateDiag}>{t.diagnosis || 'No diagnosis'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteTemplate(t.id, t.template_name)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* CARD 5: Prescription Display */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="book-outline" size={20} color="#14b8a6" />
            <Text style={styles.cardTitle}>Prescription Display</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Show Generic Names</Text>
              <Text style={styles.toggleDesc}>Display generic name below the brand name on prescriptions.</Text>
            </View>
            <Switch value={showGenerics} onValueChange={handleGenericToggle} trackColor={{ false: '#e2e8f0', true: '#14b8a6' }} />
          </View>
        </View>
      </ScrollView>

      {/* Add Location Modal */}
      <KeyboardAwareModal
        visible={showAddLocationModal}
        onClose={() => {
          setShowAddLocationModal(false);
          setLocationData({ location_label: '', clinic_name: '', address_line_1: '', city: '', state: '', pincode: '', phone_number: '', email: '' });
        }}
        title="Add New Location"
      >
        <View style={{ gap: 12 }}>
          <Text style={styles.formSectionTitle}>Enter Location Details</Text>
          <View>
            <Text style={styles.inputLabel}>Location Label *</Text>
            <TextInput style={styles.formInput} value={locationData.location_label} onChangeText={v => setLocationData(p => ({ ...p, location_label: v }))} placeholder="e.g. Main Clinic" />
          </View>
          <View>
            <Text style={styles.inputLabel}>Clinic Name *</Text>
            <TextInput style={styles.formInput} value={locationData.clinic_name} onChangeText={v => setLocationData(p => ({ ...p, clinic_name: v }))} placeholder="Clinic Name" />
          </View>
          <View>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput style={styles.formInput} value={locationData.address_line_1} onChangeText={v => setLocationData(p => ({ ...p, address_line_1: v }))} placeholder="Full address" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput style={styles.formInput} value={locationData.city} onChangeText={v => setLocationData(p => ({ ...p, city: v }))} placeholder="City" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput style={styles.formInput} value={locationData.state} onChangeText={v => setLocationData(p => ({ ...p, state: v }))} placeholder="State" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Pincode</Text>
              <TextInput style={styles.formInput} value={locationData.pincode} onChangeText={v => setLocationData(p => ({ ...p, pincode: v }))} placeholder="Pincode" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.formInput} value={locationData.phone_number} onChangeText={v => setLocationData(p => ({ ...p, phone_number: v }))} placeholder="Phone" keyboardType="phone-pad" />
            </View>
          </View>
          <View>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput style={styles.formInput} value={locationData.email} onChangeText={v => setLocationData(p => ({ ...p, email: v }))} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <TouchableOpacity style={styles.saveLocBtn} onPress={handleSaveLocation} disabled={isSavingLocation}>
            {isSavingLocation ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveLocBtnText}>Save Location</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAwareModal>

      <SuccessModal
        visible={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        message={successMessage || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  alertBannerText: { color: '#dc2626', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },

  addNewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#14b8a6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addNewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  locationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  locLabel: { fontWeight: '700', color: '#1e293b', fontSize: 15 },
  locClinic: { fontSize: 14, color: '#475569', marginTop: 2 },
  locAddress: { fontSize: 13, color: '#94a3b8', marginTop: 1 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  iconBtn: { padding: 8 },

  templateItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  templateName: { fontWeight: '600', color: '#1e293b', fontSize: 15 },
  templateDiag: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  emptyContainer: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 8 },

  signaturePreview: { width: '100%', height: 100, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', marginBottom: 12, overflow: 'hidden' },
  signatureImage: { width: '100%', height: '100%' },
  signaturePadContainer: { marginTop: 8 },
  signaturePadLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  
  signatureCanvasWrapper: { height: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  
  sigActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 10 },
  clearSigBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  clearSigText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  cancelSigBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelSigText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  saveSigBtn: { backgroundColor: '#14b8a6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveSigText: { color: '#fff', fontWeight: '700' },
  updateSigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#14b8a6', paddingVertical: 12, borderRadius: 10 },
  updateSigBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  logoSection: { marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBox: { width: 90, height: 90, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', overflow: 'hidden' },
  uploadBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  uploadBtnText: { color: '#475569', fontWeight: '600', fontSize: 13 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6 },

  fontSizeRow: { flexDirection: 'row', gap: 8 },
  fontSizeBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' },
  fontSizeBtnActive: { backgroundColor: '#14b8a6' },
  fontSizeBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  fontSizeBtnTextActive: { color: '#fff' },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontSize: 15, fontWeight: '500', color: '#334155' },
  toggleDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, maxWidth: '90%' },

  adviceInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#334155', minHeight: 80, textAlignVertical: 'top' },

  saveStyleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#14b8a6', paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  saveStyleBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  formSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  saveLocBtn: { backgroundColor: '#14b8a6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveLocBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});