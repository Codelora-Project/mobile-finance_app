import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

type TabBarVisibilityContextValue = {
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  hideTabBar: () => void;
  showTabBar: () => void;
  tabBarAnim: Animated.Value;
};

const TabBarVisibilityContext =
  createContext<TabBarVisibilityContextValue | null>(null);

export function TabBarVisibilityProvider({ children }: PropsWithChildren) {
  const tabBarAnim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = hidden
  const isHiddenRef = useRef(false);
  const lastOffsetY = useRef(0);

  const showTabBar = useCallback(() => {
    if (!isHiddenRef.current) return;
    isHiddenRef.current = false;
    Animated.spring(tabBarAnim, {
      bounciness: 0,
      speed: 16,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [tabBarAnim]);

  const hideTabBar = useCallback(() => {
    if (isHiddenRef.current) return;
    isHiddenRef.current = true;
    Animated.spring(tabBarAnim, {
      bounciness: 0,
      speed: 16,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [tabBarAnim]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentOffsetY = event.nativeEvent.contentOffset.y;
      const delta = currentOffsetY - lastOffsetY.current;

      // When near top (e.g. within 20px), always reveal tab bar
      if (currentOffsetY <= 20) {
        showTabBar();
      } else if (delta > 8 && currentOffsetY > 50) {
        // Scrolling down significantly -> hide tab bar
        hideTabBar();
      } else if (delta < -8) {
        // Scrolling up significantly -> show tab bar
        showTabBar();
      }

      lastOffsetY.current = currentOffsetY;
    },
    [hideTabBar, showTabBar],
  );

  const value = useMemo(
    () => ({
      handleScroll,
      hideTabBar,
      showTabBar,
      tabBarAnim,
    }),
    [handleScroll, hideTabBar, showTabBar, tabBarAnim],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    return {
      handleScroll: () => {},
      hideTabBar: () => {},
      showTabBar: () => {},
      tabBarAnim: new Animated.Value(0),
    };
  }
  return context;
}
