import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';

export function InAppAlertBanner() {
  const { inAppBanner, dismissInAppBanner, startTaskNow } = useTasks();
  const insets = useSafeAreaInsets();

  if (!inAppBanner) return null;

  const isStartNow = inAppBanner.stage === 'start';

  return (
    <View style={[styles.wrapper, { top: Math.max(insets.top + 8, 16) }]}>
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isStartNow ? 'flash' : 'notifications'}
            size={18}
            color={Palette.white}
          />
        </View>

        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            const targetId = inAppBanner.taskId;
            dismissInAppBanner();
            if (targetId) {
              router.push(`/task/${targetId}`);
            }
          }}
        >
          <Text style={styles.title} numberOfLines={1}>
            {inAppBanner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {inAppBanner.body}
          </Text>
        </Pressable>

        {inAppBanner.taskId && isStartNow ? (
          <Pressable
            onPress={() => {
              const id = inAppBanner.taskId!;
              dismissInAppBanner();
              startTaskNow(id);
              router.push(`/task/${id}`);
            }}
            style={styles.actionBtn}
          >
            <Text style={styles.actionBtnText}>Start Now</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={dismissInAppBanner}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={Palette.inkFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.ink,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#36342E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Palette.paper,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    color: Palette.inkFaint,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    backgroundColor: Palette.vermilion,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  actionBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
});
