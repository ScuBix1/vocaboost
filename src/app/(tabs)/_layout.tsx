/**
 * Barre d'onglets v2 : Accueil | Apprendre | Progrès | Test (design §5.0).
 * Onglet actif : pastille `primarySoft` ; pastille `flame` sur 📝 quand le test est disponible.
 */
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNow } from '@/hooks/useNow';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTestStatus } from '@/hooks/useLearnerSelectors';
import { colors, motion } from '@/theme/tokens';

function TabIcon({ emoji, focused, dot = false }: { emoji: string; focused: boolean; dot?: boolean }) {
  const reduceMotion = useReduceMotion();
  const bounce = useRef(new Animated.Value(0)).current;

  // Rebond 1 → 1,15 → 1 à la sélection (aucun si « Réduire les animations »).
  useEffect(() => {
    if (!focused || reduceMotion) return;
    bounce.setValue(0);
    Animated.timing(bounce, {
      toValue: 1,
      duration: motion.pop,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [focused, reduceMotion, bounce]);

  return (
    <View accessible={false}>
      <Animated.Text
        style={[
          styles.emoji,
          !focused && styles.inactive,
          { transform: [{ scale: bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }] },
        ]}
      >
        {emoji}
      </Animated.Text>
      {dot ? <View style={styles.dot} testID="test-available-dot" /> : null}
    </View>
  );
}

export default function TabsLayout() {
  const now = useNow();
  const testStatus = useTestStatus(now);
  const testAvailable = testStatus.kind === 'available';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.bar, { height: 80 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarAccessibilityLabel: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Apprendre',
          tabBarAccessibilityLabel: 'Apprendre',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progrès',
          tabBarAccessibilityLabel: 'Progrès',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarAccessibilityLabel: testAvailable ? 'Test, test de la semaine disponible' : 'Test',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} dot={testAvailable} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 8, paddingHorizontal: 10 },
  item: { borderRadius: 16, marginHorizontal: 2, paddingVertical: 4 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  emoji: { fontSize: 22, lineHeight: 26 },
  inactive: { opacity: 0.75 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.flame,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
