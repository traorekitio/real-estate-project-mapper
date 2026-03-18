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

const projectMainTypes = ["Collectif", "Villa", "Lot de villas", "Retail", "Mixte"];

const projectMixedTypes = [
  "Collectif/Villa",
  "Collectif/Lot de villas",
  "Villa/Lot de villas",
  "Collectif/Villa/Lot de villas",
];

const typologiesOptions = {
  Collectif: ["F2", "F3", "F4", "F5", "F6"],
  Villa: ["Villa Jumelee", "Villa Individuelle", "Villa en Bande"],
  "Lot de villas": ["Villa Jumelee", "Villa Individuelle", "Villa en Bande"],
};

// Fonction de conversion de surfaces
const convertSurface = (value: string, fromUnit: string, toUnit: string): string => {
  if (!value || isNaN(parseFloat(value))) return "";
  
  const numValue = parseFloat(value);
  let m2Value = numValue;

  // Convertir vers m² d'abord
  if (fromUnit === "ha") {
    m2Value = numValue * 10000;
  }

  // Convertir de m² vers l'unité cible
  let result = m2Value;
  if (toUnit === "ha") {
    result = m2Value / 10000;
  }

  return result.toFixed(2);
};

// Fonction pour basculer l'unité et convertir la valeur
const toggleSurfaceUnit = (
  currentValue: string,
  currentUnit: "m²" | "ha",
  setValue: (value: string) => void,
  setUnit: (unit: "m²" | "ha") => void
) => {
  if (!currentValue || isNaN(parseFloat(currentValue))) {
    return;
  }

  const newUnit = currentUnit === "m²" ? "ha" : "m²";
  const convertedValue = convertSurface(currentValue, currentUnit, newUnit);
  setValue(convertedValue);
  setUnit(newUnit);
};

export default function AddProjectScreen() {
  const router = useRouter();

  const [showMainTypeModal, setShowMainTypeModal] = useState(true);
  const [showMixedTypeModal, setShowMixedTypeModal] = useState(false);
  const [projectType, setProjectType] = useState("");
  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain">("standard");

  // --- Infos globales projet ---
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [developer, setDeveloper] = useState("");
  const [status, setStatus] = useState("");

  // --- Surfaces Foncières ---
  const [surfaceFonciereTotal, setSurfaceFonciereTotal] = useState("");
  const [surfaceFonciereCollectif, setSurfaceFonciereCollectif] = useState("");
  const [surfaceFonciereVilla, setSurfaceFonciereVilla] = useState("");
  const [surfaceFonciereVillaLot, setSurfaceFonciereVillaLot] = useState("");

  // --- Total Units ---
  const [totalUnitsGlobal, setTotalUnitsGlobal] = useState("");
  const [totalUnitsCollectif, setTotalUnitsCollectif] = useState("");
  const [totalUnitsVilla, setTotalUnitsVilla] = useState("");
  const [totalUnitsVillaLot, setTotalUnitsVillaLot] = useState("");

  // --- Dates ---
  const [deliveryDate, setDeliveryDate] = useState("");
  const [startCommercialDate, setStartCommercialDate] = useState("");

  // --- Commercialisation ---
  const [commercializationRateGlobal, setCommercializationRateGlobal] = useState("");
  const [commercializationRateCollectif, setCommercializationRateCollectif] = useState("");
  const [commercializationRateVilla, setCommercializationRateVilla] = useState("");
  const [commercializationRateVillaLot, setCommercializationRateVillaLot] = useState("");

  // --- Taux d'écoulement ---
  const [salesVelocityGlobal, setSalesVelocityGlobal] = useState("");
  const [salesVelocityCollectif, setSalesVelocityCollectif] = useState("");
  const [salesVelocityVilla, setSalesVelocityVilla] = useState("");
  const [salesVelocityVillaLot, setSalesVelocityVillaLot] = useState("");

  // --- Unités restantes ---
  const [unitsRemainingGlobal, setUnitsRemainingGlobal] = useState("");
  const [unitsRemainingCollectif, setUnitsRemainingCollectif] = useState("");
  const [unitsRemainingVilla, setUnitsRemainingVilla] = useState("");
  const [unitsRemainingVillaLot, setUnitsRemainingVillaLot] = useState("");

  // --- Typologies ---
  const [currentTypology, setCurrentTypology] = useState("");
  const [currentTypologyCategory, setCurrentTypologyCategory] = useState("");
  const [surfaceHabitable, setSurfaceHabitable] = useState("");
  const [surfaceTerrasse, setSurfaceTerrasse] = useState("");
  const [surfaceTerrain, setSurfaceTerrain] = useState("");
  const [pricing, setPricing] = useState("");
  const [units, setUnits] = useState("");
  const [typologiesList, setTypologiesList] = useState<any[]>([]);

  // --- Densité ---
  const [densityGlobal, setDensityGlobal] = useState("");
  const [densityCollectif, setDensityCollectif] = useState("");
  const [densityVilla, setDensityVilla] = useState("");
  const [densityVillaLot, setDensityVillaLot] = useState("");
  const [cus, setCus] = useState("");

  // --- Retail ---
  const [gla, setGla] = useState("");
  const [positionnement, setPositionnement] = useState("");
  const [mixRetail, setMixRetail] = useState("");
  const [enseignes, setEnseignes] = useState("");

  // --- Map ---
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // --- Unités de surface ---
  const [unitTotalSurface, setUnitTotalSurface] = useState<"m²" | "ha">("m²");
  const [unitCollectifSurface, setUnitCollectifSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaSurface, setUnitVillaSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaLotSurface, setUnitVillaLotSurface] = useState<"m²" | "ha">("m²");

  useFocusEffect(
    useCallback(() => {
      // Réinitialiser TOUS les champs
      setShowMainTypeModal(true);
      setShowMixedTypeModal(false);
      setProjectType("");
      setMapType("standard");
      
      // Infos générales
      setName("");
      setCity("");
      setQuartier("");
      setDeveloper("");
      setStatus("");
      
      // Surfaces
      setSurfaceFonciereTotal("");
      setSurfaceFonciereCollectif("");
      setSurfaceFonciereVilla("");
      setSurfaceFonciereVillaLot("");
      
      // Unités de surface
      setUnitTotalSurface("m²");
      setUnitCollectifSurface("m²");
      setUnitVillaSurface("m²");
      setUnitVillaLotSurface("m²");
      
      // Unités
      setTotalUnitsGlobal("");
      setTotalUnitsCollectif("");
      setTotalUnitsVilla("");
      setTotalUnitsVillaLot("");
      
      // Dates
      setDeliveryDate("");
      setStartCommercialDate("");
      
      // Commercialisation
      setCommercializationRateGlobal("");
      setCommercializationRateCollectif("");
      setCommercializationRateVilla("");
      setCommercializationRateVillaLot("");
      
      // Taux d'écoulement
      setSalesVelocityGlobal("");
      setSalesVelocityCollectif("");
      setSalesVelocityVilla("");
      setSalesVelocityVillaLot("");
      
      // Unités restantes
      setUnitsRemainingGlobal("");
      setUnitsRemainingCollectif("");
      setUnitsRemainingVilla("");
      setUnitsRemainingVillaLot("");
      
      // Typologies
      setCurrentTypology("");
      setCurrentTypologyCategory("");
      setSurfaceHabitable("");
      setSurfaceTerrasse("");
      setSurfaceTerrain("");
      setPricing("");
      setUnits("");
      setTypologiesList([]);
      
      // Densité
      setDensityGlobal("");
      setDensityCollectif("");
      setDensityVilla("");
      setDensityVillaLot("");
      setCus("");
      
      // Retail
      setGla("");
      setPositionnement("");
      setMixRetail("");
      setEnseignes("");
      
      // Map
      setLatitude(null);
      setLongitude(null);
    }, [])
  );

  const selectMainType = (type: string) => {
    if (type === "Mixte") {
      setShowMixedTypeModal(true);
      setShowMainTypeModal(false);
    } else {
      setProjectType(type);
      setShowMainTypeModal(false);
      // Initialiser la catégorie de typologie
      if (type === "Collectif") setCurrentTypologyCategory("Collectif");
      else if (type === "Villa") setCurrentTypologyCategory("Villa");
      else if (type === "Lot de villas") setCurrentTypologyCategory("Lot de villas");
    }
  };

  const selectMixedType = (type: string) => {
    setProjectType(type);
    setShowMixedTypeModal(false);
    // Pour les mixtes, initialiser avec la première catégorie
    if (type.includes("Collectif")) setCurrentTypologyCategory("Collectif");
    else if (type.startsWith("Villa")) setCurrentTypologyCategory("Villa");
  };

  // Fonction pour déterminer les catégories du projet
  const getProjectCategories = (): string[] => {
    if (projectType === "Collectif") return ["Collectif"];
    if (projectType === "Villa") return ["Villa"];
    if (projectType === "Lot de villas") return ["Lot de villas"];
    if (projectType === "Retail") return ["Retail"];
    if (projectType === "Collectif/Villa") return ["Collectif", "Villa"];
    if (projectType === "Collectif/Lot de villas") return ["Collectif", "Lot de villas"];
    if (projectType === "Villa/Lot de villas") return ["Villa", "Lot de villas"];
    if (projectType === "Collectif/Villa/Lot de villas") return ["Collectif", "Villa", "Lot de villas"];
    return [];
  };

  // Fonction pour obtenir les typologies disponibles
  const getTypologiesForCategory = (category: string): string[] => {
    return typologiesOptions[category as keyof typeof typologiesOptions] || [];
  };

  const categories = getProjectCategories();
  const isMixedProject = categories.length > 1;

  const addCurrentTypology = () => {
    // Pour projet simple, utiliser la catégorie par défaut. Pour mixte, vérifier la sélection
    const categoryToUse = isMixedProject ? currentTypologyCategory : categories[0];

    if (!currentTypology || !categoryToUse) {
      Alert.alert("Erreur", "Choisissez une catégorie et une typologie");
      return;
    }

    setTypologiesList([
      ...typologiesList,
      {
        typology_category: categoryToUse,
        typology: currentTypology,
        surfaceHabitable,
        surfaceTerrasse,
        surfaceTerrain,
        pricing,
        units,
      },
    ]);

    setCurrentTypology("");
    // Garder la catégorie sélectionnée pour faciliter l'ajout multiple
    if (isMixedProject) {
      setCurrentTypologyCategory(currentTypologyCategory);
    } else {
      setCurrentTypologyCategory(categories[0]);
    }
    setSurfaceHabitable("");
    setSurfaceTerrasse("");
    setSurfaceTerrain("");
    setPricing("");
    setUnits("");
  };

// Fonction pour convertir une surface en m² avant envoi à la BD
const convertToM2ForDatabase = (value: string, unit: "m²" | "ha"): number | null => {
  if (!value || isNaN(parseFloat(value))) return null;
  
  const numValue = parseFloat(value);
  
  if (unit === "ha") {
    return numValue * 10000; // ha → m²
  }
  
  return numValue; // déjà en m²
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
          surface_fonciere_totale: convertToM2ForDatabase(surfaceFonciereTotal, unitTotalSurface),
          surface_fonciere_collectif: convertToM2ForDatabase(surfaceFonciereCollectif, unitCollectifSurface),
          surface_fonciere_villa: convertToM2ForDatabase(surfaceFonciereVilla, unitVillaSurface),
          surface_fonciere_lot_villas: convertToM2ForDatabase(surfaceFonciereVillaLot, unitVillaLotSurface),
          total_units: parseInt(totalUnitsGlobal) || null,
          total_units_collectif: parseInt(totalUnitsCollectif) || null,
          total_units_villa: parseInt(totalUnitsVilla) || null,
          total_units_lot_villas: parseInt(totalUnitsVillaLot) || null,
          delivery_date: deliveryDate || null,
          start_commercial_date: startCommercialDate || null,
          commercialization_rate_global: parseFloat(commercializationRateGlobal) || null,
          commercialization_rate_collectif: parseFloat(commercializationRateCollectif) || null,
          commercialization_rate_villa: parseFloat(commercializationRateVilla) || null,
          commercialization_rate_lot_villas: parseFloat(commercializationRateVillaLot) || null,
          sales_velocity_global: parseFloat(salesVelocityGlobal) || null,
          sales_velocity_collectif: parseFloat(salesVelocityCollectif) || null,
          sales_velocity_villa: parseFloat(salesVelocityVilla) || null,
          sales_velocity_lot_villas: parseFloat(salesVelocityVillaLot) || null,
          units_remaining_global: parseInt(unitsRemainingGlobal) || null,
          units_remaining_collectif: parseInt(unitsRemainingCollectif) || null,
          units_remaining_villa: parseInt(unitsRemainingVilla) || null,
          units_remaining_lot_villas: parseInt(unitsRemainingVillaLot) || null,
        },
      ])
      .select();

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    const projectId = data[0].id;

    // Sauvegarder les typologies
    for (let t of typologiesList) {
      await supabase.from("projects_typologies").insert([
        {
          project_id: projectId,
          typology_category: t.typology_category,
          typology: t.typology,
          surface_habitable: parseFloat(t.surfaceHabitable) || null,
          surface_terrasse: parseFloat(t.surfaceTerrasse) || null,
          surface_terrain: parseFloat(t.surfaceTerrain) || null,
          pricing: t.pricing,
          units: parseInt(t.units) || null,
        },
      ]);
    }

    // Sauvegarder les densités
    if (densityGlobal) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "density",
          category: "global",
          density_value: parseFloat(densityGlobal),
        },
      ]);
    }

    if (densityCollectif && categories.includes("Collectif")) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "density",
          category: "Collectif",
          density_value: parseFloat(densityCollectif),
        },
      ]);
    }

    if (densityVilla && categories.includes("Villa")) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "density",
          category: "Villa",
          density_value: parseFloat(densityVilla),
        },
      ]);
    }

    if (densityVillaLot && categories.includes("Lot de villas")) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "density",
          category: "Lot de villas",
          density_value: parseFloat(densityVillaLot),
        },
      ]);
    }

    if (cus && categories.includes("Lot de villas")) {
      await supabase.from("projects_density").insert([
        {
          project_id: projectId,
          density_type: "CUS",
          category: "global",
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
      {/* Modal Type Principal */}
      <Modal visible={showMainTypeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choisissez le type de projet</Text>
            {projectMainTypes.map((type: string) => (
              <TouchableOpacity
                key={type}
                style={styles.typeButton}
                onPress={() => selectMainType(type)}
              >
                <Text style={styles.typeButtonText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Type Mixte */}
      <Modal visible={showMixedTypeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choisissez les types mixtes</Text>
            {projectMixedTypes.map((type: string) => (
              <TouchableOpacity
                key={type}
                style={styles.typeButton}
                onPress={() => selectMixedType(type)}
              >
                <Text style={styles.typeButtonText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {projectType && (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.mainTitle}>Ajouter un projet</Text>

          <Text style={styles.projectType}>Type : <Text style={{ fontWeight: "700", color: AppColors.accent }}>{projectType}</Text></Text>

          <TextInput placeholder="Nom du projet" style={styles.input} onChangeText={setName} />
          <TextInput placeholder="Ville" style={styles.input} onChangeText={setCity} />
          <TextInput placeholder="Quartier" style={styles.input} onChangeText={setQuartier} />
          <TextInput placeholder="Développeur" style={styles.input} onChangeText={setDeveloper} />

          {/* Surfaces Foncières */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Surfaces Foncières
          </ThemedText>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <TextInput
              placeholder="Surface foncière totale"
              style={[styles.input, { flex: 1 }]}
              value={surfaceFonciereTotal}
              onChangeText={setSurfaceFonciereTotal}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.unitToggleButton, { backgroundColor: unitTotalSurface === "m²" ? AppColors.primary.main : AppColors.primary.light }]}
              onPress={() => toggleSurfaceUnit(surfaceFonciereTotal, unitTotalSurface, setSurfaceFonciereTotal, setUnitTotalSurface)}
            >
              <Text style={styles.unitToggleText}>{unitTotalSurface}</Text>
            </TouchableOpacity>
          </View>

          {isMixedProject && categories.includes("Collectif") && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Surface foncière Collectif"
                style={[styles.input, { flex: 1 }]}
                value={surfaceFonciereCollectif}
                onChangeText={setSurfaceFonciereCollectif}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={[styles.unitToggleButton, { backgroundColor: unitCollectifSurface === "m²" ? AppColors.primary.main : AppColors.primary.light }]}
                onPress={() => toggleSurfaceUnit(surfaceFonciereCollectif, unitCollectifSurface, setSurfaceFonciereCollectif, setUnitCollectifSurface)}
              >
                <Text style={styles.unitToggleText}>{unitCollectifSurface}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isMixedProject && categories.includes("Villa") && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Surface foncière Villa"
                style={[styles.input, { flex: 1 }]}
                value={surfaceFonciereVilla}
                onChangeText={setSurfaceFonciereVilla}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={[styles.unitToggleButton, { backgroundColor: unitVillaSurface === "m²" ? AppColors.primary.main : AppColors.primary.light }]}
                onPress={() => toggleSurfaceUnit(surfaceFonciereVilla, unitVillaSurface, setSurfaceFonciereVilla, setUnitVillaSurface)}
              >
                <Text style={styles.unitToggleText}>{unitVillaSurface}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Surface foncière Lot de villas"
                style={[styles.input, { flex: 1 }]}
                value={surfaceFonciereVillaLot}
                onChangeText={setSurfaceFonciereVillaLot}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={[styles.unitToggleButton, { backgroundColor: unitVillaLotSurface === "m²" ? AppColors.primary.main : AppColors.primary.light }]}
                onPress={() => toggleSurfaceUnit(surfaceFonciereVillaLot, unitVillaLotSurface, setSurfaceFonciereVillaLot, setUnitVillaLotSurface)}
              >
                <Text style={styles.unitToggleText}>{unitVillaLotSurface}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Total Units */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Nombre d'Unités
          </ThemedText>

          <TextInput
            placeholder="Nombre total d'unités"
            style={styles.input}
            onChangeText={setTotalUnitsGlobal}
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Nombre d'unités Collectif"
              style={styles.input}
              onChangeText={setTotalUnitsCollectif}
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Nombre d'unités Villa"
              style={styles.input}
              onChangeText={setTotalUnitsVilla}
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Nombre d'unités Lot de villas"
              style={styles.input}
              onChangeText={setTotalUnitsVillaLot}
            />
          )}

          <TextInput placeholder="Statut" style={styles.input} onChangeText={setStatus} />

          {/* Dates */}
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

          {/* Commercialisation */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Commercialisation
          </ThemedText>

          <TextInput
            placeholder="Taux commercialisation global %"
            style={styles.input}
            onChangeText={setCommercializationRateGlobal}
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Taux commercialisation Collectif %"
              style={styles.input}
              onChangeText={setCommercializationRateCollectif}
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Taux commercialisation Villa %"
              style={styles.input}
              onChangeText={setCommercializationRateVilla}
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Taux commercialisation Lot de villas %"
              style={styles.input}
              onChangeText={setCommercializationRateVillaLot}
            />
          )}

          {/* Taux d'écoulement */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Taux d'Écoulement (unité/mois)
          </ThemedText>

          <TextInput
            placeholder="Taux d'écoulement global (unité/mois)"
            style={styles.input}
            onChangeText={setSalesVelocityGlobal}
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Taux d'écoulement Collectif (unité/mois)"
              style={styles.input}
              onChangeText={setSalesVelocityCollectif}
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Taux d'écoulement Villa (unité/mois)"
              style={styles.input}
              onChangeText={setSalesVelocityVilla}
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Taux d'écoulement Lot de villas (unité/mois)"
              style={styles.input}
              onChangeText={setSalesVelocityVillaLot}
            />
          )}

          {/* Unités Restantes */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Unités Restantes
          </ThemedText>

          <TextInput
            placeholder="Unités restantes global"
            style={styles.input}
            onChangeText={setUnitsRemainingGlobal}
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Unités restantes Collectif"
              style={styles.input}
              onChangeText={setUnitsRemainingCollectif}
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Unités restantes Villa"
              style={styles.input}
              onChangeText={setUnitsRemainingVilla}
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Unités restantes Lot de villas"
              style={styles.input}
              onChangeText={setUnitsRemainingVillaLot}
            />
          )}

          {/* Typologies */}
          {projectType !== "Retail" && (
            <>
              <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
                Ajouter une Typologie
              </ThemedText>

              {isMixedProject ? (
                <>
                  <Text style={{ marginBottom: 10, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Catégorie</Text>
                  <ScrollView horizontal style={{ marginBottom: 12 }}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={{
                          padding: 10,
                          margin: 4,
                          borderWidth: 2,
                          borderColor: currentTypologyCategory === cat ? AppColors.primary.main : "#ccc",
                          borderRadius: 8,
                          backgroundColor: currentTypologyCategory === cat ? AppColors.primary.light + "30" : "#fff",
                        }}
                        onPress={() => setCurrentTypologyCategory(cat)}
                      >
                        <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={{ marginBottom: 10, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Typologie</Text>
              <ScrollView horizontal style={{ marginBottom: 12 }}>
                {getTypologiesForCategory(currentTypologyCategory || categories[0]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={{
                      padding: 10,
                      margin: 4,
                      borderWidth: 2,
                      borderColor: currentTypology === t ? AppColors.primary.main : "#ccc",
                      borderRadius: 8,
                      backgroundColor: currentTypology === t ? AppColors.primary.light + "30" : "#fff",
                    }}
                    onPress={() => setCurrentTypology(t)}
                  >
                    <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{t}</Text>
                  </TouchableOpacity>
                ))}
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

              <Button title="Ajouter Typologie" onPress={addCurrentTypology} />

              {typologiesList.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: AppColors.primary.main }}>Typologies ajoutées :</Text>
                  {typologiesList.map((t, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: AppColors.ui.text, marginTop: 8 }}>
                      [{t.typology_category}] {t.typology} - Habitable: {t.surfaceHabitable} m² - Prix: {t.pricing} - Units: {t.units}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Retail */}
          {projectType === "Retail" && (
            <>
              <TextInput placeholder="GLA" style={styles.input} onChangeText={setGla} />
              <TextInput placeholder="Positionnement" style={styles.input} onChangeText={setPositionnement} />
              <TextInput placeholder="Mix retail" style={styles.input} onChangeText={setMixRetail} />
              <TextInput placeholder="Enseignes" style={styles.input} onChangeText={setEnseignes} />
            </>
          )}

          {/* Densité */}
          {projectType !== "Retail" && (
            <>
              <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
                Densité
              </ThemedText>

              {!isMixedProject ? (
                <>
                  {projectType === "Collectif" && (
                    <TextInput
                      placeholder="Densité Collectif (unités/immeuble)"
                      style={styles.input}
                      value={densityGlobal}
                      onChangeText={setDensityGlobal}
                      keyboardType="decimal-pad"
                    />
                  )}

                  {projectType === "Villa" && (
                    <TextInput
                      placeholder="Densité/ha (unités/ha)"
                      style={styles.input}
                      value={densityGlobal}
                      onChangeText={setDensityGlobal}
                      keyboardType="decimal-pad"
                    />
                  )}

                  {projectType === "Lot de villas" && (
                    <>
                      <TextInput
                        placeholder="Densité/ha (unités/ha)"
                        style={styles.input}
                        value={densityGlobal}
                        onChangeText={setDensityGlobal}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        placeholder="CUS"
                        style={styles.input}
                        value={cus}
                        onChangeText={setCus}
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Densité globale pour les mixtes */}
                  {projectType === "Villa/Lot de villas" && (
                    <TextInput
                      placeholder="Densité globale (unités/ha)"
                      style={styles.input}
                      value={densityGlobal}
                      onChangeText={setDensityGlobal}
                      keyboardType="decimal-pad"
                    />
                  )}

                  {isMixedProject && categories.includes("Collectif") && (
                    <TextInput
                      placeholder="Densité Collectif (unités/immeuble)"
                      style={styles.input}
                      value={densityCollectif}
                      onChangeText={setDensityCollectif}
                      keyboardType="decimal-pad"
                    />
                  )}

                  {isMixedProject && categories.includes("Villa") && (
                    <TextInput
                      placeholder="Densité Villa (unités/ha)"
                      style={styles.input}
                      value={densityVilla}
                      onChangeText={setDensityVilla}
                      keyboardType="decimal-pad"
                    />
                  )}

                  {isMixedProject && categories.includes("Lot de villas") && (
                    <>
                      <TextInput
                        placeholder="Densité Lot de villas (unités/ha)"
                        style={styles.input}
                        value={densityVillaLot}
                        onChangeText={setDensityVillaLot}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        placeholder="CUS"
                        style={styles.input}
                        value={cus}
                        onChangeText={setCus}
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

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

  convertButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },

  convertButtonText: {
    color: AppColors.ui.background,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  unitToggleButton: {
    paddingVertical: 0,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
    height: 50,
  },

  unitToggleText: {
    color: AppColors.ui.background,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
});