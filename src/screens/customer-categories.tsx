import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  catalogApi,
  categoryIconName,
  EmptyState,
  ErrorState,
  Icon,
  SearchBar,
  useAsync,
  colors,
  shadows,
  spacing,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';

/** Category card styles exactly matching the reference design */
const CATEGORY_CARDS = [
  {
    pattern: /fruit|veg/i,
    name: 'Fresh Fruits & Vegetable',
    bg: '#EEF7F1',
    border: '#53B175',
    emoji: '🥦🍎',
    icon: 'leaf',
  },
  {
    pattern: /oil|ghee|butter/i,
    name: 'Cooking Oil & Ghee',
    bg: '#FFF6EE',
    border: '#F8A44C',
    emoji: '🧈🫙',
    icon: 'jar',
  },
  {
    pattern: /meat|fish|paneer/i,
    name: 'Meat & Fish',
    bg: '#FDE8E4',
    border: '#F7A593',
    emoji: '🥩🐟',
    icon: 'cheese',
  },
  {
    pattern: /bakery|snack|bread/i,
    name: 'Bakery & Snacks',
    bg: '#F4EBF7',
    border: '#D3B0E0',
    emoji: '🍞🥐',
    icon: 'gift',
  },
  {
    pattern: /dairy|milk|egg|curd/i,
    name: 'Dairy & Eggs',
    bg: '#FFF8E5',
    border: '#FDE598',
    emoji: '🥛🥚',
    icon: 'milk',
  },
  {
    pattern: /beverage|drink|juice/i,
    name: 'Beverages',
    bg: '#EDF7FC',
    border: '#B7DFF5',
    emoji: '🧃🥤',
    icon: 'bowl',
  },
];

/** 7. Categories (Explore) — Find Products 2-column pastel grid. */
export function CustomerCategoriesScreen() {
  const navigate = useNavigate();
  const categories = useAsync((signal) => catalogApi.listCategories(signal), []);
  const [search, setSearch] = useState('');

  const backendList = categories.data ?? [];
  const filtered = backendList.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <CustomerShell
      header={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find Products</Text>
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search Store" />
          </View>
        </View>
      }
    >
      {categories.status === 'loading' ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeleton} />
          ))}
        </View>
      ) : categories.status === 'error' ? (
        <ErrorState
          description={categories.error?.message}
          onRetry={categories.reload}
          code={categories.error?.code}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="grid"
          title="No categories found"
          description={
            search
              ? `No match for "${search}". Try a different term.`
              : 'Categories will appear once products are listed.'
          }
        />
      ) : (
        <View style={styles.grid}>
          {filtered.map((category, index) => {
            // Match design palette by keyword or fallback to rotation
            const matched = CATEGORY_CARDS.find((c) => c.pattern.test(category.name));
            const cardTheme = matched ?? CATEGORY_CARDS[index % CATEGORY_CARDS.length];

            return (
              <Pressable
                key={category.categoryId}
                accessibilityRole="button"
                accessibilityLabel={category.name}
                onPress={() =>
                  navigate(`${customerRoutes.products}?categoryId=${category.categoryId}`)
                }
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: cardTheme.bg, borderColor: cardTheme.border },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={styles.artWrap}>
                  <Text style={styles.emojiArt}>{cardTheme.emoji}</Text>
                  <View style={[styles.iconPill, { backgroundColor: cardTheme.border + '20' }]}>
                    <Icon
                      name={categoryIconName(category.name)}
                      size={22}
                      color={cardTheme.border}
                    />
                  </View>
                </View>

                <Text numberOfLines={2} style={styles.cardTitle}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#181725',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  searchWrap: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: spacing.md,
  },
  card: {
    width: '47.5%',
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...shadows.xs,
  },
  artWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 70,
  },
  emojiArt: {
    fontSize: 38,
  },
  iconPill: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181725',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  skeleton: {
    width: '47.5%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#F2F3F2',
  },
});
