import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addressesApi,
  catalogApi,
  ErrorState,
  Icon,
  useAsync,
  colors,
  shadows,
} from '@dairy/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerShell } from '../components/customer-shell';
import { CustomerProductCard } from '../components/customer-product-card';
import { customerRoutes } from '../customer-routes';
import { useNavigate, useFocusEffect } from '../router';
import { useCustomerCart } from '../customer-cart.context';

/** Interactive categories matching Screen 1 */
const TOP_CATEGORIES = [
  { id: 'cat-milk', name: 'Fresh Milk', icon: 'milk' as const, emoji: '🥛' },
  { id: 'cat-ghee', name: 'A2 Ghee', icon: 'jar' as const, emoji: '🧈' },
  { id: 'cat-curd', name: 'Pure Curd', icon: 'bowl' as const, emoji: '🥣' },
  { id: 'cat-paneer', name: 'Malai Paneer', icon: 'cheese' as const, emoji: '🧀' },
  { id: 'cat-butter', name: 'Farm Butter', icon: 'jar' as const, emoji: '🧈' },
];

/**
 * 6. Modern Home Screen — matching Screen 1
 * - Dark hero header scrolls naturally with the page (no longer static)
 * - Category pills filter products directly on the home screen (no duplicate explore page)
 * - Live in-place search input filters products immediately
 * - Floating dark checkout pill when cart has items
 * - Clean enterprise UX
 */
export function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { itemCount } = useCustomerCart();

  const [headerHeight, setHeaderHeight] = useState(175);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const optionsAnim = useRef(new Animated.Value(0)).current;

  // Smooth entrance / exit animation for the options card
  useEffect(() => {
    if (showQuickActions) {
      Animated.spring(optionsAnim, {
        toValue: 1,
        friction: 8,
        tension: 42,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(optionsAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    }
  }, [showQuickActions, optionsAnim]);

  // When pulling down (scrollY <= 0), translateY is clamped to 0 (HEADER STAYS STUCK TO TOP).
  // When scrolling up (scrollY > 0), translateY slides up to move header with page.
  const headerScrollRange = Math.max(headerHeight - 20, 120);
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerScrollRange],
    outputRange: [0, -headerScrollRange],
    extrapolate: 'clamp',
  });

  const animHeight = optionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 195],
  });
  const animOpacity = optionsAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.45, 1],
  });
  const animSlide = optionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  });
  const animScale = optionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });
  const animMarginTop = optionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  const handleScroll = (event: any) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    // Automatically hide quick options when browsing deep into catalog
    if (offsetY > 120 && showQuickActions) {
      setShowQuickActions(false);
    }
  };

  const products = useAsync((signal) => catalogApi.listProducts({ limit: 20 }, signal), []);
  const addresses = useAsync((signal) => addressesApi.listAddresses(signal), []);

  const reloadAddressesRef = useRef(addresses.reload);
  reloadAddressesRef.current = addresses.reload;

  // Stably reload addresses whenever returning to the Home screen
  useFocusEffect(
    useCallback(() => {
      reloadAddressesRef.current();
    }, []),
  );

  const defaultAddress = useMemo(
    () =>
      (addresses.data ?? []).find((address) => address.isDefault) ?? (addresses.data ?? [])[0],
    [addresses.data],
  );

  const deliveryLabel = defaultAddress
    ? `${defaultAddress.title || 'Home'} · ${defaultAddress.city || 'Bangalore'}`
    : 'Bangalore, Indiranagar';

  const productList = products.data?.products ?? [];

  // Filter products by search query and/or selected category in real time
  const filteredProducts = useMemo(() => {
    let list = productList;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => {
        const pName = (p.name || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const pCat = (p.category?.name || '').toLowerCase();
        return pName.includes(q) || pDesc.includes(q) || pCat.includes(q);
      });
    }

    if (selectedCategory) {
      const catLower = selectedCategory.toLowerCase().replace(/fresh|pure|a2|farm/g, '').trim();
      list = list.filter((p) => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category?.name || '').toLowerCase();
        return pName.includes(catLower) || pCat.includes(catLower);
      });
    }

    return list;
  }, [productList, searchQuery, selectedCategory]);

  const recommended = productList.slice(0, 4);
  const bestSellers = productList.slice(2, 8);

  const handleHelpMeChoose = () => {
    navigate(customerRoutes.products);
  };

  return (
    <CustomerShell
      statusLight
      edges={['left', 'right']}
      padded={false}
      background="#F8F9FB"
      scroll={false}
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        {/* ── Dark Hero Header (Brand & Search) — Firmly STUCK to top on scroll down, scrolls up naturally ─────── */}
        <Animated.View
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && Math.abs(h - headerHeight) > 2) {
              setHeaderHeight(h);
            }
          }}
          style={[
            styles.hero,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              paddingTop: Math.max(insets.top, 18) + 2,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          {/* Brand & Lime Cart Header */}
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brandName}>DairyFresh~</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigate(customerRoutes.addresses)}
                style={styles.locationPill}
              >
                <Icon name="mapPin" size={13} color="#9EACB5" />
                <Text numberOfLines={1} style={styles.locationText}>
                  {deliveryLabel}
                </Text>
              </Pressable>
            </View>

            {/* Vibrant Lime Cart Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View basket, ${itemCount} items`}
              onPress={() => navigate(customerRoutes.cart)}
              style={({ pressed }) => [styles.cartBtn, pressed && { opacity: 0.88 }]}
            >
              <Icon name="cart" size={18} strokeWidth={2.4} color="#121316" />
              <Text style={styles.cartCount}>{itemCount}</Text>
            </Pressable>
          </View>

          {/* Search Bar — Live in-place search input */}
          <View style={styles.searchBar}>
            <Icon name="search" size={18} color="#8E95A0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for something tasty..."
              placeholderTextColor="#8E95A0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.clearSearchBtn}
              >
                <Icon name="x" size={16} color="#8E95A0" />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {/* ── Scrollable Body ── */}
        <Animated.ScrollView
          bounces={true}
          style={{ flex: 1, backgroundColor: '#F8F9FB' }}
          contentContainerStyle={{
            paddingTop: headerHeight + 6,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: true,
              listener: handleScroll,
            },
          )}
        >
          {/* Quick options Button */}
          <View style={styles.quickPullHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quick options"
              onPress={() => setShowQuickActions((prev) => !prev)}
              style={({ pressed }) => [
                styles.quickPullPill,
                showQuickActions && styles.quickPullPillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="sparkle" size={13} color={showQuickActions ? '#121316' : '#CCFF00'} />
              <Text style={[styles.quickPullText, showQuickActions && styles.quickPullTextActive]}>
                Quick options
              </Text>
            </Pressable>
          </View>

          {/* ── 3 Quick Action Items (Smooth Animated Entrance from Under Header) ─────── */}
          <Animated.View
            style={[
              styles.underHeaderWrap,
              {
                maxHeight: animHeight,
                opacity: animOpacity,
                marginTop: animMarginTop,
                transform: [{ translateY: animSlide }, { scale: animScale }],
                overflow: 'hidden',
              },
            ]}
          >
            <View style={styles.assistiveCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Repeat last order"
                onPress={() => navigate(customerRoutes.orders)}
                style={({ pressed }) => [styles.assistiveItem, pressed && styles.assistivePressed]}
              >
                <View style={styles.assistiveIconWrap}>
                  <Icon name="repeat" size={16} color={colors.white} />
                </View>
                <Text style={styles.assistiveText}>Repeat last order</Text>
              </Pressable>

              <View style={styles.assistiveDivider} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Help me choose"
                onPress={handleHelpMeChoose}
                style={({ pressed }) => [styles.assistiveItem, pressed && styles.assistivePressed]}
              >
                <View style={styles.assistiveIconWrap}>
                  <Icon name="help" size={16} color={colors.white} />
                </View>
                <Text style={styles.assistiveText}>Help me choose</Text>
              </Pressable>

              <View style={styles.assistiveDivider} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Daily subscription"
                onPress={() => navigate(customerRoutes.dairyPlans)}
                style={({ pressed }) => [styles.assistiveItem, pressed && styles.assistivePressed]}
              >
                <View style={styles.assistiveIconWrap}>
                  <Icon name="sparkle" size={16} color={colors.lime} />
                </View>
                <Text style={styles.assistiveText}>Daily subscription</Text>
              </Pressable>
            </View>
          </Animated.View>

      {/* ── Scrollable Body Content ─────────────────────────────── */}
      <View style={styles.content}>
        {/* ── Top Categories Section ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {selectedCategory && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedCategory(null)}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterText}>Show all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {TOP_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.name)}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    isSelected && styles.categoryPillActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapActive]}>
                    <Icon name={cat.icon} size={16} color={isSelected ? '#121316' : colors.ink} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Search Results View (Active Search Query) ──────────── */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Search results</Text>
                <Text style={styles.searchQuerySub}>"{searchQuery.trim()}"</Text>
              </View>
              <Text style={styles.itemCountSub}>{filteredProducts.length} items</Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.searchEmptyCard}>
                <View style={styles.searchEmptyIconWrap}>
                  <Icon name="search" size={28} color="#9CA3AF" />
                </View>
                <Text style={styles.searchEmptyTitle}>No exact match found</Text>
                <Text style={styles.searchEmptySub}>
                  We couldn't find any products matching "{searchQuery.trim()}". Try searching for milk, ghee, paneer, or curd.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchPill}
                >
                  <Text style={styles.clearSearchPillText}>Clear search</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.gridWrap}>
                {filteredProducts.map((product) => (
                  <View key={product.productId} style={styles.gridCardItem}>
                    <CustomerProductCard product={product} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : selectedCategory ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{selectedCategory}</Text>
              <Text style={styles.itemCountSub}>{filteredProducts.length} items</Text>
            </View>

            <View style={styles.gridWrap}>
              {filteredProducts.map((product) => (
                <View key={product.productId} style={styles.gridCardItem}>
                  <CustomerProductCard product={product} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* ── Recommended For You Section ──────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recommended for you</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate(customerRoutes.products)}
                  style={styles.viewAllRow}
                >
                  <Text style={styles.viewAllText}>View all</Text>
                  <Icon name="arrowRight" size={14} color="#72747D" />
                </Pressable>
              </View>

              {products.status === 'error' ? (
                <ErrorState description={products.error?.message} onRetry={products.reload} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCards}
                >
                  {(recommended.length > 0 ? recommended : productList).map((product) => (
                    <View key={product.productId} style={styles.cardWrap}>
                      <CustomerProductCard product={product} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Farm Fresh Bestsellers Section ───────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Farm Bestsellers</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate(customerRoutes.products)}
                  style={styles.viewAllRow}
                >
                  <Text style={styles.viewAllText}>View all</Text>
                  <Icon name="arrowRight" size={14} color="#72747D" />
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCards}
              >
                {(bestSellers.length > 0 ? bestSellers : productList).map((product) => (
                  <View key={product.productId} style={styles.cardWrap}>
                    <CustomerProductCard product={product} />
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* ── Floating / Bottom Checkout Banner (Screen 1 style) ──── */}
        {itemCount > 0 && (
          <View style={styles.checkoutBannerWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Check out ${itemCount} products`}
              onPress={() => navigate(customerRoutes.cart)}
              style={({ pressed }) => [styles.checkoutBanner, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.checkoutBannerText}>
                Check out {itemCount} {itemCount === 1 ? 'product' : 'products'}
              </Text>
            </Pressable>
          </View>
        )}
        </View>
      </Animated.ScrollView>
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#141518',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    ...shadows.dark,
  },
  quickPullHeader: {
    alignItems: 'center',
    marginVertical: 4,
    zIndex: 10,
  },
  quickPullPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E2024',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3038',
  },
  quickPullPillActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  quickPullText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  quickPullTextActive: {
    color: '#121316',
  },
  underHeaderWrap: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9EACB5',
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    ...shadows.lime,
  },
  cartCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#121316',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#222428',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchQuerySub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  searchEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  searchEmptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  searchEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#141518',
  },
  searchEmptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  clearSearchPill: {
    marginTop: 6,
    backgroundColor: '#141518',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  clearSearchPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchPlaceholder: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E95A0',
  },

  /* 3 Quick Action Items Card */
  assistiveCard: {
    backgroundColor: '#1E2024',
    borderRadius: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2D3038',
    overflow: 'hidden',
  },
  assistiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  assistivePressed: {
    backgroundColor: '#26292E',
  },
  assistiveIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2C32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  assistiveDivider: {
    height: 1,
    backgroundColor: '#2A2D33',
    marginHorizontal: 16,
  },

  /* Content */
  content: {
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#141518',
  },
  itemCountSub: {
    fontSize: 13,
    color: '#72747D',
    fontWeight: '600',
  },
  clearFilterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.greenDark,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#72747D',
  },

  /* Category pills */
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    ...shadows.sm,
  },
  categoryPillActive: {
    backgroundColor: '#141518',
    borderColor: '#141518',
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapActive: {
    backgroundColor: '#CCFF00',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },
  categoryNameActive: {
    color: colors.white,
  },

  /* Horizontal cards */
  horizontalCards: {
    paddingHorizontal: 20,
    gap: 14,
  },
  cardWrap: {
    width: 172,
  },

  /* Grid Wrap for filtered products */
  gridWrap: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridCardItem: {
    width: '47%',
  },

  /* Floating / bottom checkout banner */
  checkoutBannerWrap: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  checkoutBanner: {
    backgroundColor: '#141518',
    borderRadius: 24,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.dark,
  },
  checkoutBannerText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
});
