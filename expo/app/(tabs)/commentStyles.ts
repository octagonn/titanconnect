import { StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export const commentStyles = StyleSheet.create({
  commentRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 6,
  },
  editButton: {
    padding: 6,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 4,
  },
});
