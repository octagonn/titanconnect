import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ghost, Heart, MessageCircle } from 'lucide-react-native';
import HardShadow from '@/components/ui/HardShadow';
import Colors, { INK, palette } from '@/constants/colors';

type AnonPost = {
  id: string;
  kind: 'text' | 'poll';
  content: string;
  likes: number;
  comments: number;
  poll?: { option: string; pct: number }[];
};

const POSTS: AnonPost[] = [
  {
    id: 'a1',
    kind: 'text',
    content: "Anyone else feel like the 8am discussion sections should be illegal? asking for a friend 💀",
    likes: 214,
    comments: 38,
  },
  {
    id: 'a2',
    kind: 'poll',
    content: 'Best place to study on campus?',
    likes: 89,
    comments: 21,
    poll: [
      { option: 'Pollak Library', pct: 48 },
      { option: 'TSU Study Rooms', pct: 27 },
      { option: 'A coffee shop off-campus', pct: 25 },
    ],
  },
  {
    id: 'a3',
    kind: 'text',
    content: "Shoutout to the person who returned my AirPods at the TSU lost and found. Titans looking out for Titans 🐘",
    likes: 156,
    comments: 12,
  },
];

export default function AnonymousPreview() {
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.list}>
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>PREVIEW — sample posts, not live yet</Text>
      </View>
      {POSTS.map((post) => {
        const isLiked = !!liked[post.id];
        return (
          <View key={post.id} style={styles.cardWrap}>
            <HardShadow offset={6} radius={20} color={INK} />
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.maskWell}>
                  <Ghost size={18} color={INK} strokeWidth={2.5} />
                </View>
                <Text style={styles.anonLabel}>Anonymous Titan</Text>
              </View>

              <Text style={styles.content}>{post.content}</Text>

              {post.poll && (
                <View style={styles.pollBlock}>
                  {post.poll.map((opt) => (
                    <View key={opt.option} style={styles.pollRow}>
                      <View style={styles.pollBarTrack}>
                        <View style={[styles.pollBarFill, { width: `${opt.pct}%` }]} />
                        <Text style={styles.pollLabel}>{opt.option}</Text>
                      </View>
                      <Text style={styles.pollPct}>{opt.pct}%</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)} activeOpacity={0.8}>
                  <Heart
                    size={18}
                    color={isLiked ? palette.rust : Colors.light.textSecondary}
                    fill={isLiked ? palette.rust : 'transparent'}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.actionText}>{post.likes + (isLiked ? 1 : 0)}</Text>
                </TouchableOpacity>
                <View style={styles.actionBtn}>
                  <MessageCircle size={18} color={Colors.light.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  previewBanner: {
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  previewBannerText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: INK,
    letterSpacing: 0.4,
  },
  cardWrap: {
    position: 'relative',
  },
  card: {
    backgroundColor: INK,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  maskWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: palette.skyBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonLabel: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  content: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  pollBlock: {
    gap: 8,
    marginTop: 2,
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollBarTrack: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pollBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.orange,
  },
  pollLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    paddingHorizontal: 10,
  },
  pollPct: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    width: 34,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.85)',
  },
});
