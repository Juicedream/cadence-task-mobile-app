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

import { Fonts, TodoistColors } from '@/constants/theme';
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
    id: 'todoist-ui',
    tag: '01 · TODOIST WORKFLOW',
    title: 'Organize Today, Tomorrow & Upcoming.',
    subtitle:
      'Plan tasks for Today, Tomorrow, Next Tomorrow, or any future date with P1–P4 priority circles, #Projects, and clean daily checklists.',
    imageUri:
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=85',
    caption: 'Today · Tomorrow · Next Tomorrow · 14-Day Calendar',
    highlights: [
      { icon: 'checkmark-circle-outline', text: 'Color-coded P1 (Red), P2 (Orange), P3 (Blue) priorities' },
      { icon: 'calendar-outline', text: 'Schedule for Today, Tomorrow, or any day ahead' },
      { icon: 'list-outline', text: 'Review what you completed today vs. what is due tomorrow' },
    ],
  },
  {
    id: 'cadence',
    tag: '02 · 3-STAGE PUSH ALERTS',
    title: '30m, 15m & Start-Time Notifications.',
    subtitle:
      'Have a task at 11:00 PM? Your phone alerts you at 10:30 PM (30m), 10:45 PM (15m), and 11:00 PM ("Start your task now").',
    imageUri:
      'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=85',
    caption: '30m Heads-Up · 15m Reminder · 0m Start Trigger',
    highlights: [
      { icon: 'notifications-outline', text: '30 minutes before: "Get ready to start task"' },
      { icon: 'time-outline', text: '15 minutes before: "15 minutes remaining"' },
      { icon: 'flash-outline', text: 'At start time: "Open app & tap Starting Now"' },
    ],
  },
  {
    id: 'tracker-sqlite',
    tag: '03 · LIVE TRACKER & LOCAL SQLITE',
    title: 'Real-time tracker stored on your phone.',
    subtitle:
      'Tap "Start Now" to track live elapsed time against your deadline. Every task and activity record is saved locally in SQLite on your device.',
    imageUri:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=85',
    caption: 'On-Device SQLite · Zero Cloud Needed',
    highlights: [
      { icon: 'stopwatch-outline', text: 'Live stopwatch + deadline countdown bar' },
      { icon: 'hardware-chip-outline', text: '100% local SQLite storage on your phone' },
      { icon: 'stats-chart-outline', text: 'Complete Activity Log of everything done today' },
    ],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding, userName } = useTasks();
  const [activeIndex, setActiveIndex] = useState(0);
  const [nameInput, setNameInput] = useState(
    userName && userName !== 'Alex' ? userName : ''
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

    await completeOnboarding(nameInput.trim() || 'Alex');
    router.replace('/');
  };

  const handleSkip = async () => {
    await completeOnboarding(nameInput.trim() || 'Alex');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconCircle}>
              <Ionicons
                name="checkmark-done"
                size={15}
                color={TodoistColors.white}
              />
            </View>
            <Text style={styles.brandName}>Todoist Cadence</Text>
          </View>

          {!isLastSlide ? (
            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.localPill}>
              <Ionicons
                name="lock-closed"
                size={11}
                color={TodoistColors.dateToday}
              />
              <Text style={styles.localPillText}>On-Device SQLite</Text>
            </View>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            setActiveIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
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

              <View style={styles.copyContainer}>
                <Text style={styles.tag}>{item.tag}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>

                <View style={styles.highlightsBox}>
                  {item.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <View style={styles.highlightIconWrap}>
                        <Ionicons
                          name={h.icon}
                          size={15}
                          color={TodoistColors.red}
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

        <View style={styles.bottomArea}>
          {isLastSlide ? (
            <View style={styles.nameBox}>
              <Text style={styles.nameLabel}>YOUR NAME (OPTIONAL)</Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g., Alex"
                placeholderTextColor={TodoistColors.textFaint}
                style={styles.nameInput}
                returnKeyType="done"
              />
            </View>
          ) : null}

          <View style={styles.footerBar}>
            <View style={styles.dotsRow}>
              {SLIDES.map((s, idx) => (
                <View
                  key={s.id}
                  style={[styles.dot, idx === activeIndex && styles.dotActive]}
                />
              ))}
            </View>

            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {isLastSlide ? 'Get Started' : 'Continue'}
              </Text>
              <Ionicons
                name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color={TodoistColors.white}
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
    backgroundColor: TodoistColors.bg,
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
  brandIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: TodoistColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: TodoistColors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skipText: {
    color: TodoistColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  localPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TodoistColors.dateTodayBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  localPillText: {
    color: TodoistColors.dateToday,
    fontSize: 11,
    fontWeight: '700',
  },
  slide: {
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  imageCard: {
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: TodoistColors.trackerBg,
    borderWidth: 1,
    borderColor: TodoistColors.border,
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
    backgroundColor: 'rgba(32, 32, 32, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  imageCaptionText: {
    color: TodoistColors.white,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  copyContainer: {
    flex: 1,
    paddingTop: 16,
  },
  tag: {
    color: TodoistColors.red,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: {
    color: TodoistColors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    color: TodoistColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  highlightsBox: {
    marginTop: 14,
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: TodoistColors.border,
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
    backgroundColor: TodoistColors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
    color: TodoistColors.text,
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
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: TodoistColors.border,
  },
  nameLabel: {
    color: TodoistColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  nameInput: {
    color: TodoistColors.text,
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
    backgroundColor: TodoistColors.borderStrong,
  },
  dotActive: {
    width: 24,
    backgroundColor: TodoistColors.red,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TodoistColors.red,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: TodoistColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
