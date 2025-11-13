import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Gesture,
  GestureDetector,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

const DEFAULT_THRESHOLD = 55;
const DEFAULT_EDGE_SIZE = 48;

type SwipeBackContextValue = {
  enabled: boolean;
  registerBlocker: () => () => void;
};

const SwipeBackContext = createContext<SwipeBackContextValue>({
  enabled: true,
  registerBlocker: () => () => {},
});

export function SwipeBackProvider({ children }: { children: ReactNode }) {
  const blockerCount = useRef(0);
  const [enabled, setEnabled] = useState(true);

  const registerBlocker = useCallback(() => {
    blockerCount.current += 1;
    setEnabled(false);
    return () => {
      blockerCount.current = Math.max(0, blockerCount.current - 1);
      if (blockerCount.current === 0) {
        setEnabled(true);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      registerBlocker,
    }),
    [enabled, registerBlocker]
  );

  return <SwipeBackContext.Provider value={value}>{children}</SwipeBackContext.Provider>;
}

function useSwipeBackGesture(enabled: boolean, edgeSize = DEFAULT_EDGE_SIZE, threshold = DEFAULT_THRESHOLD) {
  const router = useRouter();
  const triggeredRef = useRef(false);
  const screenWidth = Dimensions.get('window').width;
  const shouldHandleRef = useRef(false);
  const maxVerticalRef = useRef(0);

  return useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX([-10, 10])
      .onBegin(() => {
        shouldHandleRef.current = false;
        maxVerticalRef.current = 0;
        triggeredRef.current = false;
      })
      .onStart((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
        shouldHandleRef.current = enabled && event.x >= screenWidth - edgeSize;
        maxVerticalRef.current = 0;
      })
      .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        if (!shouldHandleRef.current || triggeredRef.current) {
          return;
        }

        maxVerticalRef.current = Math.max(maxVerticalRef.current, Math.abs(event.translationY));

        if (maxVerticalRef.current > 30) {
          shouldHandleRef.current = false;
          return;
        }

        if (event.translationX < -threshold) {
          triggeredRef.current = true;
        }
      })
      .onEnd(() => {
        if (shouldHandleRef.current && triggeredRef.current) {
          const navigate = () => router.replace('/program/overview');
          requestAnimationFrame(navigate);
        }
        shouldHandleRef.current = false;
        triggeredRef.current = false;
      })
      .onFinalize(() => {
        shouldHandleRef.current = false;
        triggeredRef.current = false;
      });
  }, [edgeSize, enabled, router, screenWidth, threshold]);
}

export function SwipeBackContainer({
  children,
  edgeSize,
  threshold,
}: {
  children: ReactNode;
  edgeSize?: number;
  threshold?: number;
}) {
  const { enabled } = useContext(SwipeBackContext);
  const gesture = useSwipeBackGesture(enabled, edgeSize, threshold);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}

export function useDisableSwipeBack(active = true) {
  const { registerBlocker } = useContext(SwipeBackContext);

  useFocusEffect(
    useCallback(() => {
      if (!active) {
        return undefined;
      }
      const release = registerBlocker();
      return () => {
        release();
      };
    }, [active, registerBlocker])
  );
}

