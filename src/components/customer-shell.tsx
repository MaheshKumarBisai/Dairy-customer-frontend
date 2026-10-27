import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppShell, Screen, type HeaderProps } from '@dairy/shared';

/**
 * Customer screen frame: safe-area chrome + optional header + scroll area +
 * customer bottom nav. Keeps every `customer-*` screen consistent.
 */
export function CustomerShell({
  children,
  header,
  headerProps,
  nav = true,
  statusLight = false,
  padded = true,
  scroll = true,
  footer,
  floatingFooter,
  style,
  background,
  onRefresh,
  refreshing,
  onScroll,
  scrollEventThrottle,
  edges,
  hideRefreshIndicator,
  contentStyle,
}: {
  children: ReactNode;
  header?: ReactNode;
  headerProps?: HeaderProps;
  nav?: boolean;
  statusLight?: boolean;
  padded?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
  floatingFooter?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  hideRefreshIndicator?: boolean;
}) {
  const defaultEdges: ('top' | 'bottom' | 'left' | 'right')[] = nav
    ? ['top', 'left', 'right']
    : ['top', 'left', 'right', 'bottom'];
  return (
    <AppShell
      statusLight={statusLight}
      edges={edges ?? defaultEdges}
      style={background ? { backgroundColor: background } : undefined}
    >
      <View style={[styles.body, style]}>
        <Screen
          headerProps={headerProps}
          header={header}
          padded={padded}
          scroll={scroll}
          footer={footer}
          background={background}
          contentStyle={contentStyle}
          hasNav={nav}
          onRefresh={onRefresh}
          refreshing={refreshing}
          hideRefreshIndicator={hideRefreshIndicator}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {children}
        </Screen>
        {floatingFooter}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, width: '100%' },
});
