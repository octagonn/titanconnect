import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, MapPin, Star } from 'lucide-react-native';
import HardShadow from '@/components/ui/HardShadow';
import Chip from '@/components/ui/Chip';
import Colors, { INK, palette } from '@/constants/colors';

type EventItem = {
  id: string;
  title: string;
  host: string;
  category: 'Club' | 'Party' | 'Campus';
  date: string;
  location: string;
  color: string;
  interested: number;
};

const EVENTS: EventItem[] = [
  {
    id: 'e1',
    title: 'Titan Tech Mixer',
    host: 'CS Club',
    category: 'Club',
    date: 'Fri · 6:00 PM',
    location: 'TSU Pavilion',
    color: palette.blue,
    interested: 42,
  },
  {
    id: 'e2',
    title: 'Beach Bonfire Night',
    host: 'ASI',
    category: 'Party',
    date: 'Sat · 8:00 PM',
    location: 'Huntington Beach',
    color: palette.orange,
    interested: 118,
  },
  {
    id: 'e3',
    title: 'Career Fair: Spring 2026',
    host: 'Career Center',
    category: 'Campus',
    date: 'Wed · 10:00 AM',
    location: 'TSU Ballroom',
    color: palette.skyBlue,
    interested: 256,
  },
  {
    id: 'e4',
    title: 'Salsa Night',
    host: 'Latin Dance Club',
    category: 'Club',
    date: 'Thu · 7:00 PM',
    location: 'Titan Student Union',
    color: palette.amber,
    interested: 73,
  },
];

const CATEGORY_COLOR: Record<EventItem['category'], string> = {
  Club: palette.skyBlue,
  Party: palette.orange,
  Campus: palette.amber,
};

export default function EventsPreview() {
  const [interested, setInterested] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setInterested((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.list}>
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>PREVIEW — sample events, not live yet</Text>
      </View>
      {EVENTS.map((event) => {
        const isInterested = !!interested[event.id];
        return (
          <View key={event.id} style={styles.cardWrap}>
            <HardShadow offset={7} radius={22} />
            <View style={styles.card}>
              <View style={[styles.imageBlock, { backgroundColor: event.color }]}>
                <Calendar size={32} color={INK} strokeWidth={2} />
              </View>
              <View style={styles.body}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
                  <Chip label={event.category} variant="solid" color={CATEGORY_COLOR[event.category]} size="sm" />
                </View>
                <Text style={styles.host}>Hosted by {event.host}</Text>
                <View style={styles.metaRow}>
                  <Calendar size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.metaText}>{event.date}</Text>
                  <MapPin size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.metaText}>{event.location}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.interestedText}>
                    {event.interested + (isInterested ? 1 : 0)} interested
                  </Text>
                  <TouchableOpacity
                    style={[styles.interestBtn, isInterested && styles.interestBtnActive]}
                    onPress={() => toggle(event.id)}
                    activeOpacity={0.8}
                  >
                    <Star size={14} color={isInterested ? '#FFFFFF' : INK} fill={isInterested ? '#FFFFFF' : 'transparent'} strokeWidth={2.5} />
                    <Text style={[styles.interestBtnText, isInterested && styles.interestBtnTextActive]}>
                      {isInterested ? 'Interested' : 'Interested?'}
                    </Text>
                  </TouchableOpacity>
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
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    overflow: 'hidden',
  },
  imageBlock: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  body: {
    padding: 14,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900' as const,
    color: INK,
  },
  host: {
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
    marginTop: 4,
  },
  interestedText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  interestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  interestBtnActive: {
    backgroundColor: palette.orange,
  },
  interestBtnText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: INK,
  },
  interestBtnTextActive: {
    color: '#FFFFFF',
  },
});
