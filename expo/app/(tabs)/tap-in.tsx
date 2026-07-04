import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Scan, Users } from 'lucide-react-native';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { showAlert } from '@/lib/alert';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import HardShadow from '@/components/ui/HardShadow';
import StatTile from '@/components/ui/StatTile';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Button from '@/components/ui/Button';

type TabType = 'qr' | 'scan';

export default function TapInScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const connectionsQuery = trpc.connections.list.useQuery(undefined, { enabled: !!currentUser });
  const qrToken = trpc.profileQr.getOrCreate.useMutation();
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const resolveToken = trpc.profileQr.resolve.useQuery(
    { token: scannedToken || '' },
    {
      enabled: !!scannedToken,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
  const [activeTab, setActiveTab] = useState<TabType>('qr');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState<string | null>(null);
  const [qrError, setQrError] = useState<boolean>(false);
  const hasAttemptedToken = useRef(false);

  const handleScan = async (data: string) => {
    try {
      // Support both app scheme (myapp:// or exp://…) and plain URLs
      const parsed = Linking.parse(data);
      const path = parsed.path || '';
      const maybeToken =
        // handles /p/{token} or p/{token}
        path.split('/').filter(Boolean).pop() ||
        data.split('/').pop();

      if (!maybeToken) {
        showAlert('Invalid QR Code', 'Unrecognized code');
        setShowScanner(false);
        return;
      }

      setScannedToken(maybeToken);
    } catch (error) {
      console.error('Scan error:', error);
      showAlert('Error', 'Failed to scan QR code');
    }
  };

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert('Permission Required', 'Camera permission is needed to scan QR codes');
        return;
      }
    }
    setShowScanner(true);
  };

  const qrData = useMemo(() => {
    if (!token || !currentUser) return null;
    // Use expo-linking to build a deep link that works in Expo (exp://) and the custom scheme (myapp://)
    const payload = Linking.createURL(`/p/${token}`);
    const remote = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
    return { payload, url: remote };
  }, [token, currentUser]);

  const connectionCount = useMemo(() => {
    if (!connectionsQuery.data || !currentUser) return 0;
    return connectionsQuery.data.filter(
      (c: any) => c.otherUser && c.status === 'accepted'
    ).length;
  }, [connectionsQuery.data, currentUser]);

  const ensureToken = useCallback(async () => {
    // Guard with a ref (not just `token`/`isPending` state) so a failed
    // attempt can't retry forever: every mutateAsync call — success or
    // failure — changes the mutation object's identity, which would
    // otherwise recreate this callback and re-fire the effect below,
    // hammering the server with retries on every render.
    if (token || hasAttemptedToken.current) return;
    hasAttemptedToken.current = true;
    try {
      const res = await qrToken.mutateAsync();
      setToken(res.token);
    } catch (error) {
      console.error('Failed to get QR token:', error);
      setQrError(true);
    }
  }, [qrToken, token]);

  useEffect(() => {
    if (currentUser) {
      ensureToken();
    }
  }, [currentUser, ensureToken]);

  useEffect(() => {
    if (resolveToken.isError) {
      showAlert('Invalid QR Code', 'This code is not recognized.');
      setShowScanner(false);
      setScannedToken(null);
    }
    if (resolveToken.data?.userId) {
      const userId = resolveToken.data.userId;
      if (currentUser && userId === currentUser.id) {
        router.push('/(tabs)/profile');
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
      }
      setShowScanner(false);
      setScannedToken(null);
    }
  }, [resolveToken.data, resolveToken.isError, currentUser, router]);

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <StatTile icon={Users} value={String(connectionCount)} label="CONNECTIONS" color={palette.skyBlue} />
      </View>

      <View style={styles.tabContainer}>
        <SegmentedControl
          items={[
            { key: 'qr', label: 'My QR Code', icon: QrCode },
            { key: 'scan', label: 'Scan QR', icon: Scan },
          ]}
          value={activeTab}
          onChange={(key) => setActiveTab(key as TabType)}
          activeColor={palette.orange}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'qr' ? (
          <View style={styles.sectionStack}>
            <View style={styles.qrContainer}>
              <View style={styles.qrWrap}>
                <HardShadow offset={8} radius={24} />
                <View style={styles.qrCodePlaceholder}>
                  {qrData ? (
                    <>
                      <Image source={{ uri: qrData.url }} style={styles.qrImage} />
                      <Text style={styles.qrUserId}>{qrData.payload}</Text>
                    </>
                  ) : qrError ? (
                    <Text style={styles.qrUserId}>QR code unavailable right now. Please try again later.</Text>
                  ) : (
                    <Text style={styles.qrUserId}>Generating...</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.instructionsWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>How to Tap-In</Text>
                <View style={styles.instructionsList}>
                  <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>1</Text>
                    </View>
                    <Text style={styles.instructionText}>Show your QR code to another student</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>2</Text>
                    </View>
                    <Text style={styles.instructionText}>They scan it with their camera</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>3</Text>
                    </View>
                    <Text style={styles.instructionText}>You&apos;re instantly connected!</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sectionStack}>
            <View style={styles.scanContainer}>
              <View style={styles.scanPlaceholder}>
                <Scan size={64} color={INK} strokeWidth={2} />
                <Text style={styles.scanTitle}>Scan a QR Code</Text>
                <Text style={styles.scanSubtitle}>
                  Point your camera at another student&apos;s QR code
                </Text>
                <Button label="Open Camera" onPress={handleScanPress} color={palette.blue} />
              </View>
            </View>

            <View style={styles.tipsWrap}>
              <HardShadow offset={5} radius={18} />
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>Scanning Tips</Text>
                <Text style={styles.tipText}>• Hold your phone steady</Text>
                <Text style={styles.tipText}>• Ensure good lighting</Text>
                <Text style={styles.tipText}>• Keep the QR code centered</Text>
                <Text style={styles.tipText}>• Works best at arm&apos;s length</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            // barcodeTypes must be explicit for scanning to activate on web
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(result) => {
              if (result.data) {
                handleScan(result.data);
              }
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>Scan a TitanConnect QR Code</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowScanner(false)}
              testID="close-scanner-button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  statsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  tabContainer: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 200,
    flexGrow: 1,
    gap: 16,
  },
  sectionStack: {
    gap: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrap: {
    position: 'relative',
    width: '100%',
  },
  qrCodePlaceholder: {
    backgroundColor: Colors.light.qrBackground,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 240,
    height: 240,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
  },
  qrUserId: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    fontFamily: 'monospace' as const,
    letterSpacing: 2,
  },
  instructionsWrap: {
    position: 'relative',
  },
  instructionsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900' as const,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    lineHeight: 22,
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  scanPlaceholder: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginTop: 16,
  },
  scanSubtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  tipsWrap: {
    position: 'relative',
  },
  tipsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: INK,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 13, 40, 0.5)',
    justifyContent: 'space-between',
    padding: 20,
  },
  scannerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900' as const,
    textAlign: 'center',
    marginTop: 60,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButtonText: {
    color: INK,
    fontSize: 16,
    fontWeight: '900' as const,
  },
});
