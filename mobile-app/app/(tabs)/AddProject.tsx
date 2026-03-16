// mobile-app/app/(tabs)/AddProject.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter, useFocusEffect } from "expo-router";

import { supabase } from "@/lib/supabase";
import { ThemedText } from "@/components/themed-text";

const projectTypes = [
  "Collectif",
  "Villa",
  "Lot de villas",
  "Collectif/Villa",
  "Collectif/Lot de villas",
  "Villa/Lot de villas",
  "Collectif/Villa/Lot de villas",
  "Retail",
];

const typologiesOptions = {
  Collectif: ["F2", "F3", "F4", "F5"],
  Villa: ["Villa Jumelee", "Villa Indivuelle", "Villa en Bande"],
  "Lot de villas": ["Villa Jumelee", "Villa Indivuelle", "Villa en Bande"],
};

export default function AddProjectScreen() {
  const router = useRouter();

  const [showTypeModal, setShowTypeModal] = useState(true);
  const [projectType, setProjectType] = useState("");

  // --- Infos globales projet ---
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [developer, setDeveloper] = useState("");
  const [status, setStatus] = useState("");

  const [surfaceFonciere, setSurfaceFonciere] = useState("");
  const [totalUnits, setTotalUnits] = useState("");

  const [deliveryDate, setDeliveryDate] = useState("");
  const [startCommercialDate, setStartCommercialDate] = useState("");
  const [commercializationRate, setCommercializationRate] = useState("");
  const [salesVelocity, setSalesVelocity] = useState("");
  const [unitsRemaining, setUnitsRemaining] = useState("");

  // --- Typologies ---
  const [currentTypology, setCurrentTypology] = useState("");
  const [surfaceHabitable, setSurfaceHabitable] = useState("");
  const [surfaceTerrasse, setSurfaceTerrasse] = useState("");
  const [surfaceTerrain, setSurfaceTerrain] = useState("");
  const [pricing, setPricing] = useState("");
  const [units, setUnits] = useState("");
  const [typologiesList, setTypologiesList] = useState<any[]>([]);

  // --- Densité ---
  const [density, setDensity] = useState("");
  const [cus, setCus] = useState("");

  // --- Retail ---
  const [gla, setGla] = useState("");
  const [positionnement, setPositionnement] = useState("");
  const [mixRetail, setMixRetail] = useState("");
  const [enseignes, setEnseignes] = useState("");

  // --- Map ---
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setShowTypeModal(true);
      setProjectType("");
      setTypologiesList([]);
      setDensity("");
      setCus("");
    }, [])
  );

  const selectType = (type: string) => {
    setProjectType(type);
    setShowTypeModal(false);
    // Réinitialiser les densités quand on change le type
    setDensity("");
    setCus("");
  };

  // Fonction pour déterminer les champs de densité requis
  const getDensityFields = () => {
    const baseType = projectType.split("/")[0]; // Prendre le premier type en cas de types multiples
    
    if (baseType === "Collectif") {
      return { hasDensity: true, label: "Densité/immeuble", hasCus: false };
    }
    if (baseType === "Villa") {
      return { hasDensity: true, label: "Densité/ha", hasCus: false };
    }
    if (baseType === "Lot de villas") {
      return { hasDensity: true, label: "Densité/ha", hasCus: true };
    }
    return { hasDensity: false, label: "", hasCus: false };
  };

  const addCurrentTypology = () => {
    if (!currentTypology) {
      Alert.alert("Erreur", "Choisissez une typologie");
      return;
    }

    setTypologiesList([
      ...typologiesList,
      {
        typology: currentTypology,
        surfaceHabitable,
        surfaceTerrasse,
        surfaceTerrain,
        pricing,
        units,
      },
    ]);

    setCurrentTypology("");
    setSurfaceHabitable("");
    setSurfaceTerrasse("");
    setSurfaceTerrain("");
    setPricing("");
    setUnits("");
  };

  const addProject = async () => {
    if (!latitude || !longitude) {
      Alert.alert("Erreur", "Place le projet sur la carte");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name,
          city,
          quartier,
          latitude,
          longitude,
          developer,
          project_type: projectType,
          status,
          surface_fonciere: parseFloat(surfaceFonciere) || null,
          total_units: parseInt(totalUnits) || null,
          delivery_date: deliveryDate || null,
          start_commercial_date: startCommercialDate || null,
          commercialization_rate: parseFloat(commercializationRate) || null,
          sales_velocity: parseFloat(salesVelocity) || null,
          units_remaining: parseInt(unitsRemaining) || null,
        },
      ])
      .select();

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    const projectId = data[0].id;

    for (let t of typologiesList) {
      await supabase.from("projects_typologies").insert([
        {
          project_id: projectId,
          typology: t.typology,
          surface_habitable: parseFloat(t.surfaceHabitable) || null,
          surface_terrasse: parseFloat(t.surfaceTerrasse) || null,
          surface_terrain: parseFloat(t.surfaceTerrain) || null,
          pricing: t.pricing,
          units: parseInt(t.units) || null,
        },
      ]);
    }

    if (density) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "density",
          density_value: parseFloat(density),
        },
      ]);
    }

    if (cus) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "CUS",
          density_value: parseFloat(cus),
        },
      ]);
    }

    if (projectType === "Retail") {
      await supabase.from("projects_retail").insert([
        {
          project_id: projectId,
          gla: parseFloat(gla),
          positionnement,
          mix_retail: mixRetail,
          enseignes,
        },
      ]);
    }

    Alert.alert("Succès", "Projet ajouté !");
    router.replace("/(tabs)/explore");
  };

  return (
    <>
      <Modal visible={showTypeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ThemedText type="title">Choisissez le type de projet</ThemedText>
            {projectTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.typeButton}
                onPress={() => selectType(type)}
              >
                <ThemedText>{type}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {!showTypeModal && (
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title">Ajouter un projet</ThemedText>

          <ThemedText style={styles.projectType}>Type : {projectType}</ThemedText>

          <TextInput placeholder="Nom du projet" style={styles.input} onChangeText={setName} />
          <TextInput placeholder="Ville" style={styles.input} onChangeText={setCity} />
          <TextInput placeholder="Quartier" style={styles.input} onChangeText={setQuartier} />
          <TextInput placeholder="Développeur" style={styles.input} onChangeText={setDeveloper} />

          <TextInput
            placeholder="Surface foncière (m²)"
            style={styles.input}
            onChangeText={setSurfaceFonciere}
          />

          <TextInput
            placeholder="Nombre total d'unités"
            style={styles.input}
            onChangeText={setTotalUnits}
          />

          <TextInput placeholder="Statut" style={styles.input} onChangeText={setStatus} />

          <TextInput
            placeholder="Date livraison (YYYY-MM-DD)"
            style={styles.input}
            onChangeText={setDeliveryDate}
          />

          <TextInput
            placeholder="Début commercialisation"
            style={styles.input}
            onChangeText={setStartCommercialDate}
          />

          <TextInput
            placeholder="Taux commercialisation %"
            style={styles.input}
            onChangeText={setCommercializationRate}
          />

          <TextInput
            placeholder="Taux écoulement"
            style={styles.input}
            onChangeText={setSalesVelocity}
          />

          <TextInput
            placeholder="Unités restantes"
            style={styles.input}
            onChangeText={setUnitsRemaining}
          />

          {projectType !== "Retail" && (
            <>
              <ThemedText style={{ marginTop: 10, fontWeight: "bold" }}>
                Ajouter une typologie
              </ThemedText>

              <View style={{ marginBottom: 10 }}>
                <Text>Typologie</Text>

                <ScrollView horizontal>
                  {(typologiesOptions[projectType as keyof typeof typologiesOptions] || []).map(
                    (t) => (
                      <TouchableOpacity
                        key={t}
                        style={{
                          padding: 8,
                          margin: 4,
                          borderWidth: 1,
                          borderColor: currentTypology === t ? "blue" : "#ccc",
                          borderRadius: 6,
                        }}
                        onPress={() => setCurrentTypology(t)}
                      >
                        <Text>{t}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                <TextInput
                  placeholder="Surface habitable"
                  style={styles.input}
                  value={surfaceHabitable}
                  onChangeText={setSurfaceHabitable}
                />

                <TextInput
                  placeholder="Surface terrasse"
                  style={styles.input}
                  value={surfaceTerrasse}
                  onChangeText={setSurfaceTerrasse}
                />

                <TextInput
                  placeholder="Surface terrain"
                  style={styles.input}
                  value={surfaceTerrain}
                  onChangeText={setSurfaceTerrain}
                />

                <TextInput
                  placeholder="Prix"
                  style={styles.input}
                  value={pricing}
                  onChangeText={setPricing}
                />

                <TextInput
                  placeholder="Nombre unités"
                  style={styles.input}
                  value={units}
                  onChangeText={setUnits}
                />

                <Button title="Ajouter typologie" onPress={addCurrentTypology} />
              </View>

              {typologiesList.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text>Typologies ajoutées :</Text>

                  {typologiesList.map((t, idx) => (
                    <Text key={idx}>
                      {t.typology} - Habitable: {t.surfaceHabitable} m² - Terrasse:{" "}
                      {t.surfaceTerrasse} m² - Terrain: {t.surfaceTerrain} m² - Prix: {t.pricing} -
                      Units: {t.units}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}

          {projectType === "Retail" && (
            <>
              <TextInput placeholder="GLA" style={styles.input} onChangeText={setGla} />
              <TextInput
                placeholder="Positionnement"
                style={styles.input}
                onChangeText={setPositionnement}
              />
              <TextInput
                placeholder="Mix retail"
                style={styles.input}
                onChangeText={setMixRetail}
              />
              <TextInput
                placeholder="Enseignes"
                style={styles.input}
                onChangeText={setEnseignes}
              />
            </>
          )}

          {/* Densité - affichée selon le type de projet */}
          {(() => {
            const densityFields = getDensityFields();
            return densityFields.hasDensity ? (
              <View style={{ marginTop: 20, marginBottom: 20 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
                  Densité
                </ThemedText>

                <TextInput
                  placeholder={densityFields.label}
                  style={styles.input}
                  value={density}
                  onChangeText={setDensity}
                  keyboardType="decimal-pad"
                />

                {densityFields.hasCus && (
                  <TextInput
                    placeholder="CUS"
                    style={styles.input}
                    value={cus}
                    onChangeText={setCus}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>
            ) : null;
          })()}

          <ThemedText style={styles.locationTitle}>Localisation</ThemedText>
          <ThemedText style={styles.locationSubtitle}>Situez le projet sur la carte</ThemedText>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 33.5731,
              longitude: -7.5898,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={(e) => {
              setLatitude(e.nativeEvent.coordinate.latitude);
              setLongitude(e.nativeEvent.coordinate.longitude);
            }}
          >
            {latitude && longitude && <Marker coordinate={{ latitude, longitude }} />}
          </MapView>

          <Button title="Ajouter projet" onPress={addProject} />
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },

  projectType: {
    marginBottom: 20,
    fontSize: 16,
  },

  locationTitle: {
    marginTop: 20,
    fontSize: 18,
  },

  locationSubtitle: {
    marginBottom: 10,
    opacity: 0.7,
  },

  map: {
    width: "100%",
    height: Dimensions.get("window").height * 0.4,
    marginBottom: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "85%",
  },

  typeButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
});