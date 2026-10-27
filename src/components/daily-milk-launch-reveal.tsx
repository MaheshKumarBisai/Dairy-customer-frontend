import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';

const videoSource = require('../../assets/daily_milk_reveal.mp4');
const logoSource = require('../../assets/vintage_logo_circle.png');

export function DailyMilkLaunchReveal({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'video'>('logo');
  const finishCalledRef = useRef(false);

  const handleComplete = () => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;
    onFinish();
  };

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = true;
  });

  useEffect(() => {
    // Show the logo first for ~1.2s, then start animated video reveal
    const logoTimer = setTimeout(() => {
      setPhase('video');
      try {
        player.play();
      } catch {
        /* player error fallback */
      }
    }, 1200);

    return () => clearTimeout(logoTimer);
  }, [player]);

  useEffect(() => {
    if (phase !== 'video') return;

    // Listen for end of playback
    const subscription = player.addListener('playToEnd', () => {
      handleComplete();
    });

    // Safety fallback timer: the animated reveal is ~5.8s, automatically transition after 6.2s
    const timer = setTimeout(() => {
      handleComplete();
    }, 6200);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [player, phase]);

  return (
    <View style={styles.container}>
      <StatusBar hidden style="dark" />
      <Pressable
        style={styles.pressable}
        onPress={handleComplete}
        accessibilityRole="button"
        accessibilityLabel="Skip launch reveal"
      >
        {phase === 'logo' ? (
          <View style={styles.logoWrap}>
            <Image
              source={logoSource}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pressable: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  logoImage: {
    width: 220,
    height: 220,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});
