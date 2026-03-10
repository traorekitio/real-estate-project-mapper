// mobile-app/app/(tabs)/AddProject.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router"; // <-- import router

import { supabase } from "@/lib/supabase";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function AddProjectScreen() {
  const router = useRouter(); // <-- initialisation router

  // Champs du formulaire
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [projectType, setProjectType] = useState("");
  const [developer, setDeveloper] = useState("");
  const [units, setUnits] = useState("");
  const [prices, setPrices] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState("");

  // Localisation
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Récupérer la position de l'utilisateur
  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Impossible de récupérer votre localisation.");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setLatitude(location.coords.latitude);
    setLongitude(location.coords.longitude);
  };

  useEffect(() => {
    // getUserLocation(); // activer si besoin
  }, []);

  // Ajouter projet dans Supabase
  const addProject = async () => {
    if (!latitude || !longitude) {
      Alert.alert("Erreur", "Veuillez placer le projet sur la carte ou activer la géolocalisation.");
      return;
    }

    const { data, error } = await supabase.from("projects").insert([
      {
        name,
        city,
        latitude,
        longitude,
        project_type: projectType,
        developer,
        units: parseInt(units) || 0,
        prices,
        delivery_date: deliveryDate || null,
        status,
      },
    ]);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      Alert.alert("Succès", "Projet ajouté !");

      // Reset formulaire
      setName("");
      setCity("");
      setProjectType("");
      setDeveloper("");
      setUnits("");
      setPrices("");
      setDeliveryDate("");
      setStatus("");
      setLatitude(null);
      setLongitude(null);

      // Retour automatique à Explore + refresh carte
      router.replace("/(tabs)/explore"); // <-- force le refresh de MapView
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>
        Ajouter un projet
      </ThemedText>

      <ThemedView style={styles.form}>
        <TextInput placeholder="Nom du projet" style={styles.input} value={name} onChangeText={setName} />
        <TextInput placeholder="Ville" style={styles.input} value={city} onChangeText={setCity} />
        <TextInput placeholder="Type de projet" style={styles.input} value={projectType} onChangeText={setProjectType} />
        <TextInput placeholder="Développeur" style={styles.input} value={developer} onChangeText={setDeveloper} />
        <TextInput placeholder="Nombre d'unités" style={styles.input} value={units} onChangeText={setUnits} keyboardType="numeric" />
        <TextInput placeholder="Prix" style={styles.input} value={prices} onChangeText={setPrices} />
        <TextInput placeholder="Date de livraison (YYYY-MM-DD)" style={styles.input} value={deliveryDate} onChangeText={setDeliveryDate} />
        <TextInput placeholder="Statut" style={styles.input} value={status} onChangeText={setStatus} />
      </ThemedView>

      <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
        Localisation du projet
      </ThemedText>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: latitude || 33.5731,
          longitude: longitude || -7.5898,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) => {
          setLatitude(e.nativeEvent.coordinate.latitude);
          setLongitude(e.nativeEvent.coordinate.longitude);
        }}
      >
        {latitude && longitude && (
          <Marker coordinate={{ latitude, longitude }} title="Projet" />
        )}
      </MapView>

      <Button title="Ajouter le projet" onPress={addProject} />
      <Button title="Utiliser ma position actuelle" onPress={getUserLocation} color="#007AFF" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  form: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: Dimensions.get("window").height * 0.4,
    marginBottom: 16,
  },
});