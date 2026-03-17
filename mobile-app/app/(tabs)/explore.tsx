// mobile-app/app/(tabs)/explore.tsx
import React, { useState } from "react";
import { View, Button, StyleSheet, Modal, TouchableOpacity, Text, Pressable, ScrollView, TextInput } from "react-native";
import MapScreen from "@/components/ui/MapView";
import { useRouter } from "expo-router";
import { AppColors } from "@/constants/colors";

export default function TabTwoScreen() {
  const router = useRouter();
  const [mapType, setMapType] = useState<"standard" | "satellite" | "hybrid" | "terrain">("standard");
  const [showMapTypeModal, setShowMapTypeModal] = useState(false);
  
  // States pour la personnalisation des marqueurs
  const [showMarkerSettings, setShowMarkerSettings] = useState(false);
  const [markerSize, setMarkerSize] = useState(36);
  const [markerColor, setMarkerColor] = useState("#31849B");
  const [markerBorderColor, setMarkerBorderColor] = useState("#7F7F7F");
  const [markerTextSize, setMarkerTextSize] = useState(16);
  const [customColor, setCustomColor] = useState("");
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [customBorderColor, setCustomBorderColor] = useState("");
  const [showCustomBorderColorInput, setShowCustomBorderColorInput] = useState(false);

  const colorOptions = [
    "#31849B", // Teal
    "#43a5aa", // Light teal
    "#FF0066", // Pink
    "#008995", // Dark teal
    "#63babe", // Mint
    "#7F7F7F", // Gray
    "#000000", // Black
    "#FF6B35", // Orange
  ];

  const borderColorOptions = [
    "#7F7F7F", // Gray
    "#31849B", // Teal
    "#FF0066", // Pink
    "#FFFFFF", // White
    "#000000", // Black
    "#43a5aa", // Light teal
  ];

  const handleAddCustomColor = (color: string) => {
    if (color && color.match(/^#[0-9A-F]{6}$/i)) {
      setMarkerColor(color);
      setCustomColor("");
      setShowCustomColorInput(false);
    }
  };

  const handleAddCustomBorderColor = (color: string) => {
    if (color && color.match(/^#[0-9A-F]{6}$/i)) {
      setMarkerBorderColor(color);
      setCustomColor("");
      setShowCustomColorInput(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Carte */}
      <MapScreen 
        mapType={mapType}
        markerSize={markerSize}
        markerColor={markerColor}
        markerBorderColor={markerBorderColor}
        markerTextSize={markerTextSize}
      />

      {/* Bouton Map Type en haut à droite */}
      <View style={styles.mapTypeButtonContainer}>
        <TouchableOpacity
          style={styles.mapTypeIconButton}
          onPress={() => setShowMapTypeModal(true)}
        >
          <Text style={styles.mapTypeIcon}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* Bouton Paramètres des marqueurs (visible seulement en mode satellite) */}
      {(mapType === "satellite" || mapType === "hybrid") && (
        <View style={styles.settingsButtonContainer}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowMarkerSettings(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal pour choisir le type de carte */}
      <Modal visible={showMapTypeModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMapTypeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Type de carte</Text>

            <TouchableOpacity
              style={[
                styles.mapTypeOption,
                mapType === "standard" && styles.mapTypeOptionActive,
              ]}
              onPress={() => {
                setMapType("standard");
                setShowMapTypeModal(false);
              }}
            >
              <Text style={styles.mapTypeOptionIcon}>🗺️</Text>
              <Text
                style={[
                  styles.mapTypeOptionText,
                  mapType === "standard" && styles.mapTypeOptionTextActive,
                ]}
              >
                Standard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapTypeOption,
                mapType === "satellite" && styles.mapTypeOptionActive,
              ]}
              onPress={() => {
                setMapType("satellite");
                setShowMapTypeModal(false);
              }}
            >
              <Text style={styles.mapTypeOptionIcon}>🛰️</Text>
              <Text
                style={[
                  styles.mapTypeOptionText,
                  mapType === "satellite" && styles.mapTypeOptionTextActive,
                ]}
              >
                Satellite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapTypeOption,
                mapType === "hybrid" && styles.mapTypeOptionActive,
              ]}
              onPress={() => {
                setMapType("hybrid");
                setShowMapTypeModal(false);
              }}
            >
              <Text style={styles.mapTypeOptionIcon}>🛰️</Text>
              <Text
                style={[
                  styles.mapTypeOptionText,
                  mapType === "hybrid" && styles.mapTypeOptionTextActive,
                ]}
              >
                Satellite + Étiquettes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapTypeOption,
                mapType === "terrain" && styles.mapTypeOptionActive,
              ]}
              onPress={() => {
                setMapType("terrain");
                setShowMapTypeModal(false);
              }}
            >
              <Text style={styles.mapTypeOptionIcon}>⛰️</Text>
              <Text
                style={[
                  styles.mapTypeOptionText,
                  mapType === "terrain" && styles.mapTypeOptionTextActive,
                ]}
              >
                Relief
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Paramètres des marqueurs */}
      <Modal visible={showMarkerSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDismissArea} />
          <ScrollView 
            style={styles.settingsModalContent} 
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.settingsContentWrapper}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsModalTitle}>Personnaliser les marqueurs</Text>
                <TouchableOpacity onPress={() => setShowMarkerSettings(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

            {/* Taille du cercle */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Taille du cercle</Text>
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.decreaseButton}
                  onPress={() => setMarkerSize(Math.max(20, markerSize - 2))}
                >
                  <Text style={styles.buttonText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.sizeInput}
                  value={markerSize.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 36;
                    setMarkerSize(Math.max(20, Math.min(80, num)));
                  }}
                  keyboardType="number-pad"
                  placeholder="36"
                />
                <TouchableOpacity
                  style={styles.increaseButton}
                  onPress={() => setMarkerSize(Math.min(80, markerSize + 2))}
                >
                  <Text style={styles.buttonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>Entre 20 et 80 px</Text>
            </View>

            {/* Taille de la police du texte */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Taille du texte</Text>
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.decreaseButton}
                  onPress={() => setMarkerTextSize(Math.max(10, markerTextSize - 1))}
                >
                  <Text style={styles.buttonText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.sizeInput}
                  value={markerTextSize.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 16;
                    setMarkerTextSize(Math.max(10, Math.min(28, num)));
                  }}
                  keyboardType="number-pad"
                  placeholder="16"
                />
                <TouchableOpacity
                  style={styles.increaseButton}
                  onPress={() => setMarkerTextSize(Math.min(28, markerTextSize + 1))}
                >
                  <Text style={styles.buttonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>Entre 10 et 28 px</Text>
            </View>

            {/* Couleur du cercle */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Couleur du cercle</Text>
              <View style={styles.colorGrid}>
                {colorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      markerColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setMarkerColor(color)}
                  >
                    {markerColor === color && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.customColorButton}
                onPress={() => setShowCustomColorInput(!showCustomColorInput)}
              >
                <Text style={styles.customColorButtonText}>+ Couleur personnalisée</Text>
              </TouchableOpacity>

              {showCustomColorInput && (
                <View style={styles.customColorInputContainer}>
                  <TextInput
                    style={styles.customColorInput}
                    placeholder="#FFFFFF"
                    value={customColor}
                    onChangeText={setCustomColor}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.applyColorButton}
                    onPress={() => handleAddCustomColor(customColor)}
                  >
                    <Text style={styles.applyColorButtonText}>Appliquer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Couleur du contour */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Couleur du contour</Text>
              <View style={styles.colorGrid}>
                {borderColorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      markerBorderColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setMarkerBorderColor(color)}
                  >
                    {markerBorderColor === color && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.customColorButton}
                onPress={() => setShowCustomBorderColorInput(!showCustomBorderColorInput)}
              >
                <Text style={styles.customColorButtonText}>+ Couleur personnalisée</Text>
              </TouchableOpacity>

              {showCustomBorderColorInput && (
                <View style={styles.customColorInputContainer}>
                  <TextInput
                    style={styles.customColorInput}
                    placeholder="#000000"
                    value={customBorderColor}
                    onChangeText={setCustomBorderColor}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.applyColorButton}
                    onPress={() => handleAddCustomBorderColor(customBorderColor)}
                  >
                    <Text style={styles.applyColorButtonText}>Appliquer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Aperçu */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Aperçu</Text>
              <View style={styles.previewContainer}>
                <View style={[
                  styles.previewMarker,
                  {
                    width: markerSize,
                    height: markerSize,
                    borderRadius: markerSize / 2,
                    backgroundColor: markerColor,
                    borderColor: markerBorderColor,
                  }
                ]}>
                  <Text style={[
                    styles.previewNumber,
                    { fontSize: markerTextSize }
                  ]}>1</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 30 }} />
            </View>
          </ScrollView>
          <TouchableOpacity 
            style={styles.modalDismissArea}
            onPress={() => setShowMarkerSettings(false)}
          />
        </View>
      </Modal>

      {/* Bouton Add Project flottant */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/(tabs)/AddProject")}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Nouveau Projet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },

  mapTypeButtonContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 20,
  },

  mapTypeIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.ui.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
  },

  mapTypeIcon: {
    fontSize: 28,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(49, 132, 155, 0.4)",
    justifyContent: "flex-end",
    flexDirection: "column",
  },

  modalDismissArea: {
    flex: 1,
  },

  modalContent: {
    backgroundColor: AppColors.ui.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    minHeight: 280,
    borderTopWidth: 3,
    borderTopColor: AppColors.primary.light,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  mapTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
    backgroundColor: AppColors.gray.lightest,
  },

  mapTypeOptionActive: {
    backgroundColor: AppColors.primary.light,
    borderColor: AppColors.primary.light,
  },

  mapTypeOptionIcon: {
    fontSize: 28,
    marginRight: 16,
  },

  mapTypeOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.ui.text,
    flex: 1,
    fontFamily: "Century Gothic",
  },

  mapTypeOptionTextActive: {
    color: AppColors.ui.background,
  },

  addButtonContainer: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 180,
    zIndex: 10,
    overflow: "hidden",
    borderRadius: 12,
  },

  addButton: {
    position: "absolute",
    bottom: 24,
    right: 16,
    backgroundColor: AppColors.primary.main,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
    minWidth: 180,
    alignItems: "center",
  },

  addButtonText: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: "Century Gothic",
  },

  settingsButtonContainer: {
    position: "absolute",
    top: 76,
    right: 16,
    zIndex: 20,
  },

  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.ui.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
  },

  settingsIcon: {
    fontSize: 24,
  },

  settingsModalContent: {
    backgroundColor: AppColors.ui.background,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: "90%",
    borderTopWidth: 3,
    borderTopColor: AppColors.primary.light,
  },

  settingsContentWrapper: {
    paddingTop: 0,
    paddingBottom: 30,
  },

  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },

  settingsModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  closeButton: {
    fontSize: 28,
    color: AppColors.primary.main,
    fontWeight: "700",
  },

  settingSection: {
    marginBottom: 24,
  },

  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary.main,
    marginBottom: 12,
    fontFamily: "Century Gothic",
  },

  inputGroup: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  decreaseButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: AppColors.primary.main,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.primary.light,
  },

  increaseButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: AppColors.primary.light,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.primary.main,
  },

  buttonText: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.ui.background,
  },

  sizeInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: AppColors.gray.lightest,
    color: AppColors.ui.text,
    textAlign: "center",
    fontFamily: "Century Gothic",
  },

  inputHint: {
    fontSize: 12,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
  },

  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
    justifyContent: "center",
    alignItems: "center",
  },

  colorOptionActive: {
    borderWidth: 4,
    borderColor: AppColors.primary.dark,
  },

  checkmark: {
    fontSize: 24,
    color: AppColors.ui.background,
    fontWeight: "700",
  },

  customColorButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
    backgroundColor: AppColors.gray.lightest,
    marginBottom: 12,
    alignItems: "center",
  },

  customColorButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  customColorInputContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  customColorInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: AppColors.gray.lightest,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
  },

  applyColorButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AppColors.primary.light,
    justifyContent: "center",
    alignItems: "center",
  },

  applyColorButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.ui.background,
    fontFamily: "Century Gothic",
  },

  previewContainer: {
    backgroundColor: AppColors.gray.lightest,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
  },

  previewMarker: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
  },

  previewNumber: {
    color: AppColors.ui.background,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
});