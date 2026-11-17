import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Categories,
  type CategoryId,
  Fonts,
  Priorities,
  type PriorityLevel,
  TodoistColors,
} from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import {
  formatClockTime,
  formatShortDate,
  getStartOfDay,
} from '@/utils/time';

interface DayPreset {
  id: string;
  label: string;
  sublabel: string;
  dayOffset: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const DAY_PRESETS: DayPreset[] = [
  {
    id: 'today',
    label: 'Today',
    sublabel: 'Current day',
    dayOffset: 0,
    icon: 'today-outline',
    color: TodoistColors.dateToday,
    bg: TodoistColors.dateTodayBg,
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    sublabel: '+1 day',
    dayOffset: 1,
    icon: 'sunny-outline',
    color: TodoistColors.dateTomorrow,
    bg: TodoistColors.dateTomorrowBg,
  },
  {
    id: 'next-tomorrow',
    label: 'Next Tomorrow',
    sublabel: '+2 days',
    dayOffset: 2,
    icon: 'calendar-outline',
    color: TodoistColors.dateUpcoming,
    bg: TodoistColors.dateUpcomingBg,
  },
  {
    id: 'in-3-days',
    label: 'In 3 Days',
    sublabel: '+3 days',
    dayOffset: 3,
    icon: 'calendar-clear-outline',
    color: TodoistColors.p3,
    bg: TodoistColors.p3Bg,
  },
  {
    id: 'next-week',
    label: 'Next Week',
    sublabel: '+7 days',
    dayOffset: 7,
    icon: 'arrow-forward-circle-outline',
    color: TodoistColors.textSecondary,
    bg: TodoistColors.bgTertiary,
  },
];

const TIME_SLOTS = [
  { id: 'in-1m', label: 'In 1m (Test)', minutesFromNow: 1 },
  { id: 'in-16m', label: 'In 16m', minutesFromNow: 16 },
  { id: 'in-31m', label: 'In 31m', minutesFromNow: 31 },
  { id: '9am', label: '9:00 AM', hour: 9, minute: 0 },
  { id: '12pm', label: '12:00 PM', hour: 12, minute: 0 },
  { id: '3pm', label: '3:00 PM', hour: 15, minute: 0 },
  { id: '6pm', label: '6:00 PM', hour: 18, minute: 0 },
  { id: '11pm', label: '11:00 PM', hour: 23, minute: 0 },
];

const DURATION_OPTIONS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '90m', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: 'No Deadline', minutes: 0 },
];

export default function NewTaskScreen() {
  const { addTask, nowMs } = useTasks();
  const params = useLocalSearchParams<{
    preset?: string;
    dayOffset?: string;
  }>();

  const initialDayOffset = useMemo(() => {
    if (params.dayOffset !== undefined) {
      const parsed = Number(params.dayOffset);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (params.preset === 'tomorrow') return 1;
    if (params.preset === 'next-tomorrow') return 2;
    return 0;
  }, [params.dayOffset, params.preset]);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<CategoryId>('inbox');
  const [priority, setPriority] = useState<PriorityLevel>(4);
  const [dayOffset, setDayOffset] = useState<number>(initialDayOffset);

  // Clock time state (default to +31 mins if Today, or 10:00 AM if future day)
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    if (initialDayOffset === 0) {
      return new Date(Date.now() + 31 * 60 * 1000);
    }
    const d = getStartOfDay(new Date());
    d.setDate(d.getDate() + initialDayOffset);
    d.setHours(10, 0, 0, 0);
    return d;
  });

  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply a Day Offset while preserving the chosen hour/minute
  const handleSelectDayOffset = (newOffset: number) => {
    const safeOffset = Math.max(0, newOffset);
    setDayOffset(safeOffset);
    setScheduledDate((prev) => {
      const base = getStartOfDay(new Date(nowMs));
      base.setDate(base.getDate() + safeOffset);
      base.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      // If user picked Today and the hour was in the past, bump to +31 mins from now
      if (safeOffset === 0 && base.getTime() <= nowMs + 60 * 1000) {
        return new Date(nowMs + 31 * 60 * 1000);
      }
      return base;
    });
  };

  const handleSelectTimeSlot = (slot: (typeof TIME_SLOTS)[number]) => {
    if ('minutesFromNow' in slot && slot.minutesFromNow !== undefined) {
      setDayOffset(0);
      setScheduledDate(new Date(nowMs + slot.minutesFromNow * 60 * 1000));
      return;
    }
    setScheduledDate(() => {
      const base = getStartOfDay(new Date(nowMs));
      base.setDate(base.getDate() + dayOffset);
      base.setHours(slot.hour ?? 9, slot.minute ?? 0, 0, 0);
      if (dayOffset === 0 && base.getTime() <= nowMs + 60 * 1000) {
        // Automatically schedule for tomorrow if that clock time already passed today
        base.setDate(base.getDate() + 1);
        setDayOffset(1);
      }
      return base;
    });
  };

  const adjustClockMinutes = (deltaMinutes: number) => {
    setScheduledDate((prev) => {
      const nextMs = Math.max(
        nowMs + 30 * 1000,
        prev.getTime() + deltaMinutes * 60 * 1000
      );
      const nextDate = new Date(nextMs);
      const todayStart = getStartOfDay(new Date(nowMs));
      const nextStart = getStartOfDay(nextDate);
      const computedOffset = Math.round(
        (nextStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      setDayOffset(Math.max(0, computedOffset));
      return nextDate;
    });
  };

  const deadlineDate = useMemo(() => {
    if (durationMinutes <= 0) return null;
    return new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);
  }, [scheduledDate, durationMinutes]);

  const cadencePreview = useMemo(() => {
    const startMs = scheduledDate.getTime();
    const t30 = new Date(startMs - 30 * 60 * 1000);
    const t15 = new Date(startMs - 15 * 60 * 1000);

    return [
      {
        stage: '-30m Alert',
        time: formatClockTime(t30.toISOString()),
        willFire: t30.getTime() > nowMs + 3000,
        desc: 'Get ready: Task starts in 30 mins',
      },
      {
        stage: '-15m Alert',
        time: formatClockTime(t15.toISOString()),
        willFire: t15.getTime() > nowMs + 3000,
        desc: 'Reminder: 15 mins left before start',
      },
      {
        stage: 'Start (0m)',
        time: formatClockTime(scheduledDate.toISOString()),
        willFire: startMs > nowMs + 2000,
        desc: 'Start your task now! Tap "Start Now"',
      },
    ];
  }, [scheduledDate, nowMs]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a task name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const newId = await addTask({
        title: title.trim(),
        notes: notes.trim(),
        category,
        priority,
        scheduledStartAt: scheduledDate.toISOString(),
        deadlineAt: deadlineDate ? deadlineDate.toISOString() : null,
      });
      router.replace(`/task/${newId}`);
    } catch {
      setErrorMsg('Could not save task. Please try again.');
      setSubmitting(false);
    }
  };

  const selectedDateLabel = formatShortDate(scheduledDate.toISOString(), nowMs);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Todoist Quick-Add Top Bar */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Add Task</Text>

          <Pressable
            disabled={submitting}
            onPress={handleSave}
            style={[
              styles.sendCircleBtn,
              !title.trim() && { opacity: 0.45 },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color={TodoistColors.white} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Todoist Task Name & Description Box */}
          <View style={styles.editorBox}>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g., File quarterly taxes tomorrow at 10am"
              placeholderTextColor={TodoistColors.textFaint}
              style={styles.titleInput}
              autoFocus
            />

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Description"
              placeholderTextColor={TodoistColors.textMuted}
              style={styles.notesInput}
              multiline
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          {/* Todoist Interactive Metadata Summary Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryPillsRow}
          >
            <View
              style={[
                styles.activeSummaryChip,
                {
                  borderColor:
                    dayOffset === 0
                      ? TodoistColors.dateToday
                      : dayOffset === 1
                      ? TodoistColors.dateTomorrow
                      : TodoistColors.dateUpcoming,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={
                  dayOffset === 0
                    ? TodoistColors.dateToday
                    : dayOffset === 1
                    ? TodoistColors.dateTomorrow
                    : TodoistColors.dateUpcoming
                }
              />
              <Text
                style={[
                  styles.activeSummaryChipText,
                  {
                    color:
                      dayOffset === 0
                        ? TodoistColors.dateToday
                        : dayOffset === 1
                        ? TodoistColors.dateTomorrow
                        : TodoistColors.dateUpcoming,
                  },
                ]}
              >
                {selectedDateLabel} · {formatClockTime(scheduledDate.toISOString())}
              </Text>
            </View>

            <View style={styles.activeSummaryChip}>
              <Ionicons
                name="flag"
                size={13}
                color={
                  Priorities.find((p) => p.level === priority)?.color ??
                  TodoistColors.p4
                }
              />
              <Text style={styles.activeSummaryChipText}>P{priority}</Text>
            </View>

            <View style={styles.activeSummaryChip}>
              <Text style={styles.hashSymbol}>#</Text>
              <Text style={styles.activeSummaryChipText}>
                {Categories.find((c) => c.id === category)?.label}
              </Text>
            </View>

            <View style={styles.activeSummaryChip}>
              <Ionicons
                name="notifications-outline"
                size={13}
                color={TodoistColors.red}
              />
              <Text style={styles.activeSummaryChipText}>30m · 15m · 0m</Text>
            </View>
          </ScrollView>

          {/* 1. Schedule Day Selector (Today, Tomorrow, Next Tomorrow, or Custom Day) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>
                WHEN DO YOU WANT TO DO THIS?
              </Text>
              <View style={styles.customDayStepper}>
                <Pressable
                  onPress={() => handleSelectDayOffset(dayOffset - 1)}
                  style={styles.miniDayBtn}
                >
                  <Text style={styles.miniDayBtnText}>-1 Day</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelectDayOffset(dayOffset + 1)}
                  style={styles.miniDayBtn}
                >
                  <Text style={styles.miniDayBtnText}>+1 Day</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {DAY_PRESETS.map((preset) => {
                const isSelected = dayOffset === preset.dayOffset;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => handleSelectDayOffset(preset.dayOffset)}
                    style={[
                      styles.dayPresetCard,
                      isSelected && {
                        borderColor: preset.color,
                        backgroundColor: preset.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={preset.icon}
                      size={16}
                      color={preset.color}
                    />
                    <View>
                      <Text
                        style={[
                          styles.dayPresetTitle,
                          isSelected && { color: preset.color, fontWeight: '800' },
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <Text style={styles.dayPresetSub}>{preset.sublabel}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. Start Time & Fine-Tune Stepper */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>START TIME</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {TIME_SLOTS.map((slot) => (
                <Pressable
                  key={slot.id}
                  onPress={() => handleSelectTimeSlot(slot)}
                  style={styles.timeSlotChip}
                >
                  <Text style={styles.timeSlotText}>{slot.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.clockCard}>
              <View>
                <Text style={styles.clockDateSub}>
                  {selectedDateLabel.toUpperCase()}
                </Text>
                <Text style={styles.clockBigDigits}>
                  {formatClockTime(scheduledDate.toISOString())}
                </Text>
              </View>

              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustClockMinutes(-15)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>-15m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustClockMinutes(-5)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>-5m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustClockMinutes(5)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+5m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustClockMinutes(15)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+15m</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 3. Todoist Priority Flags (P1 - P4) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIORITY LEVEL</Text>
            <View style={styles.priorityRow}>
              {Priorities.map((p) => {
                const active = priority === p.level;
                return (
                  <Pressable
                    key={p.level}
                    onPress={() => setPriority(p.level)}
                    style={[
                      styles.priorityChip,
                      active && {
                        borderColor: p.color,
                        backgroundColor:
                          p.level === 4 ? TodoistColors.bgTertiary : p.fill,
                      },
                    ]}
                  >
                    <Ionicons name="flag" size={14} color={p.color} />
                    <Text
                      style={[
                        styles.priorityChipText,
                        active && { color: TodoistColors.text, fontWeight: '800' },
                      ]}
                    >
                      {p.short} · {p.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Project / Category (#Project) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROJECT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {Categories.map((cat) => {
                const selected = cat.id === category;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.projectChip,
                      selected && {
                        borderColor: cat.color,
                        backgroundColor: cat.bg,
                      },
                    ]}
                  >
                    <Text style={[styles.projectHash, { color: cat.color }]}>
                      #
                    </Text>
                    <Text
                      style={[
                        styles.projectChipText,
                        selected && { color: cat.color, fontWeight: '700' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 5. Deadline Duration */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>DEADLINE</Text>
              <Text style={styles.deadlineReadout}>
                {deadlineDate
                  ? `Due ${formatClockTime(deadlineDate.toISOString())}`
                  : 'No deadline'}
              </Text>
            </View>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((opt) => {
                const active = durationMinutes === opt.minutes;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setDurationMinutes(opt.minutes)}
                    style={[
                      styles.durationChip,
                      active && styles.durationChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        active && styles.durationChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 6. Automatic 30m · 15m · Start Push Notification Schedule */}
          <View style={styles.pushCard}>
            <View style={styles.pushHeader}>
              <Ionicons
                name="notifications"
                size={15}
                color={TodoistColors.red}
              />
              <Text style={styles.pushHeaderTitle}>
                PUSH NOTIFICATIONS FOR {selectedDateLabel.toUpperCase()}
              </Text>
            </View>

            {cadencePreview.map((item) => (
              <View key={item.stage} style={styles.pushRow}>
                <View style={styles.pushTimeBadge}>
                  <Text
                    style={[
                      styles.pushTimeText,
                      !item.willFire && styles.pushSkippedText,
                    ]}
                  >
                    {item.time}
                  </Text>
                  <Text style={styles.pushStageText}>{item.stage}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.pushDescText,
                      !item.willFire && styles.pushSkippedText,
                    ]}
                  >
                    {item.desc}
                  </Text>
                  <Text
                    style={[
                      styles.pushStateText,
                      {
                        color: item.willFire
                          ? TodoistColors.dateToday
                          : TodoistColors.textMuted,
                      },
                    ]}
                  >
                    {item.willFire
                      ? '● Armed on phone'
                      : '○ Window already passed'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <Pressable
            disabled={submitting}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={19}
              color={TodoistColors.white}
            />
            <Text style={styles.saveBtnText}>
              {submitting
                ? 'Saving to device...'
                : `Schedule for ${selectedDateLabel} at ${formatClockTime(
                    scheduledDate.toISOString()
                  )}`}
            </Text>
          </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  cancelBtn: {
    paddingVertical: 4,
  },
  cancelText: {
    color: TodoistColors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    color: TodoistColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sendCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TodoistColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 18,
    gap: 18,
    paddingBottom: 32,
  },
  editorBox: {
    gap: 6,
  },
  titleInput: {
    color: TodoistColors.text,
    fontSize: 19,
    fontWeight: '600',
    paddingVertical: 4,
  },
  notesInput: {
    color: TodoistColors.textSecondary,
    fontSize: 14,
    minHeight: 42,
    textAlignVertical: 'top',
  },
  errorText: {
    color: TodoistColors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryPillsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  activeSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    backgroundColor: TodoistColors.bgSecondary,
  },
  activeSummaryChipText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  hashSymbol: {
    color: TodoistColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    gap: 9,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: TodoistColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  customDayStepper: {
    flexDirection: 'row',
    gap: 6,
  },
  miniDayBtn: {
    backgroundColor: TodoistColors.bgTertiary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniDayBtnText: {
    color: TodoistColors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  chipsScroll: {
    gap: 8,
  },
  dayPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    backgroundColor: TodoistColors.bg,
  },
  dayPresetTitle: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dayPresetSub: {
    color: TodoistColors.textMuted,
    fontSize: 10,
  },
  timeSlotChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: TodoistColors.bgSecondary,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
  },
  timeSlotText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  clockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: TodoistColors.border,
  },
  clockDateSub: {
    color: TodoistColors.red,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  clockBigDigits: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepperBtn: {
    backgroundColor: TodoistColors.bg,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  stepperBtnText: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    backgroundColor: TodoistColors.bg,
  },
  priorityChipText: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    backgroundColor: TodoistColors.bg,
  },
  projectHash: {
    fontSize: 13,
    fontWeight: '800',
  },
  projectChipText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  deadlineReadout: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  durationChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    backgroundColor: TodoistColors.bg,
  },
  durationChipActive: {
    borderColor: TodoistColors.red,
    backgroundColor: TodoistColors.redSoft,
  },
  durationChipText: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: TodoistColors.red,
    fontWeight: '700',
  },
  pushCard: {
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: TodoistColors.border,
    gap: 10,
  },
  pushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.borderStrong,
  },
  pushHeaderTitle: {
    color: TodoistColors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pushTimeBadge: {
    width: 84,
  },
  pushTimeText: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  pushStageText: {
    color: TodoistColors.red,
    fontSize: 9,
    fontWeight: '700',
  },
  pushDescText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pushSkippedText: {
    textDecorationLine: 'line-through',
    color: TodoistColors.textMuted,
  },
  pushStateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TodoistColors.border,
    backgroundColor: TodoistColors.bg,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: TodoistColors.red,
    paddingVertical: 14,
    borderRadius: 11,
  },
  saveBtnText: {
    color: TodoistColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
