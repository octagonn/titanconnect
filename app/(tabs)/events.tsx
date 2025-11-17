import { Calendar, MapPin, Users, Check } from 'lucide-react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types';

export default function EventsScreen() {
  const { events, toggleEventRSVP } = useApp();
  const { currentUser } = useAuth();

  const renderEvent = ({ item }: { item: Event }) => {
    const isAttending = currentUser ? item.attendees.includes(currentUser.id) : false;
    const isInterested = currentUser ? item.interestedUsers.includes(currentUser.id) : false;
    const totalAttendees = item.attendees.length + item.interestedUsers.length;

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
});
