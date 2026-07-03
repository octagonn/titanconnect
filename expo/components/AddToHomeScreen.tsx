import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { showAlert } from '@/lib/alert';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// Floating "Add to Home Screen" pill, web only. Shows when the browser offers
// an install prompt (Chrome/Edge/Android) or on iOS Safari, where it explains
// the manual Share → Add to Home Screen flow. Hidden once installed.
export default function AddToHomeScreen() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || isStandalone()) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    if (isIosSafari()) setVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (Platform.OS !== 'web' || !visible) return null;

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') setVisible(false);
      setInstallEvent(null);
    } else {
      showAlert(
        'Add to Home Screen',
        'Tap the Share button in Safari, then choose "Add to Home Screen" to install TitanConnect.'
      );
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.pill} onPress={handleInstall} activeOpacity={0.8} testID="add-to-homescreen-button">
        <Download size={16} color="#ffffff" />
        <Text style={styles.pillText}>Add to Home Screen</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={() => setVisible(false)}
        activeOpacity={0.8}
        testID="dismiss-add-to-homescreen"
      >
        <X size={14} color={Colors.light.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 'fixed' keeps the pill pinned to the browser viewport, clear of the tab dock
    position: 'fixed' as 'absolute',
    right: 16,
    bottom: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 60,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dismiss: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
});
