/**
 * Profondeur « 3D » sans librairie (design §3.3) : une lèvre pleine sous la face.
 * - `Raised` : élément statique (Card, Flashcard, tuiles).
 * - `PressableRaised` : la face s'enfonce de `depth` à l'appui (60 ms) et remonte (120 ms).
 * La lèvre est une `View` absolue décalée de `depth` ; la face enfoncée la recouvre exactement.
 */
import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

export interface RaisedProps extends Omit<ViewProps, 'style'> {
  children?: ReactNode;
  lipColor: string;
  depth: number;
  radius: number;
  /** Style de la face (fond, bordure, padding…). */
  faceStyle?: StyleProp<ViewStyle>;
  /** Style du conteneur (marges, flex, largeur). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function Lip({ color, depth, radius, testID }: { color: string; depth: number; radius: number; testID?: string }) {
  if (depth <= 0) return null;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={[styles.lip, { top: depth, backgroundColor: color, borderRadius: radius }]}
    />
  );
}

export function Raised({ children, lipColor, depth, radius, faceStyle, style, ...rest }: RaisedProps) {
  return (
    <View {...rest} style={[{ paddingBottom: depth }, style]}>
      <Lip color={lipColor} depth={depth} radius={radius} />
      <View style={[styles.face, { borderRadius: radius }, faceStyle]}>{children}</View>
    </View>
  );
}

export interface PressableRaisedProps
  extends Omit<PressableProps, 'style' | 'children'>,
    Pick<RaisedProps, 'lipColor' | 'depth' | 'radius' | 'style'> {
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  faceStyle?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  /** Course de la face à l'appui (défaut : `depth`, la lèvre disparaît). */
  travel?: number;
  faceTestID?: string;
}

export function PressableRaised({
  children,
  lipColor,
  depth,
  radius,
  faceStyle,
  style,
  travel,
  faceTestID,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableRaisedProps) {
  const reduceMotion = useReduceMotion();
  const press = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) => {
    if (reduceMotion) {
      press.setValue(toValue);
      return;
    }
    Animated.timing(press, {
      toValue,
      duration: toValue ? motion.pressIn : motion.pressOut,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        animateTo(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(0);
        onPressOut?.(e);
      }}
      style={[{ paddingBottom: depth }, style]}
    >
      {({ pressed }) => (
        <>
          <Lip color={lipColor} depth={depth} radius={radius} testID={faceTestID ? `${faceTestID}-lip` : undefined} />
          <Animated.View
            testID={faceTestID}
            style={[
              styles.face,
              { borderRadius: radius },
              typeof faceStyle === 'function' ? faceStyle(pressed) : faceStyle,
              { transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, travel ?? depth] }) }] },
            ]}
          >
            {typeof children === 'function' ? children({ pressed }) : children}
          </Animated.View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: { flexGrow: 1 },
});
