import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  catalogApi,
  EmptyState,
  ErrorState,
  Icon,
  ProductCardSkeleton,
  SearchBar,
  useAsync,
  useDebouncedValue,
  colors,
  shadows,
  spacing,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { CustomerProductCard } from '../components/customer-product-card';
import { useNavigate, useSearchParams } from '../router';

/** 8. Product list — with search, and Screen 5 Filters modal matching the reference design. */
export function CustomerProductListScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const categoryId = params.get('categoryId') ?? undefined;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryId ? [categoryId] : [],
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);
  const categories = useAsync((signal) => catalogApi.listCategories(signal), []);

  useEffect(() => {
    if (categoryId && !selectedCategories.includes(categoryId)) {
      setSelectedCategories([categoryId]);
    }
  }, [categoryId]);

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
      limit: 24,
    }),
    [debouncedSearch, selectedCategories],
  );

  const products = useAsync((signal) => catalogApi.listProducts(query, signal), [query]);

  const activeCategory = (categories.data ?? []).find(
    (category) => category.categoryId === categoryId,
  );

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (selectedCategories.length > 0) next.set('categoryId', selectedCategories[0]);
    setParams(next);
  };

  const BRANDS = [
    'Farm Fresh Organic Dairy',
    'Green Valley Pure Dairy',
    'Country Delight',
    'Amul Dairy',
  ];

  return (
    <CustomerShell
      header={
        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigate(-1)}
              style={styles.backBtn}
            >
              <Icon name="chevronLeft" size={22} color="#181725" />
            </Pressable>

            <Text numberOfLines={1} style={styles.headerTitle}>
              {activeCategory ? activeCategory.name : 'Find Products'}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filters"
              onPress={() => setShowFilterModal(true)}
              style={styles.filterBtn}
            >
              <Icon name="filter" size={20} color="#181725" />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search Store" />
          </View>
        </View>
      }
    >
      {products.status === 'loading' ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.gridCol}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      ) : products.status === 'error' ? (
        <ErrorState description={products.error?.message} onRetry={products.reload} />
      ) : (products.data?.products.length ?? 0) === 0 ? (
        <EmptyState
          icon="basket"
          title="No products found"
          description="Try a different search term or category."
        />
      ) : (
        <View style={styles.grid}>
          {products.data!.products.map((product) => (
            <View key={product.productId} style={styles.gridCol}>
              <CustomerProductCard product={product} />
            </View>
          ))}
        </View>
      )}

      {/* ── Filters Modal Screen (Screen 5 in design) ───────── */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.filterHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={() => setShowFilterModal(false)}
              hitSlop={8}
            >
              <Icon name="x" size={22} color="#181725" />
            </Pressable>
            <Text style={styles.filterHeaderTitle}>Filters</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Body */}
          <ScrollView style={styles.filterBody} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categories</Text>
              {(categories.data ?? []).map((cat) => {
                const checked = selectedCategories.includes(cat.categoryId);
                return (
                  <Pressable
                    key={cat.categoryId}
                    onPress={() => toggleCategory(cat.categoryId)}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked ? (
                        <Icon name="check" size={14} strokeWidth={3} color={colors.white} />
                      ) : null}
                    </View>
                    <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Brand */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Brand</Text>
              {BRANDS.map((brand) => {
                const checked = selectedBrands.includes(brand);
                return (
                  <Pressable
                    key={brand}
                    onPress={() => toggleBrand(brand)}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked ? (
                        <Icon name="check" size={14} strokeWidth={3} color={colors.white} />
                      ) : null}
                    </View>
                    <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>
                      {brand}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Apply Filter CTA */}
          <View style={styles.filterFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply Filter"
              onPress={applyFilters}
              style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#181725',
    flex: 1,
    textAlign: 'center',
  },
  filterBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    paddingTop: spacing.md,
  },
  gridCol: {
    width: '48%',
  },

  /* Filters Modal Styles (Screen 5) */
  modalContent: {
    flex: 1,
    backgroundColor: '#F2F3F2',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  filterHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#181725',
  },
  filterBody: {
    flex: 1,
    backgroundColor: '#F2F3F2',
  },
  filterSection: {
    backgroundColor: colors.white,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 18,
    marginHorizontal: 12,
  },
  filterSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#181725',
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#B1B1B1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#181725',
  },
  checkLabelActive: {
    color: colors.green,
    fontWeight: '700',
  },
  filterFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E2E2',
  },
  applyBtn: {
    backgroundColor: '#141518',
    borderRadius: 24,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.dark,
  },
  applyBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },
});
