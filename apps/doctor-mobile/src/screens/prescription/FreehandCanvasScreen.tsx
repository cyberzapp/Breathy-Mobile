import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Path, Group, Rect, Skia, Paint, useCanvasRef, Line, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS, useDerivedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import getStroke from 'perfect-freehand';
import { useColors } from '../../hooks/useColors';
import { useBreathySounds } from '../../hooks/useBreathySounds';
import { isOnline } from '../../services/offlineCacheService';
import { instantFreehandExtract } from '../../services/prescriptionService';
import WarningModal from '../../components/ui/WarningModal';
import ErrorModal from '../../components/ui/ErrorModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

// ---------------------------------------------------------------------------
// FreehandCanvasScreen — Native Skia Drawing Canvas
// ---------------------------------------------------------------------------

interface Stroke {
  path: string;
  isEraser: boolean;
}

export default function FreehandCanvasScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { playPop, playSuccess, playError } = useBreathySounds();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const canvasRef = useCanvasRef();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [penWeight, setPenWeight] = useState(3);
  const [eraserWeight, setEraserWeight] = useState(24);
  const [showSlider, setShowSlider] = useState<'pen' | 'eraser' | null>(null);

  // --- Clinical Inputs State ---
  const [vitals, setVitals] = useState({ bp: '', pulse: '', spo2: '', temp: '', weight: '' });
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- Drawing State ---
  const [completedStrokes, setCompletedStrokes] = useState<Stroke[]>([]);
  const activePoints = useRef<number[][]>([]);
  const activePathSvg = useSharedValue<string>('');

  // --- Zoom & Pan State ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // --- Helpers ---
  const getSvgPathFromStroke = (strokePoints: number[][], isEraser: boolean, currentSize?: number) => {
    if (!strokePoints.length) return '';
    const stroke = getStroke(strokePoints, {
      size: currentSize ?? (isEraser ? eraserWeight : penWeight),
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    if (!stroke.length) return '';
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ['M', ...stroke[0], 'Q']
    );
    d.push('Z');
    return d.join(' ');
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const doClear = () => {
    setShowClearConfirm(false);
    setCompletedStrokes([]);
    scale.value = 1; savedScale.value = 1;
    translateX.value = 0; savedTranslateX.value = 0;
    translateY.value = 0; savedTranslateY.value = 0;
  };

  const handleUndo = () => {
    playPop();
    setCompletedStrokes((prev) => prev.slice(0, -1));
  };

  const activeSkPath = useDerivedValue(() => {
    if (!activePathSvg.value) return Skia.Path.Make();
    return Skia.Path.MakeFromSVGString(activePathSvg.value) ?? Skia.Path.Make();
  });

  const handleZoomIn = () => {
    scale.value = withTiming(Math.min(scale.value * 1.5, 4));
    savedScale.value = scale.value;
  };

  const handleZoomOut = () => {
    scale.value = withTiming(Math.max(scale.value / 1.5, 0.5));
    savedScale.value = scale.value;
  };

  const handleResetZoom = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    savedTranslateX.value = 0;
    translateY.value = withTiming(0);
    savedTranslateY.value = 0;
  };

  const handleReview = useCallback(async () => {
    if (completedStrokes.length === 0) {
      setWarningMessage('Please write your prescription before reviewing.');
      return;
    }

    const image = canvasRef.current?.makeImageSnapshot();
    if (!image) {
      setErrorMessage('Failed to capture drawing.');
      return;
    }
    const base64Data = image.encodeToBase64();

    const online = await isOnline();
    if (!online) {
      setWarningMessage('Your drawing has been saved locally. It will be processed by AI when you reconnect.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = Date.now();
      const response: any = await instantFreehandExtract(base64Data);
      const elapsed = Date.now() - startTime;

      const clinicalInputs = {
        vitals: Object.values(vitals).some(Boolean) ? vitals : null,
        diagnosis: diagnosis || null,
        icdCode: icdCode || null,
        followUp: followUp || null,
      };

      // Unwrap response.result — the API returns { result, confidence, freehand_image_path }
      // The review form expects aiResult to be the inner `result` object (matching web behavior)
      playSuccess();
      navigation.navigate('FreehandReview', {
        aiResult: response.result,
        confidence: response.confidence || 0,
        freehandImagePath: response.freehand_image_path || '',
        elapsedMs: elapsed,
        clinicalInputs,
      });
    } catch (err: any) {
      playError();
      setErrorMessage('Could not process your handwriting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [navigation, vitals, diagnosis, icdCode, followUp, completedStrokes]);

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .minPointers(activeTool === 'pan' ? 1 : 2)
    .maxPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const drawGesture = Gesture.Pan()
    .enabled(activeTool !== 'pan')
    .minPointers(1)
    .maxPointers(1)
    .runOnJS(true)
    .onStart((e) => {
      const cx = (e.x - translateX.value) / scale.value;
      const cy = (e.y - translateY.value) / scale.value;
      activePoints.current = [[cx, cy]];
      activePathSvg.value = getSvgPathFromStroke(activePoints.current, activeTool === 'eraser');
    })
    .onUpdate((e) => {
      const cx = (e.x - translateX.value) / scale.value;
      const cy = (e.y - translateY.value) / scale.value;
      activePoints.current.push([cx, cy]);
      activePathSvg.value = getSvgPathFromStroke(activePoints.current, activeTool === 'eraser');
    })
    .onEnd(() => {
      if (activePoints.current.length > 0 && activePathSvg.value) {
        const path = activePathSvg.value;
        const isEraser = activeTool === 'eraser';
        setCompletedStrokes((prev) => [...prev, { path, isEraser }]);
      }
    });

  // Handoff synchronization: Wait until React has fully rendered the new completed stroke
  // BEFORE clearing it from the Reanimated UI thread. This completely eliminates "blinking"!
  useEffect(() => {
    const timer = setTimeout(() => {
      activePathSvg.value = '';
      activePoints.current = [];
    }, 50); // 50ms is enough to let Skia Reconciler paint the new JSX path
    return () => clearTimeout(timer);
  }, [completedStrokes]);

  const composedGesture = Gesture.Simultaneous(
    Gesture.Simultaneous(pinchGesture, panGesture),
    drawGesture
  );

  // --- Grid Layout Calculations ---
  const CANVAS_WIDTH = Math.max(screenWidth, 800);
  const CANVAS_HEIGHT = Math.max(screenHeight, 1000);
  const margin = 16;
  const gap = 10;
  const gridW = CANVAS_WIDTH - margin * 2;
  const gridH = CANVAS_HEIGHT - margin * 2;
  const rxWidth = gridW * 0.58;
  const vitalsWidth = gridW - rxWidth - gap;
  const topHeight = gridH * 0.58;
  const bottomHeight = gridH - topHeight - gap;

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ]
  }));

  const headerNode = useMemo(() => (
    <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: c.text }]}>Freehand Prescription</Text>
      <TouchableOpacity style={styles.backBtn} onPress={handleUndo}>
        <Ionicons name="arrow-undo" size={22} color={c.text} />
      </TouchableOpacity>
    </View>
  ), [c, navigation, handleUndo]);

  const clinicalInputsNode = useMemo(() => (
    <View style={{ height: 50, marginTop: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 8 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text }]} placeholder="Diagnosis" placeholderTextColor={c.textTertiary} value={diagnosis} onChangeText={setDiagnosis} /></View>
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 60 }]} placeholder="ICD" placeholderTextColor={c.textTertiary} value={icdCode} onChangeText={setIcdCode} /></View>
        <View style={styles.dividerPill} />
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 70 }]} placeholder="BP" placeholderTextColor={c.textTertiary} value={vitals.bp} onChangeText={(v) => setVitals((prev) => ({ ...prev, bp: v }))} /></View>
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 60 }]} placeholder="Pulse" placeholderTextColor={c.textTertiary} value={vitals.pulse} onChangeText={(v) => setVitals((prev) => ({ ...prev, pulse: v }))} keyboardType="numeric" /></View>
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 60 }]} placeholder="SpO₂" placeholderTextColor={c.textTertiary} value={vitals.spo2} onChangeText={(v) => setVitals((prev) => ({ ...prev, spo2: v }))} keyboardType="numeric" /></View>
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 60 }]} placeholder="Temp" placeholderTextColor={c.textTertiary} value={vitals.temp} onChangeText={(v) => setVitals((prev) => ({ ...prev, temp: v }))} keyboardType="numeric" /></View>
        <View style={[styles.inputPill, { backgroundColor: c.input, borderColor: c.borderMedium }]}><TextInput style={[styles.pillTextInput, { color: c.text, width: 60 }]} placeholder="Weight" placeholderTextColor={c.textTertiary} value={vitals.weight} onChangeText={(v) => setVitals((prev) => ({ ...prev, weight: v }))} keyboardType="numeric" /></View>
      </ScrollView>
    </View>
  ), [c, diagnosis, icdCode, vitals]);

  const sideToolbarNode = useMemo(() => (
    <View style={[styles.sideToolbar, { backgroundColor: c.card, borderColor: c.border, right: 24, bottom: insets.bottom + 90 }]}>
      <TouchableOpacity style={styles.sideToolBtn} onPress={handleZoomIn}>
        <Ionicons name="add" size={22} color={c.textSecondary} />
      </TouchableOpacity>
      <View style={{ width: '100%', height: 1, backgroundColor: c.borderMedium }} />
      <TouchableOpacity style={styles.sideToolBtn} onPress={handleZoomOut}>
        <Ionicons name="remove" size={22} color={c.textSecondary} />
      </TouchableOpacity>
      <View style={{ width: '100%', height: 1, backgroundColor: c.borderMedium }} />
      <TouchableOpacity style={styles.sideToolBtn} onPress={handleResetZoom}>
        <Ionicons name="scan" size={18} color={c.textSecondary} />
      </TouchableOpacity>
      <View style={{ width: '100%', height: 1, backgroundColor: c.borderMedium }} />
      <TouchableOpacity style={styles.sideToolBtn} onPress={handleUndo} disabled={completedStrokes.length === 0}>
        <Ionicons name="arrow-undo-outline" size={18} color={completedStrokes.length === 0 ? c.textTertiary : c.textSecondary} />
      </TouchableOpacity>
    </View>
  ), [c, insets.bottom, handleZoomIn, handleZoomOut, handleResetZoom, handleUndo, completedStrokes.length]);

  const sliderPopoverNode = useMemo(() => {
    if (!showSlider) return null;
    return (
      <View style={[styles.sliderPopover, { backgroundColor: c.card, borderColor: c.border, bottom: insets.bottom + 70 }]}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSecondary, marginBottom: 8, textAlign: 'center' }}>
          {showSlider === 'pen' ? 'Pen Weight' : 'Eraser Size'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          {(showSlider === 'pen' ? [1, 2, 3, 5, 8] : [10, 20, 30, 40, 50]).map((w) => {
            const isActive = (showSlider === 'pen' ? penWeight : eraserWeight) === w;
            return (
              <TouchableOpacity
                key={w}
                onPress={() => {
                  if (showSlider === 'pen') setPenWeight(w);
                  else setEraserWeight(w);
                  setShowSlider(null);
                }}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isActive ? (showSlider === 'pen' ? c.brandBg : c.errorBg) : c.input,
                  borderWidth: 1, borderColor: isActive ? (showSlider === 'pen' ? c.brand : c.error) : c.borderMedium,
                  justifyContent: 'center', alignItems: 'center'
                }}
              >
                <View style={{
                  width: showSlider === 'pen' ? w * 2 + 2 : w / 2,
                  height: showSlider === 'pen' ? w * 2 + 2 : w / 2,
                  borderRadius: 20,
                  backgroundColor: isActive ? (showSlider === 'pen' ? c.brand : c.error) : c.textSecondary
                }} />
              </TouchableOpacity>
            )
          })}
        </View>
        <TouchableOpacity style={{ position: 'absolute', top: 6, right: 6, padding: 4 }} onPress={() => setShowSlider(null)}>
          <Ionicons name="close" size={16} color={c.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  }, [c, insets.bottom, showSlider, penWeight, eraserWeight]);

  const footerToolbarNode = useMemo(() => (
    <View style={[styles.toolbar, { backgroundColor: c.card, borderColor: c.border, bottom: insets.bottom + 16 }]}>
      <TouchableOpacity 
        style={[styles.toolBtn, activeTool === 'pen' && { backgroundColor: c.brandBg, borderColor: c.brand }]} 
        onPress={() => setActiveTool('pen')}
        onLongPress={() => setShowSlider('pen')}
      >
        <Ionicons name="pencil" size={20} color={activeTool === 'pen' ? c.brand : c.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.toolBtn, activeTool === 'eraser' && { backgroundColor: c.errorBg, borderColor: c.error }]} 
        onPress={() => setActiveTool('eraser')}
        onLongPress={() => setShowSlider('eraser')}
      >
        <Ionicons name="backspace-outline" size={20} color={activeTool === 'eraser' ? c.error : c.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.toolBtn, activeTool === 'pan' && { backgroundColor: c.warningBg, borderColor: c.warning }]} 
        onPress={() => { setActiveTool('pan'); setShowSlider(null); }}
      >
        <Ionicons name="hand-right-outline" size={20} color={activeTool === 'pan' ? c.warning : c.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.toolBtn} onPress={handleClear}>
        <Ionicons name="trash-outline" size={20} color={c.textTertiary} />
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: c.borderMedium }]} />

      <TouchableOpacity style={[styles.reviewBtn, { backgroundColor: c.brand }, isSubmitting && { opacity: 0.6 }]} onPress={handleReview} disabled={isSubmitting} activeOpacity={0.8}>
        {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : (
          <>
            <Text style={styles.reviewText}>Review</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  ), [c, insets.bottom, activeTool, isSubmitting, handleClear, handleReview]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {headerNode}
      {clinicalInputsNode}

      {/* Skia Canvas */}
      <View style={[styles.canvasWrap, { backgroundColor: '#fff', borderColor: c.border, overflow: 'hidden' }]}>
        
        <GestureDetector gesture={composedGesture}>
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            <Group transform={transform}>
              {/* White Background for Image Capture */}
              <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} color="#ffffff" />
              
              {/* Rx — MEDICATIONS */}
              <Rect x={margin} y={margin} width={rxWidth} height={topHeight} color="rgba(20, 184, 166, 0.05)" />
              <Rect x={margin} y={margin} width={rxWidth} height={topHeight} color="transparent" style="stroke" strokeWidth={1} />
              
              {/* VITALS & LAB VALUES */}
              <Rect x={margin + rxWidth + gap} y={margin} width={vitalsWidth} height={topHeight} color="rgba(99, 102, 241, 0.05)" />
              <Rect x={margin + rxWidth + gap} y={margin} width={vitalsWidth} height={topHeight} color="transparent" style="stroke" strokeWidth={1} />
              
              {/* INVESTIGATIONS / TESTS */}
              <Rect x={margin} y={margin + topHeight + gap} width={rxWidth} height={bottomHeight} color="rgba(245, 158, 11, 0.05)" />
              <Rect x={margin} y={margin + topHeight + gap} width={rxWidth} height={bottomHeight} color="transparent" style="stroke" strokeWidth={1} />
              
              {/* ADVICE / NOTES */}
              <Rect x={margin + rxWidth + gap} y={margin + topHeight + gap} width={vitalsWidth} height={bottomHeight} color="rgba(100, 116, 139, 0.05)" />
              <Rect x={margin + rxWidth + gap} y={margin + topHeight + gap} width={vitalsWidth} height={bottomHeight} color="transparent" style="stroke" strokeWidth={1} />

              {/* Strokes Layer (Uses Offscreen Buffer for Eraser blendMode="clear") */}
              <Group layer={<Paint />}>
                {completedStrokes.map((stroke, i) => (
                  <Path key={i} path={stroke.path} color={stroke.isEraser ? "transparent" : "#000000"} style="fill" blendMode={stroke.isEraser ? "clear" : "srcOver"} />
                ))}
                <Path path={activeSkPath} color={activeTool === 'eraser' ? "transparent" : "#000000"} style="fill" blendMode={activeTool === 'eraser' ? "clear" : "srcOver"} />
              </Group>
            </Group>
          </Canvas>
        </GestureDetector>

        {/* RN Absolute Overlay for Background Text - Syncs with Skia Pan/Zoom */}
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none', zIndex: 10 }, animatedBgStyle]}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <View style={{ position: 'absolute', left: margin, top: margin, padding: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: 'rgba(20, 184, 166, 0.2)', letterSpacing: 1 }}>Rx — MEDICATIONS</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(20, 184, 166, 0.3)', marginTop: 4 }}>Write drug names, dosage, duration</Text>
            </View>
            <View style={{ position: 'absolute', left: margin + rxWidth + gap, top: margin, padding: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(99, 102, 241, 0.2)', letterSpacing: 1 }}>VITALS</Text>
            </View>
            <View style={{ position: 'absolute', left: margin, top: margin + topHeight + gap, padding: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(245, 158, 11, 0.2)', letterSpacing: 1 }}>INVESTIGATIONS</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(245, 158, 11, 0.3)', marginTop: 4 }}>Tests and diagnostic queries</Text>
            </View>
            <View style={{ position: 'absolute', left: margin + rxWidth + gap, top: margin + topHeight + gap, padding: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(100, 116, 139, 0.2)', letterSpacing: 1 }}>ADVICE</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(100, 116, 139, 0.3)', marginTop: 4 }}>Notes & Follow up</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {sideToolbarNode}
      {sliderPopoverNode}
      {footerToolbarNode}
      <WarningModal
        visible={!!warningMessage}
        message={warningMessage || ''}
        onClose={() => setWarningMessage(null)}
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <ConfirmationModal
        visible={showClearConfirm}
        title="Clear Canvas"
        message="Erase everything?"
        confirmText="Clear"
        isDestructive={true}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={doClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  canvasWrap: { flex: 1, margin: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sliderPopover: { position: 'absolute', left: 16, padding: 12, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, zIndex: 10 },
  sideToolbar: { position: 'absolute', width: 44, borderRadius: 22, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  sideToolBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  toolbar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  toolBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  divider: { width: 1, height: 28 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14 },
  reviewText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  inputPill: { height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, justifyContent: 'center' },
  pillTextInput: { fontSize: 14, fontWeight: '500', minWidth: 80 },
  dividerPill: { width: 1, height: 24, backgroundColor: '#cbd5e1', marginHorizontal: 4 },
});
