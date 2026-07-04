import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingBag, Tag } from 'lucide-react-native';
import HardShadow from '@/components/ui/HardShadow';
import Colors, { INK, palette } from '@/constants/colors';

type Listing = {
  id: string;
  title: string;
  price: string;
  condition: string;
  seller: string;
  color: string;
};

const LISTINGS: Listing[] = [
  { id: 'm1', title: 'Calculus Textbook (8th ed)', price: '$40', condition: 'Like new', seller: 'Jordan P.', color: palette.skyBlue },
  { id: 'm2', title: 'Mini Fridge', price: '$60', condition: 'Pickup only', seller: 'Casey L.', color: palette.orange },
  { id: 'm3', title: 'Trek FX2 Bike', price: '$120', condition: 'Great condition', seller: 'Amir H.', color: palette.amber },
  { id: 'm4', title: 'Desk Lamp', price: '$10', condition: 'Used', seller: 'Sam T.', color: palette.blue },
];

export default function MarketplacePreview() {
  const [messaged, setMessaged] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setMessaged((prev) => ({ ...prev, [id]: true }));

  return (
    <View>
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>PREVIEW — sample listings, not live yet</Text>
      </View>
      <View style={styles.grid}>
        {LISTINGS.map((item) => {
          const didMessage = !!messaged[item.id];
          return (
            <View key={item.id} style={styles.cardWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.card}>
                <View style={[styles.imageBlock, { backgroundColor: item.color }]}>
                  <ShoppingBag size={28} color={INK} strokeWidth={2} />
                  <View style={styles.priceTag}>
                    <Tag size={11} color={INK} strokeWidth={2.5} />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.condition}>{item.condition}</Text>
                  <Text style={styles.seller}>{item.seller}</Text>
                  <TouchableOpacity
                    style={[styles.messageBtn, didMessage && styles.messageBtnSent]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.8}
                    disabled={didMessage}
                  >
                    <Text style={[styles.messageBtnText, didMessage && styles.messageBtnTextSent]}>
                      {didMessage ? 'Message Sent' : 'Message Seller'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewBanner: {
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  previewBannerText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: INK,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrap: {
    position: 'relative',
    width: '46%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    overflow: 'hidden',
  },
  imageBlock: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: INK,
  },
  body: {
    padding: 10,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
    minHeight: 34,
  },
  condition: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  seller: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  messageBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: palette.blue,
  },
  messageBtnSent: {
    backgroundColor: '#FFFFFF',
  },
  messageBtnText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  messageBtnTextSent: {
    color: Colors.light.textSecondary,
  },
});
