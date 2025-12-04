// @ts-nocheck
import { Calendar, MapPin, Users, Check, Trash2, Edit2 } from 'lucide-react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Event, Comment } from '@/types';
import { useState } from 'react';
import { commentStyles } from './commentStyles';

export default function EventsScreen(): JSX.Element {
  const { events, toggleEventRSVP } = useApp();
  const { currentUser } = useAuth();

  const renderEvent = ({ item }: { item: Event }) => {
    const isAttending = currentUser ? item.attendees.includes(currentUser.id) : false;
    const isInterested = currentUser ? item.interestedUsers.includes(currentUser.id) : false;
    const totalAttendees = item.attendees.length + item.interestedUsers.length;

    // Local state for comment input
    const [commentText, setCommentText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [comments, setComments] = useState<Comment[]>(item.comments || []);

    async function refreshComments() {
      try {
        const response = await fetch(`/api/comments?postId=${item.id}`);
        const data = await response.json();
        if (response.ok) {
          setComments(data.comments);
        }
      } catch (error) {
        console.error('Error refreshing comments:', error);
      }
    }

    async function postComment() {
      if (!commentText.trim()) return;

      try {
        const response = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: item.id,
            commentText,
            userId: currentUser?.id,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('Failed to post comment:', data.error);
          return;
        }

        setCommentText("");
        await refreshComments();
      } catch (error) {
        console.error('Error posting comment:', error);
      }
    }

    async function deleteComment(commentId: string) {
      try {
        const response = await fetch("/api/comments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commentId,
            userId: currentUser?.id,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('Failed to delete comment:', data.error);
          return;
        }

        await refreshComments();
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }

    async function updateComment(commentId: string) {
      if (!editingText.trim()) return;

      try {
        const response = await fetch("/api/comments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commentId,
            content: editingText,
            userId: currentUser?.id,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('Failed to update comment:', data.error);
          return;
        }

        setEditingCommentId(null);
        setEditingText("");
        await refreshComments();
      } catch (error) {
        console.error('Error updating comment:', error);
      }
    }

    return (
      <View style={styles.eventCard}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.eventImage} resizeMode="cover" />
        )}

        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.attendeesBadge}>
              <Users size={14} color={Colors.light.primary} />
              <Text style={styles.attendeesText}>{totalAttendees}</Text>
            </View>
          </View>

          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.light.textSecondary} />
              <Text style={styles.metaText}>
                {formatDate(item.date)} at {item.time}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={16} color={Colors.light.textSecondary} />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          </View>

          <View style={styles.hostInfo}>
            <Text style={styles.hostLabel}>Hosted by</Text>
            <Text style={styles.hostName}>{item.hostName}</Text>
          </View>

          <View style={styles.rsvpButtons}>
            <TouchableOpacity
              style={[styles.rsvpButton, isAttending && styles.rsvpButtonActive]}
              onPress={() => toggleEventRSVP(item.id, 'attending')}
              testID={`rsvp-attending-${item.id}`}
            >
              {isAttending && <Check size={16} color="#ffffff" />}
              <Text style={[styles.rsvpButtonText, isAttending && styles.rsvpButtonTextActive]}>
                Going
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rsvpButton, isInterested && styles.rsvpButtonInterested]}
              onPress={() => toggleEventRSVP(item.id, 'interested')}
              testID={`rsvp-interested-${item.id}`}
            >
              <Text
                style={[styles.rsvpButtonText, isInterested && styles.rsvpButtonTextInterested]}
              >
                Interested
              </Text>
            </TouchableOpacity>
          </View>

          {/* --- Comments Section --- */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>Comments</Text>
            {comments?.map((comment: Comment) => {
              const commentRow = commentStyles.commentRow as any;
              const commentUserName = commentStyles.commentUserName as any;
              const deleteBtn = commentStyles.deleteButton as any;
              const editBtn = commentStyles.editButton as any;
              const actionBtns = commentStyles.actionButtons as any;
              
              return editingCommentId === comment.id ? (
                <View key={comment.id} style={commentRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={editingText}
                      onChangeText={setEditingText}
                      placeholder="Edit comment..."
                      style={styles.commentInput}
                      multiline
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => updateComment(comment.id)}
                        style={[styles.commentButton, { flex: 1 }]}
                      >
                        <Text style={styles.commentButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCommentId(null);
                          setEditingText("");
                        }}
                        style={[styles.commentButton, { flex: 1, backgroundColor: Colors.light.textSecondary }]}
                      >
                        <Text style={styles.commentButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View key={comment.id} style={commentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={commentUserName}>{comment.userName}</Text>
                    <Text style={commentStyles.commentText}>
                      {comment.content}
                    </Text>
                  </View>
                  {currentUser?.id === comment.userId && (
                    <View style={actionBtns}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCommentId(comment.id);
                          setEditingText(comment.content);
                        }}
                        style={editBtn}
                      >
                        <Edit2 size={16} color={Colors.light.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteComment(comment.id)}
                        style={deleteBtn}
                      >
                        <Trash2 size={16} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.commentInputRow}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                style={styles.commentInput}
              />
              <TouchableOpacity onPress={postComment} style={styles.commentButton}>
                <Text style={styles.commentButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginRight: 12,
  },
  attendeesBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.light.qrBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  attendeesText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  eventDescription: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  eventMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  hostInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  hostLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  hostName: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
  rsvpButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  rsvpButtonInterested: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  rsvpButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  rsvpButtonTextActive: {
    color: '#ffffff',
  },
  rsvpButtonTextInterested: {
    color: '#ffffff',
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
    color: Colors.light.text,
  },
  commentInputRow: {
    flexDirection: 'row' as const,
    marginTop: 8,
    alignItems: 'center' as const,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  commentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  commentButtonText: {
    color: '#ffffff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
});