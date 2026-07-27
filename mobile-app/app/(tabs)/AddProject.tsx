// mobile-app/app/(tabs)/AddProject.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { OpenLocationCode } from "open-location-code";

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

const moroccoCities = [
  "Agadir",
  "Ahfir",
  "Aït Melloul",
  "Al Hoceïma",
  "Asilah",
  "Azemmour",
  "Azrou",
  "Béni Mellal",
  "Berkane",
  "Berrechid",
  "Bouarfa",
  "Bouskoura",
  "Bouznika",
  "Casablanca",
  "Chefchaouen",
  "Chichaoua",
  "Dakhla",
  "El Hajeb",
  "El Jadida",
  "Errachidia",
  "Essaouira",
  "Fès",
  "Fnideq",
  "Guelmim",
  "Ifrane",
  "Jerada",
  "Kénitra",
  "Khemisset",
  "Khémis Zemamra",
  "Khénifra",
  "Khouribga",
  "Ksar El Kébir",
  "Laâyoune",
  "Larache",
  "Martil",
  "Marrakech",
  "Mechra Bel Ksiri",
  "Midelt",
  "Mohammédia",
  "Nador",
  "Ouarzazate",
  "Ouezzane",
  "Oujda",
  "Rabat",
  "Safi",
  "Salé",
  "Sefrou",
  "Settat",
  "Sidi Bennour",
  "Sidi Ifni",
  "Sidi Kacem",
  "Sidi Slimane",
  "Skhirat",
  "Souk El Arbaa",
  "Taounate",
  "Tarfaya",
  "Taroudant",
  "Taourirt",
  "Taza",
  "Témara",
  "Tétouan",
  "Tinghir",
  "Tiznit",
  "Youssoufia",
  "Zagora",
  "Autre",
];

const neighbourhoodOptions = [
  "Anfa",
  "Gauthier",
  "Maarif",
  "Sidi Maarouf",
  "Ain Sebaa",
  "Hay Hassani",
  "Hay Riad",
  "Agdal",
  "Guéliz",
  "Palmeraie",
  "Sidi Belyout",
  "Centre Ville",
  "Palmier",
  "Riyad",
  "Bernoussi",
  "Hay Mohammadi",
  "Mers Sultan",
  "Habbous",
  "Nour",
  "Val Fleuri",
];

const cityQuartiers: Record<string, string[]> = {
  Agadir: ["Talborjt", "Founty", "Hay Mohammadi", "Dakhla", "Charaf", "Bensergao", "Anza", "Tikiouine", "Al Massira"],
  Ahfir: ["Centre-ville", "Hay Khattab", "Oulad El Mokhtar", "Hay Al Fath"],
  "Aït Melloul": ["Al Massira 1", "Al Massira 2", "Mhamid", "Bouregreg"],
  "Al Hoceïma": ["Boulevard Mohamed V", "Ben Ziane", "Tanger", "Boulevard Abdelkrim El Khattabi", "Boinsouda"],
  Asilah: ["Medina", "Quat", "Boulevard", "Bab al Bahr"],
  Azemmour: ["Quartier du Port", "Sidi Ibrahim", "Saada", "La Kasbah"],
  Azrou: ["Hay Rimal", "Bizerte", "Taddart", "El Mansour"],
  "Béni Mellal": ["Ain Asserdoun", "Sidi Rahal", "Hay Hamdouch", "Oued Zem"],
  Berkane: ["Hay Mohammadi", "Cité Saiada", "Boulevard Mohamed V", "Oued Zegzoug"],
  Berrechid: ["Hay Nahda", "Hay Salam", "Cité Al Amal", "Centre-ville"],
  Bouarfa: ["Hay Mohammadi", "Quartier Industriel", "Ouled El Habib"],
  Bouskoura: ["Bouskoura City", "Emaar", "Palmier", "Canal"],
  Bouznika: ["Plage", "Quartier Résidentiel", "Hay Al Bahr"],
  Casablanca: ["Maarif", "Anfa", "Ain Diab", "Sidi Maârouf", "Bourgogne", "Hay Hassani", "Sidi Bernoussi", "Gauthier", "Habbous", "Sidi Belyout", "Ain Sebaa", "Hay Mohammadi", "Racine", "Derb Omar"],
  Chefchaouen: ["Medina", "Bab Souk", "Kasbah", "Ouazzane", "Bab El Ansar"],
  Chichaoua: ["Centre-ville", "Hay Anfa", "Ain Zaalan"],
  Dakhla: ["Quartier Administratif", "Al Massira", "Hay Al Bahr", "Oued Eddahab"],
  "El Hajeb": ["Centre-ville", "Hay Rachad", "El Maârif"],
  "El Jadida": ["Quartier du Stade", "Ksar", "Boulevard Mohammed V", "Al Massira"],
  Errachidia: ["Hay Mohamed V", "Les Américains", "Oued Ziz", "Centre-ville"],
  Essaouira: ["Medina", "Quartier des Pêcheurs", "Laksar", "Mellah"],
  Fès: ["Fès El Bali", "Fès Jdid", "Agdal", "Zouagha", "Narjiss", "Route d'Imouzzer", "Saiss", "Mellah", "Ain Azliten"],
  Fnideq: ["Malabata", "Bab Sebta", "Cité Jidar", "Sidi Bouzid"],
  Guelmim: ["Hay Tiout", "Boulevard Abdelkrim", "Mohammed V", "El Ksar"],
  Ifrane: ["Quartier universitaire", "Al Atlas", "Azrou", "Moulay Rachid"],
  Jerada: ["Quartier Industriel", "Oued El Arab", "Hay Ennakhil"],
  "Kénitra": ["Maamora", "La Ville Haute", "Mimosas", "Bir Rami", "El Haddada", "Saknia", "Val Fleuri", "Hay Al Qods"],
  Khemisset: ["Boulevard Mohamed V", "Hay Al Mahrouss", "Cité Moulay Rachid"],
  "Khémis Zemamra": ["Hay Lahrir", "Quartier Industriel", "Oued Zem"],
  Khénifra: ["Ville Nouvelle", "Oued El Abid", "Hay Riad"],
  Khouribga: ["Hay Al Salam", "Cité Mouvements", "Oued El Arab"],
  "Ksar El Kébir": ["Quartier El Mansour", "Diego Suarez", "Hay Salam"],
  "Laâyoune": ["Hay Al Massira", "Hay Salam", "Boulevard Hassan II", "Quartier Administratif"],
  Larache: ["Hay El Jadida", "Centre-ville", "Oued El Makhazine"],
  Martil: ["Corniche", "Quartier Portuaire", "Hay Salam"],
  Marrakech: ["Guéliz", "Hivernage", "Médina", "Sidi Youssef Ben Ali (SYBA)", "Daoudiate", "Targa", "Massira", "Sidi Ghanem", "Palmeraie", "Bab Doukkala"],
  "Mechra Bel Ksiri": ["Quartier Agricole", "Cité Moussa", "Souk"],
  Midelt: ["Hay Al Amal", "Quartier Ouest", "Hay Rissani"],
  "Mohammédia": ["Centre-ville", "Sidi Moussa", "Hay Mohammadi", "Cité Galilée"],
  Nador: ["Souk Ziraoui", "Hay Salam", "Beni Roumman", "Cité Al Wifaq"],
  "Ouarzazate": ["Village des Arts", "Hay Laksour", "Cité Al Atlas"],
  Ouezzane: ["Quartier Andalou", "Hay Riad", "Centre-ville"],
  Oujda: ["Hay Al Qods", "Hay Al Andalous", "Lazaret", "Sidi Yahya", "Hay Ennour", "Centre-ville", "Hay El Fath"],
  Rabat: ["Agdal", "Hassan", "Hay Riad", "Yacoub El Mansour", "Souissi", "Océan", "Akkari", "Quartier des Orangers"],
  Safi: ["Quartier Industriel", "Hay Al Hssaine", "Jadida", "Cité Saïd"],
  Salé: ["Tabriquet", "Bettana", "Hay Salam", "Sala Al Jadida", "Hay Rahma", "Sidi Moussa", "Bab Lamrissa"],
  Sefrou: ["Bab El Qebbour", "Cité Al Qods", "Hay Moulay Rachid"],
  Settat: ["Quartier du Stade", "Hay Fokhar", "Ain Noujoum"],
  "Sidi Bennour": ["Hay El Basma", "Centre-ville"],
  "Sidi Ifni": ["La Plage", "Cité Nelson Mandela"],
  "Sidi Kacem": ["Hay El Hana", "Quartier Industriel"],
  "Sidi Slimane": ["Hay Riad", "Centre-ville"],
  Skhirat: ["Plage", "Cité Sea Golf", "Hay Al Amal"],
  "Souk El Arbaa": ["Hay Ennakhil", "Quartier du Souk"],
  Taounate: ["Hay Souani", "Cité Administrative"],
  Tarfaya: ["Corniche", "Hay Al Matar"],
  Taroudant: ["Hay El Wadi", "Quartier Souk", "Cité Al Wifaq"],
  Taourirt: ["Quartier des Princes", "Hay Al Khair"],
  Taza: ["Quartier Boulevard", "Hay El Irfane", "Centre-ville"],
  Témara: ["Boukhalef", "Riad Salam", "Founty"],
  "Tétouan": ["Martil", "Fnideq", "Quartier Andalou", "Boulevard Hassan II"],
  Tinghir: ["Hay El Matar", "Cité Ouarzazate"],
  Tiznit: ["Quartier des Artisans", "Hay Al Amal", "Cité Saada"],
  Youssoufia: ["Quartier Industriel", "Hay Al Massira"],
  Zagora: ["Quartier du Souk", "Boulevard Hassan II"],
  Autre: ["Centre-ville", "Quartier Administratif", "Hay Riad", "Ville Nouvelle"],
};

const statusOptions = [
  "Livré",
  "En cours de livraison/construction",
];

const residentialAmenitiesOptions = [
  "Piscine",
  "Salle de sport",
  "Jardin",
  "Sécurité 24/7",
  "Parking",
  "Club enfant",
];

const projectComponentsOptions = [
  "Résidentiel",
  "Commerces",
  "Bureaux",
  "Hôtel",
  "Espaces verts",
  "Parking",
  "Loisirs",
];

const toggleSelection = (
  option: string,
  selected: string[],
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
) => {
  if (selected.includes(option)) {
    setSelected(selected.filter((item) => item !== option));
  } else {
    setSelected([...selected, option]);
  }
};

const businessModelOptions = ["vente", "location", "mixte vente-location", "autre"];
const standingOptions = [
  "economique",
  "moyen de gamme",
  "moyen de gamme +",
  "haut de gamme",
  "haut de gamme +",
  "premium",
];

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const getCalendarMatrix = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows: Array<Array<Date | null>> = [];
  let currentDay = 1;

  for (let row = 0; row < 6; row += 1) {
    const week: Array<Date | null> = [];
    for (let col = 0; col < 7; col += 1) {
      if (row === 0 && col < firstDay) {
        week.push(null);
      } else if (currentDay > daysInMonth) {
        week.push(null);
      } else {
        week.push(new Date(year, month, currentDay));
        currentDay += 1;
      }
    }
    rows.push(week);
  }
  return rows;
};

const cleanupPercentValue = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
};

const filterSuggestions = (value: string, list: string[]) => {
  const query = value.trim().toLowerCase();
  if (!query) return list;
  return list.filter((item) => item.toLowerCase().startsWith(query));
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
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [showMainTypeModal, setShowMainTypeModal] = useState(!projectId);
  const [showMixedTypeModal, setShowMixedTypeModal] = useState(false);
  const [projectType, setProjectType] = useState("");
  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain">("standard");

  // --- Infos globales projet ---
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [developer, setDeveloper] = useState("");
  const [status, setStatus] = useState("");
  const [showStatusSuggestions, setShowStatusSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<"city" | "quartier" | null>(null);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [showStartCommercialDatePicker, setShowStartCommercialDatePicker] = useState(false);
  const [deliveryDateObj, setDeliveryDateObj] = useState<Date | null>(null);
  const [startCommercialDateObj, setStartCommercialDateObj] = useState<Date | null>(null);
  const [activeCalendar, setActiveCalendar] = useState<"delivery" | "start" | null>(null);

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
  const [surfaceHabitableMin, setSurfaceHabitableMin] = useState("");
  const [surfaceHabitableMax, setSurfaceHabitableMax] = useState("");
  const [surfaceTerrasseMin, setSurfaceTerrasseMin] = useState("");
  const [surfaceTerrasseMax, setSurfaceTerrasseMax] = useState("");
  const [surfaceTerrainMin, setSurfaceTerrainMin] = useState("");
  const [surfaceTerrainMax, setSurfaceTerrainMax] = useState("");
  const [cusTypology, setCusTypology] = useState("");
  const [cosTypology, setCosTypology] = useState("");
  const [hauteurTypology, setHauteurTypology] = useState("");
  const [pricingMode, setPricingMode] = useState<"from" | "between">("from");
  const [pricingMin, setPricingMin] = useState("");
  const [pricingMax, setPricingMax] = useState("");
  const [pricingUnit, setPricingUnit] = useState("MMAD");
  const [pricingComment, setPricingComment] = useState("");
  const [units, setUnits] = useState("");
  const [typologiesList, setTypologiesList] = useState<any[]>([]);
  const [standingCible, setStandingCible] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenitiesCustom, setAmenitiesCustom] = useState("");
  const [projectComponents, setProjectComponents] = useState<string[]>([]);
  const [projectComponentsCustom, setProjectComponentsCustom] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [businessModelCustom, setBusinessModelCustom] = useState("");

  // --- Localisation ---
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [loadingLocationSearch, setLoadingLocationSearch] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");

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
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.5731,
    longitude: -7.5898,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView | null>(null);
  const openLocationCode = new OpenLocationCode();

  // --- Unités de surface ---
  const [unitTotalSurface, setUnitTotalSurface] = useState<"m²" | "ha">("m²");
  const [unitCollectifSurface, setUnitCollectifSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaSurface, setUnitVillaSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaLotSurface, setUnitVillaLotSurface] = useState<"m²" | "ha">("m²");

  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        return;
      }

      // Réinitialiser TOUS les champs pour un nouveau projet
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
      setSurfaceHabitableMin("");
      setSurfaceHabitableMax("");
      setSurfaceTerrasseMin("");
      setSurfaceTerrasseMax("");
      setSurfaceTerrainMin("");
      setSurfaceTerrainMax("");
      setPricingMode("from");
      setPricingMin("");
      setPricingMax("");
      setPricingUnit("MMAD");
      setPricingComment("");
      setUnits("");
      setCusTypology("");
      setCosTypology("");
      setHauteurTypology("");
      setTypologiesList([]);
      setStandingCible("");
      setAmenities([]);
      setAmenitiesCustom("");
      setProjectComponents([]);
      setProjectComponentsCustom("");
      setBusinessModel("");
      
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
    }, [projectId])
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

  const getCitySuggestions = () => filterSuggestions(city, moroccoCities);
  const getQuartierSuggestions = () => {
    const cityKey = moroccoCities.find((item) => item.toLowerCase() === city.trim().toLowerCase());
    const quartierList = cityKey ? cityQuartiers[cityKey] ?? neighbourhoodOptions : neighbourhoodOptions;
    return filterSuggestions(quartier, quartierList);
  };
  const getStatusSuggestions = () => filterSuggestions(status, statusOptions);

  const onSelectCity = (value: string) => {
    setCity(value);
    setActiveSuggestion(null);
  };

  const loadProjectForEdit = async (id: string) => {
    setIsLoadingProject(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError || !projectData) {
        console.error("Erreur chargement projet", projectError);
        Alert.alert("Erreur", "Impossible de charger le projet.");
        return;
      }

      setEditingProjectId(id);
      setIsEditMode(true);
      setShowMainTypeModal(false);
      setShowMixedTypeModal(false);
      setProjectType(projectData.project_type || "");
      setName(projectData.name || "");
      setCity(projectData.city || "");
      setQuartier(projectData.quartier || "");
      setDeveloper(projectData.developer || "");
      setStatus(projectData.status || "");
      setStandingCible(projectData.standing_cible || "");
      setBusinessModel(projectData.business_model || "");
      setAmenities(projectData.amenities || []);
      setProjectComponents(projectData.project_components || []);
      setSurfaceFonciereTotal(projectData.surface_fonciere_totale?.toString() || "");
      setSurfaceFonciereCollectif(projectData.surface_fonciere_collectif?.toString() || "");
      setSurfaceFonciereVilla(projectData.surface_fonciere_villa?.toString() || "");
      setSurfaceFonciereVillaLot(projectData.surface_fonciere_lot_villas?.toString() || "");
      setTotalUnitsGlobal(projectData.total_units?.toString() || "");
      setTotalUnitsCollectif(projectData.total_units_collectif?.toString() || "");
      setTotalUnitsVilla(projectData.total_units_villa?.toString() || "");
      setTotalUnitsVillaLot(projectData.total_units_lot_villas?.toString() || "");
      setDeliveryDate(projectData.delivery_date || "");
      setStartCommercialDate(projectData.start_commercial_date || "");
      setCommercializationRateGlobal(projectData.commercialization_rate_global?.toString() || "");
      setCommercializationRateCollectif(projectData.commercialization_rate_collectif?.toString() || "");
      setCommercializationRateVilla(projectData.commercialization_rate_villa?.toString() || "");
      setCommercializationRateVillaLot(projectData.commercialization_rate_lot_villas?.toString() || "");
      setSalesVelocityGlobal(projectData.sales_velocity_global?.toString() || "");
      setSalesVelocityCollectif(projectData.sales_velocity_collectif?.toString() || "");
      setSalesVelocityVilla(projectData.sales_velocity_villa?.toString() || "");
      setSalesVelocityVillaLot(projectData.sales_velocity_lot_villas?.toString() || "");
      setUnitsRemainingGlobal(projectData.units_remaining_global?.toString() || "");
      setUnitsRemainingCollectif(projectData.units_remaining_collectif?.toString() || "");
      setUnitsRemainingVilla(projectData.units_remaining_villa?.toString() || "");
      setUnitsRemainingVillaLot(projectData.units_remaining_lot_villas?.toString() || "");
      setLatitude(projectData.latitude ?? null);
      setLongitude(projectData.longitude ?? null);
      setMapRegion({
        latitude: projectData.latitude || 33.5731,
        longitude: projectData.longitude || -7.5898,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const { data: typologiesData, error: typologiesError } = await supabase
        .from("projects_typologies")
        .select("*")
        .eq("project_id", id);

      if (typologiesError) {
        console.error("Erreur chargement typologies", typologiesError);
      } else {
        setTypologiesList(
          typologiesData?.map((t: any) => ({
            typology_category: t.typology_category,
            typology: t.typology,
            surfaceHabitableMin: t.surface_habitable_min?.toString() || "",
            surfaceHabitableMax: t.surface_habitable_max?.toString() || "",
            surfaceTerrasseMin: t.surface_terrasse_min?.toString() || "",
            surfaceTerrasseMax: t.surface_terrasse_max?.toString() || "",
            surfaceTerrainMin: t.surface_terrain_min?.toString() || "",
            surfaceTerrainMax: t.surface_terrain_max?.toString() || "",
            cus: t.cus?.toString() || "",
            cos: t.cos?.toString() || "",
            hauteur: t.hauteur || "",
            pricingMode: t.pricing_type || "from",
            pricingMin: t.pricing_min?.toString() || "",
            pricingMax: t.pricing_max?.toString() || "",
            pricingUnit: t.pricing_unit || "MMAD",
            pricingComment: t.pricing_comment || "",
            units: t.units?.toString() || "",
          })) || []
        );
      }

      const { data: densityData, error: densityError } = await supabase
        .from("projects_density")
        .select("*")
        .eq("project_id", id);

      if (!densityError && densityData) {
        const densityGlobalRow = densityData.find((row: any) => row.category === "global" && row.density_type === "density");
        const densityCollectifRow = densityData.find((row: any) => row.category === "Collectif");
        const densityVillaRow = densityData.find((row: any) => row.category === "Villa");
        const densityLotRow = densityData.find((row: any) => row.category === "Lot de villas");
        const cusRow = densityData.find((row: any) => row.density_type === "CUS");

        setDensityGlobal(densityGlobalRow?.density_value?.toString() || "");
        setDensityCollectif(densityCollectifRow?.density_value?.toString() || "");
        setDensityVilla(densityVillaRow?.density_value?.toString() || "");
        setDensityVillaLot(densityLotRow?.density_value?.toString() || "");
        setCus(cusRow?.density_value?.toString() || "");
      }

      const { data: retailData, error: retailError } = await supabase
        .from("projects_retail")
        .select("*")
        .eq("project_id", id)
        .single();

      if (!retailError && retailData) {
        setGla(retailData.gla?.toString() || "");
        setPositionnement(retailData.positionnement || "");
        setMixRetail(retailData.mix_retail || "");
        setEnseignes(retailData.enseignes || "");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de charger le projet.");
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProjectForEdit(projectId);
    }
  }, [projectId]);

  const onSelectQuartier = (value: string) => {
    setQuartier(value);
    setActiveSuggestion(null);
  };

  const onSelectStatus = (value: string) => {
    setStatus(value);
    setShowStatusSuggestions(false);
  };

  if (projectId && isLoadingProject) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary.main} />
        <Text style={styles.loadingText}>Chargement du projet…</Text>
      </View>
    );
  }

  const getCalendarRows = (date: Date) => getCalendarMatrix(date);

  const changeCalendarMonth = (type: "delivery" | "start", delta: number) => {
    if (type === "delivery") {
      const current = deliveryDateObj || new Date();
      setDeliveryDateObj(new Date(current.getFullYear(), current.getMonth() + delta, 1));
    } else {
      const current = startCommercialDateObj || new Date();
      setStartCommercialDateObj(new Date(current.getFullYear(), current.getMonth() + delta, 1));
    }
  };

  const onCalendarDateSelect = (type: "delivery" | "start", date: Date) => {
    const value = formatDate(date);
    if (type === "delivery") {
      setDeliveryDateObj(date);
      setDeliveryDate(value);
      setShowDeliveryDatePicker(false);
      setActiveCalendar(null);
    } else {
      setStartCommercialDateObj(date);
      setStartCommercialDate(value);
      setShowStartCommercialDatePicker(false);
      setActiveCalendar(null);
    }
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
        surfaceHabitableMin,
        surfaceHabitableMax,
        surfaceTerrasseMin,
        surfaceTerrasseMax,
        surfaceTerrainMin,
        surfaceTerrainMax,
        cus: cusTypology,
        cos: cosTypology,
        hauteur: hauteurTypology,
        pricingMode,
        pricingMin,
        pricingMax,
        pricingUnit,
        pricingComment,
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
    setSurfaceHabitableMin("");
    setSurfaceHabitableMax("");
    setSurfaceTerrasseMin("");
    setSurfaceTerrasseMax("");
    setSurfaceTerrainMin("");
    setSurfaceTerrainMax("");
    setCusTypology("");
    setCosTypology("");
    setHauteurTypology("");
    setPricingMode("from");
    setPricingMin("");
    setPricingMax("");
    setPricingUnit("MMAD");
    setPricingComment("");
    setUnits("");
    setBusinessModelCustom("");
  };

  const extractPlusCode = (text: string): string | null => {
    const match = text.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}/i);
    return match ? match[0].toUpperCase() : null;
  };

  const getPhotonResults = async (query: string) => {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=fr`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "RealEstateMapper/1.0 (contact@votre-domaine.com)",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Photon search failed", response.status, text);
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((feature: any) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [];
      const labelParts = [props.name, props.street, props.city, props.state, props.country]
        .filter(Boolean);
      return {
        lat: coords[1]?.toString() || "0",
        lon: coords[0]?.toString() || "0",
        display_name: labelParts.join(", ") || "Résultat de localisation",
        type: props.type || props.osm_key || "",
      };
    });
  };

  const geocodeReferenceLocation = async (query: string) => {
    const results = await getPhotonResults(query);
    if (results.length === 0) return null;
    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  };

  const decodePlusCodeQuery = async (query: string, plusCode: string) => {
    if (!plusCode) return null;

    if (openLocationCode.isValid(plusCode) && !openLocationCode.isShort(plusCode)) {
      const decoded = openLocationCode.decode(plusCode);
      return {
        lat: decoded.latitudeCenter.toString(),
        lon: decoded.longitudeCenter.toString(),
        display_name: plusCode,
      };
    }

    const context = query.replace(plusCode, "").trim();
    if (!context) {
      return null;
    }

    const reference = await geocodeReferenceLocation(context);
    if (!reference) {
      return null;
    }

    const recoveredCode = openLocationCode.recoverNearest(plusCode, reference.latitude, reference.longitude);
    if (typeof recoveredCode !== "string") {
      return null;
    }

    const decoded = openLocationCode.decode(recoveredCode);
    return {
      lat: decoded.latitudeCenter.toString(),
      lon: decoded.longitudeCenter.toString(),
      display_name: `${recoveredCode} - ${context}`,
    };
  };

  const searchLocation = async () => {
    const query = locationQuery.trim();
    if (!query) {
      Alert.alert("Recherche", "Entrez une adresse ou un lieu à rechercher.");
      return;
    }

    setLoadingLocationSearch(true);
    try {
      const plusCode = extractPlusCode(query);
      if (plusCode) {
        const decoded = await decodePlusCodeQuery(query, plusCode);
        if (decoded) {
          applyLocationResult(decoded);
          setLoadingLocationSearch(false);
          return;
        }
      }

      const results = await getPhotonResults(query);
      if (results.length === 0) {
        setLocationResults([]);
        Alert.alert("Aucun résultat", "Aucun emplacement trouvé pour cette recherche.");
        return;
      }

      setLocationResults(results);
    } catch (error) {
      console.error("Location search error", error);
      Alert.alert("Erreur", "Impossible de rechercher l'emplacement, réessayez.");
      setLocationResults([]);
    } finally {
      setLoadingLocationSearch(false);
    }
  };

  const applyLocationResult = (result: any) => {
    const latitudeResult = parseFloat(result.lat);
    const longitudeResult = parseFloat(result.lon);
    if (Number.isNaN(latitudeResult) || Number.isNaN(longitudeResult)) {
      Alert.alert("Erreur", "Coordonnées invalides pour ce résultat.");
      return;
    }

    const newRegion = {
      latitude: latitudeResult,
      longitude: longitudeResult,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setLatitude(latitudeResult);
    setLongitude(longitudeResult);
    setMapRegion(newRegion);
    setSelectedLocationLabel(result.display_name || locationQuery);
    setLocationResults([]);

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 600);
    }
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

  const saveProject = async () => {
    if (!latitude || !longitude) {
      Alert.alert("Erreur", "Place le projet sur la carte");
      return;
    }

    const normalizedAmenities = [...amenities];
    if (amenitiesCustom.trim()) normalizedAmenities.push(amenitiesCustom.trim());

    const normalizedProjectComponents = [...projectComponents];
    if (projectComponentsCustom.trim()) normalizedProjectComponents.push(projectComponentsCustom.trim());

    const projectData = {
      name,
      city,
      quartier,
      latitude,
      longitude,
      developer,
      project_type: projectType,
      status,
      standing_cible: standingCible || null,
      business_model: businessModel === "autre" ? (businessModelCustom || null) : businessModel || null,
      amenities: normalizedAmenities.length ? normalizedAmenities : null,
      project_components: normalizedProjectComponents.length ? normalizedProjectComponents : null,
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
    };

    let projectIdToUse = editingProjectId;
    let projectResponse;

    if (isEditMode && editingProjectId) {
      const { data, error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", editingProjectId)
        .select();

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      projectResponse = data;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert([projectData])
        .select();

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      projectResponse = data;
      projectIdToUse = (data && data[0]?.id) || null;
    }

    if (!projectIdToUse) {
      Alert.alert("Erreur", "Impossible de récupérer l'ID du projet.");
      return;
    }

    // Sauvegarder les typologies
    await supabase.from("projects_typologies").delete().eq("project_id", projectIdToUse);
    for (let t of typologiesList) {
      await supabase.from("projects_typologies").insert([{
        project_id: projectIdToUse,
        typology_category: t.typology_category,
        typology: t.typology,
        surface_habitable_min: parseFloat(t.surfaceHabitableMin) || null,
        surface_habitable_max: parseFloat(t.surfaceHabitableMax) || null,
        surface_terrasse_min: parseFloat(t.surfaceTerrasseMin) || null,
        surface_terrasse_max: parseFloat(t.surfaceTerrasseMax) || null,
        surface_terrain_min: parseFloat(t.surfaceTerrainMin) || null,
        surface_terrain_max: parseFloat(t.surfaceTerrainMax) || null,
        cus: t.cus ? parseFloat(t.cus) : null,
        cos: t.cos ? parseFloat(t.cos) : null,
        hauteur: t.hauteur || null,
        pricing_type: t.pricingMode,
        pricing_min: parseFloat(t.pricingMin) || null,
        pricing_max: parseFloat(t.pricingMax) || null,
        pricing_unit: t.pricingUnit || null,
        pricing_comment: t.pricingComment || null,
        units: parseInt(t.units) || null,
      }]);
    }

    await supabase.from("projects_density").delete().eq("project_id", projectIdToUse);
    if (densityGlobal) {
      await supabase.from("projects_density").insert([{
        project_id: projectIdToUse,
        density_type: "density",
        category: "global",
        density_value: parseFloat(densityGlobal),
      }]);
    }

    if (densityCollectif && categories.includes("Collectif")) {
      await supabase.from("projects_density").insert([{
        project_id: projectIdToUse,
        density_type: "density",
        category: "Collectif",
        density_value: parseFloat(densityCollectif),
      }]);
    }

    if (densityVilla && categories.includes("Villa")) {
      await supabase.from("projects_density").insert([{
        project_id: projectIdToUse,
        density_type: "density",
        category: "Villa",
        density_value: parseFloat(densityVilla),
      }]);
    }

    if (densityVillaLot && categories.includes("Lot de villas")) {
      await supabase.from("projects_density").insert([{
        project_id: projectIdToUse,
        density_type: "density",
        category: "Lot de villas",
        density_value: parseFloat(densityVillaLot),
      }]);
    }

    await supabase.from("projects_density").delete().eq("project_id", projectIdToUse).eq("density_type", "CUS");
    if (cus && categories.includes("Lot de villas")) {
      await supabase.from("projects_density").insert([{
        project_id: projectIdToUse,
        density_type: "CUS",
        category: "global",
        density_value: parseFloat(cus),
      }]);
    }

    if (projectType === "Retail") {
      await supabase.from("projects_retail").delete().eq("project_id", projectIdToUse);
      await supabase.from("projects_retail").insert([{
        project_id: projectIdToUse,
        gla: parseFloat(gla),
        positionnement,
        mix_retail: mixRetail,
        enseignes,
      }]);
    }

    Alert.alert("Succès", isEditMode ? "Projet mis à jour !" : "Projet ajouté !");
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

          <TextInput
            placeholder="Nom du projet"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <View style={{ position: "relative" }}>
            <TextInput
              placeholder="Ville"
              style={styles.input}
              value={city}
              onChangeText={(text) => {
                setCity(text);
                setActiveSuggestion("city");
              }}
              onFocus={() => setActiveSuggestion("city")}
            />
            {activeSuggestion === "city" && getCitySuggestions().length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.suggestionsContent}
              >
                {getCitySuggestions().map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionItem}
                    onPress={() => onSelectCity(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          <View style={{ position: "relative" }}>
            <TextInput
              placeholder="Quartier"
              style={styles.input}
              value={quartier}
              onChangeText={(text) => {
                setQuartier(text);
                setActiveSuggestion("quartier");
              }}
              onFocus={() => setActiveSuggestion("quartier")}
            />
            {activeSuggestion === "quartier" && getQuartierSuggestions().length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.suggestionsContent}
              >
                {getQuartierSuggestions().map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionItem}
                    onPress={() => onSelectQuartier(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          <TextInput placeholder="Développeur" style={styles.input} onChangeText={setDeveloper} />
          <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Standing / cible</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {standingOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: standingCible === opt ? AppColors.primary.main : AppColors.gray.lighter,
                  backgroundColor: standingCible === opt ? AppColors.primary.light + "30" : AppColors.ui.background,
                }}
                onPress={() => setStandingCible(opt)}
              >
                <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

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

          <View style={{ position: "relative" }}>
            <TextInput
              placeholder="Statut"
              style={styles.input}
              value={status}
              onChangeText={(text) => {
                setStatus(text);
                setShowStatusSuggestions(true);
              }}
              onFocus={() => setShowStatusSuggestions(true)}
            />
            {showStatusSuggestions && getStatusSuggestions().length > 0 && (
              <View style={styles.suggestionsContainer}>
                {getStatusSuggestions().map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionItem}
                    onPress={() => onSelectStatus(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Dates */}
          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.8}
            onPress={() => {
              setShowDeliveryDatePicker(true);
              setActiveCalendar("delivery");
              if (!deliveryDateObj) setDeliveryDateObj(new Date());
            }}
          >
            <Text style={[styles.dateInputText, !deliveryDate && styles.placeholderText]}>
              {deliveryDate || "Date livraison"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.8}
            onPress={() => {
              setShowStartCommercialDatePicker(true);
              setActiveCalendar("start");
              if (!startCommercialDateObj) setStartCommercialDateObj(new Date());
            }}
          >
            <Text style={[styles.dateInputText, !startCommercialDate && styles.placeholderText]}>
              {startCommercialDate || "Début commercialisation"}
            </Text>
          </TouchableOpacity>

          {(showDeliveryDatePicker || showStartCommercialDatePicker) && (
            <Modal transparent animationType="fade">
              <View style={styles.calendarModalOverlay}>
                <View style={styles.calendarModal}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarMonth("delivery", -1);
                        else changeCalendarMonth("start", -1);
                      }}
                    >
                      <Text style={styles.calendarNavButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      {activeCalendar === "delivery"
                        ? `${monthNames[(deliveryDateObj || new Date()).getMonth()]} ${(deliveryDateObj || new Date()).getFullYear()}`
                        : `${monthNames[(startCommercialDateObj || new Date()).getMonth()]} ${(startCommercialDateObj || new Date()).getFullYear()}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarMonth("delivery", 1);
                        else changeCalendarMonth("start", 1);
                      }}
                    >
                      <Text style={styles.calendarNavButtonText}>{">"}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekRow}>
                    {['D','L','M','M','J','V','S'].map((weekday, idx) => (
                      <Text key={`${weekday}-${idx}`} style={styles.calendarWeekDay}>
                        {weekday}
                      </Text>
                    ))}
                  </View>

                  {(activeCalendar === "delivery" ? getCalendarRows(deliveryDateObj || new Date()) : getCalendarRows(startCommercialDateObj || new Date())).map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarRow}>
                      {week.map((day, dayIndex) => {
                        const isSelected = day
                          ? (activeCalendar === "delivery"
                              ? deliveryDate === formatDate(day)
                              : startCommercialDate === formatDate(day))
                          : false;
                        return (
                          <TouchableOpacity
                            key={dayIndex}
                            style={[
                              styles.calendarDay,
                              isSelected && styles.calendarDaySelected,
                              !day && styles.calendarDayEmpty,
                            ]}
                            disabled={!day}
                            onPress={() => day && onCalendarDateSelect(activeCalendar || "delivery", day)}
                          >
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
                              {day ? day.getDate() : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.calendarCloseButton}
                    onPress={() => {
                      setShowDeliveryDatePicker(false);
                      setShowStartCommercialDatePicker(false);
                      setActiveCalendar(null);
                    }}
                  >
                    <Text style={styles.calendarCloseButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {/* Commercialisation */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Commercialisation
          </ThemedText>

          <TextInput
            placeholder="Taux commercialisation global"
            style={styles.input}
            value={commercializationRateGlobal ? `${commercializationRateGlobal}%` : ""}
            onChangeText={(text) => setCommercializationRateGlobal(cleanupPercentValue(text))}
            keyboardType="numeric"
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Taux commercialisation Collectif"
              style={styles.input}
              value={commercializationRateCollectif ? `${commercializationRateCollectif}%` : ""}
              onChangeText={(text) => setCommercializationRateCollectif(cleanupPercentValue(text))}
              keyboardType="numeric"
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Taux commercialisation Villa"
              style={styles.input}
              value={commercializationRateVilla ? `${commercializationRateVilla}%` : ""}
              onChangeText={(text) => setCommercializationRateVilla(cleanupPercentValue(text))}
              keyboardType="numeric"
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Taux commercialisation Lot de villas"
              style={styles.input}
              value={commercializationRateVillaLot ? `${commercializationRateVillaLot}%` : ""}
              onChangeText={(text) => setCommercializationRateVillaLot(cleanupPercentValue(text))}
              keyboardType="numeric"
            />
          )}

          {/* Taux d'écoulement */}
          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Taux d'Écoulement (unité/mois)
          </ThemedText>

          <TextInput
            placeholder="Taux d'écoulement global (unité/mois)"
            style={styles.input}
            value={salesVelocityGlobal ? `${salesVelocityGlobal} unité/mois` : ""}
            onChangeText={(text) => setSalesVelocityGlobal(cleanupPercentValue(text))}
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Taux d'écoulement Collectif (unité/mois)"
              style={styles.input}
              value={salesVelocityCollectif ? `${salesVelocityCollectif} unité/mois` : ""}
              onChangeText={(text) => setSalesVelocityCollectif(cleanupPercentValue(text))}
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Taux d'écoulement Villa (unité/mois)"
              style={styles.input}
              value={salesVelocityVilla ? `${salesVelocityVilla} unité/mois` : ""}
              onChangeText={(text) => setSalesVelocityVilla(cleanupPercentValue(text))}
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Taux d'écoulement Lot de villas (unité/mois)"
              style={styles.input}
              value={salesVelocityVillaLot ? `${salesVelocityVillaLot} unité/mois` : ""}
              onChangeText={(text) => setSalesVelocityVillaLot(cleanupPercentValue(text))}
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

              <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Surface habitable</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="Min (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceHabitableMin}
                  onChangeText={setSurfaceHabitableMin}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  placeholder="Max (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceHabitableMax}
                  onChangeText={setSurfaceHabitableMax}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Surface terrasse</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="Min (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceTerrasseMin}
                  onChangeText={setSurfaceTerrasseMin}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  placeholder="Max (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceTerrasseMax}
                  onChangeText={setSurfaceTerrasseMax}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Surface terrain</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="Min (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceTerrainMin}
                  onChangeText={setSurfaceTerrainMin}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  placeholder="Max (m²)"
                  style={[styles.input, { flex: 1 }]}
                  value={surfaceTerrainMax}
                  onChangeText={setSurfaceTerrainMax}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="CUS"
                  style={[styles.input, { flex: 1 }]}
                  value={cusTypology ? `${cusTypology}%` : ""}
                  onChangeText={(text) => setCusTypology(cleanupPercentValue(text))}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="COS"
                  style={[styles.input, { flex: 1 }]}
                  value={cosTypology ? `${cosTypology}%` : ""}
                  onChangeText={(text) => setCosTypology(cleanupPercentValue(text))}
                  keyboardType="numeric"
                />
              </View>
              <TextInput
                placeholder="Hauteur (ex: R+1)"
                style={[styles.input, { marginBottom: 12 }]}
                value={hauteurTypology}
                onChangeText={setHauteurTypology}
                keyboardType="default"
              />

              <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Prix de vente</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                {(["from", "between"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: pricingMode === mode ? AppColors.primary.main : AppColors.gray.lighter,
                      backgroundColor: pricingMode === mode ? AppColors.primary.light : AppColors.ui.background,
                      alignItems: "center",
                    }}
                    onPress={() => setPricingMode(mode)}
                  >
                    <Text style={{ color: pricingMode === mode ? AppColors.ui.background : AppColors.ui.text, fontWeight: "700" }}>
                      {mode === "from" ? "À partir" : "Entre"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="Prix min"
                  style={[styles.input, { flex: 1 }]}
                  value={pricingMin}
                  onChangeText={setPricingMin}
                  keyboardType="decimal-pad"
                />
                {pricingMode === "between" && (
                  <TextInput
                    placeholder="Prix max"
                    style={[styles.input, { flex: 1 }]}
                    value={pricingMax}
                    onChangeText={setPricingMax}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>

              <TextInput
                placeholder="Unité prix (MMAD, MAD, etc.)"
                style={styles.input}
                value={pricingUnit}
                onChangeText={setPricingUnit}
              />
              <TextInput
                placeholder="Commentaire prix (ex: soit 46 666 MAD/m²)"
                style={styles.input}
                value={pricingComment}
                onChangeText={setPricingComment}
              />
              <TextInput
                placeholder="Nombre unités"
                style={styles.input}
                value={units}
                onChangeText={setUnits}
                keyboardType="decimal-pad"
              />

              <Button title="Ajouter Typologie" onPress={addCurrentTypology} />

              {typologiesList.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: AppColors.primary.main }}>Typologies ajoutées :</Text>
                  {typologiesList.map((t, idx) => {
                    const habitableRange = t.surfaceHabitableMax ? `${t.surfaceHabitableMin}-${t.surfaceHabitableMax}` : `${t.surfaceHabitableMin}`;
                    const terrasseRange = t.surfaceTerrasseMax ? `${t.surfaceTerrasseMin}-${t.surfaceTerrasseMax}` : t.surfaceTerrasseMin;
                    const terrainRange = t.surfaceTerrainMax ? `${t.surfaceTerrainMin}-${t.surfaceTerrainMax}` : t.surfaceTerrainMin;
                    const priceRange = t.pricingMode === "between"
                      ? `Entre ${t.pricingMin} et ${t.pricingMax} ${t.pricingUnit}`
                      : `À partir de ${t.pricingMin} ${t.pricingUnit}`;
                    const typologyExtras = [
                      t.cus ? `CUS: ${t.cus}%` : null,
                      t.cos ? `COS: ${t.cos}%` : null,
                      t.hauteur ? `Hauteur: ${t.hauteur}` : null,
                    ].filter(Boolean).join(" • ");

                    return (
                      <View key={idx} style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, color: AppColors.ui.text }}>
                          [{t.typology_category}] {t.typology} - Habitable: {habitableRange} m² - Terrasse: {terrasseRange ? `${terrasseRange} m²` : "-"} - Terrain: {terrainRange ? `${terrainRange} m²` : "-"} - Prix: {priceRange} - Units: {t.units}
                        </Text>
                        {typologyExtras ? (
                          <Text style={{ fontSize: 12, color: AppColors.gray.dark }}>{typologyExtras}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Amenities du résidentiel
          </ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {residentialAmenitiesOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: amenities.includes(option) ? AppColors.primary.main : AppColors.gray.lighter,
                  backgroundColor: amenities.includes(option) ? AppColors.primary.light + "30" : AppColors.ui.background,
                }}
                onPress={() => toggleSelection(option, amenities, setAmenities)}
              >
                <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            placeholder="Autre amenity"
            style={styles.input}
            value={amenitiesCustom}
            onChangeText={setAmenitiesCustom}
          />

          <ThemedText style={{ marginTop: 20, fontSize: 16, fontWeight: "bold", color: AppColors.primary.main }}>
            Composantes du projet
          </ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {projectComponentsOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: projectComponents.includes(option) ? AppColors.primary.main : AppColors.gray.lighter,
                  backgroundColor: projectComponents.includes(option) ? AppColors.primary.light + "30" : AppColors.ui.background,
                }}
                onPress={() => toggleSelection(option, projectComponents, setProjectComponents)}
              >
                <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            placeholder="Autre composante"
            style={styles.input}
            value={projectComponentsCustom}
            onChangeText={setProjectComponentsCustom}
          />

          {/* Retail */}
          {projectType === "Retail" && (
            <>
              <TextInput placeholder="GLA" style={styles.input} onChangeText={setGla} />
              <TextInput placeholder="Positionnement" style={styles.input} onChangeText={setPositionnement} />
              <TextInput placeholder="Mix retail" style={styles.input} onChangeText={setMixRetail} />
              <TextInput placeholder="Enseignes" style={styles.input} onChangeText={setEnseignes} />
            </>
          )}

          {/* Business model */}
          <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "600", color: AppColors.primary.main }}>Business model</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {businessModelOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: businessModel === opt ? AppColors.primary.main : AppColors.gray.lighter,
                  backgroundColor: businessModel === opt ? AppColors.primary.light + "30" : AppColors.ui.background,
                }}
                onPress={() => setBusinessModel(opt)}
              >
                <Text style={{ color: AppColors.primary.main, fontWeight: "600" }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {businessModel === "autre" && (
            <TextInput
              placeholder="Précisez le business model"
              style={styles.input}
              value={businessModelCustom}
              onChangeText={setBusinessModelCustom}
            />
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
                        value={cus ? `${cus}%` : ""}
                        onChangeText={(text) => setCus(cleanupPercentValue(text))}
                        keyboardType="numeric"
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
                        value={cus ? `${cus}%` : ""}
                        onChangeText={(text) => setCus(cleanupPercentValue(text))}
                        keyboardType="numeric"
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          <ThemedText style={styles.locationTitle}>Localisation</ThemedText>
          <ThemedText style={styles.locationSubtitle}>Situez le projet sur la carte ou recherchez une adresse</ThemedText>

          <View style={{ marginBottom: 12 }}>
            <TextInput
              placeholder="Rechercher une adresse, un lieu ou un code plus"
              style={styles.input}
              value={locationQuery}
              onChangeText={setLocationQuery}
              onSubmitEditing={searchLocation}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.locationSearchButton}
              onPress={searchLocation}
              activeOpacity={0.8}
            >
              <Text style={styles.locationSearchButtonText}>
                {loadingLocationSearch ? "Recherche..." : "Rechercher"}
              </Text>
            </TouchableOpacity>

            {selectedLocationLabel ? (
              <Text style={styles.selectedLocationText} numberOfLines={2}>
                Localisation sélectionnée : {selectedLocationLabel}
              </Text>
            ) : null}

            {locationResults.length > 0 && (
              <View style={styles.locationResultsContainer}>
                {locationResults.map((result, index) => (
                  <TouchableOpacity
                    key={result.place_id ?? index}
                    style={styles.locationResultItem}
                    onPress={() => applyLocationResult(result)}
                  >
                    <Text style={styles.locationResultTitle} numberOfLines={2}>
                      {result.display_name}
                    </Text>
                    {result.type ? (
                      <Text style={styles.locationResultSubtitle} numberOfLines={1}>
                        {result.type}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
            ref={(ref) => { mapRef.current = ref; }}
            style={styles.map}
            mapType={mapType}
            region={mapRegion}
            onPress={(e) => {
              const lat = e.nativeEvent.coordinate.latitude;
              const lon = e.nativeEvent.coordinate.longitude;
              setLatitude(lat);
              setLongitude(lon);
              setMapRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }}
          >
            {latitude && longitude && <Marker coordinate={{ latitude, longitude }} />}
          </MapView>

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={saveProject}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>{isEditMode ? "✓ Mettre à jour" : "✓ Ajouter projet"}</Text>
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

  locationSearchButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: AppColors.primary.main,
    alignItems: "center",
    justifyContent: "center",
  },

  locationSearchButtonText: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  selectedLocationText: {
    marginTop: 10,
    color: AppColors.primary.main,
    fontSize: 13,
    lineHeight: 18,
  },

  locationResultsContainer: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: AppColors.ui.background,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    overflow: "hidden",
  },

  locationResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: AppColors.gray.lighter,
  },

  locationResultTitle: {
    color: AppColors.ui.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  locationResultSubtitle: {
    color: AppColors.gray.dark,
    fontSize: 12,
  },

  suggestionsContainer: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: AppColors.ui.background,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    borderRadius: 10,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 220,
  },

  suggestionsContent: {
    paddingBottom: 8,
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: AppColors.gray.lighter,
  },

  suggestionText: {
    color: AppColors.ui.text,
    fontSize: 14,
  },

  dateInputText: {
    color: AppColors.ui.text,
    fontSize: 16,
  },

  placeholderText: {
    color: AppColors.gray.dark,
  },

  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  calendarModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: AppColors.ui.background,
    borderRadius: 16,
    padding: 16,
  },

  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  calendarNavButton: {
    padding: 10,
  },

  calendarNavButtonText: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
  },

  calendarTitle: {
    color: AppColors.primary.main,
    fontSize: 16,
    fontWeight: "700",
  },

  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  calendarWeekDay: {
    width: 40,
    textAlign: "center",
    color: AppColors.gray.dark,
    fontWeight: "700",
  },

  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  calendarDay: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  calendarDayEmpty: {
    opacity: 0,
  },

  calendarDaySelected: {
    backgroundColor: AppColors.primary.main,
  },

  calendarDayText: {
    color: AppColors.ui.text,
  },

  calendarDayTextSelected: {
    color: AppColors.ui.background,
    fontWeight: "700",
  },

  calendarCloseButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: AppColors.primary.main,
    alignItems: "center",
  },

  calendarCloseButtonText: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.gray.lightest,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: AppColors.primary.main,
    fontWeight: "700",
  },
});