import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types';

type FilterType = 'all' | 'clubs' | 'events' | 'study';

export default function HomeScreen() {
  const { posts, addPost, toggleLike, addComment } = useApp();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  const filteredPosts = posts.filter((post) => filter === 'all' || post.category === filter);

  const handleCreatePost = useCallback(() => {
    if (newPostContent.trim()) {
      addPost(newPostContent.trim(), filter === 'all' ? 'all' : filter);
      setNewPostContent('');
      setShowCreatePost(false);
    }
  }, [newPostContent, filter, addPost]);

  const handleAddComment = useCallback(
    (postId: string) => {
      if (commentText.trim()) {
        addComment(postId, commentText.trim());
        setCommentText('');
      }
    },
    [commentText, addComment]
  );

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const isLiked = currentUser ? item.likedBy.includes(currentUser.id) : false;
      const showingComments = showComments === item.id;

      const onAddComment = () => {
        handleAddComment(item.id);
      };

      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image
              source={{ uri: item.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
              style={styles.avatar}
            />
            <View style={styles.postHeaderText}>
              <Text style={styles.userName}>{item.userName}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          <Text style={styles.postContent}>{item.content}</Text>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleLike(item.id)}
              testID={`like-button-${item.id}`}
            >
              <Heart
                size={20}
                color={isLiked ? Colors.light.error : Colors.light.textSecondary}
                fill={isLiked ? Colors.light.error : 'transparent'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {item.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(showingComments ? null : item.id)}
              testID={`comment-button-${item.id}`}
            >
              <MessageCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.actionText}>{item.comments.length}</Text>
            </TouchableOpacity>
          </View>

          {showingComments && (
            <View style={styles.commentsSection}>
              {item.comments.map((comment) => (
                <View key={comment.id} style={styles.comment}>
                  <Image
                    source={{ uri: comment.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.addComment}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.light.placeholder}
                  value={commentText}
                  onChangeText={setCommentText}
                  testID={`comment-input-${item.id}`}
                />
                <TouchableOpacity
                  onPress={onAddComment}
                  disabled={!commentText.trim()}
                  testID={`submit-comment-${item.id}`}
                >
                  <Text
                    style={[
                      styles.commentSubmit,
                      !commentText.trim() && styles.commentSubmitDisabled,
                    ]}
                  >
                    Post
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    },
    [currentUser, showComments, commentText, toggleLike, handleAddComment]
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {(['all', 'clubs', 'events', 'study'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
            testID={`filter-${f}`}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreatePost(true)}
        testID="create-post-button"
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        visible={showCreatePost}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreatePost(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowCreatePost(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.light.placeholder}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              autoFocus
              testID="post-content-input"
            />

            <TouchableOpacity
              style={[styles.postButton, !newPostContent.trim() && styles.postButtonDisabled]}
              onPress={handleCreatePost}
              disabled={!newPostContent.trim()}
              testID="submit-post-button"
            >
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
    bottom: 24,
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
  postButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
