import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Scan, Users } from 'lucide-react-native';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView, Image } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

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

  const handleScan = async (data: string) => {
    try {
      const maybeToken =
        data.match(/titan:\/\/p\/([A-Za-z0-9-]+)/)?.[1] ||
        data.match(/\/p\/([A-Za-z0-9-]+)/)?.[1] ||
        data.split('/').pop();

      if (!maybeToken) {
        Alert.alert('Invalid QR Code', 'Unrecognized code');
        setShowScanner(false);
        return;
      }

      setScannedToken(maybeToken);
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to scan QR code');
    }
  };

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
        return;
      }
    }
    setShowScanner(true);
  };

  const qrData = useMemo(() => {
    if (!token || !currentUser) return null;
    const payload = `titan://p/${token}`;
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
    if (token || qrToken.isPending) return;
    const res = await qrToken.mutateAsync();
    setToken(res.token);
  }, [qrToken, token]);

  useEffect(() => {
    if (currentUser) {
      ensureToken();
    }
  }, [currentUser, ensureToken]);

  useEffect(() => {
    if (resolveToken.isError) {
      Alert.alert('Invalid QR Code', 'This code is not recognized.');
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
        <View style={styles.statCard}>
          <Users size={32} color={Colors.light.primary} />
          <Text style={styles.statNumber}>{connectionCount}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && styles.tabActive]}
          onPress={() => setActiveTab('qr')}
          testID="tab-qr"
        >
          <QrCode size={20} color={activeTab === 'qr' ? Colors.light.primary : Colors.light.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
            My QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
          onPress={() => setActiveTab('scan')}
          testID="tab-scan"
        >
          <Scan size={20} color={activeTab === 'scan' ? Colors.light.primary : Colors.light.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            Scan QR
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'qr' ? (
          <View style={styles.sectionStack}>
            <View style={styles.qrContainer}>
            <View style={styles.qrCodePlaceholder}>
              {qrData ? (
                <>
                  <Image source={{ uri: qrData.url }} style={styles.qrImage} />
                  <Text style={styles.qrUserId}>{qrData.payload}</Text>
                </>
              ) : (
                <Text style={styles.qrUserId}>Generating...</Text>
              )}
            </View>
            </View>

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
        ) : (
          <View style={styles.sectionStack}>
            <View style={styles.scanContainer}>
              <View style={styles.scanPlaceholder}>
                <Scan size={64} color={Colors.light.primary} />
                <Text style={styles.scanTitle}>Scan a QR Code</Text>
                <Text style={styles.scanSubtitle}>
                  Point your camera at another student&apos;s QR code
                </Text>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScanPress}
                  testID="open-scanner-button"
                >
                  <Text style={styles.scanButtonText}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Scanning Tips</Text>
              <Text style={styles.tipText}>• Hold your phone steady</Text>
              <Text style={styles.tipText}>• Ensure good lighting</Text>
              <Text style={styles.tipText}>• Keep the QR code centered</Text>
              <Text style={styles.tipText}>• Works best at arm&apos;s length</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
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
    backgroundColor: Colors.light.background,
  },
  statsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 160,
  },
  statNumber: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: Colors.light.primary,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.primary,
    fontWeight: '600' as const,
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
  qrCodePlaceholder: {
    backgroundColor: Colors.light.qrBackground,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  qrImage: {
    width: 240,
    height: 240,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  qrUserId: {
    marginTop: 16,
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontFamily: 'monospace' as const,
    letterSpacing: 2,
  },
  instructionsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
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
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
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
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  scanButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tipsCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    padding: 20,
  },
  scannerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: 60,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
