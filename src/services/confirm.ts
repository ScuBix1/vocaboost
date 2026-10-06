/**
 * Boîte de confirmation native (design §3.9 « ConfirmDialog »).
 * `Alert.alert` est sans effet sur le web : on y retombe sur `window.confirm`.
 */
import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function confirmDestructive({ title, message, cancelLabel, confirmLabel, onConfirm }: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    if (confirmFn?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}
