// mobile-app/app/(tabs)/explore.tsx
import React from "react";
import { View, Button, StyleSheet } from "react-native";
import MapScreen from "@/components/ui/MapView";
import { useRouter } from "expo-router";

export default function TabTwoScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Carte */}
      <MapScreen />

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
    position: "relative", // essentiel pour que le bouton soit au-dessus de la carte
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 160,
    zIndex: 10, // pour s'assurer qu'il reste au-dessus de la carte
  },
});