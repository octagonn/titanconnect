import { Alert, AlertButton, Platform } from 'react-native';

// Drop-in replacement for Alert.alert. RN's Alert is a no-op on react-native-web,
// so on web we fall back to window.alert / window.confirm (all call sites in this
// app use at most two buttons).
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
  const confirmButton = buttons.find((b) => b !== cancelButton) ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton.onPress?.();
  }
}
