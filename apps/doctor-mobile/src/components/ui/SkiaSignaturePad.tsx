import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Canvas, Path, Skia, SkPath, useCanvasRef, ImageFormat } from '@shopify/react-native-skia';

export interface SignaturePadRef {
  clear: () => void;
  getBase64: () => string | undefined;
}

interface Props {
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

export const SkiaSignaturePad = forwardRef<SignaturePadRef, Props>(({ onDrawStart, onDrawEnd }, ref) => {
  const canvasRef = useCanvasRef();
  const [paths, setPaths] = useState<SkPath[]>([]);
  const currentPath = useRef<SkPath | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      setPaths([]);
      currentPath.current = null;
    },
    getBase64: () => {
      // Takes a GPU snapshot of the canvas and encodes it to PNG Base64
      const image = canvasRef.current?.makeImageSnapshot();
      if (image) {
        return image.encodeToBase64(ImageFormat.PNG, 100);
      }
      return undefined;
    }
  }));

  const pan = Gesture.Pan()
    .runOnJS(true) // Crucial: Allows gesture handler to trigger React state updates
    .maxPointers(1)
    .onStart((g) => {
      onDrawStart?.();
      const newPath = Skia.Path.Make();
      newPath.moveTo(g.x, g.y);
      currentPath.current = newPath;
      setPaths((prev) => [...prev, newPath]);
    })
    .onUpdate((g) => {
      if (currentPath.current) {
        currentPath.current.lineTo(g.x, g.y);
        setPaths((prev) => [...prev]); // Trigger re-render to update canvas
      }
    })
    .onEnd(() => {
      onDrawEnd?.();
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas}>
          {paths.map((path, index) => (
            <Path
              key={index}
              path={path}
              color="#0f172a" // Dark slate stroke
              style="stroke"
              strokeWidth={4}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#ffffff' },
  canvas: { flex: 1, width: '100%' }
});