import { Heart, MessageCircle, Plus, Image as ImageIcon, X } from 'lucide-react-native';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types';
import { trpc } from '@/lib/trpc';
import { uploadImage } from '@/lib/storage';

// Helper to show alerts safely on web
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);

  const utils = trpc.useUtils();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = trpc.posts.getInfinite.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setNewPostContent('');
      setSelectedImage(null);
      setShowCreatePost(false);
      setIsPosting(false);
    },
    onError: (error) => {
      console.error('Create Post Error:', error);
      showAlert('Error', error.message || 'Failed to create post');
      setIsPosting(false);
    },
  });

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
    },
  });

  const addCommentMutation = trpc.posts.addComment.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setCommentText('');
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    console.log('Creating post...', { content: newPostContent, hasImage: !!selectedImage });
    setIsPosting(true);
    try {
      let imageUrl = undefined;
      if (selectedImage) {
        console.log('Uploading image...');
        const uploadedUrl = await uploadImage('posts', selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log('Image uploaded:', imageUrl);
        } else {
          showAlert('Error', 'Failed to upload image');
          setIsPosting(false);
          return;
        }
      }

      console.log('Mutating createPost...');
      await createPostMutation.mutateAsync({
        content: newPostContent.trim(),
        category: 'all',
        imageUrl,
      });
    } catch (error) {
      // Error handled in mutation onError
      console.error('HandleCreatePost catch:', error);
    }
  };

  const handleToggleLike = (postId: string) => {
    toggleLikeMutation.mutate({ postId });
  };

  const handleAddComment = useCallback(
    (postId: string) => {
      if (commentText.trim()) {
        addCommentMutation.mutate({ postId, content: commentText.trim() });
      }
    },
    [commentText, addCommentMutation]
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
          >
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
            
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="contain" />
            )}
          </TouchableOpacity>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleLike(item.id)}
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
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  testID={`submit-comment-${item.id}`}
                >
                  <Text
                    style={[
                      styles.commentSubmit,
                      (!commentText.trim() || addCommentMutation.isPending) && styles.commentSubmitDisabled,
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
    [currentUser, showComments, commentText, handleToggleLike, handleAddComment, addCommentMutation.isPending, router]
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.light.primary} /> : null}
          ListEmptyComponent={
             !isLoading && (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No posts found</Text>
              </View>
            )
          }
        />
      )}

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

            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <ImageIcon size={24} color={Colors.light.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postButton,
                  (!newPostContent.trim() && !selectedImage) && styles.postButtonDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                testID="submit-post-button"
              >
                {isPosting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
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
});
