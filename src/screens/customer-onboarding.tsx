import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell, Button, OnboardingScene, Screen, colors, spacing, typography } from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { markOnboardingSeen } from '../bootstrap';

const SLIDES = [
  {
    title: 'Pure Dairy,\nStraight to You',
    text: 'Milk, curd, ghee and more from verified local dairy farmers — chilled and delivered fresh.',
  },
  {
    title: 'Subscribe Daily\nin Seconds',
    text: 'Start a dairy plan for the days you want. Skip, pause or add an extra delivery whenever life changes.',
  },
  {
    title: 'Track Every\nDelivery Live',
    text: 'Follow your order from the dairy farm to your doorstep, with live updates from your delivery partner.',
  },
] as const;

/** 2. Onboarding — explains the app before account creation. */
export function CustomerOnboardingScreen() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    markOnboardingSeen();
    navigate(customerRoutes.login, { replace: true });
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((value) => value + 1);
  };

  return (
    <AppShell>
      <Screen padded={false} navInset={0}>
        <View style={styles.wrap}>
          <Pressable accessibilityRole="button" onPress={finish} style={styles.skip} hitSlop={8}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <View style={styles.art}>
            <OnboardingScene variant={(index + 1) as 1 | 2 | 3} />
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>
              {slide.title.split('\n').map((line) => (
                <Text key={line}>
                  {line}
                  {'\n'}
                </Text>
              ))}
            </Text>
            <Text style={styles.text}>{slide.text}</Text>
          </View>

          <View style={styles.foot}>
            <View style={styles.dots} accessibilityElementsHidden>
              {SLIDES.map((_, dot) => (
                <View key={dot} style={[styles.dot, dot === index && styles.dotActive]} />
              ))}
            </View>
            <Button size="lg" block onPress={next}>
              {isLast ? 'Get Started' : 'Next'}
            </Button>
          </View>
        </View>
      </Screen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.xl },
  skip: { alignSelf: 'flex-end', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  skipText: { ...typography.small, color: colors.muted, fontWeight: '600' },
  art: { alignItems: 'center', marginTop: spacing.lg },
  body: { marginTop: spacing.xl, gap: spacing.md },
  title: { ...typography.display, fontSize: 28, lineHeight: 36 },
  text: { ...typography.body, color: colors.muted, lineHeight: 23 },
  foot: { marginTop: 'auto', paddingBottom: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotActive: { width: 22, backgroundColor: colors.green },
});
