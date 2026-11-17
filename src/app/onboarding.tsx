import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Fonts, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  imageUri: string;
  caption: string;
  highlights: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
}

const SLIDES: SlideItem[] = [
  {
    id: 'cadence',
    tag: '01 · ANTICIPATORY CADENCE',
    title: 'Never miss the moment work begins.',
    subtitle:
      'Set your start time—say 11:00 PM—and Cadence automatically dispatches push notifications 30 minutes prior, 15 minutes prior, and right on the dot.',
    imageUri:
      'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=85',
    caption: '30m Heads-Up · 15m Prep · 0m Action Trigger',
    highlights: [
      { icon: 'notifications-outline', text: '10:30 PM — "Get ready to start in 30 mins"' },
      { icon: 'time-outline', text: '10:45 PM — "15 minutes left before start"' },
      { icon: 'flash-outline', text: '11:00 PM — "Start your task now"' },
    ],
  },
  {
    id: 'tracking',
    tag: '02 · LIVE CHRONOMETER',
    title: 'Tap "Starting Now" and own the clock.',
    subtitle:
      'When your start notification arrives, jump into Cadence with a single tap. Track real-time elapsed effort alongside your live deadline countdown.',
    imageUri:
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=85',
    caption: 'Real-time precision · Pause, Resume & Complete',
    highlights: [
      { icon: 'play-circle-outline', text: 'One-tap transition from Scheduled to Live' },
      { icon: 'stopwatch-outline', text: 'Second-by-second tabular chronometer' },
      { icon: 'flag-outline', text: 'Live countdown against your target deadline' },
    ],
  },
  {
    id: 'sqlite',
    tag: '03 · 100% ON-DEVICE SQLITE',
    title: 'Stored on your phone. Private by design.',
    subtitle:
      'Every task, timestamp, and completed work log is persisted directly in a local SQLite database on your device—instant, offline, and cloud-ready later.',
    imageUri:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=85',
    caption: 'Local SQLite Engine · Zero cloud latency',
    highlights: [
      { icon: 'hardware-chip-outline', text: 'Embedded SQLite database on your phone' },
      { icon: 'shield-checkmark-outline', text: 'No external servers or account required' },
      { icon: 'layers-outline', text: 'Clean schema ready for future phone-switch sync' },
    ],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding, userName } = useTasks();
  const [activeIndex, setActiveIndex] = useState(0);
  const [nameInput, setNameInput] = useState(
    userName && userName !== 'Operator' ? userName : ''
  );
  const listRef = useRef<FlatList<SlideItem>>(null);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const handleNext = async () => {
    if (!isLastSlide) {
      const nextIdx = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setActiveIndex(nextIdx);
      return;
    }

    await completeOnboarding(nameInput.trim() || 'Operator');
    router.replace('/');
  };

  const handleSkip = async () => {
    await completeOnboarding(nameInput.trim() || 'Operator');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark} />
            <Text style={styles.brandName}>{Brand.name}</Text>
          </View>

          {!isLastSlide ? (
            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={styles.skipText}>Skip Intro</Text>
            </Pressable>
          ) : (
            <View style={styles.localPill}>
              <Ionicons name="lock-closed" size={11} color={Palette.forest} />
              <Text style={styles.localPillText}>SQLite Local</Text>
            </View>
          )}
        </View>

        {/* Slides Carousel */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              {/* Editorial Photograph Card */}
              <View style={styles.imageCard}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.imageCaptionStrip}>
                  <Text style={styles.imageCaptionText}>{item.caption}</Text>
                </View>
              </View>

              {/* Copy Section */}
              <View style={styles.copyContainer}>
                <Text style={styles.tag}>{item.tag}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>

                {/* Feature Breakdown List */}
                <View style={styles.highlightsBox}>
                  {item.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <View style={styles.highlightIconWrap}>
                        <Ionicons
                          name={h.icon}
                          size={15}
                          color={Palette.vermilion}
                        />
                      </View>
                      <Text style={styles.highlightText}>{h.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        />

        {/* Bottom Controls + Optional Name Input on Final Slide */}
        <View style={styles.bottomArea}>
          {isLastSlide ? (
            <View style={styles.nameBox}>
              <Text style={styles.nameLabel}>YOUR FIRST NAME (OPTIONAL)</Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g., Alex"
                placeholderTextColor={Palette.inkFaint}
                style={styles.nameInput}
                returnKeyType="done"
              />
            </View>
          ) : null}

          <View style={styles.footerBar}>
            {/* Step Indicators */}
            <View style={styles.dotsRow}>
              {SLIDES.map((s, idx) => (
                <View
                  key={s.id}
                  style={[
                    styles.dot,
                    idx === activeIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            {/* Primary CTA */}
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {isLastSlide ? 'Enable Alerts & Start' : 'Continue'}
              </Text>
              <Ionicons
                name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color={Palette.white}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Palette.vermilion,
  },
  brandName: {
    color: Palette.ink,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skipText: {
    color: Palette.inkMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  localPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.forestSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  localPillText: {
    color: Palette.forest,
    fontSize: 11,
    fontWeight: '700',
  },
  slide: {
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  imageCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Palette.ink,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCaptionStrip: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(22, 22, 20, 0.84)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  imageCaptionText: {
    color: Palette.paper,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  copyContainer: {
    flex: 1,
    paddingTop: 18,
  },
  tag: {
    color: Palette.vermilion,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: Palette.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  subtitle: {
    color: Palette.inkMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  highlightsBox: {
    marginTop: 16,
    backgroundColor: Palette.paperElevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 9,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Palette.vermilionSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomArea: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 12,
  },
  nameBox: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  nameLabel: {
    color: Palette.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nameInput: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 2,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Palette.vermilion,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.ink,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
