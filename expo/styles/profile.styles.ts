// app/(tabs)/profile.styles.ts
import { StyleSheet } from 'react-native'
import Colors from '@/constants/colors'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  logoutButton: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 12,
    backgroundColor: Colors.light.qrBackground,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ffffff', 
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // For profile picture edit button
  editProfileIconButton: { 
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: Colors.light.primary,
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  majorAndYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  major: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  yearBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  yearText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 2,
  },
  bioText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  addBioSection: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginVertical: 8,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12, //spacing between Posts, Connections, and Likes
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.qrBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
  },
  joinedSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  joinedText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  editBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  editBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  saveBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  saveBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  addBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  addBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
uploadOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.25)", // fallback
},

uploadingText: {
  marginTop: 16,
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},
editButton: {
  paddingHorizontal: 8,
},
editContainer: {
  flex: 1,
  backgroundColor: Colors.light.background,
},
editHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingTop: 48,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: Colors.light.border,
},
cancelText: {
  color: Colors.light.textSecondary,
  fontWeight: '600' as const,
},
editTitle: {
  fontSize: 18,
  fontWeight: '700' as const,
  color: Colors.light.text,
},
saveButton: {
  padding: 6,
},
editContent: {
  padding: 20,
  gap: 16,
},
editAvatarWrap: {
  alignSelf: 'center',
  position: 'relative',
},
editAvatar: {
  width: 140,
  height: 140,
  borderRadius: 70,
},
editAvatarPlaceholder: {
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: Colors.light.inputBackground,
  alignItems: 'center',
  justifyContent: 'center',
},
editAvatarOverlay: {
  position: 'absolute',
  bottom: 6,
  right: 6,
  backgroundColor: 'rgba(0,0,0,0.6)',
  borderRadius: 14,
  paddingHorizontal: 10,
  paddingVertical: 6,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
editAvatarText: {
  color: '#fff',
  fontWeight: '600' as const,
  fontSize: 12,
},
editField: {
  gap: 6,
},
editLabel: {
  fontSize: 14,
  fontWeight: '600' as const,
  color: Colors.light.text,
},
editInput: {
  backgroundColor: Colors.light.inputBackground,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: Colors.light.text,
},
editTextarea: {
  minHeight: 100,
  textAlignVertical: 'top',
},
interestsEditScrollView: {
  maxHeight: 300,
},
interestsEditContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  paddingBottom: 8,
},
interestChipEdit: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: Colors.light.inputBackground,
  borderWidth: 2,
  borderColor: Colors.light.border,
},
interestChipEditSelected: {
  backgroundColor: Colors.light.primary,
  borderColor: Colors.light.primary,
},
interestChipTextEdit: {
  fontSize: 13,
  color: Colors.light.text,
  fontWeight: '600' as const,
},
interestChipTextEditSelected: {
  color: '#ffffff',
},
chipIconEdit: {
  marginLeft: 2,
},




})

export default styles
