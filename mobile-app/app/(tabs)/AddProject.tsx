// mobile-app/app/(tabs)/AddProject.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput as RNTextInput,
  Button,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "@/components/ui/MapViewWrapper";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { OpenLocationCode } from "open-location-code";

import { supabase } from "@/lib/supabase";
import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/colors";
import AppNoticeModal, { NoticeType } from "@/components/ui/AppNoticeModal";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  primaryLabel: string;
  primaryVariant?: "primary" | "secondary" | "danger";
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

type MediaItem = {
  id?: string;
  uri: string;
  isExisting?: boolean;
};

type CountByTypeItem = {
  name: string;
  count: string;
};

type OfficeSpaceItem = {
  space: string;
  description: string;
  pricingMode: "from" | "between";
  pricingMin: string;
  pricingMax: string;
  pricingUnit: string;
  pricingComment?: string;
  pricing?: string;
};

type HotelRoomItem = {
  type: string;
  count: string;
  surface: string;
};

type HotelServiceItem = {
  name: string;
  type: string;
  capacity: string;
  count?: string;
  roomsCount?: string;
  surface?: string;
};

const projectMainTypes = ["Collectif", "Villa", "Lot de villas", "Retail", "Mixte", "Bureau", "Santé", "Hotel"];

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

const retailStatusOptions = ["En exploitation", "En cours de construction", "Annoncé"];
const officeStatusOptions = ["En exploitation", "En cours de construction", "Annoncé"];
const healthStatusOptions = ["En exploitation", "En cours de construction", "Annoncé"];
const hotelStatusOptions = ["En exploitation", "En cours de construction", "Annoncé"];

const retailTypologyOptions = ["Centre urbain", "Centre de proximité", "Centre lifestyle", "Retail park", "Mall régional", "Autre"];
const retailFoodTypeOptions = [
  "Restaurant",
  "Café / Coffee Shop",
  "Bar",
  "Lounge",
  "Fast Food / QSR",
  "Fast Casual",
  "Dessert / Ice Cream",
  "Bakery / Pâtisserie",
  "Tea Room",
  "Food Court",
  "Beach Club",
  "Rooftop",
  "Wine Bar",
  "Night Club",
];
const clinicTypologyOptions = ["Clinique privée", "Clinique spécialisée", "Polyclinique", "Autre"];
const hotelCategoryOptions = ["5 étoiles", "4 étoiles", "3 étoiles", "2 étoiles", "1 étoile", "RH", "RIPT", "Autre"];

type AutoNextTextInputProps = React.ComponentProps<typeof RNTextInput>;
const autoNextInputRegistry: RNTextInput[] = [];

const setForwardedTextInputRef = (forwardedRef: React.ForwardedRef<RNTextInput>, node: RNTextInput | null) => {
  if (!forwardedRef) return;
  if (typeof forwardedRef === "function") {
    forwardedRef(node);
    return;
  }
  forwardedRef.current = node;
};

const unregisterTextInput = (node: RNTextInput | null) => {
  if (!node) return;
  const index = autoNextInputRegistry.indexOf(node);
  if (index >= 0) {
    autoNextInputRegistry.splice(index, 1);
  }
};

const focusNextTextInput = (current: RNTextInput | null) => {
  if (!current) return;
  const index = autoNextInputRegistry.indexOf(current);
  if (index < 0) return;

  for (let i = index + 1; i < autoNextInputRegistry.length; i += 1) {
    const next = autoNextInputRegistry[i];
    if (next && typeof next.focus === "function") {
      next.focus();
      break;
    }
  }
};

const TextInput = React.forwardRef<RNTextInput, AutoNextTextInputProps>((props, forwardedRef) => {
  const localRef = useRef<RNTextInput | null>(null);

  const registerRef = useCallback((node: RNTextInput | null) => {
    unregisterTextInput(localRef.current);
    localRef.current = node;
    if (node && !autoNextInputRegistry.includes(node)) {
      autoNextInputRegistry.push(node);
    }
    setForwardedTextInputRef(forwardedRef, node);
  }, [forwardedRef]);

  useEffect(() => () => {
    unregisterTextInput(localRef.current);
  }, []);

  return (
    <RNTextInput
      {...props}
      ref={registerRef}
      blurOnSubmit={props.blurOnSubmit ?? false}
      returnKeyType={props.returnKeyType ?? "next"}
      onSubmitEditing={(event) => {
        props.onSubmitEditing?.(event);
        const shouldKeepCurrent = props.multiline || props.returnKeyType === "search" || props.returnKeyType === "done";
        if (!shouldKeepCurrent) {
          focusNextTextInput(localRef.current);
        }
      }}
    />
  );
});

TextInput.displayName = "AutoNextTextInput";

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

const getStatusOptionsByProjectType = (projectType: string) => {
  switch (projectType) {
    case "Retail":
      return retailStatusOptions;
    case "Bureau":
      return officeStatusOptions;
    case "Santé":
      return healthStatusOptions;
    case "Hotel":
      return hotelStatusOptions;
    default:
      return statusOptions;
  }
};

const upsertListItem = <T,>(items: T[], item: T, editIndex: number | null) => {
  if (editIndex === null) return [...items, item];
  return items.map((current, index) => (index === editIndex ? item : current));
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
  const hasProjectId = typeof projectId === "string" && projectId.trim().length > 0;

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [showMainTypeModal, setShowMainTypeModal] = useState(!hasProjectId);
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
  const [showOpeningDatePicker, setShowOpeningDatePicker] = useState(false);
  const [deliveryDateObj, setDeliveryDateObj] = useState<Date | null>(null);
  const [startCommercialDateObj, setStartCommercialDateObj] = useState<Date | null>(null);
  const [openingDateObj, setOpeningDateObj] = useState<Date | null>(null);
  const [activeCalendar, setActiveCalendar] = useState<"delivery" | "start" | "opening" | null>(null);

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
  const [openingDate, setOpeningDate] = useState("");

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
  const [editingTypologyIndex, setEditingTypologyIndex] = useState<number | null>(null);
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
  const [sourceLink, setSourceLink] = useState("");
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const [retailTypology, setRetailTypology] = useState("");
  const [retailNiveaux, setRetailNiveaux] = useState("");
  const [retailCommerces, setRetailCommerces] = useState("");
  const [retailParkingPlaces, setRetailParkingPlaces] = useState("");
  const [retailParkingType, setRetailParkingType] = useState("");
  const [retailParkingRatio, setRetailParkingRatio] = useState("");
  const [retailShoppingCount, setRetailShoppingCount] = useState("");
  const [retailShoppingBrands, setRetailShoppingBrands] = useState("");
  const [retailFoodCount, setRetailFoodCount] = useState("");
  const [retailFoodBrands, setRetailFoodBrands] = useState("");
  const [retailFoodTypologies, setRetailFoodTypologies] = useState<string[]>([]);
  const [retailServicesCount, setRetailServicesCount] = useState("");
  const [retailServicesBrands, setRetailServicesBrands] = useState("");
  const [retailLeisureCount, setRetailLeisureCount] = useState("");
  const [retailLeisureBrands, setRetailLeisureBrands] = useState("");
  const [retailMainTenants, setRetailMainTenants] = useState("");
  const [retailOccupancyRate, setRetailOccupancyRate] = useState("");

  const [officeType, setOfficeType] = useState("");
  const [officeConcept, setOfficeConcept] = useState("");
  const [officeTarget, setOfficeTarget] = useState("");
  const [officeServices, setOfficeServices] = useState("");
  const [officeSpaces, setOfficeSpaces] = useState<OfficeSpaceItem[]>([]);
  const [officeSpaceInput, setOfficeSpaceInput] = useState<OfficeSpaceItem>({
    space: "",
    description: "",
    pricingMode: "from",
    pricingMin: "",
    pricingMax: "",
    pricingUnit: "MAD",
    pricingComment: "",
  });
  const [editingOfficeSpaceIndex, setEditingOfficeSpaceIndex] = useState<number | null>(null);

  const [clinicTypology, setClinicTypology] = useState("");
  const [clinicDescription, setClinicDescription] = useState("");
  const [clinicBeds, setClinicBeds] = useState("");
  const [clinicDoctors, setClinicDoctors] = useState("");
  const [clinicBedTypes, setClinicBedTypes] = useState<CountByTypeItem[]>([]);
  const [clinicDoctorTypes, setClinicDoctorTypes] = useState<CountByTypeItem[]>([]);
  const [clinicBedInput, setClinicBedInput] = useState<CountByTypeItem>({ name: "", count: "" });
  const [clinicDoctorInput, setClinicDoctorInput] = useState<CountByTypeItem>({ name: "", count: "" });
  const [editingClinicBedIndex, setEditingClinicBedIndex] = useState<number | null>(null);
  const [editingClinicDoctorIndex, setEditingClinicDoctorIndex] = useState<number | null>(null);
  const [clinicEquipments, setClinicEquipments] = useState("");
  const [clinicOperatingBlocks, setClinicOperatingBlocks] = useState("");
  const [clinicComplementaryRooms, setClinicComplementaryRooms] = useState("");
  const [clinicSpecialties, setClinicSpecialties] = useState("");

  const [hotelSubtype, setHotelSubtype] = useState("");
  const [hotelCategory, setHotelCategory] = useState("");
  const [hotelBookingNote, setHotelBookingNote] = useState("");
  const [hotelOperator, setHotelOperator] = useState("");
  const [hotelInvestor, setHotelInvestor] = useState("");
  const [hotelManager, setHotelManager] = useState("");
  const [hotelRenovationDate, setHotelRenovationDate] = useState("");
  const [hotelKeys, setHotelKeys] = useState("");
  const [hotelFloors, setHotelFloors] = useState("");
  const [hotelRooms, setHotelRooms] = useState<HotelRoomItem[]>([]);
  const [hotelRoomInput, setHotelRoomInput] = useState<HotelRoomItem>({ type: "", count: "", surface: "" });
  const [editingHotelRoomIndex, setEditingHotelRoomIndex] = useState<number | null>(null);
  const [hotelFnB, setHotelFnB] = useState<HotelServiceItem[]>([]);
  const [hotelFnBInput, setHotelFnBInput] = useState<HotelServiceItem>({ name: "", type: "", capacity: "" });
  const [editingHotelFnBIndex, setEditingHotelFnBIndex] = useState<number | null>(null);
  const [hotelMice, setHotelMice] = useState<HotelServiceItem[]>([]);
  const [hotelMiceInput, setHotelMiceInput] = useState<HotelServiceItem>({ name: "", type: "", capacity: "", roomsCount: "", surface: "" });
  const [editingHotelMiceIndex, setEditingHotelMiceIndex] = useState<number | null>(null);
  const [hotelLeisure, setHotelLeisure] = useState<HotelServiceItem[]>([]);
  const [hotelLeisureInput, setHotelLeisureInput] = useState<HotelServiceItem>({ name: "", type: "", capacity: "", count: "", surface: "" });
  const [editingHotelLeisureIndex, setEditingHotelLeisureIndex] = useState<number | null>(null);

  // --- Map ---
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.5731,
    longitude: -7.5898,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "Information",
    message: "",
    primaryLabel: "OK",
  });
  const mapRef = useRef<any | null>(null);
  const openLocationCode = new OpenLocationCode();

  const showNotice = useCallback((payload: Omit<NoticeState, "visible">) => {
    setNotice({ visible: true, ...payload });
  }, []);

  const closeNotice = useCallback(() => {
    setNotice((previous) => ({ ...previous, visible: false }));
  }, []);

  // --- Unités de surface ---
  const [unitTotalSurface, setUnitTotalSurface] = useState<"m²" | "ha">("m²");
  const [unitCollectifSurface, setUnitCollectifSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaSurface, setUnitVillaSurface] = useState<"m²" | "ha">("m²");
  const [unitVillaLotSurface, setUnitVillaLotSurface] = useState<"m²" | "ha">("m²");

  useFocusEffect(
    useCallback(() => {
      if (hasProjectId) {
        return;
      }

      // Force create mode when no projectId is provided (tab screens keep state mounted).
      setEditingProjectId(null);
      setIsEditMode(false);
      setIsLoadingProject(false);

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
      setOpeningDate("");
      setShowDeliveryDatePicker(false);
      setShowStartCommercialDatePicker(false);
      setShowOpeningDatePicker(false);
      setDeliveryDateObj(null);
      setStartCommercialDateObj(null);
      setOpeningDateObj(null);
      setActiveCalendar(null);
      
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
      setSourceLink("");
      setPhotos([]);
      setRetailTypology("");
      setRetailNiveaux("");
      setRetailCommerces("");
      setRetailParkingPlaces("");
      setRetailParkingType("");
      setRetailParkingRatio("");
      setRetailShoppingCount("");
      setRetailShoppingBrands("");
      setRetailFoodCount("");
      setRetailFoodBrands("");
      setRetailFoodTypologies([]);
      setRetailServicesCount("");
      setRetailServicesBrands("");
      setRetailLeisureCount("");
      setRetailLeisureBrands("");
      setRetailMainTenants("");
      setRetailOccupancyRate("");
      setOfficeType("");
      setOfficeConcept("");
      setOfficeTarget("");
      setOfficeServices("");
      setOfficeSpaces([]);
      setOfficeSpaceInput({
        space: "",
        description: "",
        pricingMode: "from",
        pricingMin: "",
        pricingMax: "",
        pricingUnit: "MAD",
        pricingComment: "",
      });
      setEditingOfficeSpaceIndex(null);
      setClinicTypology("");
      setClinicDescription("");
      setClinicBeds("");
      setClinicDoctors("");
      setClinicBedTypes([]);
      setClinicDoctorTypes([]);
      setClinicBedInput({ name: "", count: "" });
      setClinicDoctorInput({ name: "", count: "" });
      setEditingClinicBedIndex(null);
      setEditingClinicDoctorIndex(null);
      setClinicEquipments("");
      setClinicOperatingBlocks("");
      setClinicComplementaryRooms("");
      setClinicSpecialties("");
      setHotelSubtype("");
      setHotelCategory("");
      setHotelBookingNote("");
      setHotelOperator("");
      setHotelInvestor("");
      setHotelManager("");
      setHotelRenovationDate("");
      setHotelKeys("");
      setHotelFloors("");
      setHotelRooms([]);
      setHotelRoomInput({ type: "", count: "", surface: "" });
      setEditingHotelRoomIndex(null);
      setHotelFnB([]);
      setHotelFnBInput({ name: "", type: "", capacity: "" });
      setEditingHotelFnBIndex(null);
      setHotelMice([]);
      setHotelMiceInput({ name: "", type: "", capacity: "", roomsCount: "", surface: "" });
      setEditingHotelMiceIndex(null);
      setHotelLeisure([]);
      setHotelLeisureInput({ name: "", type: "", capacity: "", count: "", surface: "" });
      setEditingHotelLeisureIndex(null);
      
      // Map
      setLatitude(null);
      setLongitude(null);
    }, [hasProjectId])
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
    if (projectType === "Bureau") return ["Bureau"];
    if (projectType === "Santé") return ["Santé"];
    if (projectType === "Hotel") return ["Hotel"];
    if (projectType === "Collectif/Villa") return ["Collectif", "Villa"];
    if (projectType === "Collectif/Lot de villas") return ["Collectif", "Lot de villas"];
    if (projectType === "Villa/Lot de villas") return ["Villa", "Lot de villas"];
    if (projectType === "Collectif/Villa/Lot de villas") return ["Collectif", "Villa", "Lot de villas"];
    return [];
  };

  const isResidentialProject = ["Collectif", "Villa", "Lot de villas"].includes(projectType) || projectType.includes("/");
  const showCommercialMetrics = isResidentialProject || projectType === "Retail";
  const hideCommercialFields = ["Bureau", "Santé", "Hotel"].includes(projectType);

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
  const getStatusSuggestions = () => filterSuggestions(status, getStatusOptionsByProjectType(projectType));

  const onSelectCity = (value: string) => {
    setCity(value);
    setActiveSuggestion(null);
  };

  const pickPhotosFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.75,
    });

    if (result.canceled) return;
    const selected = result.assets.map((asset) => ({ uri: asset.uri }));
    setPhotos((previous) => [...previous, ...selected]);
  };

  const takePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotice({
        type: "warning",
        title: "Autorisation caméra",
        message: "Activez l'accès caméra pour prendre une photo.",
        primaryLabel: "OK",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });

    if (result.canceled) return;
    const photo = result.assets[0];
    if (!photo?.uri) return;
    setPhotos((previous) => [...previous, { uri: photo.uri }]);
  };

  const removePhoto = (index: number) => {
    setPhotos((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadPhotoAndGetUrl = async (projectId: string, uri: string, index: number) => {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const extension = uri.split(".").pop()?.split("?")[0] || "jpg";
    const filePath = `${projectId}/${Date.now()}-${index}.${extension}`;
    const contentType = response.headers.get("content-type") || "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(filePath, arrayBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("project-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const addOrUpdateOfficeSpace = () => {
    if (!officeSpaceInput.space.trim()) return;
    if (!officeSpaceInput.pricingMin.trim()) return;
    const next = upsertListItem(officeSpaces, officeSpaceInput, editingOfficeSpaceIndex);
    setOfficeSpaces(next);
    setOfficeSpaceInput({
      space: "",
      description: "",
      pricingMode: "from",
      pricingMin: "",
      pricingMax: "",
      pricingUnit: "MAD",
      pricingComment: "",
    });
    setEditingOfficeSpaceIndex(null);
  };

  const formatOfficeSpacePricing = (space: OfficeSpaceItem) => {
    if (space.pricingMode === "between" && space.pricingMin && space.pricingMax) {
      return `Entre ${space.pricingMin} et ${space.pricingMax} ${space.pricingUnit}`;
    }
    if (space.pricingMin) {
      return `A partir de ${space.pricingMin} ${space.pricingUnit}`;
    }
    return space.pricing || "";
  };

  const addOrUpdateClinicBedType = () => {
    if (!clinicBedInput.name.trim()) return;
    const next = upsertListItem(clinicBedTypes, clinicBedInput, editingClinicBedIndex);
    setClinicBedTypes(next);
    setClinicBedInput({ name: "", count: "" });
    setEditingClinicBedIndex(null);
  };

  const addOrUpdateClinicDoctorType = () => {
    if (!clinicDoctorInput.name.trim()) return;
    const next = upsertListItem(clinicDoctorTypes, clinicDoctorInput, editingClinicDoctorIndex);
    setClinicDoctorTypes(next);
    setClinicDoctorInput({ name: "", count: "" });
    setEditingClinicDoctorIndex(null);
  };

  const addOrUpdateHotelRoom = () => {
    if (!hotelRoomInput.type.trim()) return;
    const next = upsertListItem(hotelRooms, hotelRoomInput, editingHotelRoomIndex);
    setHotelRooms(next);
    setHotelRoomInput({ type: "", count: "", surface: "" });
    setEditingHotelRoomIndex(null);
  };

  const addOrUpdateHotelFnB = () => {
    if (!hotelFnBInput.name.trim()) return;
    const next = upsertListItem(hotelFnB, hotelFnBInput, editingHotelFnBIndex);
    setHotelFnB(next);
    setHotelFnBInput({ name: "", type: "", capacity: "" });
    setEditingHotelFnBIndex(null);
  };

  const addOrUpdateHotelMice = () => {
    if (!hotelMiceInput.name.trim()) return;
    const next = upsertListItem(hotelMice, hotelMiceInput, editingHotelMiceIndex);
    setHotelMice(next);
    setHotelMiceInput({ name: "", type: "", capacity: "", roomsCount: "", surface: "" });
    setEditingHotelMiceIndex(null);
  };

  const addOrUpdateHotelLeisure = () => {
    if (!hotelLeisureInput.name.trim()) return;
    const next = upsertListItem(hotelLeisure, hotelLeisureInput, editingHotelLeisureIndex);
    setHotelLeisure(next);
    setHotelLeisureInput({ name: "", type: "", capacity: "", count: "", surface: "" });
    setEditingHotelLeisureIndex(null);
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
        showNotice({
          type: "error",
          title: "Erreur",
          message: "Impossible de charger le projet.",
          primaryLabel: "Fermer",
        });
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
      setSourceLink(projectData.source_link || "");
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
      setOpeningDate("");
      setShowDeliveryDatePicker(false);
      setShowStartCommercialDatePicker(false);
      setShowOpeningDatePicker(false);
      setDeliveryDateObj(projectData.delivery_date ? new Date(projectData.delivery_date) : null);
      setStartCommercialDateObj(projectData.start_commercial_date ? new Date(projectData.start_commercial_date) : null);
      setOpeningDateObj(null);
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
        setOpeningDate(retailData.opening_date || "");
        setOpeningDateObj(retailData.opening_date ? new Date(retailData.opening_date) : null);
      }

      const { data: mediaData } = await supabase
        .from("projects_media")
        .select("id, media_url")
        .eq("project_id", id);

      if (Array.isArray(mediaData)) {
        setPhotos(mediaData.map((item: any) => ({ id: item.id, uri: item.media_url, isExisting: true })));
      }

      const { data: detailsData } = await supabase
        .from("projects_extended_details")
        .select("details")
        .eq("project_id", id)
        .single();

      if (detailsData?.details) {
        const details = detailsData.details as Record<string, any>;
        const retail = details.retail || {};
        const office = details.office || {};
        const health = details.health || {};
        const hotel = details.hotel || {};

        setRetailTypology(retail.typology || "");
        setRetailNiveaux(retail.niveaux || "");
        setRetailCommerces(retail.commerces || "");
        setRetailParkingPlaces(retail.parkingPlaces || "");
        setRetailParkingType(retail.parkingType || "");
        setRetailParkingRatio(retail.parkingRatio || "");
        setRetailShoppingCount(retail.shoppingCount || "");
        setRetailShoppingBrands(retail.shoppingBrands || "");
        setRetailFoodCount(retail.foodCount || "");
        setRetailFoodBrands(retail.foodBrands || "");
        setRetailFoodTypologies(Array.isArray(retail.foodTypologies) ? retail.foodTypologies : []);
        setRetailServicesCount(retail.servicesCount || "");
        setRetailServicesBrands(retail.servicesBrands || "");
        setRetailLeisureCount(retail.leisureCount || "");
        setRetailLeisureBrands(retail.leisureBrands || "");
        setRetailMainTenants(retail.mainTenants || "");
        setRetailOccupancyRate(retail.occupancyRate || "");

        setOfficeType(office.officeType || "");
        setOfficeConcept(office.concept || "");
        setOfficeTarget(office.target || "");
        setOfficeServices(office.services || "");
        setOfficeSpaces(
          Array.isArray(office.spaces)
            ? office.spaces.map((item: any) => ({
                space: item.space || "",
                description: item.description || "",
                pricingMode: item.pricingMode === "between" ? "between" : "from",
                pricingMin: item.pricingMin || item.pricing || "",
                pricingMax: item.pricingMax || "",
                pricingUnit: item.pricingUnit || "MAD",
                pricingComment: item.pricingComment || "",
                pricing: item.pricing || "",
              }))
            : []
        );
        setOpeningDate(office.openingDate || "");
        setOpeningDateObj(office.openingDate ? new Date(office.openingDate) : null);

        setClinicTypology(health.clinicTypology || "");
        setClinicDescription(health.description || "");
        setClinicBeds(health.beds || "");
        setClinicDoctors(health.doctors || "");
        setClinicBedTypes(Array.isArray(health.bedTypes) ? health.bedTypes : []);
        setClinicDoctorTypes(Array.isArray(health.doctorTypes) ? health.doctorTypes : []);
        setClinicEquipments(health.equipments || "");
        setClinicOperatingBlocks(health.operatingBlocks || "");
        setClinicComplementaryRooms(health.complementaryRooms || "");
        setClinicSpecialties(health.specialties || "");
        setOpeningDate(health.openingDate || "");
        setOpeningDateObj(health.openingDate ? new Date(health.openingDate) : null);

        setHotelSubtype(hotel.subtype || "");
        setHotelCategory(hotel.category || "");
        setHotelBookingNote(hotel.bookingNote || "");
        setHotelOperator(hotel.operator || "");
        setHotelInvestor(hotel.investor || "");
        setHotelManager(hotel.manager || "");
        setHotelRenovationDate(hotel.renovationDate || "");
        setHotelKeys(hotel.keys || "");
        setHotelFloors(hotel.floors || "");
        setHotelRooms(Array.isArray(hotel.rooms) ? hotel.rooms : []);
        setHotelFnB(Array.isArray(hotel.fnb) ? hotel.fnb : []);
        setHotelMice(Array.isArray(hotel.mice) ? hotel.mice : []);
        setHotelLeisure(Array.isArray(hotel.leisure) ? hotel.leisure : []);
        setOpeningDate(hotel.openingDate || "");
        setOpeningDateObj(hotel.openingDate ? new Date(hotel.openingDate) : null);
      }
    } catch (error) {
      console.error(error);
      showNotice({
        type: "error",
        title: "Erreur",
        message: "Impossible de charger le projet.",
        primaryLabel: "Fermer",
      });
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    if (hasProjectId && projectId) {
      loadProjectForEdit(projectId);
    }
  }, [hasProjectId, projectId]);

  const onSelectQuartier = (value: string) => {
    setQuartier(value);
    setActiveSuggestion(null);
  };

  const onSelectStatus = (value: string) => {
    setStatus(value);
    setShowStatusSuggestions(false);
  };

  if (hasProjectId && isLoadingProject) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary.main} />
        <Text style={styles.loadingText}>Chargement du projet…</Text>
      </View>
    );
  }

  const getCalendarRows = (date: Date) => getCalendarMatrix(date);

  const changeCalendarMonth = (type: "delivery" | "start" | "opening", delta: number) => {
    if (type === "delivery") {
      const current = deliveryDateObj || new Date();
      setDeliveryDateObj(new Date(current.getFullYear(), current.getMonth() + delta, 1));
      return;
    }

    if (type === "start") {
      const current = startCommercialDateObj || new Date();
      setStartCommercialDateObj(new Date(current.getFullYear(), current.getMonth() + delta, 1));
      return;
    }

    const openingCurrent = openingDateObj || new Date();
    setOpeningDateObj(new Date(openingCurrent.getFullYear(), openingCurrent.getMonth() + delta, 1));
  };

  const changeCalendarYear = (type: "delivery" | "start" | "opening", deltaYears: number) => {
    changeCalendarMonth(type, deltaYears * 12);
  };

  const onCalendarDateSelect = (type: "delivery" | "start" | "opening", date: Date) => {
    const value = formatDate(date);
    if (type === "delivery") {
      setDeliveryDateObj(date);
      setDeliveryDate(value);
      setShowDeliveryDatePicker(false);
      setActiveCalendar(null);
    } else if (type === "start") {
      setStartCommercialDateObj(date);
      setStartCommercialDate(value);
      setShowStartCommercialDatePicker(false);
      setActiveCalendar(null);
    } else {
      setOpeningDateObj(date);
      setOpeningDate(value);
      setShowOpeningDatePicker(false);
      setActiveCalendar(null);
    }
  };

  const categories = getProjectCategories();
  const isMixedProject = categories.length > 1;

  const addCurrentTypology = () => {
    const categoryToUse = isMixedProject ? currentTypologyCategory : categories[0];

    if (!currentTypology || !categoryToUse) {
      showNotice({
        type: "warning",
        title: "Erreur",
        message: "Choisissez une catégorie et une typologie",
        primaryLabel: "Compris",
      });
      return;
    }

    const newTypology = {
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
    };

    if (editingTypologyIndex !== null) {
      setTypologiesList((prev) =>
        prev.map((item, index) => (index === editingTypologyIndex ? newTypology : item))
      );
      setEditingTypologyIndex(null);
    } else {
      setTypologiesList((prev) => [...prev, newTypology]);
    }

    setCurrentTypology("");
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

  const editTypology = (index: number) => {
    const typology = typologiesList[index];
    setEditingTypologyIndex(index);
    setCurrentTypology(typology.typology || "");
    setCurrentTypologyCategory(typology.typology_category || categories[0]);
    setSurfaceHabitableMin(typology.surfaceHabitableMin || "");
    setSurfaceHabitableMax(typology.surfaceHabitableMax || "");
    setSurfaceTerrasseMin(typology.surfaceTerrasseMin || "");
    setSurfaceTerrasseMax(typology.surfaceTerrasseMax || "");
    setSurfaceTerrainMin(typology.surfaceTerrainMin || "");
    setSurfaceTerrainMax(typology.surfaceTerrainMax || "");
    setCusTypology(typology.cus || "");
    setCosTypology(typology.cos || "");
    setHauteurTypology(typology.hauteur || "");
    setPricingMode(typology.pricingMode || "from");
    setPricingMin(typology.pricingMin || "");
    setPricingMax(typology.pricingMax || "");
    setPricingUnit(typology.pricingUnit || "MMAD");
    setPricingComment(typology.pricingComment || "");
    setUnits(typology.units || "");
  };

  const deleteTypology = (index: number) => {
    setTypologiesList((prev) => prev.filter((_, idx) => idx !== index));
    if (editingTypologyIndex === index) {
      setEditingTypologyIndex(null);
      setCurrentTypology("");
      setCurrentTypologyCategory(isMixedProject ? categories[0] : categories[0]);
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
    } else if (editingTypologyIndex !== null && index < editingTypologyIndex) {
      setEditingTypologyIndex(editingTypologyIndex - 1);
    }
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
      showNotice({
        type: "info",
        title: "Recherche",
        message: "Entrez une adresse ou un lieu à rechercher.",
        primaryLabel: "OK",
      });
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
        showNotice({
          type: "warning",
          title: "Aucun résultat",
          message: "Aucun emplacement trouvé pour cette recherche.",
          primaryLabel: "OK",
        });
        return;
      }

      setLocationResults(results);
    } catch (error) {
      console.error("Location search error", error);
      showNotice({
        type: "error",
        title: "Erreur",
        message: "Impossible de rechercher l'emplacement, réessayez.",
        primaryLabel: "Fermer",
      });
      setLocationResults([]);
    } finally {
      setLoadingLocationSearch(false);
    }
  };

  const applyLocationResult = (result: any) => {
    const latitudeResult = parseFloat(result.lat);
    const longitudeResult = parseFloat(result.lon);
    if (Number.isNaN(latitudeResult) || Number.isNaN(longitudeResult)) {
      showNotice({
        type: "error",
        title: "Erreur",
        message: "Coordonnées invalides pour ce résultat.",
        primaryLabel: "Fermer",
      });
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

    if (mapRef.current && typeof mapRef.current.animateToRegion === "function") {
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
      showNotice({
        type: "warning",
        title: "Erreur",
        message: "Place le projet sur la carte",
        primaryLabel: "Compris",
      });
      return;
    }

    const normalizedAmenities = [...amenities];
    if (amenitiesCustom.trim()) normalizedAmenities.push(amenitiesCustom.trim());

    const normalizedProjectComponents = [...projectComponents];
    if (projectComponentsCustom.trim()) normalizedProjectComponents.push(projectComponentsCustom.trim());

    const projectDataBase = {
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
      amenities: isResidentialProject && normalizedAmenities.length ? normalizedAmenities : null,
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
    const projectData = {
      ...projectDataBase,
      source_link: sourceLink || null,
    } as any;

    let projectIdToUse = editingProjectId;

    const saveProjectRow = async (payload: any) => {
      if (isEditMode && editingProjectId) {
        return await supabase
          .from("projects")
          .update(payload)
          .eq("id", editingProjectId)
          .select();
      }

      return await supabase
        .from("projects")
        .insert([payload])
        .select();
    };

    let { data: projectResponse, error: projectSaveError } = await saveProjectRow(projectData);

    if (projectSaveError && String(projectSaveError.message).toLowerCase().includes("source_link")) {
      const retry = await saveProjectRow(projectDataBase);
      projectResponse = retry.data;
      projectSaveError = retry.error;
    }

    if (projectSaveError) {
      showNotice({
        type: "error",
        title: "Erreur",
        message: projectSaveError.message,
        primaryLabel: "Fermer",
      });
      return;
    }

    if (!isEditMode) {
      projectIdToUse = (projectResponse && projectResponse[0]?.id) || null;
    }

    if (!projectIdToUse) {
      showNotice({
        type: "error",
        title: "Erreur",
        message: "Impossible de récupérer l'ID du projet.",
        primaryLabel: "Fermer",
      });
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
        opening_date: openingDate || null,
        gla: parseFloat(gla),
        positionnement,
        mix_retail: mixRetail,
        enseignes,
      }]);
    }

    const extendedDetailsPayload = {
      retail: {
        typology: retailTypology,
        niveaux: retailNiveaux,
        parkingPlaces: retailParkingPlaces,
        parkingType: retailParkingType,
        parkingRatio: retailParkingRatio,
        shoppingCount: retailShoppingCount,
        shoppingBrands: retailShoppingBrands,
        foodCount: retailFoodCount,
        foodBrands: retailFoodBrands,
        foodTypologies: retailFoodTypologies,
        servicesCount: retailServicesCount,
        servicesBrands: retailServicesBrands,
        leisureCount: retailLeisureCount,
        leisureBrands: retailLeisureBrands,
        mainTenants: retailMainTenants,
        occupancyRate: retailOccupancyRate,
      },
      office: {
        officeType,
        concept: officeConcept,
        target: officeTarget,
        services: officeServices,
        spaces: officeSpaces,
        openingDate,
      },
      health: {
        clinicTypology,
        description: clinicDescription,
        beds: clinicBeds,
        bedTypes: clinicBedTypes,
        doctors: clinicDoctors,
        doctorTypes: clinicDoctorTypes,
        equipments: clinicEquipments,
        operatingBlocks: clinicOperatingBlocks,
        complementaryRooms: clinicComplementaryRooms,
        specialties: clinicSpecialties,
        openingDate,
      },
      hotel: {
        subtype: hotelSubtype,
        category: hotelCategory,
        bookingNote: hotelBookingNote,
        operator: hotelOperator,
        investor: hotelInvestor,
        manager: hotelManager,
        renovationDate: hotelRenovationDate,
        keys: hotelKeys,
        floors: hotelFloors,
        rooms: hotelRooms,
        fnb: hotelFnB,
        mice: hotelMice,
        leisure: hotelLeisure,
        openingDate,
      },
    };

    const { error: detailsError } = await supabase
      .from("projects_extended_details")
      .upsert(
        [{
          project_id: projectIdToUse,
          project_type: projectType,
          details: extendedDetailsPayload,
        }],
        { onConflict: "project_id" }
      );

    if (detailsError) {
      console.warn("Extended details not saved", detailsError);
    }

    setIsUploadingPhotos(true);
    try {
      await supabase.from("projects_media").delete().eq("project_id", projectIdToUse);

      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        if (photo.isExisting) {
          uploadedUrls.push(photo.uri);
          continue;
        }
        const uploadedUrl = await uploadPhotoAndGetUrl(projectIdToUse, photo.uri, i);
        uploadedUrls.push(uploadedUrl);
      }

      if (uploadedUrls.length > 0) {
        const { error: mediaInsertError } = await supabase.from("projects_media").insert(
          uploadedUrls.map((mediaUrl) => ({
            project_id: projectIdToUse,
            media_url: mediaUrl,
            media_type: "image",
          }))
        );
        if (mediaInsertError) {
          throw mediaInsertError;
        }
      }
    } catch (mediaError) {
      console.warn("Project photos not fully saved", mediaError);
      const mediaErrorMessage = mediaError instanceof Error ? mediaError.message : "Upload images impossible";
      showNotice({
        type: "warning",
        title: "Images non sauvegardees",
        message: `Le projet est enregistre, mais les images ne sont pas passees. ${mediaErrorMessage}`,
        primaryLabel: "OK",
      });
    } finally {
      setIsUploadingPhotos(false);
    }

    showNotice({
      type: "success",
      title: "Succès",
      message: isEditMode ? "Projet mis à jour !" : "Projet ajouté !",
      primaryLabel: "Voir sur la carte",
      onPrimary: () => router.replace("/(tabs)/explore"),
    });
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
          <View
            style={[
              styles.suggestionFieldWrapper,
              activeSuggestion === "city" && styles.suggestionFieldWrapperActive,
            ]}
          >
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
          <View
            style={[
              styles.suggestionFieldWrapper,
              activeSuggestion === "quartier" && styles.suggestionFieldWrapperActive,
            ]}
          >
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
          <TextInput placeholder="Développeur" style={styles.input} value={developer} onChangeText={setDeveloper} />
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
            value={totalUnitsGlobal}
            onChangeText={setTotalUnitsGlobal}
            keyboardType="decimal-pad"
          />

          {isMixedProject && categories.includes("Collectif") && (
            <TextInput
              placeholder="Nombre d'unités Collectif"
              style={styles.input}
              value={totalUnitsCollectif}
              onChangeText={setTotalUnitsCollectif}
              keyboardType="decimal-pad"
            />
          )}

          {isMixedProject && categories.includes("Villa") && (
            <TextInput
              placeholder="Nombre d'unités Villa"
              style={styles.input}
              value={totalUnitsVilla}
              onChangeText={setTotalUnitsVilla}
              keyboardType="decimal-pad"
            />
          )}

          {isMixedProject && categories.includes("Lot de villas") && (
            <TextInput
              placeholder="Nombre d'unités Lot de villas"
              style={styles.input}
              value={totalUnitsVillaLot}
              onChangeText={setTotalUnitsVillaLot}
              keyboardType="decimal-pad"
            />
          )}

          <View
            style={[
              styles.suggestionFieldWrapper,
              showStatusSuggestions && styles.suggestionFieldWrapperActive,
            ]}
          >
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
              <ScrollView
                style={styles.suggestionsContainer}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.suggestionsContent}
              >
                {getStatusSuggestions().map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionItem}
                    onPress={() => onSelectStatus(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
              setShowOpeningDatePicker(true);
              setActiveCalendar("opening");
              if (!openingDateObj) setOpeningDateObj(new Date());
            }}
          >
            <Text style={[styles.dateInputText, !openingDate && styles.placeholderText]}>
              {openingDate || "Date d'ouverture"}
            </Text>
          </TouchableOpacity>

          {(showDeliveryDatePicker || showStartCommercialDatePicker || showOpeningDatePicker) && (
            <Modal transparent animationType="fade">
              <View style={styles.calendarModalOverlay}>
                <View style={styles.calendarModal}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarMonth("delivery", -1);
                        else if (activeCalendar === "start") changeCalendarMonth("start", -1);
                        else changeCalendarMonth("opening", -1);
                      }}
                    >
                      <Text style={styles.calendarNavButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      {activeCalendar === "delivery"
                        ? `${monthNames[(deliveryDateObj || new Date()).getMonth()]} ${(deliveryDateObj || new Date()).getFullYear()}`
                        : activeCalendar === "start"
                          ? `${monthNames[(startCommercialDateObj || new Date()).getMonth()]} ${(startCommercialDateObj || new Date()).getFullYear()}`
                          : `${monthNames[(openingDateObj || new Date()).getMonth()]} ${(openingDateObj || new Date()).getFullYear()}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarMonth("delivery", 1);
                        else if (activeCalendar === "start") changeCalendarMonth("start", 1);
                        else changeCalendarMonth("opening", 1);
                      }}
                    >
                      <Text style={styles.calendarNavButtonText}>{">"}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarQuickActionsRow}>
                    <TouchableOpacity
                      style={styles.calendarQuickButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarYear("delivery", -5);
                        else if (activeCalendar === "start") changeCalendarYear("start", -5);
                        else changeCalendarYear("opening", -5);
                      }}
                    >
                      <Text style={styles.calendarQuickButtonText}>-5 ans</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarQuickButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarYear("delivery", -1);
                        else if (activeCalendar === "start") changeCalendarYear("start", -1);
                        else changeCalendarYear("opening", -1);
                      }}
                    >
                      <Text style={styles.calendarQuickButtonText}>-1 an</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarQuickButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarYear("delivery", 1);
                        else if (activeCalendar === "start") changeCalendarYear("start", 1);
                        else changeCalendarYear("opening", 1);
                      }}
                    >
                      <Text style={styles.calendarQuickButtonText}>+1 an</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarQuickButton}
                      onPress={() => {
                        if (activeCalendar === "delivery") changeCalendarYear("delivery", 5);
                        else if (activeCalendar === "start") changeCalendarYear("start", 5);
                        else changeCalendarYear("opening", 5);
                      }}
                    >
                      <Text style={styles.calendarQuickButtonText}>+5 ans</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekRow}>
                    {['D','L','M','M','J','V','S'].map((weekday, idx) => (
                      <Text key={`${weekday}-${idx}`} style={styles.calendarWeekDay}>
                        {weekday}
                      </Text>
                    ))}
                  </View>

                  {(activeCalendar === "delivery"
                    ? getCalendarRows(deliveryDateObj || new Date())
                    : activeCalendar === "start"
                      ? getCalendarRows(startCommercialDateObj || new Date())
                      : getCalendarRows(openingDateObj || new Date())).map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarRow}>
                      {week.map((day, dayIndex) => {
                        const isSelected = day
                          ? (activeCalendar === "delivery"
                              ? deliveryDate === formatDate(day)
                              : activeCalendar === "start"
                                ? startCommercialDate === formatDate(day)
                                : openingDate === formatDate(day))
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
                      setShowOpeningDatePicker(false);
                      setActiveCalendar(null);
                    }}
                  >
                    <Text style={styles.calendarCloseButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {showCommercialMetrics && !hideCommercialFields && (
            <>
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
                value={unitsRemainingGlobal}
                onChangeText={setUnitsRemainingGlobal}
                keyboardType="decimal-pad"
              />

              {isMixedProject && categories.includes("Collectif") && (
                <TextInput
                  placeholder="Unités restantes Collectif"
                  style={styles.input}
                  value={unitsRemainingCollectif}
                  onChangeText={setUnitsRemainingCollectif}
                  keyboardType="decimal-pad"
                />
              )}

              {isMixedProject && categories.includes("Villa") && (
                <TextInput
                  placeholder="Unités restantes Villa"
                  style={styles.input}
                  value={unitsRemainingVilla}
                  onChangeText={setUnitsRemainingVilla}
                  keyboardType="decimal-pad"
                />
              )}

              {isMixedProject && categories.includes("Lot de villas") && (
                <TextInput
                  placeholder="Unités restantes Lot de villas"
                  style={styles.input}
                  value={unitsRemainingVillaLot}
                  onChangeText={setUnitsRemainingVillaLot}
                  keyboardType="decimal-pad"
                />
              )}
            </>
          )}

          {/* Typologies */}
          {(isMixedProject || ["Collectif", "Villa", "Lot de villas"].includes(projectType)) && (
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

              <Button
                title={editingTypologyIndex !== null ? "Modifier Typologie" : "Ajouter Typologie"}
                onPress={addCurrentTypology}
              />

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
                      <View key={idx} style={{ marginTop: 8, padding: 10, borderWidth: 1, borderColor: AppColors.gray.lighter, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, color: AppColors.ui.text, marginBottom: 4 }}>
                          [{t.typology_category}] {t.typology}
                        </Text>
                        <Text style={{ fontSize: 12, color: AppColors.ui.text }}>
                          Habitable: {habitableRange} m² • Terrasse: {terrasseRange ? `${terrasseRange} m²` : "-"} • Terrain: {terrainRange ? `${terrainRange} m²` : "-"}
                        </Text>
                        <Text style={{ fontSize: 12, color: AppColors.ui.text }}>
                          Prix: {priceRange} • Units: {t.units}
                        </Text>
                        {typologyExtras ? (
                          <Text style={{ fontSize: 12, color: AppColors.gray.dark, marginTop: 4 }}>{typologyExtras}</Text>
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                          <TouchableOpacity
                            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: AppColors.primary.light }}
                            onPress={() => editTypology(idx)}
                          >
                            <Text style={{ color: AppColors.primary.main, textAlign: "center", fontWeight: "700" }}>Modifier</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: AppColors.gray.lighter }}
                            onPress={() => deleteTypology(idx)}
                          >
                            <Text style={{ color: AppColors.ui.text, textAlign: "center", fontWeight: "700" }}>Supprimer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {isResidentialProject && (
            <>
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
            </>
          )}

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
              <ThemedText style={styles.sectionTitle}>Retail - Informations générales</ThemedText>
              <TextInput placeholder="Typologie retail (centre urbain, proximité...)" style={styles.input} value={retailTypology} onChangeText={setRetailTypology} />
              <Text style={styles.fieldLabel}>Typologie de retail (sélection rapide)</Text>
              <View style={styles.chipsRow}>
                {retailTypologyOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionChip, retailTypology === option && styles.optionChipActive]}
                    onPress={() => setRetailTypology(option)}
                  >
                    <Text style={[styles.optionChipText, retailTypology === option && styles.optionChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.sectionTitle}>Retail - Caractéristiques physiques</ThemedText>
              <TextInput
                placeholder="Surface GLA (m²)"
                style={styles.input}
                value={gla ? `${gla} m²` : ""}
                onChangeText={(text) => setGla(cleanupPercentValue(text))}
                keyboardType="decimal-pad"
              />
              <TextInput placeholder="Nombre de niveaux (ex: RDC + 1)" style={styles.input} value={retailNiveaux} onChangeText={setRetailNiveaux} />
              <TextInput placeholder="Nombre de places de parking" style={styles.input} value={retailParkingPlaces} onChangeText={setRetailParkingPlaces} keyboardType="decimal-pad" />
              <TextInput placeholder="Parking (ex: Souterrain)" style={styles.input} value={retailParkingType} onChangeText={setRetailParkingType} />
              <TextInput placeholder="Ratio parking (ex: 3.25 places /100 m² GLA)" style={styles.input} value={retailParkingRatio} onChangeText={setRetailParkingRatio} />

              <ThemedText style={styles.sectionTitle}>Positionnement & Mix commercial</ThemedText>
              <TextInput placeholder="Positionnement" style={styles.input} value={positionnement} onChangeText={setPositionnement} multiline />
              <TextInput placeholder="Mix commercial" style={styles.input} value={mixRetail} onChangeText={setMixRetail} multiline />

              <ThemedText style={styles.subSectionTitle}>Shopping</ThemedText>
              <TextInput placeholder="Nombre d'enseignes" style={styles.input} value={retailShoppingCount} onChangeText={setRetailShoppingCount} keyboardType="decimal-pad" />
              <TextInput placeholder="Enseignes" style={styles.input} value={retailShoppingBrands} onChangeText={setRetailShoppingBrands} multiline />

              <ThemedText style={styles.subSectionTitle}>Food & Beverage</ThemedText>
              <TextInput placeholder="Nombre d'enseignes" style={styles.input} value={retailFoodCount} onChangeText={setRetailFoodCount} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>Typologies F&B (sélection multiple)</Text>
              <View style={styles.chipsRow}>
                {retailFoodTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionChip, retailFoodTypologies.includes(option) && styles.optionChipActive]}
                    onPress={() => toggleSelection(option, retailFoodTypologies, setRetailFoodTypologies)}
                  >
                    <Text style={[styles.optionChipText, retailFoodTypologies.includes(option) && styles.optionChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="Enseignes" style={styles.input} value={retailFoodBrands} onChangeText={setRetailFoodBrands} multiline />

              <ThemedText style={styles.subSectionTitle}>Services</ThemedText>
              <TextInput placeholder="Nombre d'enseignes" style={styles.input} value={retailServicesCount} onChangeText={setRetailServicesCount} keyboardType="decimal-pad" />
              <TextInput placeholder="Enseignes" style={styles.input} value={retailServicesBrands} onChangeText={setRetailServicesBrands} multiline />

              <ThemedText style={styles.subSectionTitle}>Loisirs</ThemedText>
              <TextInput placeholder="Nombre d'enseignes" style={styles.input} value={retailLeisureCount} onChangeText={setRetailLeisureCount} keyboardType="decimal-pad" />
              <TextInput placeholder="Enseignes" style={styles.input} value={retailLeisureBrands} onChangeText={setRetailLeisureBrands} multiline />

              <TextInput placeholder="Locataires principaux" style={styles.input} value={retailMainTenants} onChangeText={setRetailMainTenants} multiline />
              <TextInput
                placeholder="Taux d'occupation (%)"
                style={styles.input}
                value={retailOccupancyRate ? `${retailOccupancyRate}%` : ""}
                onChangeText={(text) => setRetailOccupancyRate(cleanupPercentValue(text))}
                keyboardType="decimal-pad"
              />
              <TextInput placeholder="Enseignes (résumé)" style={styles.input} value={enseignes} onChangeText={setEnseignes} multiline />
            </>
          )}

          {projectType === "Bureau" && (
            <>
              <ThemedText style={styles.sectionTitle}>Bureau</ThemedText>
              <TextInput placeholder="Type de bureau (coworking, centre d'affaires...)" style={styles.input} value={officeType} onChangeText={setOfficeType} />
              <TextInput placeholder="Concept" style={styles.input} value={officeConcept} onChangeText={setOfficeConcept} multiline />
              <TextInput placeholder="Cible" style={styles.input} value={officeTarget} onChangeText={setOfficeTarget} />
              <TextInput placeholder="Services" style={styles.input} value={officeServices} onChangeText={setOfficeServices} multiline />

              <ThemedText style={styles.subSectionTitle}>Espaces de travail</ThemedText>
              <TextInput
                placeholder="Nom espace (ex: Open Office)"
                style={styles.input}
                value={officeSpaceInput.space}
                onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, space: text }))}
              />
              <TextInput
                placeholder="Description"
                style={styles.input}
                value={officeSpaceInput.description}
                onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, description: text }))}
              />
              <Text style={styles.fieldLabel}>Prix de location</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                {(["from", "between"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: officeSpaceInput.pricingMode === mode ? AppColors.primary.main : AppColors.gray.lighter,
                      backgroundColor: officeSpaceInput.pricingMode === mode ? AppColors.primary.light : AppColors.ui.background,
                      alignItems: "center",
                    }}
                    onPress={() => setOfficeSpaceInput((previous) => ({ ...previous, pricingMode: mode }))}
                  >
                    <Text style={{ color: officeSpaceInput.pricingMode === mode ? AppColors.ui.background : AppColors.ui.text, fontWeight: "700" }}>
                      {mode === "from" ? "A partir" : "Entre"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput
                  placeholder="Prix min"
                  style={[styles.input, { flex: 1 }]}
                  value={officeSpaceInput.pricingMin}
                  onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, pricingMin: text }))}
                  keyboardType="decimal-pad"
                />
                {officeSpaceInput.pricingMode === "between" && (
                  <TextInput
                    placeholder="Prix max"
                    style={[styles.input, { flex: 1 }]}
                    value={officeSpaceInput.pricingMax}
                    onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, pricingMax: text }))}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>
              <TextInput
                placeholder="Unité prix (MAD, MMAD, etc.)"
                style={styles.input}
                value={officeSpaceInput.pricingUnit}
                onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, pricingUnit: text }))}
              />
              <TextInput
                placeholder="Commentaire prix (optionnel)"
                style={styles.input}
                value={officeSpaceInput.pricingComment || ""}
                onChangeText={(text) => setOfficeSpaceInput((previous) => ({ ...previous, pricingComment: text }))}
              />
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateOfficeSpace}>
                <Text style={styles.inlineAddButtonText}>{editingOfficeSpaceIndex === null ? "Ajouter espace" : "Modifier espace"}</Text>
              </TouchableOpacity>
              {officeSpaces.map((item, index) => (
                <View key={`${item.space}-${index}`} style={styles.inlineCard}>
                  <Text style={styles.inlineCardTitle}>{item.space}</Text>
                  <Text style={styles.inlineCardText}>{item.description}</Text>
                  <Text style={styles.inlineCardText}>{formatOfficeSpacePricing(item)}</Text>
                  {item.pricingComment ? <Text style={styles.inlineCardText}>{item.pricingComment}</Text> : null}
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setOfficeSpaceInput(item); setEditingOfficeSpaceIndex(index); }}>
                      <Text style={styles.inlineActionEdit}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setOfficeSpaces((previous) => previous.filter((_, i) => i !== index))}>
                      <Text style={styles.inlineActionDelete}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {projectType === "Santé" && (
            <>
              <ThemedText style={styles.sectionTitle}>Santé</ThemedText>
              <TextInput placeholder="Typologie de clinique" style={styles.input} value={clinicTypology} onChangeText={setClinicTypology} />
              <Text style={styles.fieldLabel}>Typologie (sélection rapide)</Text>
              <View style={styles.chipsRow}>
                {clinicTypologyOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionChip, clinicTypology === option && styles.optionChipActive]}
                    onPress={() => setClinicTypology(option)}
                  >
                    <Text style={[styles.optionChipText, clinicTypology === option && styles.optionChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="Description" style={styles.input} value={clinicDescription} onChangeText={setClinicDescription} multiline />
              <TextInput placeholder="Nombre de lits" style={styles.input} value={clinicBeds} onChangeText={setClinicBeds} keyboardType="decimal-pad" />
              <TextInput placeholder="Nombre de médecins" style={styles.input} value={clinicDoctors} onChangeText={setClinicDoctors} keyboardType="decimal-pad" />

              <ThemedText style={styles.subSectionTitle}>Typologie de lits</ThemedText>
              <View style={styles.inlineRow}>
                <TextInput placeholder="Nom (ex: lits de soins intensifs)" style={[styles.input, styles.inlineInput]} value={clinicBedInput.name} onChangeText={(text) => setClinicBedInput((previous) => ({ ...previous, name: text }))} />
                <TextInput placeholder="Nombre" style={[styles.input, styles.inlineInput]} value={clinicBedInput.count} onChangeText={(text) => setClinicBedInput((previous) => ({ ...previous, count: text }))} keyboardType="decimal-pad" />
              </View>
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateClinicBedType}>
                <Text style={styles.inlineAddButtonText}>{editingClinicBedIndex === null ? "Ajouter" : "Modifier"}</Text>
              </TouchableOpacity>
              {clinicBedTypes.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.name}: {item.count}</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setClinicBedInput(item); setEditingClinicBedIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setClinicBedTypes((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <ThemedText style={styles.subSectionTitle}>Typologie de médecins</ThemedText>
              <View style={styles.inlineRow}>
                <TextInput placeholder="Nom (ex: réanimateurs, anesthésistes, échographes)" style={[styles.input, styles.inlineInput]} value={clinicDoctorInput.name} onChangeText={(text) => setClinicDoctorInput((previous) => ({ ...previous, name: text }))} />
                <TextInput placeholder="Nombre" style={[styles.input, styles.inlineInput]} value={clinicDoctorInput.count} onChangeText={(text) => setClinicDoctorInput((previous) => ({ ...previous, count: text }))} keyboardType="decimal-pad" />
              </View>
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateClinicDoctorType}>
                <Text style={styles.inlineAddButtonText}>{editingClinicDoctorIndex === null ? "Ajouter" : "Modifier"}</Text>
              </TouchableOpacity>
              {clinicDoctorTypes.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.name}: {item.count}</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setClinicDoctorInput(item); setEditingClinicDoctorIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setClinicDoctorTypes((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <TextInput placeholder="Équipements" style={styles.input} value={clinicEquipments} onChangeText={setClinicEquipments} multiline />
              <TextInput placeholder="Nombre de blocs opératoires" style={styles.input} value={clinicOperatingBlocks} onChangeText={setClinicOperatingBlocks} keyboardType="decimal-pad" />
              <TextInput placeholder="Salles complémentaires" style={styles.input} value={clinicComplementaryRooms} onChangeText={setClinicComplementaryRooms} />
              <TextInput placeholder="Spécialités médicales & chirurgicales (ex: Ophtalmologie, Réanimation & Néonatologie, Cardiologie)" style={styles.input} value={clinicSpecialties} onChangeText={setClinicSpecialties} multiline />
            </>
          )}

          {projectType === "Hotel" && (
            <>
              <ThemedText style={styles.sectionTitle}>Hôtel - Informations générales</ThemedText>
              <TextInput placeholder="Sous-type" style={styles.input} value={hotelSubtype} onChangeText={setHotelSubtype} />
              <TextInput placeholder="Catégorie" style={styles.input} value={hotelCategory} onChangeText={setHotelCategory} />
              <Text style={styles.fieldLabel}>Catégorie (sélection rapide)</Text>
              <View style={styles.chipsRow}>
                {hotelCategoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionChip, hotelCategory === option && styles.optionChipActive]}
                    onPress={() => setHotelCategory(option)}
                  >
                    <Text style={[styles.optionChipText, hotelCategory === option && styles.optionChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="Note Booking" style={styles.input} value={hotelBookingNote} onChangeText={setHotelBookingNote} keyboardType="decimal-pad" />
              <TextInput placeholder="Opérateur" style={styles.input} value={hotelOperator} onChangeText={setHotelOperator} />
              <TextInput placeholder="Investisseur / Propriétaire" style={styles.input} value={hotelInvestor} onChangeText={setHotelInvestor} />
              <TextInput placeholder="Gestionnaire" style={styles.input} value={hotelManager} onChangeText={setHotelManager} />
              <TextInput placeholder="Date de rénovation" style={styles.input} value={hotelRenovationDate} onChangeText={setHotelRenovationDate} />

              <ThemedText style={styles.sectionTitle}>Hôtel - Hébergement</ThemedText>
              <TextInput placeholder="Nombre de clés" style={styles.input} value={hotelKeys} onChangeText={setHotelKeys} keyboardType="decimal-pad" />
              <TextInput placeholder="Nombre d'étages" style={styles.input} value={hotelFloors} onChangeText={setHotelFloors} keyboardType="decimal-pad" />

              <ThemedText style={styles.subSectionTitle}>Typologie des chambres</ThemedText>
              <View style={styles.inlineRow}>
                <TextInput placeholder="Type" style={[styles.input, styles.inlineInput]} value={hotelRoomInput.type} onChangeText={(text) => setHotelRoomInput((previous) => ({ ...previous, type: text }))} />
                <TextInput placeholder="Nombre" style={[styles.input, styles.inlineInput]} value={hotelRoomInput.count} onChangeText={(text) => setHotelRoomInput((previous) => ({ ...previous, count: text }))} keyboardType="decimal-pad" />
              </View>
              <TextInput placeholder="Surface (m²)" style={styles.input} value={hotelRoomInput.surface} onChangeText={(text) => setHotelRoomInput((previous) => ({ ...previous, surface: text }))} keyboardType="decimal-pad" />
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateHotelRoom}>
                <Text style={styles.inlineAddButtonText}>{editingHotelRoomIndex === null ? "Ajouter chambre" : "Modifier chambre"}</Text>
              </TouchableOpacity>
              {hotelRooms.map((item, index) => (
                <View key={`${item.type}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.type} - {item.count} - {item.surface} m²</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setHotelRoomInput(item); setEditingHotelRoomIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setHotelRooms((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <ThemedText style={styles.subSectionTitle}>Restauration (F&B)</ThemedText>
              <TextInput placeholder="Nom" style={styles.input} value={hotelFnBInput.name} onChangeText={(text) => setHotelFnBInput((previous) => ({ ...previous, name: text }))} />
              <TextInput placeholder="Type" style={styles.input} value={hotelFnBInput.type} onChangeText={(text) => setHotelFnBInput((previous) => ({ ...previous, type: text }))} />
              <TextInput placeholder="Capacité" style={styles.input} value={hotelFnBInput.capacity} onChangeText={(text) => setHotelFnBInput((previous) => ({ ...previous, capacity: text }))} />
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateHotelFnB}><Text style={styles.inlineAddButtonText}>{editingHotelFnBIndex === null ? "Ajouter F&B" : "Modifier F&B"}</Text></TouchableOpacity>
              {hotelFnB.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.name} - {item.type} - {item.capacity}</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setHotelFnBInput(item); setEditingHotelFnBIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setHotelFnB((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <ThemedText style={styles.subSectionTitle}>MICE</ThemedText>
              <TextInput placeholder="Nom" style={styles.input} value={hotelMiceInput.name} onChangeText={(text) => setHotelMiceInput((previous) => ({ ...previous, name: text }))} />
              <TextInput placeholder="Type" style={styles.input} value={hotelMiceInput.type} onChangeText={(text) => setHotelMiceInput((previous) => ({ ...previous, type: text }))} />
              <TextInput placeholder="Nombre de salles" style={styles.input} value={hotelMiceInput.roomsCount || ""} onChangeText={(text) => setHotelMiceInput((previous) => ({ ...previous, roomsCount: text }))} />
              <TextInput placeholder="Capacité" style={styles.input} value={hotelMiceInput.capacity} onChangeText={(text) => setHotelMiceInput((previous) => ({ ...previous, capacity: text }))} />
              <TextInput placeholder="Surface" style={styles.input} value={hotelMiceInput.surface || ""} onChangeText={(text) => setHotelMiceInput((previous) => ({ ...previous, surface: text }))} />
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateHotelMice}><Text style={styles.inlineAddButtonText}>{editingHotelMiceIndex === null ? "Ajouter MICE" : "Modifier MICE"}</Text></TouchableOpacity>
              {hotelMice.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.name} - {item.type} - {item.roomsCount} salles - {item.capacity}</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setHotelMiceInput(item); setEditingHotelMiceIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setHotelMice((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <ThemedText style={styles.subSectionTitle}>Loisirs</ThemedText>
              <TextInput placeholder="Nom" style={styles.input} value={hotelLeisureInput.name} onChangeText={(text) => setHotelLeisureInput((previous) => ({ ...previous, name: text }))} />
              <TextInput placeholder="Type" style={styles.input} value={hotelLeisureInput.type} onChangeText={(text) => setHotelLeisureInput((previous) => ({ ...previous, type: text }))} />
              <TextInput placeholder="Nombre" style={styles.input} value={hotelLeisureInput.count || ""} onChangeText={(text) => setHotelLeisureInput((previous) => ({ ...previous, count: text }))} />
              <TextInput placeholder="Surface" style={styles.input} value={hotelLeisureInput.surface || ""} onChangeText={(text) => setHotelLeisureInput((previous) => ({ ...previous, surface: text }))} />
              <TextInput placeholder="Capacité" style={styles.input} value={hotelLeisureInput.capacity} onChangeText={(text) => setHotelLeisureInput((previous) => ({ ...previous, capacity: text }))} />
              <TouchableOpacity style={styles.inlineAddButton} onPress={addOrUpdateHotelLeisure}><Text style={styles.inlineAddButtonText}>{editingHotelLeisureIndex === null ? "Ajouter loisir" : "Modifier loisir"}</Text></TouchableOpacity>
              {hotelLeisure.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.inlineCardSimple}>
                  <Text style={styles.inlineCardText}>{item.name} - {item.type} - {item.count} - {item.surface}</Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity onPress={() => { setHotelLeisureInput(item); setEditingHotelLeisureIndex(index); }}><Text style={styles.inlineActionEdit}>Modifier</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setHotelLeisure((previous) => previous.filter((_, i) => i !== index))}><Text style={styles.inlineActionDelete}>Supprimer</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
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
          {(isMixedProject || ["Collectif", "Villa", "Lot de villas"].includes(projectType)) && (
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

          <ThemedText style={styles.sectionTitle}>Sources</ThemedText>
          <TextInput
            placeholder="Lien / source (article, site officiel, etc.)"
            style={styles.input}
            value={sourceLink}
            onChangeText={setSourceLink}
            autoCapitalize="none"
          />

          <ThemedText style={styles.sectionTitle}>Photos / Images</ThemedText>
          <View style={styles.photoActionsRow}>
            <TouchableOpacity style={styles.inlineAddButton} onPress={pickPhotosFromLibrary}>
              <Text style={styles.inlineAddButtonText}>Ajouter depuis appareil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineAddButton} onPress={takePhotoWithCamera}>
              <Text style={styles.inlineAddButtonText}>Prendre une photo</Text>
            </TouchableOpacity>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoPreviewCard}>
                  <ExpoImage source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
                  <TouchableOpacity style={styles.photoDeleteButton} onPress={() => removePhoto(index)}>
                    <Text style={styles.photoDeleteButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          {isUploadingPhotos ? <Text style={styles.uploadHint}>Upload photos en cours...</Text> : null}

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
            ref={(ref: any) => { mapRef.current = ref; }}
            style={styles.map}
            mapType={mapType}
            region={mapRegion}
            onPress={(e: any) => {
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
            {latitude && longitude && (
              <Marker
                coordinate={{ latitude, longitude }}
                iconHtml={
                  mapType === "satellite"
                    ? `<div style="width:28px;height:28px;border-radius:14px;background:#31849B;border:2px solid #7F7F7F;"></div>`
                    : `<div style="font-size:24px;">📍</div>`
                }
                iconSize={[28, 28]}
                anchor={{ x: 0.5, y: 0.5 }}
              />
            )}
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

      <AppNoticeModal
        visible={notice.visible}
        type={notice.type}
        title={notice.title}
        message={notice.message}
        primaryAction={{
          label: notice.primaryLabel,
          variant: notice.primaryVariant,
          onPress: notice.onPrimary,
        }}
        secondaryAction={notice.secondaryLabel ? {
          label: notice.secondaryLabel,
          variant: "secondary",
          onPress: notice.onSecondary,
        } : undefined}
        onDismiss={closeNotice}
      />
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

  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  subSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  optionChip: {
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: AppColors.ui.background,
  },

  optionChipActive: {
    backgroundColor: AppColors.primary.main,
    borderColor: AppColors.primary.main,
  },

  optionChipText: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontWeight: "700",
  },

  optionChipTextActive: {
    color: AppColors.ui.background,
  },

  inlineRow: {
    flexDirection: "row",
    gap: 8,
  },

  inlineInput: {
    flex: 1,
  },

  inlineAddButton: {
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: AppColors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },

  inlineAddButtonText: {
    color: AppColors.ui.background,
    fontWeight: "700",
    fontSize: 13,
  },

  inlineCard: {
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    borderRadius: 10,
    padding: 10,
    backgroundColor: AppColors.ui.background,
    marginBottom: 8,
  },

  inlineCardSimple: {
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    borderRadius: 10,
    padding: 10,
    backgroundColor: AppColors.ui.background,
    marginBottom: 8,
  },

  inlineCardTitle: {
    color: AppColors.primary.main,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 4,
  },

  inlineCardText: {
    color: AppColors.ui.text,
    fontSize: 12,
    marginBottom: 2,
  },

  inlineActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  inlineActionEdit: {
    color: AppColors.primary.main,
    fontWeight: "700",
  },

  inlineActionDelete: {
    color: "#C0392B",
    fontWeight: "700",
  },

  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  photoPreviewCard: {
    width: 145,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    overflow: "hidden",
    backgroundColor: AppColors.ui.background,
  },

  photoPreview: {
    width: "100%",
    height: 100,
  },

  photoDeleteButton: {
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: AppColors.gray.lightest,
  },

  photoDeleteButtonText: {
    color: "#C0392B",
    fontSize: 12,
    fontWeight: "700",
  },

  uploadHint: {
    marginBottom: 10,
    color: AppColors.primary.main,
    fontSize: 12,
    fontWeight: "600",
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

  suggestionFieldWrapper: {
    position: "relative",
    zIndex: 1,
  },

  suggestionFieldWrapperActive: {
    zIndex: 50,
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
    zIndex: 60,
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

  calendarQuickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },

  calendarQuickButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: AppColors.ui.background,
  },

  calendarQuickButtonText: {
    color: AppColors.primary.main,
    fontSize: 12,
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