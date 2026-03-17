// mobile-app/app/(tabs)/explore.tsx
import React, { useState } from "react";
import { View, Button, StyleSheet, Modal, TouchableOpacity, Text, Pressable } from "react-native";
import MapScreen from "@/components/ui/MapView";
import { useRouter } from "expo-router";

export default function TabTwoScreen() {
  const router = useRouter();
  const [mapType, setMapType] = useState<"standard" | "satellite" | "hybrid" | "terrain">("standard");
  const [showMapTypeModal, setShowMapTypeModal] = useState(false);

  return (
    <View style={styles.container}>
      {/* Carte */}
      <MapScreen mapType={mapType} />

      {/* Bouton Map Type en haut à droite */}
      <View style={styles.mapTypeButtonContainer}>
        <TouchableOpacity
          style={styles.mapTypeIconButton}
          onPress={() => setShowMapTypeModal(true)}
        >
          <Text style={styles.mapTypeIcon}>🗺️</Text>
        </TouchableOpacity>
      </View>

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

      {/* Bouton Add Project flottant */}
      <View style={styles.addButtonContainer}>
        <Button
          title="Add New Project"
          onPress={() => router.push("/(tabs)/AddProject")}
          color="#007AFF"
        />
      </View>
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
    top: 20,
    right: 20,
    zIndex: 20,
  },

  mapTypeIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  mapTypeIcon: {
    fontSize: 24,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 250,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  mapTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
  },

  mapTypeOptionActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },

  mapTypeOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },

  mapTypeOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },

  mapTypeOptionTextActive: {
    color: "white",
  },

  addButtonContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 160,
    zIndex: 10,
  },
});