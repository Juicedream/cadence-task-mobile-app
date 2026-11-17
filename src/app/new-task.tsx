import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

import { Categories, type CategoryId, Fonts, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { formatClockTime, formatShortDate } from '@/utils/time';

interface StartPreset {
  id: string;
  label: string;
  sublabel: string;
  getStartDate: () => Date;
}

const START_PRESETS: StartPreset[] = [
  {
    id: 'demo-1m',
    label: 'In 1 Min',
    sublabel: 'Fast Live Test',
    getStartDate: () => new Date(Date.now() + 60 * 1000),
  },
  {
    id: 'in-16m',
    label: 'In 16 Mins',
    sublabel: 'Triggers 15m + Start',
    getStartDate: () => new Date(Date.now() + 16 * 60 * 1000),
  },
  {
    id: 'in-31m',
    label: 'In 31 Mins',
    sublabel: 'Triggers 30m + 15m + Start',
    getStartDate: () => new Date(Date.now() + 31 * 60 * 1000),
  },
  {
    id: 'in-1h',
    label: 'In 1 Hour',
    sublabel: 'Full 3-Stage Cadence',
    getStartDate: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    id: 'tonight-11pm',
    label: '11:00 PM',
    sublabel: 'Classic Evening Slot',
    getStartDate: () => {
      const d = new Date();
      d.setHours(23, 0, 0, 0);
      if (d.getTime() <= Date.now() + 60 * 1000) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    },
  },
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

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<CategoryId>('deep-work');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('in-31m');
  const [scheduledDate, setScheduledDate] = useState<Date>(
    () => new Date(Date.now() + 31 * 60 * 1000)
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectPreset = (preset: StartPreset) => {
    setSelectedPresetId(preset.id);
    setScheduledDate(preset.getStartDate());
  };

  const adjustStartMinutes = (deltaMinutes: number) => {
    setSelectedPresetId('custom');
    setScheduledDate((prev) => {
      const nextMs = Math.max(
        Date.now() + 30 * 1000,
        prev.getTime() + deltaMinutes * 60 * 1000
      );
      return new Date(nextMs);
    });
  };

  const deadlineDate = useMemo(() => {
    if (durationMinutes <= 0) return null;
    return new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);
  }, [scheduledDate, durationMinutes]);

  // Compute exact 30m, 15m, and 0m notification times for live preview
  const cadencePreview = useMemo(() => {
    const startMs = scheduledDate.getTime();
    const t30 = new Date(startMs - 30 * 60 * 1000);
    const t15 = new Date(startMs - 15 * 60 * 1000);

    return [
      {
        stage: '-30 MIN ALERT',
        time: formatClockTime(t30.toISOString()),
        willFire: t30.getTime() > nowMs + 3000,
        desc: 'Heads-up: Get ready to start task in 30 minutes',
      },
      {
        stage: '-15 MIN ALERT',
        time: formatClockTime(t15.toISOString()),
        willFire: t15.getTime() > nowMs + 3000,
        desc: 'Reminder: 15 minutes remaining until task begins',
      },
      {
        stage: 'START TIME (0M)',
        time: formatClockTime(scheduledDate.toISOString()),
        willFire: startMs > nowMs + 2000,
        desc: 'Action: Open Cadence & tap "Starting Now"',
      },
    ];
  }, [scheduledDate, nowMs]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a task title.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const newId = await addTask({
        title: title.trim(),
        notes: notes.trim(),
        category,
        scheduledStartAt: scheduledDate.toISOString(),
        deadlineAt: deadlineDate ? deadlineDate.toISOString() : null,
      });
      router.replace(`/task/${newId}`);
    } catch {
      setErrorMsg('Could not save task. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Modal Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={Palette.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Schedule Task</Text>
          <View style={styles.sqliteBadge}>
            <Ionicons name="save-outline" size={12} color={Palette.forest} />
            <Text style={styles.sqliteBadgeText}>SQLite</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Task Title & Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TASK SPECIFICATION</Text>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="What needs your undivided focus?"
              placeholderTextColor={Palette.inkFaint}
              style={styles.titleInput}
              autoFocus
            />

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional checklist, deliverables, or context..."
              placeholderTextColor={Palette.inkFaint}
              style={styles.notesInput}
              multiline
            />
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          {/* Category Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
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
                      styles.categoryChip,
                      selected && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={selected ? Palette.white : cat.color}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && { color: Palette.white },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Start Time Presets & Stepper */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>WHEN SHOULD IT START?</Text>
              <Text style={styles.dateBadge}>
                {formatShortDate(scheduledDate.toISOString())}
              </Text>
            </View>

            {/* Quick Presets */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScroll}
            >
              {START_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => selectPreset(preset)}
                    style={[
                      styles.presetCard,
                      isSelected && styles.presetCardSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetLabel,
                        isSelected && styles.presetLabelSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetSublabel,
                        isSelected && styles.presetSublabelSelected,
                      ]}
                    >
                      {preset.sublabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Fine-Tune Clock Dial */}
            <View style={styles.clockDialCard}>
              <View>
                <Text style={styles.clockDialCaption}>SCHEDULED START TIME</Text>
                <Text style={styles.clockDialTime}>
                  {formatClockTime(scheduledDate.toISOString())}
                </Text>
              </View>

              <View style={styles.stepperGroup}>
                <Pressable
                  onPress={() => adjustStartMinutes(-15)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>-15m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustStartMinutes(-5)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>-5m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustStartMinutes(5)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+5m</Text>
                </Pressable>
                <Pressable
                  onPress={() => adjustStartMinutes(15)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+15m</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Deadline Duration */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>DEADLINE WINDOW</Text>
              {deadlineDate ? (
                <Text style={styles.deadlineReadout}>
                  Deadline: {formatClockTime(deadlineDate.toISOString())}
                </Text>
              ) : (
                <Text style={styles.deadlineReadout}>Open-ended</Text>
              )}
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

          {/* Live Push Notification Schedule Preview */}
          <View style={styles.cadencePreviewCard}>
            <View style={styles.cadenceHeaderRow}>
              <Ionicons
                name="notifications"
                size={16}
                color={Palette.vermilion}
              />
              <Text style={styles.cadenceHeaderTitle}>
                AUTOMATIC PUSH NOTIFICATION TIMELINE
              </Text>
            </View>

            {cadencePreview.map((item, index) => (
              <View key={item.stage} style={styles.cadenceTimelineRow}>
                <View style={styles.cadenceTimeCol}>
                  <Text
                    style={[
                      styles.cadenceTimeText,
                      !item.willFire && styles.cadenceTimeSkipped,
                    ]}
                  >
                    {item.time}
                  </Text>
                  <Text style={styles.cadenceStageLabel}>{item.stage}</Text>
                </View>

                <View style={styles.cadenceDescCol}>
                  <Text
                    style={[
                      styles.cadenceDescText,
                      !item.willFire && styles.cadenceDescSkipped,
                    ]}
                  >
                    {item.desc}
                  </Text>
                  <Text
                    style={[
                      styles.cadenceStatusPill,
                      item.willFire
                        ? { color: Palette.forest }
                        : { color: Palette.inkFaint },
                    ]}
                  >
                    {item.willFire
                      ? '● Will schedule push notification'
                      : '○ Window already passed (skipped)'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Save Bar */}
        <View style={styles.footer}>
          <Pressable
            disabled={submitting}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.9 },
              submitting && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color={Palette.white} />
            <Text style={styles.saveBtnText}>
              {submitting ? 'Scheduling...' : 'Save Task & Arm Notifications'}
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
    backgroundColor: Palette.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.paperSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Palette.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  sqliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.forestSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sqliteBadgeText: {
    color: Palette.forest,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    gap: 22,
    paddingBottom: 36,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: Palette.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  dateBadge: {
    color: Palette.vermilion,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  titleInput: {
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Palette.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Palette.ink,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Palette.crimson,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsScroll: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  categoryChipText: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  presetsScroll: {
    gap: 9,
  },
  presetCard: {
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 125,
  },
  presetCardSelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  presetLabel: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  presetLabelSelected: {
    color: Palette.white,
  },
  presetSublabel: {
    color: Palette.inkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  presetSublabelSelected: {
    color: Palette.inkFaint,
  },
  clockDialCard: {
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  clockDialCaption: {
    color: Palette.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clockDialTime: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    backgroundColor: Palette.paperSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
  },
  stepperBtnText: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  deadlineReadout: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  durationChipActive: {
    backgroundColor: Palette.vermilionSoft,
    borderColor: Palette.vermilion,
  },
  durationChipText: {
    color: Palette.inkMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: Palette.vermilion,
    fontWeight: '700',
  },
  cadencePreviewCard: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  cadenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  cadenceHeaderTitle: {
    color: Palette.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  cadenceTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cadenceTimeCol: {
    width: 96,
  },
  cadenceTimeText: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 14,
    fontWeight: '700',
  },
  cadenceTimeSkipped: {
    textDecorationLine: 'line-through',
    color: Palette.inkFaint,
  },
  cadenceStageLabel: {
    color: Palette.vermilion,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cadenceDescCol: {
    flex: 1,
  },
  cadenceDescText: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  cadenceDescSkipped: {
    color: Palette.inkFaint,
  },
  cadenceStatusPill: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: Palette.paper,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.vermilion,
    paddingVertical: 15,
    borderRadius: 15,
  },
  saveBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
