import { StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

const homeStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.feedBackground,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    searchBar: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        backgroundColor: Colors.light.inputBackground,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.light.text,
        flex: 1,
    },
    cancelSearch: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    cancelText: {
        color: Colors.light.primary,
        fontWeight: '700' as const,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
        gap: 12,
    },
    postCard: {
        backgroundColor: Colors.light.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarWrap: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postHeaderText: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.light.text,
    },
    timeAgo: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    postContent: {
        fontSize: 15,
        color: Colors.light.text,
        lineHeight: 22,
        marginBottom: 12,
    },
    postImage: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: Colors.light.backgroundSecondary,
    },
    postActions: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        fontWeight: '500' as const,
    },
    actionTextActive: {
        color: Colors.light.error,
    },
    commentsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        gap: 12,
    },
    comment: {
        flexDirection: 'row',
        gap: 8,
        position: 'relative',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    commentContent: {
        flex: 1,
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 12,
        padding: 10,
    },
    commentUserName: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: Colors.light.text,
        marginBottom: 4,
    },
    commentText: {
        fontSize: 14,
        color: Colors.light.text,
        lineHeight: 20,
    },
    commentActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    commentAction: {
        paddingVertical: 4,
    },
    commentActionText: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        fontWeight: '600' as const,
    },
    repliesContainer: {
        marginTop: 8,
        gap: 8,
    },
    replyRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    replyAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    replyContent: {
        flex: 1,
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 10,
        padding: 10,
    },
    replyAuthor: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: Colors.light.text,
    },
    replyText: {
        fontSize: 13,
        color: Colors.light.text,
        marginTop: 2,
    },
    replyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    replyInput: {
        flex: 1,
        backgroundColor: Colors.light.inputBackground,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: Colors.light.text,
        fontSize: 13,
    },
    replySend: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: Colors.light.primary,
        borderRadius: 8,
    },
    replySendText: {
        color: '#fff',
        fontWeight: '700' as const,
        fontSize: 13,
    },
    addComment: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        backgroundColor: Colors.light.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        color: Colors.light.text,
    },
    commentSubmit: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: Colors.light.primary,
    },
    commentSubmitDisabled: {
        color: Colors.light.placeholder,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700' as const,
        color: Colors.light.text,
    },
    modalClose: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    postInput: {
        backgroundColor: Colors.light.inputBackground,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.light.text,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    imageButton: {
        padding: 10,
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 8,
    },
    postButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        alignItems: 'center',
        minWidth: 100,
    },
    postButtonDisabled: {
        backgroundColor: Colors.light.border,
    },
    postButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600' as const,
    },
    selectedImageContainer: {
        position: 'relative',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    selectedImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    },
    profileModalContainer: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    profileModalHeader: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    modalCloseText: {
        color: Colors.light.primary,
        fontWeight: '700' as const,
        fontSize: 16,
    },
    profileModalLoading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileModalContent: {
        padding: 20,
        gap: 16,
    },
    profileHeader: {
        alignItems: 'center',
        gap: 8,
    },
    profileAvatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        marginBottom: 8,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700' as const,
        color: Colors.light.text,
    },
    profileMajor: {
        fontSize: 15,
        color: Colors.light.textSecondary,
    },
    profilePill: {
        marginTop: 6,
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
    },
    profilePillText: {
        color: '#fff',
        fontWeight: '700' as const,
    },
    profileActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    profileButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    profilePrimary: {
        backgroundColor: Colors.light.primary,
    },
    profileButtonDisabled: {
        backgroundColor: Colors.light.border,
    },
    profileSecondary: {
        backgroundColor: Colors.light.border,
    },
    profileButtonText: {
        color: '#fff',
        fontWeight: '700' as const,
    },
    profileSecondaryText: {
        color: Colors.light.text,
    },
    profileSection: {
        gap: 8,
    },
    profileSectionTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: Colors.light.text,
    },
    profileBody: {
        fontSize: 15,
        color: Colors.light.text,
        lineHeight: 22,
    },
    profileChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    profileChip: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    profileChipText: {
        color: '#fff',
        fontWeight: '600' as const,
    },
    profileDetail: {
        fontSize: 14,
        color: Colors.light.text,
        marginBottom: 4,
    },
    reportButton: {
        backgroundColor: Colors.light.error,
        alignSelf: 'center',
        marginTop: 8,
        paddingHorizontal: 18,
    },
    reportText: {
        color: '#fff',
    },
    moreButton: {
        padding: 6,
    },
    commentOptions: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    optionsCard: {
        backgroundColor: Colors.light.card,
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        gap: 8,
    },
    optionsItem: {
        paddingVertical: 12,
    },
    optionsItemText: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '600' as const,
    },
    optionsItemDestructive: {
        fontSize: 16,
        color: Colors.light.error,
        fontWeight: '700' as const,
    },
    optionsCancel: {
        paddingVertical: 12,
    },
    optionsCancelText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        fontWeight: '600' as const,
        textAlign: 'center',
    },
    editModalContent: {
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    editModalActions: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
    },
    infoCard: {
        backgroundColor: Colors.light.card,
        borderRadius: 12,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.light.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        color: Colors.light.text,
        fontWeight: '600',
        marginTop: 1,
    },

    //   For Stats Section (not used yet)
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.light.card,
        borderRadius: 12,
        marginTop: 8,
        gap: 12,
    },

    statCard: {
        flex: 1,
        backgroundColor: Colors.light.backgroundSecondary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.light.text,
    },

    statLabel: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },


});

export default homeStyles;
