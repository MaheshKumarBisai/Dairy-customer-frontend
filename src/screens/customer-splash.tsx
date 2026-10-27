import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerAuth } from '../auth/customer-auth.context';
import { customerSession } from '../bootstrap';

/** Character Body contour tracing the reference design with bunny ears and swelling dome */
const CHAR_BODY_D =
  'M 0 1024 L 0 567 L 4 564 L 8 558 L 12 552 L 16 547 L 20 542 L 24 538 L 28 533 L 32 529 L 36 525 L 40 521 L 44 517 L 48 514 L 52 510 L 56 507 L 60 504 L 64 501 L 68 498 L 72 495 L 76 493 L 80 491 L 84 488 L 88 486 L 92 484 L 96 482 L 100 480 L 104 479 L 108 477 L 112 413 L 116 401 L 120 394 L 124 388 L 128 384 L 132 381 L 136 379 L 140 379 L 144 380 L 148 382 L 152 386 L 156 392 L 160 399 L 164 409 L 168 422 L 172 440 L 176 440 L 180 414 L 184 402 L 188 394 L 192 388 L 196 384 L 200 381 L 204 379 L 208 378 L 212 376 L 216 375 L 220 375 L 224 375 L 228 376 L 232 379 L 236 384 L 240 399 L 244 466 L 248 466 L 252 467 L 256 468 L 260 469 L 264 470 L 268 471 L 272 472 L 276 473 L 280 474 L 284 475 L 288 476 L 292 477 L 296 478 L 300 479 L 304 480 L 308 481 L 312 482 L 316 484 L 320 485 L 324 486 L 328 488 L 332 489 L 336 490 L 340 492 L 344 493 L 348 495 L 352 496 L 356 498 L 360 500 L 364 501 L 368 503 L 372 505 L 376 507 L 380 509 L 384 511 L 388 513 L 392 515 L 396 517 L 400 519 L 404 522 L 408 524 L 412 527 L 416 530 L 420 533 L 424 535 L 428 539 L 432 542 L 436 545 L 440 549 L 444 552 L 448 556 L 452 560 L 456 565 L 460 569 L 464 573 L 465 573 L 466 1024 Z';

/** Authentic playful typography vectors matching reference "Hi BUDDY!" */
const HI_BUDDY_PATHS = [
  'M 124 281 L 119 281 L 115 285 L 115 289 L 114 292 L 112 294 L 108 293 L 104 283 L 104 317 L 106 317 L 106 307 L 107 298 L 109 296 L 114 297 L 115 301 L 116 317 L 121 319 L 128 318 L 129 289 L 126 283 Z',
  'M 137 289 L 135 291 L 135 313 L 137 317 L 139 318 L 146 317 L 148 313 L 147 301 L 148 292 L 146 290 L 144 289 Z',
  'M 135 282 L 137 285 L 145 285 L 147 284 L 146 281 L 137 281 Z',
  'M 174 279 L 172 280 L 172 317 L 173 319 L 177 321 L 186 321 L 190 320 L 194 318 L 197 315 L 198 313 L 198 303 L 196 298 L 188 291 L 188 289 L 190 286 L 190 284 L 186 280 L 183 279 Z',
  'M 178 294 L 184 294 L 187 295 L 189 296 L 191 298 L 191 301 L 188 304 L 185 305 L 181 306 L 179 306 L 177 304 Z',
  'M 177 288 L 177 286 L 179 284 L 185 286 L 182 289 L 179 290 Z',
  'M 232 281 L 221 281 L 218 282 L 218 305 L 216 311 L 213 313 L 210 310 L 208 306 L 207 282 L 204 283 L 204 307 L 206 311 L 211 316 L 213 317 L 222 317 L 226 315 L 230 311 L 232 306 L 234 289 L 234 283 Z',
  'M 240 281 L 239 283 L 239 314 L 240 317 L 242 318 L 247 319 L 254 319 L 260 317 L 262 315 L 265 309 L 265 295 L 262 289 L 255 282 L 250 280 Z',
  'M 245 286 L 252 286 L 256 288 L 258 290 L 260 294 L 260 296 L 259 298 L 256 301 L 252 303 L 244 303 L 242 301 L 242 297 L 243 288 Z',
  'M 271 281 L 270 283 L 271 291 L 270 315 L 271 317 L 278 319 L 284 319 L 291 317 L 293 315 L 296 308 L 296 296 L 293 289 L 287 283 L 284 281 L 281 280 Z',
  'M 275 286 L 283 286 L 285 287 L 290 292 L 290 298 L 287 301 L 283 303 L 275 303 L 273 301 L 273 295 Z',
  'M 331 279 L 329 279 L 327 281 L 325 284 L 323 289 L 321 291 L 318 290 L 318 288 L 316 284 L 313 281 L 311 280 L 305 280 L 301 282 L 302 284 L 302 286 L 305 291 L 305 293 L 307 296 L 308 318 L 310 319 L 313 319 L 320 317 L 321 310 L 321 299 L 323 295 L 325 293 L 326 290 L 328 288 L 331 282 Z',
  'M 338 280 L 337 281 L 336 281 L 335 304 L 338 307 L 342 308 L 348 307 L 349 305 L 349 283 L 347 281 L 345 280 Z',
  'M 336 315 L 336 317 L 338 318 L 343 319 L 346 318 L 345 315 L 341 314 L 339 314 Z',
];

/** Relaxed curved eyes (smile-arched) and mouth vectors */
const LEFT_EYE_D =
  'M 102 623 L 102 627 L 113 638 L 124 644 L 132 646 L 143 646 L 154 643 L 163 638 L 170 632 L 172 627 L 169 624 L 167 625 L 160 632 L 149 638 L 140 640 L 135 640 L 124 637 L 122 635 L 119 634 L 106 622 Z';

const RIGHT_EYE_D =
  'M 209 629 L 209 632 L 220 643 L 231 649 L 235 650 L 250 650 L 254 649 L 257 647 L 259 647 L 261 645 L 267 642 L 276 633 L 277 631 L 277 629 L 275 627 L 272 627 L 264 636 L 260 639 L 252 643 L 248 644 L 236 644 L 227 640 L 223 637 L 214 627 L 211 627 Z';

const SMILE_D =
  'M 152 695 L 152 699 L 163 710 L 174 716 L 178 717 L 193 717 L 199 715 L 211 708 L 218 701 L 220 697 L 219 695 L 215 694 L 208 702 L 197 709 L 190 711 L 180 711 L 170 707 L 166 704 L 157 694 L 154 694 Z';

/** 1. Splash — Customer app "Hi BUDDY!" character screen in Brand Lime (#CCFF00) */
export function CustomerSplashScreen() {
  const navigate = useNavigate();
  const { booting, authenticated } = useCustomerAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // If already authenticated from a previous session, navigate into home
  useEffect(() => {
    if (booting) return;
    if (authenticated) {
      navigate(customerRoutes.home, { replace: true });
    }
  }, [booting, authenticated, navigate]);

  const handleStart = () => {
    navigate(customerRoutes.login);
  };

  const handleLogin = () => {
    navigate(customerRoutes.login);
  };

  // Prevent any visual flash if user is already authenticated
  if (customerSession.isAuthenticated() || authenticated) {
    return null;
  }

  return (
    <AppShell statusLight edges={['left', 'right']}>
      <View style={styles.container}>
        {/* Full-bleed SVG illustration matching user's reference with Brand Lime */}
        <Svg
          width={width}
          height={height}
          viewBox="0 0 466 1024"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          {/* Light sage/cream background (#E9F2E8) */}
          <Rect width="466" height="1024" fill="#E9F2E8" />

          {/* Character Body (Lime #CCFF00) extending to bottom of screen */}
          <Path d={CHAR_BODY_D} fill="#CCFF00" />

          {/* "Hi BUDDY!" Playful Lettering */}
          {HI_BUDDY_PATHS.map((d, index) => (
            <Path key={`hi-buddy-${index}`} d={d} fill="#141518" />
          ))}

          {/* Face: Curved Relaxed Eyes */}
          <Path d={LEFT_EYE_D} fill="#141518" />
          <Path d={RIGHT_EYE_D} fill="#141518" />

          {/* Face: Gentle Smile */}
          <Path d={SMILE_D} fill="#141518" />
        </Svg>

        {/* Interactive Bottom CTA & Login Row on the Lime Character */}
        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Let’s start"
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={styles.startBtnText}>Let’s start</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={handleLogin}
            hitSlop={12}
            style={styles.loginRow}
          >
            <Text style={styles.loginPrompt}>
              Already using Daily Milk? <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9F2E8',
    position: 'relative',
    overflow: 'hidden',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  startBtn: {
    width: '100%',
    maxWidth: 440,
    height: 56,
    backgroundColor: '#38433B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  loginRow: {
    paddingVertical: 4,
  },
  loginPrompt: {
    fontSize: 14,
    color: '#141518',
  },
  loginLink: {
    fontWeight: '800',
    color: '#141518',
  },
});
