import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface PostMediaProps {
  uri: string;
  mediaType?: 'image' | 'video';
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
}

// Shared by the feed card, post detail, and create-post preview so a post's
// attached media renders the same way (image vs. video) everywhere.
export default function PostMedia({ uri, mediaType = 'image', style, resizeMode = 'contain' }: PostMediaProps) {
  const isVideo = mediaType === 'video';
  const player = useVideoPlayer(isVideo ? uri : null, (p) => {
    p.loop = false;
  });

  if (isVideo) {
    return (
      <VideoView
        style={style as any}
        player={player}
        contentFit={resizeMode}
        nativeControls
      />
    );
  }

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
