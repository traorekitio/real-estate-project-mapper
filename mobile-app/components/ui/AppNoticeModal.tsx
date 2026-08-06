import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors } from "@/constants/colors";

export type NoticeType = "success" | "error" | "warning" | "info";

export type NoticeAction = {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  onPress?: () => void;
};

type AppNoticeModalProps = {
  visible: boolean;
  type?: NoticeType;
  title: string;
  message: string;
  primaryAction: NoticeAction;
  secondaryAction?: NoticeAction;
  onDismiss: () => void;
};

const typeTheme: Record<NoticeType, { icon: string; color: string; bg: string }> = {
  success: { icon: "✓", color: "#0B8F66", bg: "#E7F8F1" },
  error: { icon: "!", color: "#C0392B", bg: "#FDEDEC" },
  warning: { icon: "!", color: "#A56500", bg: "#FFF5E6" },
  info: { icon: "i", color: AppColors.primary.main, bg: "#EAF5F8" },
};

export default function AppNoticeModal({
  visible,
  type = "info",
  title,
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
}: AppNoticeModalProps) {
  const theme = typeTheme[type];

  const handleAction = (action?: NoticeAction) => {
    onDismiss();
    if (action?.onPress) {
      action.onPress();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
            <Text style={[styles.icon, { color: theme.color }]}>{theme.icon}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            {secondaryAction ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => handleAction(secondaryAction)}
              >
                <Text style={styles.buttonSecondaryText}>{secondaryAction.label}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                primaryAction.variant === "danger" ? styles.buttonDanger : styles.buttonPrimary,
              ]}
              onPress={() => handleAction(primaryAction)}
            >
              <Text style={styles.buttonPrimaryText}>{primaryAction.label}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14, 33, 44, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: AppColors.ui.background,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  icon: {
    fontSize: 20,
    fontWeight: "700",
  },
  title: {
    color: AppColors.primary.main,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 8,
    fontFamily: "Century Gothic",
  },
  message: {
    color: AppColors.ui.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: "Century Gothic",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    minWidth: 96,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: AppColors.primary.main,
  },
  buttonDanger: {
    backgroundColor: "#D83A3A",
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    backgroundColor: AppColors.ui.background,
  },
  buttonPrimaryText: {
    color: AppColors.ui.background,
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Century Gothic",
  },
  buttonSecondaryText: {
    color: AppColors.ui.text,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Century Gothic",
  },
});
