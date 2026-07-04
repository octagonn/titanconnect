import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, Clock, MapPin } from 'lucide-react-native';
import HardShadow from '@/components/ui/HardShadow';
import Avatar from '@/components/ui/Avatar';
import Colors, { INK, palette } from '@/constants/colors';

type StudyGroup = {
  id: string;
  course: string;
  topic: string;
  host: string;
  when: string;
  where: string;
  spotsFilled: number;
  spotsTotal: number;
  color: string;
};

const GROUPS: StudyGroup[] = [
  {
    id: 's1',
    course: 'CPSC 335',
    topic: 'Algorithms Study Group',
    host: 'Maya R.',
    when: 'Tue & Thu · 5:00 PM',
    where: 'Pollak Library, 3rd Floor',
    spotsFilled: 4,
    spotsTotal: 6,
    color: palette.skyBlue,
  },
  {
    id: 's2',
    course: 'MATH 250B',
    topic: 'Calc III Partners',
    host: 'Devon K.',
    when: 'Mon · 3:00 PM',
    where: 'Online (Zoom)',
    spotsFilled: 2,
    spotsTotal: 4,
    color: palette.amber,
  },
  {
    id: 's3',
    course: 'ACCT 301',
    topic: 'Looking for 1-on-1 partner',
    host: 'Priya S.',
    when: 'Flexible',
    where: 'McCarthy Hall',
    spotsFilled: 0,
    spotsTotal: 1,
    color: palette.orange,
  },
];

export default function StudyBuddyPreview() {
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setJoined((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.list}>
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>PREVIEW — sample groups, not live yet</Text>
      </View>
      {GROUPS.map((group) => {
        const isJoined = !!joined[group.id];
        const filled = group.spotsFilled + (isJoined ? 1 : 0);
        const full = filled >= group.spotsTotal;
        return (
          <View key={group.id} style={styles.cardWrap}>
            <HardShadow offset={6} radius={20} />
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={[styles.courseWell, { backgroundColor: group.color }]}>
                  <BookOpen size={18} color={INK} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.course}>{group.course}</Text>
                  <Text style={styles.topic}>{group.topic}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Clock size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                <Text style={styles.metaText}>{group.when}</Text>
                <MapPin size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                <Text style={styles.metaText}>{group.where}</Text>
              </View>

              <View style={styles.footerRow}>
                <View style={styles.hostRow}>
                  <Avatar name={group.host} size={28} />
                  <Text style={styles.hostText}>{group.host} · {filled}/{group.spotsTotal} spots</Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnActive, full && !isJoined && styles.joinBtnFull]}
                  onPress={() => !(full && !isJoined) && toggle(group.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}>
                    {isJoined ? 'Joined' : full ? 'Full' : 'Join'}
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseWell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  course: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: INK,
  },
  topic: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  joinBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: palette.blue,
  },
  joinBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  joinBtnFull: {
    backgroundColor: '#D8D3E0',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  joinBtnTextActive: {
    color: INK,
  },
});
