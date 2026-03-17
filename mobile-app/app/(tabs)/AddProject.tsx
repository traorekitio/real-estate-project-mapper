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
import { AppColors } from "@/constants/colors";

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
  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain">("standard");

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
      setMapType("standard");
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
      return { hasDensity: true, label: "Densité/immeuble (unité/immeuble)", hasCus: false };
    }
    if (baseType === "Villa") {
      return { hasDensity: true, label: "Densité/ha (unité/ha)", hasCus: false };
    }
    if (baseType === "Lot de villas") {
      return { hasDensity: true, label: "Densité/ha (unité/ha)", hasCus: true };
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
            <Text style={styles.modalTitle}>Choisissez le type de projet</Text>
            {projectTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.typeButton}
                onPress={() => selectType(type)}
              >
                <Text style={styles.typeButtonText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {!showTypeModal && (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.mainTitle}>Ajouter un projet</Text>

          <Text style={styles.projectType}>Type : <Text style={{ fontWeight: "700", color: AppColors.accent }}>{projectType}</Text></Text>

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
            placeholder="Taux écoulement(unité/mois)"
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
                  placeholder="Surface habitable (m²)"
                  style={styles.input}
                  value={surfaceHabitable}
                  onChangeText={setSurfaceHabitable}
                />

                <TextInput
                  placeholder="Surface terrasse (m²)"
                  style={styles.input}
                  value={surfaceTerrasse}
                  onChangeText={setSurfaceTerrasse}
                />

                <TextInput
                  placeholder="Surface terrain (m²)"
                  style={styles.input}
                  value={surfaceTerrain}
                  onChangeText={setSurfaceTerrain}
                />

                <TextInput
                  placeholder="Prix de vente (MAD)"
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

          {/* Boutons pour changer le type de carte */}
          <View style={styles.mapTypeContainer}>
            <TouchableOpacity
              style={[
                styles.mapTypeButton,
                mapType === "standard" && styles.mapTypeButtonActive,
              ]}
              onPress={() => setMapType("standard")}
            >
              <Text style={[
                styles.mapTypeButtonText,
                mapType === "standard" && styles.mapTypeButtonTextActive,
              ]}>
                Standard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapTypeButton,
                mapType === "satellite" && styles.mapTypeButtonActive,
              ]}
              onPress={() => setMapType("satellite")}
            >
              <Text style={[
                styles.mapTypeButtonText,
                mapType === "satellite" && styles.mapTypeButtonTextActive,
              ]}>
                Satellite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapTypeButton,
                mapType === "terrain" && styles.mapTypeButtonActive,
              ]}
              onPress={() => setMapType("terrain")}
            >
              <Text style={[
                styles.mapTypeButtonText,
                mapType === "terrain" && styles.mapTypeButtonTextActive,
              ]}>
                Relief
              </Text>
            </TouchableOpacity>
          </View>

          <MapView
            style={styles.map}
            mapType={mapType}
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

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={addProject}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>✓ Ajouter projet</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 18,
    backgroundColor: AppColors.gray.lightest,
  },

  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  input: {
    borderWidth: 1.5,
    borderColor: AppColors.gray.lighter,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: AppColors.ui.background,
    color: AppColors.ui.text,
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Century Gothic",
  },

  projectType: {
    marginBottom: 22,
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  locationTitle: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  locationSubtitle: {
    marginBottom: 14,
    opacity: 0.7,
    fontSize: 14,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
  },

  map: {
    width: "100%",
    height: Dimensions.get("window").height * 0.4,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: AppColors.primary.light,
  },

  mapTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    gap: 8,
  },

  mapTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColors.gray.lighter,
    backgroundColor: AppColors.ui.background,
    alignItems: "center",
  },

  mapTypeButtonActive: {
    backgroundColor: AppColors.primary.light,
    borderColor: AppColors.primary.light,
  },

  mapTypeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.ui.text,
  },

  mapTypeButtonTextActive: {
    color: AppColors.ui.background,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(49, 132, 155, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: AppColors.ui.background,
    padding: 24,
    borderRadius: 16,
    width: "88%",
    borderWidth: 2,
    borderColor: AppColors.primary.light,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: AppColors.primary.main,
    textAlign: "center",
    fontFamily: "Century Gothic",
  },

  typeButton: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: AppColors.gray.lightest,
    backgroundColor: AppColors.ui.background,
  },

  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  submitButton: {
    backgroundColor: AppColors.primary.light,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    marginTop: 8,
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.65,
    elevation: 8,
  },

  submitButtonText: {
    color: AppColors.ui.background,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "Century Gothic",
  },
});