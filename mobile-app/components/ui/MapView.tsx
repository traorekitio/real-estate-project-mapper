import React, { useCallback, useMemo, useRef, useState } from "react";
import { Image, Linking, Platform, StyleSheet, View, Text, TextInput, Modal, Pressable, ScrollView, TouchableOpacity } from "react-native";
import MapView, { Marker } from "@/components/ui/MapViewWrapper";
import { supabase } from "../../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { AppColors } from "@/constants/colors";
import AppNoticeModal, { NoticeType } from "@/components/ui/AppNoticeModal";

type Project = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  project_type: string;
  status: string;
  country?: string;
  city?: string;
  quartier?: string;
  developer?: string;
  standing_cible?: string;
  business_model?: string;
  amenities?: string[];
  project_components?: string[];
  // Surfaces foncières séparées par type
  surface_fonciere_totale?: number;
  surface_fonciere_collectif?: number;
  surface_fonciere_villa?: number;
  surface_fonciere_lot_villas?: number;
  // Total d'unités séparées par type
  total_units?: number;
  total_units_collectif?: number;
  total_units_villa?: number;
  total_units_lot_villas?: number;
  // Taux de commercialisation par type
  commercialization_rate_global?: number;
  commercialization_rate_collectif?: number;
  commercialization_rate_villa?: number;
  commercialization_rate_lot_villas?: number;
  // Taux d'écoulement par type
  sales_velocity_global?: number;
  sales_velocity_collectif?: number;
  sales_velocity_villa?: number;
  sales_velocity_lot_villas?: number;
  // Unités restantes par type
  units_remaining_global?: number;
  units_remaining_collectif?: number;
  units_remaining_villa?: number;
  units_remaining_lot_villas?: number;
  // Dates
  delivery_date?: string;
  start_commercial_date?: string;
  source_link?: string;
};

type Typology = {
  id: string;
  typology_category?: string;
  typology: string;
  surface_habitable_min?: number;
  surface_habitable_max?: number;
  surface_terrasse_min?: number;
  surface_terrasse_max?: number;
  surface_terrain_min?: number;
  surface_terrain_max?: number;
  cus?: number;
  cos?: number;
  hauteur?: string;
  pricing_type?: string;
  pricing_min?: number;
  pricing_max?: number;
  pricing_unit?: string;
  pricing_comment?: string;
  units?: number;
};

type DensityInfo = {
  density_type: string;
  density_value: number;
};

type RetailInfo = {
  opening_date?: string;
  gla?: number;
  positionnement?: string;
  mix_retail?: string;
  enseignes?: string;
};

type ProjectMediaItem = {
  id: string;
  media_url: string;
  media_type?: string;
  caption?: string;
};

const explorerIcons = {
  businessModel: require("../../assets/images/explorer/icone-business model.png"),
  characteristic: require("../../assets/images/explorer/icone-caracteristique.png"),
  collectif: require("../../assets/images/explorer/icone-collectif.png"),
  component: require("../../assets/images/explorer/icone-composante.png"),
  deliveryDate: require("../../assets/images/explorer/icone-date livraison.png"),
  density: require("../../assets/images/explorer/icone-densite.png"),
  developer: require("../../assets/images/explorer/icone-developpeur.png"),
  documents: require("../../assets/images/explorer/icone-documents disponibles.png"),
  star: require("../../assets/images/explorer/icone-etoile.png"),
  fx: require("../../assets/images/explorer/icone-Fx.png"),
  priceRange: require("../../assets/images/explorer/icone-gamme de prix.png"),
  globalPriceRange: require("../../assets/images/explorer/icone-gamme prix globale.png"),
  localisation: require("../../assets/images/explorer/icone-localisation.png"),
  totalUnits: require("../../assets/images/explorer/icone-nombre total unite.png"),
  note: require("../../assets/images/explorer/icone-note.png"),
  openSource: require("../../assets/images/explorer/icone-ouvrir source.png"),
  source: require("../../assets/images/explorer/icone-source.png"),
  standing: require("../../assets/images/explorer/icone-standing cible.png"),
  status: require("../../assets/images/explorer/icone-statut.png"),
  surface: require("../../assets/images/explorer/icone-surface fonciere.png"),
  commercializationRate: require("../../assets/images/explorer/icone-taux commercialisation.png"),
  salesVelocity: require("../../assets/images/explorer/icone-taux ecoulement.png"),
  download: require("../../assets/images/explorer/icone-telecharger.png"),
  unitsPrice: require("../../assets/images/explorer/icone-unite prix.png"),
  unitsRemaining: require("../../assets/images/explorer/icone-unite restante.png"),
} as const;

type ExtendedRetailDetails = {
  typology?: string;
  niveaux?: string;
  parkingPlaces?: string;
  parkingType?: string;
  parkingRatio?: string;
  shoppingCount?: string;
  shoppingBrands?: string;
  foodCount?: string;
  foodBrands?: string;
  foodTypologies?: string[];
  servicesCount?: string;
  servicesBrands?: string;
  leisureCount?: string;
  leisureBrands?: string;
  mainTenants?: string;
  occupancyRate?: string;
};

type ExtendedOfficeDetails = {
  officeType?: string;
  concept?: string;
  target?: string;
  services?: string;
  openingDate?: string;
  spaces?: Array<{
    space?: string;
    description?: string;
    pricingMode?: "from" | "between";
    pricingMin?: string;
    pricingMax?: string;
    pricingUnit?: string;
    pricingComment?: string;
  }>;
};

type ExtendedHealthDetails = {
  clinicTypology?: string;
  description?: string;
  beds?: string;
  bedTypes?: Array<{ name?: string; count?: string }>;
  doctors?: string;
  doctorTypes?: Array<{ name?: string; count?: string }>;
  equipments?: string;
  operatingBlocks?: string;
  complementaryRooms?: string;
  specialties?: string;
  openingDate?: string;
};

type ExtendedHotelDetails = {
  subtype?: string;
  category?: string;
  bookingNote?: string;
  operator?: string;
  investor?: string;
  manager?: string;
  renovationDate?: string;
  keys?: string;
  floors?: string;
  openingDate?: string;
  rooms?: Array<{ type?: string; count?: string; surface?: string; pricePerNight?: string; priceUnit?: string }>;
  fnb?: Array<{ name?: string; type?: string; capacity?: string; pricingAmount?: string; pricingUnit?: string }>;
  mice?: Array<{ name?: string; type?: string; roomsCount?: string; capacity?: string; surface?: string; pricingAmount?: string; pricingUnit?: string }>;
  leisure?: Array<{ name?: string; type?: string; count?: string; surface?: string; capacity?: string; pricingAmount?: string; pricingUnit?: string }>;
};

type ExtendedSportDetails = {
  subtype?: string;
  creationDate?: string;
  openingDate?: string;
  renovationDate?: string;
  capacity?: string;
  positioning?: string;
  targets?: string[];
  targetsOther?: string;
  description?: string;
  activities?: string[];
  activitiesOther?: string;
  equipments?: string[];
  equipmentsOther?: string;
  services?: string[];
  servicesOther?: string;
  fnb?: string[];
  fnbOther?: string;
  pricingMembershipFee?: string;
  pricingMonthly?: string;
  pricingAnnual?: string;
  pricingDaily?: string;
  pricingPerActivity?: string;
  currentMembers?: string;
  renewalRate?: string;
  labels?: string;
  businessModels?: string[];
};

type ExtendedEducationDetails = {
  subtype?: string;
  creationDate?: string;
  openingDate?: string;
  renovationDate?: string;
  capacity?: string;
  students?: string;
  internationalStudents?: string;
  teachers?: string;
  positioning?: string;
  targets?: string[];
  targetsOther?: string;
  description?: string;
  programs?: string[];
  programsOther?: string;
  axes?: string[];
  axesOther?: string;
  equipments?: string[];
  equipmentsOther?: string;
  services?: string[];
  servicesOther?: string;
  fnb?: string[];
  contractModels?: string[];
  contractModelsOther?: string;
  partners?: string;
  accreditations?: string;
  businessModels?: string[];
};

type ExtendedArtCultureDetails = {
  subtype?: string;
  creationDate?: string;
  openingDate?: string;
  renovationDate?: string;
  operator?: string;
  capacity?: string;
  positioning?: string;
  targets?: string[];
  targetsOther?: string;
  description?: string;
  activities?: string[];
  activitiesOther?: string;
  equipments?: string[];
  equipmentsOther?: string;
  services?: string[];
  servicesOther?: string;
  fnb?: string[];
  fnbOther?: string;
  spaceCapacities?: Array<{ name?: string; capacity?: string; surface?: string }>;
  highlights?: string;
  managementModels?: string[];
  managementModelsOther?: string;
  businessModels?: string[];
  partners?: string[];
  partnersOther?: string;
  labels?: string[];
  labelsOther?: string;
};

type ExtendedLeisureDetails = {
  subtype?: string;
  builtSurface?: string;
  creationDate?: string;
  openingDate?: string;
  renovationDate?: string;
  capacity?: string;
  annualVisitors?: string;
  positioning?: string;
  targets?: string[];
  description?: string;
  activities?: string[];
  activitiesOther?: string;
  equipments?: string[];
  equipmentsOther?: string;
  services?: string[];
  servicesOther?: string;
  fnb?: string[];
  spaceCapacities?: Array<{ name?: string; capacity?: string; surface?: string }>;
  highlights?: string;
  seasonality?: string[];
  managementModels?: string[];
  managementModelsOther?: string;
  businessModels?: string[];
  partners?: string;
  labels?: string;
  pricingAdult?: string;
  pricingChild?: string;
  pricingFamily?: string;
  pricingAnnualPass?: string;
  pricingGroup?: string;
  pricingCorporate?: string;
  pricingPerActivity?: string;
};

type ProjectExtendedDetails = {
  retail?: ExtendedRetailDetails;
  office?: ExtendedOfficeDetails;
  health?: ExtendedHealthDetails;
  hotel?: ExtendedHotelDetails;
  sport?: ExtendedSportDetails;
  education?: ExtendedEducationDetails;
  artCulture?: ExtendedArtCultureDetails;
  leisure?: ExtendedLeisureDetails;
};

type MapViewProps = {
  mapType?: "standard" | "satellite" | "hybrid" | "terrain";
  markerSize?: number;
  markerColor?: string;
  projectTypeColors?: Record<"Collectif" | "Villa" | "Lot de villas" | "Retail" | "Bureau" | "Santé" | "Hotel" | "Loisir" | "Sport" | "Education" | "Art et culture", string>;
  markerBorderColor?: string;
  markerTextSize?: number;
};

type SelectionPoint = {
  x: number;
  y: number;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WebMapExportApi = {
  getContainerElement: () => HTMLElement | null;
  latLngToContainerPoint: (coordinate: { latitude: number; longitude: number }) => SelectionPoint;
};

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

const clampSelectionSize = (value: number) => Math.max(1, value);

const toSelectionRect = (start: SelectionPoint, end: SelectionPoint): SelectionRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: clampSelectionSize(Math.abs(end.x - start.x)),
  height: clampSelectionSize(Math.abs(end.y - start.y)),
});

const rgbToHex = (input: string) => {
  if (input.startsWith("#")) return input.toUpperCase();

  const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return input;

  const [, red, green, blue] = match;
  return `#${[red, green, blue]
    .map((value) => Number(value).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
};

const splitProjectsIntoColumns = <T,>(items: T[]) => {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
};

const FILTER_TYPES = ["Collectif", "Villa", "Lot de villas", "Retail", "Bureau", "Santé", "Hotel", "Loisir", "Sport", "Education", "Art et culture"] as const;
type FilterType = (typeof FILTER_TYPES)[number];

const PROJECT_TYPE_DEFAULT_COLORS: Record<FilterType, string> = {
  Collectif: "#31849B",
  Villa: "#FF0066",
  "Lot de villas": "#00CCEE",
  Retail: "#00B050",
  Bureau: "#18424E",
  "Santé": "#009999",
  Hotel: "#7030A0",
  Loisir: "#ff6b35",
  Sport: "#1f77b4",
  Education: "#2ca02c",
  "Art et culture": "#e377c2",
};

const getProjectFilterTypes = (projectType: string | undefined): FilterType[] => {
  if (!projectType) return [];

  const normalized = projectType.toLowerCase();
  const types: FilterType[] = [];

  if (normalized.includes("collectif")) {
    types.push("Collectif");
  }
  if (normalized.includes("lot de villas")) {
    types.push("Lot de villas");
  }
  if (normalized.includes("villa") && !types.includes("Lot de villas")) {
    types.push("Villa");
  }
  if (normalized.includes("retail")) {
    types.push("Retail");
  }
  if (normalized.includes("bureau")) {
    types.push("Bureau");
  }
  if (normalized.includes("sant")) {
    types.push("Santé");
  }
  if (normalized.includes("hotel") || normalized.includes("hôtel")) {
    types.push("Hotel");
  }
  if (normalized.includes("loisir")) {
    types.push("Loisir");
  }
  if (normalized.includes("sport")) {
    types.push("Sport");
  }
  if (normalized.includes("education") || normalized.includes("éducation")) {
    types.push("Education");
  }
  if (normalized.includes("art et culture")) {
    types.push("Art et culture");
  }

  return types;
};

const getPrimaryFilterType = (projectType: string | undefined): FilterType => {
  const projectTypes = getProjectFilterTypes(projectType);
  return projectTypes[0] ?? "Collectif";
};

const assetToDataUrl = async (asset: any) => {
  try {
    const resolved = Image.resolveAssetSource(asset);
    if (!resolved?.uri) {
      return null;
    }

    const response = await fetch(resolved.uri);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const addSlideChrome = async (slide: any, subtitle: string, pageLabel: string) => {
  slide.background = { color: "FFFFFF" };
  slide.addText("Outlook Marché", {
    x: 0.78,
    y: 0.42,
    w: 3.8,
    h: 0.42,
    fontFace: "Century Gothic",
    fontSize: 24,
    color: "31849B",
    bold: false,
  });
  slide.addText(subtitle, {
    x: 0.8,
    y: 0.86,
    w: 4.8,
    h: 0.38,
    fontFace: "Century Gothic",
    fontSize: 18,
    color: "8E9091",
    bold: false,
  });
  slide.addShape("line", {
    x: 0,
    y: 6.83,
    w: 13.333,
    h: 0,
    line: { color: "31849B", width: 1.2 },
  });
  slide.addText("Source: AMS Africa", {
    x: 0.4,
    y: 6.92,
    w: 2.2,
    h: 0.18,
    fontFace: "Century Gothic",
    fontSize: 9,
    color: "4A4A4A",
    italic: true,
  });
  slide.addText("*Note: This list is not exhaustive", {
    x: 0.4,
    y: 7.06,
    w: 2.6,
    h: 0.18,
    fontFace: "Century Gothic",
    fontSize: 8,
    color: "FF2D7A",
    bold: true,
  });
  slide.addText(pageLabel, {
    x: 0.8,
    y: 7.2,
    w: 1,
    h: 0.2,
    fontFace: "Century Gothic",
    fontSize: 8.5,
    color: "31849B",
    align: "center",
  });
  slide.addText("AMS Africa, July 2026", {
    x: 5.8,
    y: 7.08,
    w: 1.9,
    h: 0.18,
    fontFace: "Century Gothic",
    fontSize: 8.5,
    color: "8E9091",
    align: "center",
  });

  const logoDataUrl = await assetToDataUrl(require("@/assets/logos/logo.png"));
  if (logoDataUrl) {
    slide.addImage({
      data: logoDataUrl,
      x: 11.45,
      y: 6.95,
      w: 1.75,
      h: 0.45,
    });
  }
};

export default function MapScreen({ 
  mapType = "standard",
  markerSize = 36,
  markerColor = "#31849B",
  projectTypeColors,
  markerBorderColor = "#7F7F7F",
  markerTextSize = 16
}: MapViewProps) {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTypologies, setProjectTypologies] = useState<Typology[]>([]);
  const [projectDensity, setProjectDensity] = useState<DensityInfo[]>([]);
  const [projectRetail, setProjectRetail] = useState<RetailInfo | null>(null);
  const [projectMedia, setProjectMedia] = useState<ProjectMediaItem[]>([]);
  const [projectExtendedDetails, setProjectExtendedDetails] = useState<ProjectExtendedDetails | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState<"overview" | "characteristics" | "components" | "units" | "commercialization" | "documents">("overview");
  const [activeProjectMediaIndex, setActiveProjectMediaIndex] = useState(0);
  const projectDetailSectionKeys = ["overview", "characteristics", "components", "units", "commercialization", "documents"] as const;
  const projectDetailScrollRef = useRef<ScrollView | null>(null);
  const projectDetailSectionOffsets = useRef<Record<string, number>>({});
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([...FILTER_TYPES]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string | null>(null);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [mapExportApi, setMapExportApi] = useState<WebMapExportApi | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState<SelectionPoint | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "Information",
    message: "",
    primaryLabel: "OK",
  });

  const showNotice = useCallback((payload: Omit<NoticeState, "visible">) => {
    setNotice({ visible: true, ...payload });
  }, []);

  const closeNotice = useCallback(() => {
    setNotice((previous) => ({ ...previous, visible: false }));
  }, []);

  // Fetch projects depuis Supabase chaque fois que l'écran est focus
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*");
    if (error) {
      console.log("Error fetching projects:", error);
    } else {
      setProjects(data as Project[]);
    }
  };

  const fetchProjectTypologies = async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects_typologies")
      .select("*")
      .eq("project_id", projectId);
    if (error) {
      console.log("Error fetching typologies:", error);
      setProjectTypologies([]);
    } else {
      setProjectTypologies(data as Typology[]);
    }
  };

  const fetchProjectDensity = async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects_density")
      .select("*")
      .eq("project_id", projectId);
    if (error) {
      console.log("Error fetching density:", error);
      setProjectDensity([]);
    } else {
      setProjectDensity(data as DensityInfo[]);
    }
  };

  const fetchProjectRetail = async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects_retail")
      .select("*")
      .eq("project_id", projectId);
    if (error) {
      console.log("Error fetching retail:", error);
      setProjectRetail(null);
    } else {
      setProjectRetail(data && data.length > 0 ? (data[0] as RetailInfo) : null);
    }
  };

  const fetchProjectMedia = async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects_media")
      .select("id, media_url, media_type, caption")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Error fetching project media:", error);
      setProjectMedia([]);
      return;
    }

    setProjectMedia((data as ProjectMediaItem[]) || []);
  };

  const fetchProjectExtendedDetails = async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects_extended_details")
      .select("details")
      .eq("project_id", projectId)
      .single();

    if (error) {
      console.log("Error fetching extended details:", error);
      setProjectExtendedDetails(null);
      return;
    }

    setProjectExtendedDetails((data?.details as ProjectExtendedDetails) || null);
  };

  const handleMarkerPress = async (project: Project) => {
    setSelectedProject(project);
    setActiveProjectTab("overview");
    projectDetailSectionOffsets.current = {};
    setProjectMedia([]);
    setProjectExtendedDetails(null);
    if (projectDetailScrollRef.current) {
      projectDetailScrollRef.current.scrollTo({ y: 0, animated: false });
    }
    await Promise.all([
      fetchProjectTypologies(project.id),
      fetchProjectDensity(project.id),
      fetchProjectRetail(project.id),
      fetchProjectMedia(project.id),
      fetchProjectExtendedDetails(project.id),
    ]);
  };

  const syncCollectiveDetailTabFromScroll = useCallback((offsetY: number) => {
    const threshold = 120;
    let nextTab: typeof activeProjectTab = "overview";

    for (const tabKey of projectDetailSectionKeys) {
      const sectionTop = projectDetailSectionOffsets.current[tabKey];
      if (sectionTop != null && offsetY + threshold >= sectionTop) {
        nextTab = tabKey;
      }
    }

    setActiveProjectTab((current) => (current === nextTab ? current : nextTab));
  }, [activeProjectTab]);

  const handleCollectiveTabPress = useCallback((tabKey: typeof projectDetailSectionKeys[number]) => {
    setActiveProjectTab(tabKey);
    const targetOffset = projectDetailSectionOffsets.current[tabKey];
    if (targetOffset == null || !projectDetailScrollRef.current) {
      return;
    }

    projectDetailScrollRef.current.scrollTo({
      y: Math.max(0, targetOffset - 12),
      animated: true,
    });
  }, []);

  const filterTypeColors = useMemo(
    () => ({
      ...PROJECT_TYPE_DEFAULT_COLORS,
      ...(projectTypeColors ?? {}),
    }),
    [projectTypeColors]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const types = getProjectFilterTypes(project.project_type);
      const matchesType = types.length === 0
        ? activeFilters.length === FILTER_TYPES.length
        : types.some((type) => activeFilters.includes(type));

      if (!matchesType) return false;

      if (!selectedCityFilter) return true;
      return (project.city || "").trim().toLowerCase() === selectedCityFilter.trim().toLowerCase();
    });
  }, [activeFilters, projects, selectedCityFilter]);

  const cityFilterOptions = useMemo(() => {
    const uniqueCities = new Set<string>();
    projects.forEach((project) => {
      const city = (project.city || "").trim();
      if (city) uniqueCities.add(city);
    });
    return Array.from(uniqueCities).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [projects]);

  const toggleFilter = (type: FilterType) => {
    setActiveFilters((previous) => {
      if (previous.includes(type)) {
        const next = previous.filter((item) => item !== type);
        return next.length === 0 ? [...FILTER_TYPES] : next;
      }

      return [...previous, type];
    });
  };

  const searchCityOnMap = async () => {
    const query = citySearchQuery.trim();
    if (!query) {
      showNotice({
        type: "info",
        title: "Recherche",
        message: "Entrez une ville à rechercher.",
        primaryLabel: "Compris",
      });
      return;
    }

    setIsSearchingCity(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=fr`
      );
      const data = await response.json();
      const firstResult = data?.features?.[0];
      const longitude = firstResult?.geometry?.coordinates?.[0];
      const latitude = firstResult?.geometry?.coordinates?.[1];

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        showNotice({
          type: "warning",
          title: "Recherche",
          message: "Aucun résultat trouvé pour cette ville.",
          primaryLabel: "OK",
        });
        return;
      }

      const targetRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

      if (mapRef.current && typeof mapRef.current.animateToRegion === "function") {
        mapRef.current.animateToRegion(targetRegion, 700);
      }

      setCitySearchQuery(firstResult?.properties?.city || query);
      if (firstResult?.properties?.city) {
        setSelectedCityFilter(firstResult.properties.city);
      }
    } catch (error) {
      console.error("City search failed", error);
      showNotice({
        type: "error",
        title: "Recherche",
        message: "Impossible de rechercher cette ville pour le moment.",
        primaryLabel: "Fermer",
      });
    } finally {
      setIsSearchingCity(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    const executeDelete = async () => {
      const deletes = [
        supabase.from("projects_typologies").delete().eq("project_id", projectId),
        supabase.from("projects_density").delete().eq("project_id", projectId),
        supabase.from("projects_retail").delete().eq("project_id", projectId),
        supabase.from("projects_media").delete().eq("project_id", projectId),
        supabase.from("projects_extended_details").delete().eq("project_id", projectId),
      ];

      const deleteRelations = await Promise.all(deletes);
      const relationError = deleteRelations.find((result) => result.error)?.error;
      if (relationError) {
        throw relationError;
      }

      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) {
        throw error;
      }

      setSelectedProject(null);
      setProjectTypologies([]);
      setProjectDensity([]);
      setProjectRetail(null);
      setProjectMedia([]);
      setProjectExtendedDetails(null);
      await fetchProjects();
    };

    showNotice({
      type: "warning",
      title: "Supprimer ce projet",
      message: "Voulez-vous vraiment supprimer ce projet ?",
      primaryLabel: "Supprimer",
      primaryVariant: "danger",
      secondaryLabel: "Annuler",
      onPrimary: async () => {
        try {
          await executeDelete();
          showNotice({
            type: "success",
            title: "Succès",
            message: "Projet supprimé avec succès.",
            primaryLabel: "Parfait",
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
          showNotice({
            type: "error",
            title: "Erreur",
            message: `Suppression impossible: ${errorMessage}`,
            primaryLabel: "Fermer",
          });
        }
      },
    });
  };

  const getDensityLabel = (projectType: string | undefined, densityType: string) => {
    if (densityType === "CUS") {
      return `CUS: `;
    }
    
    if (densityType === "density") {
      switch (projectType) {
        case "Collectif":
          return "Densité: ";
        case "Villa":
          return "Densité: ";
        case "Lot de villas":
          return "Densité: ";
        default:
          return "Densité: ";
      }
    }
    
    return `${densityType}: `;
  };

  const getDensityUnit = (projectType: string | undefined, densityType: string) => {
    if (densityType === "CUS") {
      return "";
    }
    
    if (densityType === "density") {
      switch (projectType) {
        case "Collectif":
          return " unités/immeuble";
        case "Villa":
          return " unités/ha";
        case "Lot de villas":
          return " unités/ha";
        default:
          return "";
      }
    }
    
    return "";
  };

  const formatPrice = (priceString: string): string => {
    if (!priceString) return priceString;
    
    // Essayer de parser le prix comme nombre
    const priceMatch = priceString.match(/[\d.,]+/);
    if (!priceMatch) return priceString;
    
    let numericPart = priceMatch[0].replace(/[.,]/g, '');
    
    // Formater avec espaces de milliers
    const formatted = numericPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    // Ajouter MAD s'il n'y est pas déjà
    if (!priceString.toUpperCase().includes('MAD')) {
      return `${formatted} MAD`;
    }
    
    return `${formatted} MAD`;
  };

  const formatRange = (min?: number, max?: number) => {
    if (min != null && max != null) {
      return `${min} - ${max}`;
    }
    if (min != null) {
      return `${min}`;
    }
    if (max != null) {
      return `${max}`;
    }
    return "";
  };

  const formatArray = (items?: string[] | null) => {
    if (!items || items.length === 0) return "";
    return items.join(" • ");
  };

  const formatNumericPrice = (value?: number | null, unit?: string) => {
    if (value == null || Number.isNaN(value)) return "";
    const formatted = value.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const getMinHabitableSurface = (typology: Typology) => {
    if (typology.surface_habitable_min != null) {
      return typology.surface_habitable_min;
    }
    return null;
  };

  const getTypologyPricePerSquareMeter = (typology: Typology) => {
    const priceMin = typology.pricing_min;
    const habitableMin = getMinHabitableSurface(typology);

    if (priceMin == null || habitableMin == null || habitableMin <= 0) {
      return null;
    }

    return Math.round(priceMin / habitableMin);
  };

  const getTypologyPriceLabel = (typology: Typology) => {
    if (typology.pricing_type === "between" && typology.pricing_min != null && typology.pricing_max != null) {
      return `Entre ${formatNumericPrice(typology.pricing_min, typology.pricing_unit)} et ${formatNumericPrice(typology.pricing_max, typology.pricing_unit)}`;
    }
    if (typology.pricing_type === "from" && typology.pricing_min != null) {
      return `À partir de ${formatNumericPrice(typology.pricing_min, typology.pricing_unit)}`;
    }
    if (typology.pricing_min != null) {
      return formatNumericPrice(typology.pricing_min, typology.pricing_unit);
    }
    return "Prix non précisé";
  };

  const getPriceRangeText = (typologies: Typology[]) => {
    const values = typologies
      .map((typology) => typology.pricing_min)
      .filter((value): value is number => value != null && !Number.isNaN(value));

    if (values.length === 0) {
      return "Aucune donnée de prix";
    }

    const minPrice = Math.min(...values);
    const maxPrice = Math.max(...values);
    const unit = typologies.find((typology) => typology.pricing_unit)?.pricing_unit;

    if (minPrice === maxPrice) {
      return formatNumericPrice(minPrice, unit);
    }

    return `Entre ${formatNumericPrice(minPrice, unit)} et ${formatNumericPrice(maxPrice, unit)}`;
  };

  const formatOfficeSpacePricing = (space: NonNullable<ExtendedOfficeDetails["spaces"]>[number]) => {
    if (!space) return "";
    if (space.pricingMode === "between" && space.pricingMin && space.pricingMax) {
      return `Entre ${space.pricingMin} et ${space.pricingMax} ${space.pricingUnit || "MAD"}`;
    }
    if (space.pricingMin) {
      return `A partir de ${space.pricingMin} ${space.pricingUnit || "MAD"}`;
    }
    return "";
  };

  const formatCountTypePairs = (items?: Array<{ name?: string; count?: string }>) => {
    if (!items || items.length === 0) return "";
    return items
      .filter((item) => item?.name || item?.count)
      .map((item) => `${item.name || "Type"}: ${item.count || "-"}`)
      .join(" • ");
  };

  const renderActiveProjectTabContent = () => {
    if (!selectedProject) {
      return null;
    }

    const galleryImages = projectMedia.length > 0
      ? projectMedia.map((item) => item.media_url).filter(Boolean)
      : ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"];
    const currentGalleryImage = galleryImages[activeProjectMediaIndex] || galleryImages[0];
    const amenities = [...new Set([...(selectedProject.amenities || []), ...(selectedProject.project_components || [])])];

    const overviewCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Standing / Cible", value: selectedProject.standing_cible || "Moyen de gamme +", icon: "standing" },
      { label: "Statut", value: selectedProject.status || "En cours de livraison/construction", icon: "status" },
      { label: "Localisation", value: [selectedProject.country, selectedProject.city, selectedProject.quartier].filter(Boolean).join(", ") || "Maroc, Casablanca, CFC", icon: "localisation" },
      { label: "Développeur", value: selectedProject.developer || "Valoris group", icon: "developer" },
      { label: "Business model", value: selectedProject.business_model || "Vente", icon: "businessModel" },
    ];

    const characteristicMetrics = [
      { label: "Surface foncière totale", value: selectedProject.surface_fonciere_totale ? `${selectedProject.surface_fonciere_totale.toLocaleString()} m²` : "N/A" },
      { label: "Nombre total d’unités", value: selectedProject.total_units ? `${selectedProject.total_units.toLocaleString()} unités` : "N/A" },
      { label: "Date de livraison", value: selectedProject.delivery_date || "N/A" },
      { label: "Densité", value: projectDensity.length > 0 ? projectDensity.map((density) => `${density.density_value}${getDensityUnit(selectedProject.project_type, density.density_type) || ""}`).join(" • ") : "N/A" },
    ];

    const commercializationCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Taux de commercialisation global", value: selectedProject.commercialization_rate_global != null ? `${selectedProject.commercialization_rate_global}%` : "N/A", icon: "commercializationRate" },
      { label: "Taux d’écoulement global", value: selectedProject.sales_velocity_global != null ? `${selectedProject.sales_velocity_global} unités/mois` : "N/A", icon: "salesVelocity" },
      { label: "Unités restantes", value: selectedProject.units_remaining_global != null ? `${selectedProject.units_remaining_global.toLocaleString()} unités` : "N/A", icon: "unitsRemaining" },
      { label: "Gamme de prix", value: projectTypologies.length > 0 ? getPriceRangeText(projectTypologies) : "N/A", icon: "priceRange" },
    ];

    const documentRows = projectMedia.length > 0
      ? projectMedia.map((item, index) => ({
          id: item.id,
          title: item.caption || `Document ${index + 1}`,
          format: item.media_type || "Document",
          url: item.media_url,
        }))
      : [
          { id: "no-doc", title: "Aucun document disponible", format: "—", url: "" },
        ];

    const tabButtons = [
      { key: "overview", label: "Vue d’ensemble", icon: "▣" },
      { key: "characteristics", label: "Caractéristiques", icon: "▤" },
      { key: "components", label: "Équipements", icon: "◫" },
      { key: "units", label: "Unités & Prix", icon: "▥" },
      { key: "commercialization", label: "Commercialisation", icon: "▌" },
      { key: "documents", label: "Documents & Source", icon: "□" },
    ] as const;

    const renderTabButton = (tabKey: typeof tabButtons[number]["key"]) => {
      const isActive = activeProjectTab === tabKey;
      const tab = tabButtons.find((item) => item.key === tabKey);
      return (
        <TouchableOpacity
          key={tabKey}
          style={[styles.projectTabButton, isActive && styles.projectTabButtonActive]}
          onPress={() => setActiveProjectTab(tabKey)}
          activeOpacity={0.9}
        >
          <View style={styles.projectTabIconSlot}>
            <Text style={[styles.projectTabIcon, isActive && styles.projectTabIconActive]}>{tab?.icon || "▣"}</Text>
          </View>
          <Text style={[styles.projectTabText, isActive && styles.projectTabTextActive]}>{tab?.label}</Text>
        </TouchableOpacity>
      );
    };

    const renderCardGrid = (items: { label: string; value: string; icon?: keyof typeof explorerIcons }[]) => (
      <View style={styles.projectOverviewGrid}>
        {items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.projectOverviewCard}>
            <View style={styles.projectOverviewCardIconWrap}>
              <Image source={explorerIcons[item.icon || "component"]} style={styles.explorerIcon} resizeMode="contain" />
            </View>
            <View style={styles.projectOverviewCardContent}>
              <Text style={styles.projectOverviewCardLabel}>{item.label}</Text>
              <Text style={styles.projectOverviewCardValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>
    );

    const hotelDetails = projectExtendedDetails?.hotel;
    const retailDetails = projectExtendedDetails?.retail;
    const officeDetails = projectExtendedDetails?.office;
    const artCultureDetails = projectExtendedDetails?.artCulture;
    const isHotelProject = (selectedProject.project_type || "").toLowerCase().includes("hotel") || (selectedProject.project_type || "").toLowerCase().includes("hôtel");
    const isRetailProject = (selectedProject.project_type || "").toLowerCase().includes("retail");
    const isOfficeProject = (selectedProject.project_type || "").toLowerCase().includes("bureau") || (selectedProject.project_type || "").toLowerCase().includes("office");
    const isArtCultureProject = (selectedProject.project_type || "").toLowerCase().includes("art et culture");
    const splitTextList = (value?: string) => {
      if (!value) return [];
      return value
        .split(/[,;|•]/)
        .map((item) => item.trim())
        .filter(Boolean);
    };
    const hotelRooms = Array.isArray(hotelDetails?.rooms) ? hotelDetails.rooms.filter((room) => room && typeof room === "object") : [];
    const hotelFnb = Array.isArray(hotelDetails?.fnb) ? hotelDetails.fnb.filter((item) => item && typeof item === "object") : [];
    const hotelMice = Array.isArray(hotelDetails?.mice) ? hotelDetails.mice.filter((item) => item && typeof item === "object") : [];
    const hotelLeisure = Array.isArray(hotelDetails?.leisure) ? hotelDetails.leisure.filter((item) => item && typeof item === "object") : [];
    const hotelRoomCountTotal = hotelRooms.reduce((sum, room) => {
      const parsed = Number(String(room.count ?? "").replace(/[^0-9.]/g, ""));
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
    const hotelMinNightPrice = hotelRooms
      .map((room) => Number(String(room.pricePerNight ?? "").replace(/[^0-9.]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((min, value) => (value < min ? value : min), Number.POSITIVE_INFINITY);
    const hotelMaxNightPrice = hotelRooms
      .map((room) => Number(String(room.pricePerNight ?? "").replace(/[^0-9.]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((max, value) => (value > max ? value : max), Number.NEGATIVE_INFINITY);

    const hotelOverviewCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Sous-type", value: hotelDetails?.subtype || "Hôtel", icon: "collectif" },
      { label: "Catégorie", value: hotelDetails?.category || "Non renseignée", icon: "star" },
      { label: "Nombre de clés", value: hotelDetails?.keys ? `${hotelDetails.keys.toLocaleString()} clés` : "N/A", icon: "totalUnits" },
      { label: "Nombre d’étages", value: hotelDetails?.floors ? `${hotelDetails.floors.toLocaleString()} étages` : "N/A", icon: "density" },
      { label: "Opérateur", value: hotelDetails?.operator || "N/A", icon: "developer" },
    ];

    const hotelCharacteristics = [
      { label: "Surface foncière totale", value: selectedProject.surface_fonciere_totale ? `${selectedProject.surface_fonciere_totale.toLocaleString()} m²` : "N/A" },
      { label: "Nombre de chambres", value: hotelRoomCountTotal > 0 ? `${hotelRoomCountTotal.toLocaleString()} chambres` : "N/A" },
      { label: "Date d’ouverture", value: hotelDetails?.openingDate || "N/A" },
      { label: "Date de rénovation", value: hotelDetails?.renovationDate || "N/A" },
    ];

    const hotelCommercializationCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Note Booking", value: hotelDetails?.bookingNote || "N/A", icon: "commercializationRate" },
      { label: "Investisseur / Propriétaire", value: hotelDetails?.investor || "N/A", icon: "developer" },
      { label: "Gestionnaire", value: hotelDetails?.manager || "N/A", icon: "status" },
      { label: "Mix services", value: `${hotelFnb.length} F&B • ${hotelMice.length} MICE • ${hotelLeisure.length} Loisirs`, icon: "component" },
      { label: "Gamme de prix / nuit", value: hotelMinNightPrice !== Number.POSITIVE_INFINITY && hotelMaxNightPrice !== Number.NEGATIVE_INFINITY
        ? `${hotelMinNightPrice.toLocaleString()} - ${hotelMaxNightPrice.toLocaleString()} MAD`
        : "N/A", icon: "priceRange" },
    ];

    const retailOverviewCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Typologie retail", value: retailDetails?.typology || "N/A", icon: "collectif" },
      { label: "Positionnement", value: projectRetail?.positionnement || "N/A", icon: "standing" },
      { label: "GLA", value: projectRetail?.gla != null ? `${projectRetail.gla.toLocaleString()} m²` : "N/A", icon: "surface" },
      { label: "Niveaux", value: retailDetails?.niveaux || "N/A", icon: "density" },
      { label: "Mix retail", value: projectRetail?.mix_retail || "N/A", icon: "component" },
    ];

    const retailCharacteristicsRows = [
      { label: "Date d'ouverture", value: projectRetail?.opening_date || "N/A" },
      { label: "Parking places", value: retailDetails?.parkingPlaces || "N/A" },
      { label: "Type de parking", value: retailDetails?.parkingType || "N/A" },
      { label: "Parking ratio", value: retailDetails?.parkingRatio || "N/A" },
      { label: "Taux d'occupation", value: retailDetails?.occupancyRate || "N/A" },
      { label: "Locataires principaux", value: retailDetails?.mainTenants || "N/A" },
    ];

    const officeSpaces = Array.isArray(officeDetails?.spaces)
      ? officeDetails!.spaces.filter((space) => space && (space.space || space.description || space.pricingMin || space.pricingMax))
      : [];

    const officeOverviewCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Type de bureau", value: officeDetails?.officeType || "N/A", icon: "collectif" },
      { label: "Concept", value: officeDetails?.concept || "N/A", icon: "component" },
      { label: "Cible", value: officeDetails?.target || "N/A", icon: "standing" },
      { label: "Services", value: officeDetails?.services || "N/A", icon: "documents" },
      { label: "Espaces de travail", value: `${officeSpaces.length} espace(s)`, icon: "totalUnits" },
    ];

    const officeCharacteristicsRows = [
      { label: "Date d'ouverture", value: officeDetails?.openingDate || "N/A" },
      { label: "Surface foncière totale", value: selectedProject.surface_fonciere_totale ? `${selectedProject.surface_fonciere_totale.toLocaleString()} m²` : "N/A" },
      { label: "Nombre total d’unités", value: selectedProject.total_units ? `${selectedProject.total_units.toLocaleString()} unités` : "N/A" },
      { label: "Ville", value: selectedProject.city || "N/A" },
    ];

    const artCultureTargets = [
      ...(artCultureDetails?.targets || []),
      ...splitTextList(artCultureDetails?.targetsOther),
    ].filter(Boolean);

    const artCultureSpaces = Array.isArray(artCultureDetails?.spaceCapacities)
      ? artCultureDetails!.spaceCapacities.filter((item) => item && (item.name || item.capacity || item.surface))
      : [];

    const artCultureOverviewCards: Array<{ label: string; value: string; icon?: keyof typeof explorerIcons }> = [
      { label: "Sous-type", value: artCultureDetails?.subtype || "N/A", icon: "collectif" },
      { label: "Capacité", value: artCultureDetails?.capacity || "N/A", icon: "totalUnits" },
      { label: "Public cible", value: artCultureTargets.length > 0 ? artCultureTargets.join(" • ") : "N/A", icon: "standing" },
      { label: "Positionnement", value: artCultureDetails?.positioning || "N/A", icon: "status" },
      { label: "Typologie d'espaces", value: `${artCultureSpaces.length} espace(s)`, icon: "component" },
    ];

    const artCultureCharacteristicRows = [
      { label: "Date de création", value: artCultureDetails?.creationDate || "N/A" },
      { label: "Date de rénovation", value: artCultureDetails?.renovationDate || "N/A" },
      { label: "Opérateur", value: artCultureDetails?.operator || "N/A" },
      { label: "Temps forts", value: artCultureDetails?.highlights || "N/A" },
    ];

    const renderArtCultureCharacteristicsContent = () => {
      const leftRows = artCultureCharacteristicRows.slice(0, 2);
      const rightRows = artCultureCharacteristicRows.slice(2, 4);

      return (
        <View style={styles.projectCharacteristicsContainer}>
          <View style={styles.projectCharacteristicsHeader}>
            <View style={styles.projectCharacteristicsTitleIconWrap}>
              <Image source={explorerIcons.characteristic} style={styles.explorerIconMedium} resizeMode="contain" />
            </View>
            <Text style={styles.projectCharacteristicsTitle}>Chiffres clés art & culture</Text>
          </View>

          <View style={styles.projectCharacteristicsGrid}>
            <View style={styles.projectCharacteristicsBlock}>
              {leftRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === leftRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.projectCharacteristicsBlock}>
              {rightRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === rightRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderArtCultureUnitsContent = () => {
      return (
        <View style={styles.projectUnitsSectionContainer}>
          <View style={styles.projectUnitsTitleRow}>
            <View style={styles.projectUnitsTitleIconWrap}>
              <Image source={explorerIcons.unitsPrice} style={styles.projectUnitsSectionIcon} resizeMode="contain" />
            </View>
            <Text style={styles.projectUnitsTitle}>Typologie d'espaces</Text>
          </View>

          {artCultureSpaces.length > 0 ? (
            <View style={styles.projectTypologyGrid}>
              {artCultureSpaces.map((space, index) => (
                <View key={`${space.name || "espace"}-${index}`} style={styles.projectTypologyCard}>
                  <View style={styles.projectTypologyPlanZone}>
                    <View style={styles.projectTypologyIconWrap}>
                      <Image source={explorerIcons.fx} style={styles.projectTypologyIconImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectTypologyName}>{space.name || `Espace ${index + 1}`}</Text>
                  </View>

                  <View style={styles.projectTypologyDivider} />

                  <View style={styles.projectTypologySurfaceZone}>
                    <Text style={styles.projectTypologyMetaLine}>
                      <Text style={styles.projectTypologyMetaLabel}>Capacité: </Text>
                      <Text style={styles.projectTypologyMetaValue}>{space.capacity || "N/A"}</Text>
                    </Text>
                  </View>

                  <View style={styles.projectTypologyDivider} />

                  <View style={styles.projectTypologyPriceZone}>
                    <Text style={styles.projectTypologyPriceLabel}>Surface</Text>
                    <Text style={styles.projectTypologyPriceValue}>{space.surface ? `${space.surface} m²` : "N/A"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>Aucune typologie d'espace renseignée.</Text></View>
          )}
        </View>
      );
    };

    const renderArtCultureSpecificContent = () => (
      <View>
        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.overview = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(artCultureOverviewCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.characteristics = event.nativeEvent.layout.y;
          }}
        >
          {renderArtCultureCharacteristicsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.components = event.nativeEvent.layout.y;
          }}
        >
          {renderComponentsGrid()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.units = event.nativeEvent.layout.y;
          }}
        >
          {renderArtCultureUnitsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.commercialization = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(commercializationCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.documents = event.nativeEvent.layout.y;
          }}
        >
          {renderDocumentsContent()}
        </View>
      </View>
    );

    const renderOfficeCharacteristicsContent = () => {
      const leftRows = officeCharacteristicsRows.slice(0, 2);
      const rightRows = officeCharacteristicsRows.slice(2, 4);

      return (
        <View style={styles.projectCharacteristicsContainer}>
          <View style={styles.projectCharacteristicsHeader}>
            <View style={styles.projectCharacteristicsTitleIconWrap}>
              <Image source={explorerIcons.characteristic} style={styles.explorerIconMedium} resizeMode="contain" />
            </View>
            <Text style={styles.projectCharacteristicsTitle}>Chiffres clés bureau</Text>
          </View>

          <View style={styles.projectCharacteristicsGrid}>
            <View style={styles.projectCharacteristicsBlock}>
              {leftRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === leftRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.projectCharacteristicsBlock}>
              {rightRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === rightRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderOfficeUnitsContent = () => {
      return (
        <View style={styles.projectUnitsSectionContainer}>
          <View style={styles.projectUnitsTitleRow}>
            <View style={styles.projectUnitsTitleIconWrap}>
              <Image source={explorerIcons.unitsPrice} style={styles.projectUnitsSectionIcon} resizeMode="contain" />
            </View>
            <Text style={styles.projectUnitsTitle}>Espaces de travail</Text>
          </View>

          {officeSpaces.length > 0 ? (
            <View style={styles.projectTypologyGrid}>
              {officeSpaces.map((space, index) => {
                const pricingLabel = formatOfficeSpacePricing(space as NonNullable<ExtendedOfficeDetails["spaces"]>[number]) || "Prix non renseigné";

                return (
                  <View key={`${space.space || "espace"}-${index}`} style={styles.projectTypologyCard}>
                    <View style={styles.projectTypologyPlanZone}>
                      <View style={styles.projectTypologyIconWrap}>
                        <Image source={explorerIcons.fx} style={styles.projectTypologyIconImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.projectTypologyName}>{space.space || `Espace ${index + 1}`}</Text>
                    </View>

                    <View style={styles.projectTypologyDivider} />

                    <View style={styles.projectTypologySurfaceZone}>
                      <Text style={styles.projectTypologyMetaLine}>
                        <Text style={styles.projectTypologyMetaLabel}>Description: </Text>
                        <Text style={styles.projectTypologyMetaValue}>{space.description || "N/A"}</Text>
                      </Text>
                    </View>

                    <View style={styles.projectTypologyDivider} />

                    <View style={styles.projectTypologyPriceZone}>
                      <Text style={styles.projectTypologyPriceLabel}>Prix de location</Text>
                      <Text style={styles.projectTypologyPriceValue}>{pricingLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>Aucun espace de travail renseigné.</Text></View>
          )}
        </View>
      );
    };

    const renderOfficeSpecificContent = () => (
      <View>
        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.overview = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(officeOverviewCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.characteristics = event.nativeEvent.layout.y;
          }}
        >
          {renderOfficeCharacteristicsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.components = event.nativeEvent.layout.y;
          }}
        >
          {renderComponentsGrid()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.units = event.nativeEvent.layout.y;
          }}
        >
          {renderOfficeUnitsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.commercialization = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(commercializationCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.documents = event.nativeEvent.layout.y;
          }}
        >
          {renderDocumentsContent()}
        </View>
      </View>
    );

    const renderRetailCharacteristicsContent = () => {
      const leftRows = retailCharacteristicsRows.slice(0, 3);
      const rightRows = retailCharacteristicsRows.slice(3, 6);

      return (
        <View style={styles.projectCharacteristicsContainer}>
          <View style={styles.projectCharacteristicsHeader}>
            <View style={styles.projectCharacteristicsTitleIconWrap}>
              <Image source={explorerIcons.characteristic} style={styles.explorerIconMedium} resizeMode="contain" />
            </View>
            <Text style={styles.projectCharacteristicsTitle}>Chiffres clés retail</Text>
          </View>

          <View style={styles.projectCharacteristicsGrid}>
            <View style={styles.projectCharacteristicsBlock}>
              {leftRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === leftRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.projectCharacteristicsBlock}>
              {rightRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === rightRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderRetailComponentsGrid = () => {
      const shoppingBrands = splitTextList(retailDetails?.shoppingBrands);
      const servicesBrands = splitTextList(retailDetails?.servicesBrands);
      const leisureBrands = splitTextList(retailDetails?.leisureBrands);
      const fnbBrands = splitTextList(retailDetails?.foodBrands);

      const renderBrandList = (title: string, count: string | undefined, items: string[]) => (
        <View style={styles.projectEquipmentBlock}>
          <View style={styles.projectEquipmentHeader}>
            <View style={styles.projectEquipmentIconWrap}>
              <Image source={explorerIcons.component} style={styles.projectEquipmentTitleIcon} resizeMode="contain" />
            </View>
            <Text style={styles.projectEquipmentTitle}>{title} ({count || "0"})</Text>
          </View>

          <View style={styles.projectComponentGrid}>
            {(items.length > 0 ? items : ["Aucune enseigne renseignée"]).map((item, index) => (
              <View key={`${title}-${item}-${index}`} style={styles.projectComponentItem}>
                <Text style={styles.projectComponentItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      );

      return (
        <View style={styles.projectEquipmentLayout}>
          {renderBrandList("Shopping", retailDetails?.shoppingCount, shoppingBrands)}
          {renderBrandList("Services", retailDetails?.servicesCount, servicesBrands)}
          {renderBrandList("Loisirs", retailDetails?.leisureCount, leisureBrands)}
          {renderBrandList("F&B", retailDetails?.foodCount, fnbBrands)}
        </View>
      );
    };

    const renderRetailSpecificContent = () => (
      <View>
        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.overview = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(retailOverviewCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.characteristics = event.nativeEvent.layout.y;
          }}
        >
          {renderRetailCharacteristicsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.components = event.nativeEvent.layout.y;
          }}
        >
          {renderRetailComponentsGrid()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.units = event.nativeEvent.layout.y;
          }}
        >
          {renderUnitsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.commercialization = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(commercializationCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.documents = event.nativeEvent.layout.y;
          }}
        >
          {renderDocumentsContent()}
        </View>
      </View>
    );

    const renderHotelCharacteristicsContent = () => {
      const leftRows = hotelCharacteristics.slice(0, 2);
      const rightRows = hotelCharacteristics.slice(2, 4);

      return (
        <View style={styles.projectCharacteristicsContainer}>
          <View style={styles.projectCharacteristicsHeader}>
            <View style={styles.projectCharacteristicsTitleIconWrap}>
              <Image source={explorerIcons.characteristic} style={styles.explorerIconMedium} resizeMode="contain" />
            </View>
            <Text style={styles.projectCharacteristicsTitle}>Chiffres clés</Text>
          </View>

          <View style={styles.projectCharacteristicsGrid}>
            <View style={styles.projectCharacteristicsBlock}>
              {leftRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === leftRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.projectCharacteristicsBlock}>
              {rightRows.map((row, index) => (
                <View key={row.label} style={[styles.projectCharacteristicsRow, index === rightRows.length - 1 && styles.projectCharacteristicsRowLast]}>
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons.characteristic} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderHotelComponentsGrid = () => {
      const fnbList = hotelFnb.length > 0 ? hotelFnb : [{ name: "Aucune restauration renseignée", type: "—", capacity: "—", pricingAmount: "", pricingUnit: "MAD" }];
      const miceList = hotelMice.length > 0 ? hotelMice : [{ name: "Aucun MICE renseigné", type: "—", roomsCount: "—", capacity: "—", surface: "—", pricingAmount: "", pricingUnit: "MAD" }];
      const leisureList = hotelLeisure.length > 0 ? hotelLeisure : [{ name: "Aucun loisir renseigné", type: "—", count: "—", surface: "—", capacity: "—", pricingAmount: "", pricingUnit: "MAD" }];

      return (
        <View style={styles.projectEquipmentLayout}>
          <View style={styles.projectEquipmentBlock}>
            <View style={styles.projectEquipmentHeader}>
              <View style={styles.projectEquipmentIconWrap}>
                <Image source={explorerIcons.component} style={styles.projectEquipmentTitleIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectEquipmentTitle}>Restauration (F&B)</Text>
            </View>

            <View style={styles.projectComponentGrid}>
              {fnbList.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.projectComponentItem}>
                  <Text style={styles.projectComponentItemText}>{item.name} {item.type ? `• ${item.type}` : ""} {item.capacity ? `• ${item.capacity}` : ""}{item.pricingAmount ? ` • ${item.pricingAmount} ${item.pricingUnit || "MAD"}` : ""}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.projectEquipmentBlock}>
            <View style={styles.projectEquipmentHeader}>
              <View style={styles.projectEquipmentIconWrap}>
                <Image source={explorerIcons.star} style={styles.projectEquipmentTitleIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectEquipmentTitle}>MICE & Loisirs</Text>
            </View>

            <View style={styles.projectComponentGrid}>
              {[...miceList.map((item) => ({ title: `${item.name || "MICE"} • ${item.type || "—"} • ${item.capacity || "—"}`, key: `mice-${item.name}-${item.type}` })), ...leisureList.map((item) => ({ title: `${item.name || "Loisir"} • ${item.type || "—"} • ${item.count || "—"} • ${item.surface || "—"}`, key: `leisure-${item.name}-${item.type}` }))].map((item) => (
                <View key={item.key} style={styles.projectComponentItem}>
                  <Text style={styles.projectComponentItemText}>{item.title}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderHotelUnitsContent = () => {
      const rooms = hotelRooms.length > 0 ? hotelRooms : [];
      const hasRoomData = rooms.length > 0;

      return (
        <View style={styles.projectUnitsSectionContainer}>
          <View style={styles.projectUnitsTitleRow}>
            <View style={styles.projectUnitsTitleIconWrap}>
              <Image source={explorerIcons.unitsPrice} style={styles.projectUnitsSectionIcon} resizeMode="contain" />
            </View>
            <Text style={styles.projectUnitsTitle}>Typologie des chambres</Text>
          </View>

          {hasRoomData ? (
            <View style={styles.projectTypologyGrid}>
              {rooms.map((room, index) => (
                <View key={`${room.type || "chambre"}-${index}`} style={styles.projectTypologyCard}>
                  <View style={styles.projectTypologyPlanZone}>
                    <View style={styles.projectTypologyIconWrap}>
                      <Image source={explorerIcons.fx} style={styles.projectTypologyIconImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectTypologyName}>{room.type || `Chambre ${index + 1}`}</Text>
                  </View>

                  <View style={styles.projectTypologyDivider} />

                  <View style={styles.projectTypologySurfaceZone}>
                    <Text style={styles.projectTypologyMetaLine}>
                      <Text style={styles.projectTypologyMetaLabel}>Nombre: </Text>
                      <Text style={styles.projectTypologyMetaValue}>{room.count || "N/A"}</Text>
                    </Text>
                    <Text style={styles.projectTypologyMetaLine}>
                      <Text style={styles.projectTypologyMetaLabel}>Surface: </Text>
                      <Text style={styles.projectTypologyMetaValue}>{room.surface ? `${room.surface} m²` : "N/A"}</Text>
                    </Text>
                  </View>

                  <View style={styles.projectTypologyDivider} />

                  <View style={styles.projectTypologyPriceZone}>
                    <Text style={styles.projectTypologyPriceLabel}>Prix / nuit</Text>
                    <Text style={styles.projectTypologyPriceValue}>
                      {room.pricePerNight ? `${Number(room.pricePerNight).toLocaleString("fr-FR")} ${room.priceUnit || "MAD"}` : "N/A"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>Aucune chambre renseignée.</Text></View>
          )}
        </View>
      );
    };

    const renderHotelSpecificContent = () => (
      <View>
        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.overview = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(hotelOverviewCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.characteristics = event.nativeEvent.layout.y;
          }}
        >
          {renderHotelCharacteristicsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.components = event.nativeEvent.layout.y;
          }}
        >
          {renderHotelComponentsGrid()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.units = event.nativeEvent.layout.y;
          }}
        >
          {renderHotelUnitsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.commercialization = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(hotelCommercializationCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.documents = event.nativeEvent.layout.y;
          }}
        >
          {renderDocumentsContent()}
        </View>
      </View>
    );

    const renderCharacteristicsContent = () => {
      const leftRows = [
        {
          icon: "surface",
          label: "Surface foncière totale",
          value: selectedProject.surface_fonciere_totale ? `${selectedProject.surface_fonciere_totale.toLocaleString()} m²` : "N/A",
        },
        {
          icon: "totalUnits",
          label: "Nombre total d’unités",
          value: selectedProject.total_units ? `${selectedProject.total_units.toLocaleString()} unités` : "N/A",
        },
      ];

      const rightRows = [
        {
          icon: "deliveryDate",
          label: "Date de livraison",
          value: selectedProject.delivery_date || "N/A",
        },
        {
          icon: "density",
          label: "Densité",
          value: projectDensity.length > 0 ? projectDensity.map((density) => `${density.density_value}${getDensityUnit(selectedProject.project_type, density.density_type) || ""}`).join(" • ") : "N/A",
        },
      ];

      return (
        <View style={styles.projectCharacteristicsContainer}>
          <View style={styles.projectCharacteristicsHeader}>
            <View style={styles.projectCharacteristicsTitleIconWrap}>
              <Image source={explorerIcons.characteristic} style={styles.explorerIconMedium} resizeMode="contain" />
            </View>
            <Text style={styles.projectCharacteristicsTitle}>Chiffres clés</Text>
          </View>

          <View style={styles.projectCharacteristicsGrid}>
            <View style={styles.projectCharacteristicsBlock}>
              {leftRows.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.projectCharacteristicsRow,
                    index === leftRows.length - 1 && styles.projectCharacteristicsRowLast,
                  ]}
                >
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons[row.icon as keyof typeof explorerIcons]} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.projectCharacteristicsBlock}>
              {rightRows.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.projectCharacteristicsRow,
                    index === rightRows.length - 1 && styles.projectCharacteristicsRowLast,
                  ]}
                >
                  <View style={styles.projectCharacteristicsLabelWrap}>
                    <View style={styles.projectCharacteristicsItemIconWrap}>
                      <Image source={explorerIcons[row.icon as keyof typeof explorerIcons]} style={styles.explorerIconSmall} resizeMode="contain" />
                    </View>
                    <Text style={styles.projectCharacteristicsLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.projectCharacteristicsValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderComponentsGrid = () => {
      const projectComponents = (selectedProject.project_components || []).filter(Boolean);
      const projectAmenities = (selectedProject.amenities || []).filter(Boolean);

      return (
        <View style={styles.projectEquipmentLayout}>
          <View style={styles.projectEquipmentBlock}>
            <View style={styles.projectEquipmentHeader}>
              <View style={styles.projectEquipmentIconWrap}>
                <Image source={explorerIcons.component} style={styles.projectEquipmentTitleIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectEquipmentTitle}>Composantes du projet</Text>
            </View>

            <View style={styles.projectComponentGrid}>
              {(projectComponents.length > 0 ? projectComponents : ["Aucune composante renseignée"]).map((item, index) => (
                <View key={`${item}-${index}`} style={styles.projectComponentItem}>
                  <Text style={styles.projectComponentItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.projectEquipmentBlock}>
            <View style={styles.projectEquipmentHeader}>
              <View style={styles.projectEquipmentIconWrap}>
                <Image source={explorerIcons.star} style={styles.projectEquipmentTitleIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectEquipmentTitle}>Aménities</Text>
            </View>

            <View style={styles.projectComponentGrid}>
              {(projectAmenities.length > 0 ? projectAmenities : ["Aucune aménity renseignée"]).map((item, index) => (
                <View key={`${item}-${index}`} style={styles.projectComponentItem}>
                  <Text style={styles.projectComponentItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    };

    const renderUnitsContent = () => {
      const cards = projectTypologies.length > 0 ? projectTypologies : [];
      const priceRangeText = projectTypologies.length > 0 ? getPriceRangeText(projectTypologies) : "N/A";
      const minPrice = projectTypologies
        .map((typology) => typology.pricing_min)
        .filter((value): value is number => value != null && !Number.isNaN(value));
      const globalMin = minPrice.length > 0 ? Math.min(...minPrice) : null;
      const globalMax = minPrice.length > 0 ? Math.max(...minPrice) : null;

      const globalPriceText = globalMin != null && globalMax != null
        ? `Entre ${formatNumericPrice(globalMin, "MAD")} et ${formatNumericPrice(globalMax, "MAD")}`
        : priceRangeText;

      return (
        <View style={styles.projectUnitsSectionContainer}>
          <View style={styles.projectUnitsTitleRow}>
            <View style={styles.projectUnitsTitleIconWrap}>
              <Image source={explorerIcons.unitsPrice} style={styles.projectUnitsSectionIcon} resizeMode="contain" />
            </View>
            <Text style={styles.projectUnitsTitle}>Typologies disponibles</Text>
          </View>

          {cards.length > 0 ? (
            <View style={styles.projectTypologyGrid}>
              {cards.map((typology, index) => {
                const typologyName = typology.typology || `Type ${index + 1}`;
                const habitableText = formatRange(typology.surface_habitable_min, typology.surface_habitable_max) || "N/A";
                const terrasseText = formatRange(typology.surface_terrasse_min, typology.surface_terrasse_max) || "N/A";
                const totalText = (
                  typology.surface_habitable_min != null || typology.surface_habitable_max != null ||
                  typology.surface_terrasse_min != null || typology.surface_terrasse_max != null
                )
                  ? formatRange(
                      typology.surface_habitable_min != null && typology.surface_terrasse_min != null
                        ? typology.surface_habitable_min + typology.surface_terrasse_min
                        : undefined,
                      typology.surface_habitable_max != null && typology.surface_terrasse_max != null
                        ? typology.surface_habitable_max + typology.surface_terrasse_max
                        : undefined,
                    ) || "N/A"
                  : "N/A";
                const pricePerM2 = getTypologyPricePerSquareMeter(typology);
                const startPrice = typology.pricing_min != null ? formatNumericPrice(typology.pricing_min, typology.pricing_unit || "MAD") : "N/A";

                return (
                  <View key={typology.id || `${typologyName}-${index}`} style={styles.projectTypologyCard}>
                    <View style={styles.projectTypologyPlanZone}>
                      <View style={styles.projectTypologyIconWrap}>
                        <Image source={explorerIcons.fx} style={styles.projectTypologyIconImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.projectTypologyName}>{typologyName}</Text>
                    </View>

                    <View style={styles.projectTypologyDivider} />

                    <View style={styles.projectTypologySurfaceZone}>
                      <Text style={styles.projectTypologyMetaLine}>
                        <Text style={styles.projectTypologyMetaLabel}>Surface habitable: </Text>
                        <Text style={styles.projectTypologyMetaValue}>{habitableText} m²</Text>
                      </Text>
                      <Text style={styles.projectTypologyMetaLine}>
                        <Text style={styles.projectTypologyMetaLabel}>Surface terrasse: </Text>
                        <Text style={styles.projectTypologyMetaValue}>{terrasseText} m²</Text>
                      </Text>
                      <Text style={styles.projectTypologyMetaLine}>
                        <Text style={styles.projectTypologyMetaLabel}>Surface totale: </Text>
                        <Text style={styles.projectTypologyMetaValue}>{totalText} m²</Text>
                      </Text>
                    </View>

                    <View style={styles.projectTypologyDivider} />

                    <View style={styles.projectTypologyPriceZone}>
                      <Text style={styles.projectTypologyPriceLabel}>Prix au m²</Text>
                      <Text style={styles.projectTypologyPriceValue}>{pricePerM2 != null ? `${pricePerM2.toLocaleString("fr-FR")} MAD` : "N/A"}</Text>
                      <Text style={styles.projectTypologyStartLabel}>À partir de</Text>
                      <Text style={styles.projectTypologyStartValue}>{startPrice}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStateBox}><Text style={styles.emptyStateText}>Aucune typologie renseignée.</Text></View>
          )}

          <View style={styles.projectGlobalPriceBox}>
            <View style={styles.projectGlobalPriceLabelWrap}>
              <View style={styles.projectGlobalPriceIconWrap}>
                <Image source={explorerIcons.globalPriceRange} style={styles.projectGlobalPriceIconImage} resizeMode="contain" />
              </View>
              <Text style={styles.projectGlobalPriceLabel}>Gamme de prix globale</Text>
            </View>
            <Text style={styles.projectGlobalPriceValue}>{globalPriceText}</Text>
          </View>
        </View>
      );
    };

    const renderDocumentsContent = () => {
      const documentTypeMeta = (doc: (typeof documentRows)[number]) => {
        const rawType = (doc.format || "Document").toString().trim();
        const normalizedType = rawType.toUpperCase();
        const lower = normalizedType.toLowerCase();

        if (lower.includes("pdf")) {
          return { icon: "PDF", tone: "#d83b3b", background: "#FFE9EA" };
        }
        if (lower.includes("image") || lower.includes("png") || lower.includes("jpg") || lower.includes("jpeg") || lower.includes("webp")) {
          return { icon: lower.includes("png") ? "PNG" : lower.includes("webp") ? "WEBP" : "JPG", tone: "#12a86f", background: "#E8F9F0" };
        }
        if (lower.includes("cad")) {
          return { icon: "CAD", tone: "#6a5cff", background: "#F0EEFF" };
        }
        if (lower.includes("excel") || lower.includes("xls") || lower.includes("csv")) {
          return { icon: "XLS", tone: "#1a8f4d", background: "#EAF9F0" };
        }
        return { icon: "DOC", tone: "#0c7ea3", background: "#EAF7FB" };
      };

      const documentMetaText = (doc: (typeof documentRows)[number]) => {
        const typeMeta = documentTypeMeta(doc);
        const rawType = (doc.format || "Document").toString().trim();
        const displayType = rawType && rawType.toLowerCase() !== "document" && rawType.toLowerCase() !== "—"
          ? typeMeta.icon
          : "Document";

        return displayType;
      };

      return (
        <View style={styles.projectDocumentsLayout}>
          <View style={styles.projectDocumentPanel}>
            <View style={styles.projectDocumentHeader}>
              <View style={styles.projectDocumentHeaderIconWrap}>
                <Image source={explorerIcons.documents} style={styles.projectSectionHeaderIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectDocumentHeaderTitle}>Documents disponibles</Text>
            </View>

            <View style={styles.projectDocumentList}>
              {documentRows.map((doc) => {
                const typeMeta = documentTypeMeta(doc);
                const metaText = documentMetaText(doc);

                return (
                  <View key={doc.id} style={styles.projectDocumentRow}>
                    <View style={styles.projectDocumentRowMain}>
                      <View style={[styles.projectDocumentFileBadge, { backgroundColor: typeMeta.background }]}>
                        <View style={[styles.projectDocumentFileBadgeInner, { backgroundColor: typeMeta.tone }]}>
                          <Text style={styles.projectDocumentFileBadgeText}>{typeMeta.icon}</Text>
                        </View>
                      </View>

                      <View style={styles.projectDocumentInfo}>
                        <Text style={styles.projectDocumentName}>{doc.title}</Text>
                        <Text style={styles.projectDocumentMeta}>{metaText}</Text>
                      </View>
                    </View>

                    {doc.url ? (
                      <TouchableOpacity style={styles.projectDownloadButton} onPress={() => Linking.openURL(doc.url)}>
                        <Image source={explorerIcons.download} style={styles.projectDownloadIcon} resizeMode="contain" />
                        <Text style={styles.projectDownloadButtonText}>Télécharger</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.projectDownloadButtonDisabled}>
                        <Image source={explorerIcons.download} style={styles.projectDownloadIcon} resizeMode="contain" />
                        <Text style={styles.projectDownloadButtonText}>Télécharger</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.projectDocumentPanel}>
            <View style={styles.projectDocumentHeader}>
              <View style={styles.projectDocumentHeaderIconWrap}>
                <Image source={explorerIcons.source} style={styles.projectSectionHeaderIcon} resizeMode="contain" />
              </View>
              <Text style={styles.projectDocumentHeaderTitle}>Source</Text>
            </View>

            <View style={styles.projectSourceUrlBox}>
              <Text style={styles.projectSourceLinkText}>{selectedProject.source_link || "Aucun lien source enregistré"}</Text>
            </View>

            {selectedProject.source_link ? (
              <TouchableOpacity style={styles.projectSourceButton} onPress={() => openSourceLink(selectedProject.source_link!)}>
                <Image source={explorerIcons.openSource} style={styles.projectOpenSourceIcon} resizeMode="contain" />
                <Text style={styles.projectSourceButtonText}>Ouvrir la source</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.projectSourceNote}>
              <View style={styles.projectSourceNoteHeader}>
                <View style={styles.projectSourceNoteIconWrap}>
                  <Image source={explorerIcons.note} style={styles.projectInfoIcon} resizeMode="contain" />
                </View>
                <Text style={styles.projectSourceNoteTitle}>Note</Text>
              </View>
              <Text style={styles.projectSourceNoteText}>Ce lien renvoie vers la source d’origine du projet. Assurez-vous d’avoir les droits d’accès nécessaires.</Text>
            </View>
          </View>
        </View>
      );
    };

    if (isHotelProject) {
      return renderHotelSpecificContent();
    }

    if (isRetailProject) {
      return renderRetailSpecificContent();
    }

    if (isOfficeProject) {
      return renderOfficeSpecificContent();
    }

    if (isArtCultureProject) {
      return renderArtCultureSpecificContent();
    }

    return (
      <View>
        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.overview = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(overviewCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.characteristics = event.nativeEvent.layout.y;
          }}
        >
          {renderCharacteristicsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.components = event.nativeEvent.layout.y;
          }}
        >
          {renderComponentsGrid()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.units = event.nativeEvent.layout.y;
          }}
        >
          {renderUnitsContent()}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.commercialization = event.nativeEvent.layout.y;
          }}
        >
          {renderCardGrid(commercializationCards)}
        </View>

        <View
          style={styles.projectCollectiveSectionBlock}
          onLayout={(event) => {
            projectDetailSectionOffsets.current.documents = event.nativeEvent.layout.y;
          }}
        >
          {renderDocumentsContent()}
        </View>
      </View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  const exportInstructionText = useMemo(() => {
    if (!selectionRect) {
      return "Tracez la zone à exporter.";
    }

    return "Zone prête. Exportez le PPT.";
  }, [selectionRect]);

  const selectedTypeFilters = useMemo(() => getProjectFilterTypes(selectedProject?.project_type), [selectedProject?.project_type]);
  const normalizedProjectType = (selectedProject?.project_type || "").toLowerCase();
  const isCollectiveProject = normalizedProjectType.includes("collectif");
  const isVillaProject = normalizedProjectType.includes("villa") && !normalizedProjectType.includes("lot");
  const isLotVillaProject = normalizedProjectType.includes("lot") && normalizedProjectType.includes("villa");
  const isHotelProjectDetail = selectedTypeFilters.includes("Hotel") || normalizedProjectType.includes("hotel") || normalizedProjectType.includes("hôtel");
  const isResidentialProjectDetail = isCollectiveProject || isVillaProject || isLotVillaProject;
  const isRetailSelected = selectedTypeFilters.includes("Retail");
  const isOfficeSelected = selectedTypeFilters.includes("Bureau");
  const isHealthSelected = selectedTypeFilters.includes("Santé");
  const isHotelSelected = selectedTypeFilters.includes("Hotel");
  const isSportSelected = selectedTypeFilters.includes("Sport");
  const isEducationSelected = selectedTypeFilters.includes("Education");
  const isArtCultureSelected = selectedTypeFilters.includes("Art et culture");
  const isLeisureSelected = selectedTypeFilters.includes("Loisir");
  const isPremiumProjectDetail = isResidentialProjectDetail || isHotelProjectDetail || isRetailSelected || isOfficeSelected || isHealthSelected || isSportSelected || isEducationSelected || isArtCultureSelected || isLeisureSelected;

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const openSourceLink = async (rawUrl: string) => {
    const targetUrl = normalizeUrl(rawUrl);
    if (!targetUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (!canOpen) {
        showNotice({
          type: "warning",
          title: "Source",
          message: "Lien invalide ou non supporté.",
          primaryLabel: "OK",
        });
        return;
      }
      await Linking.openURL(targetUrl);
    } catch {
      showNotice({
        type: "error",
        title: "Source",
        message: "Impossible d'ouvrir ce lien pour le moment.",
        primaryLabel: "Fermer",
      });
    }
  };

  const closeDetailsModal = useCallback(() => {
    setSelectedProject(null);
    setProjectMedia([]);
    setProjectExtendedDetails(null);
  }, []);

  const resetSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectionStart(null);
    setSelectionRect(null);
  }, []);

  const beginSelectionMode = useCallback(() => {
    if (Platform.OS !== "web") {
      showNotice({
        type: "info",
        title: "Export PPT",
        message: "L'export PPT est disponible sur la version web pour le moment.",
        primaryLabel: "OK",
      });
      return;
    }

    setSelectedProject(null);
    setIsSelectionMode(true);
    setSelectionStart(null);
    setSelectionRect(null);
  }, []);

  const handleSelectionGrant = useCallback((event: any) => {
    if (!isSelectionMode) return;

    const start = {
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    };

    setSelectionStart(start);
    setSelectionRect({ ...start, width: 1, height: 1 });
  }, [isSelectionMode]);

  const handleSelectionMove = useCallback((event: any) => {
    if (!isSelectionMode || !selectionStart) return;

    setSelectionRect(
      toSelectionRect(selectionStart, {
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      })
    );
  }, [isSelectionMode, selectionStart]);

  const handleSelectionRelease = useCallback((event: any) => {
    if (!isSelectionMode || !selectionStart) return;

    setSelectionRect(
      toSelectionRect(selectionStart, {
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      })
    );
    setSelectionStart(null);
  }, [isSelectionMode, selectionStart]);

  const exportHotelProjectToPpt = useCallback(async () => {
    if (Platform.OS !== "web") {
      showNotice({
        type: "info",
        title: "Export PPT",
        message: "Cette fonctionnalité est disponible sur la version web pour le moment.",
        primaryLabel: "OK",
      });
      return;
    }

    if (!selectedProject) {
      showNotice({
        type: "warning",
        title: "Export PPT",
        message: "Aucun projet hôtel sélectionné.",
        primaryLabel: "OK",
      });
      return;
    }

    setIsExporting(true);

    try {
      const PptxGenJS = require("pptxgenjs");

      const hotelDetails = projectExtendedDetails?.hotel || {};
      const hotelRooms = Array.isArray(hotelDetails.rooms) ? hotelDetails.rooms.filter((room) => room && typeof room === "object") : [];
      const hotelFnb = Array.isArray(hotelDetails.fnb) ? hotelDetails.fnb.filter((item) => item && typeof item === "object") : [];
      const hotelMice = Array.isArray(hotelDetails.mice) ? hotelDetails.mice.filter((item) => item && typeof item === "object") : [];
      const hotelLeisure = Array.isArray(hotelDetails.leisure) ? hotelDetails.leisure.filter((item) => item && typeof item === "object") : [];
      const hotelImageUrls = projectMedia
        .filter((media) => {
          const mediaType = String(media.media_type || "").toLowerCase();
          const mediaUrl = String(media.media_url || "");
          return mediaType.includes("image") || /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(mediaUrl);
        })
        .map((media) => media.media_url)
        .filter(Boolean)
        .slice(0, 2);

      const toDataUrl = async (url: string) => {
        try {
          const imageResponse = await fetch(url);
          const imageBlob = await imageResponse.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Image conversion failed"));
            reader.readAsDataURL(imageBlob);
          });
        } catch {
          return null;
        }
      };

      const parseNumber = (value?: string | number | null) => {
        if (value == null) return null;
        const parsed = Number(String(value).replace(/[^0-9.,-]/g, "").replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
      };

      const formatDateForPpt = (value?: string) => {
        if (!value) return "-";
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split("-");
          return `${day}/${month}/${year}`;
        }
        return value;
      };

      const safeText = (value?: string | number | null, fallback = "N/A") => {
        if (value == null) return fallback;
        const text = String(value).trim();
        return text.length > 0 ? text : fallback;
      };

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      const title = String(selectedProject.name || "Projet hôtel");
      const subtitle = `ZOOM SUR LE ${title.toUpperCase()}: FICHE PROJET HÔTEL`;
      const categoryValue = safeText(hotelDetails.category, "-");
      const bookingValue = safeText(hotelDetails.bookingNote, "-");
      const operatorValue = safeText(hotelDetails.operator || hotelDetails.manager, "-");
      const investorValue = safeText(hotelDetails.investor, "-");
      const keysNumber = parseNumber(hotelDetails.keys);
      const keysValue = keysNumber != null ? `${keysNumber.toLocaleString("fr-FR")} chambres` : "-";
      const openingDateValue = formatDateForPpt(hotelDetails.openingDate);
      const renovationDateValue = formatDateForPpt(hotelDetails.renovationDate);
      const roomCount = hotelRooms.reduce((sum, room) => {
        const parsed = parseNumber(room.count);
        return sum + (parsed != null ? parsed : 0);
      }, 0);

      slide.addText("Outlook Marché – Tourisme & Hôtellerie", {
        x: 0.55,
        y: 0.34,
        w: 8.9,
        h: 0.52,
        fontFace: "Century Gothic",
        fontSize: 30,
        bold: false,
        color: "31849B",
        margin: 0,
      });

      slide.addText(subtitle, {
        x: 0.55,
        y: 0.92,
        w: 12.2,
        h: 0.34,
        fontFace: "Century Gothic",
        fontSize: 20,
        color: "7F7F7F",
        margin: 0,
        bold: false,
        fit: "shrink",
      });

      const leftX = 0.4;
      const leftY = 1.45;
      const leftW = 7.2;
      const rightX = 8.05;
      const rightW = 4.9;

      const drawImagePlaceholder = (x: number, y: number, h: number) => {
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w: rightW,
          h,
          fill: { color: "F4F4F4" },
          line: { color: "D9DDE2", width: 1 },
        });
        slide.addText("Image non disponible", {
          x,
          y: y + h / 2 - 0.15,
          w: rightW,
          h: 0.3,
          fontFace: "Century Gothic",
          fontSize: 12,
          bold: true,
          color: "80868B",
          align: "center",
          valign: "middle",
          margin: 0,
        });
      };

      const topImageY = leftY;
      const topImageH = 2.95;
      const bottomImageY = topImageY + topImageH + 0.12;
      const bottomImageH = 2.95;
      const imageDataUrls = await Promise.all(hotelImageUrls.map((url) => toDataUrl(url)));

      if (imageDataUrls[0]) {
        slide.addImage({ data: imageDataUrls[0], x: rightX, y: topImageY, w: rightW, h: topImageH });
      } else {
        drawImagePlaceholder(rightX, topImageY, topImageH);
      }

      if (imageDataUrls[1]) {
        slide.addImage({ data: imageDataUrls[1], x: rightX, y: bottomImageY, w: rightW, h: bottomImageH });
      } else {
        drawImagePlaceholder(rightX, bottomImageY, bottomImageH);
      }

      slide.addShape(pptx.ShapeType.rect, {
        x: leftX,
        y: leftY,
        w: leftW,
        h: 0.33,
        fill: { color: "31849B" },
        line: { color: "31849B", width: 0.8 },
      });
      slide.addText(title.toUpperCase(), {
        x: leftX,
        y: leftY + 0.04,
        w: leftW,
        h: 0.22,
        align: "center",
        fontFace: "Century Gothic",
        fontSize: 13,
        bold: true,
        color: "FFFFFF",
        margin: 0,
        fit: "shrink",
      });

      const infoRows: Array<[string, string]> = [
        ["Nombre de clés", keysValue],
        ["Investisseur / Operateur", `${investorValue} / ${operatorValue}`],
        ["Date d’ouverture/rénovation", `${openingDateValue} / ${renovationDateValue}`],
        ["Catégorie", categoryValue],
        ["Note Booking", bookingValue],
      ];

      const infoStartY = leftY + 0.33;
      const infoRowH = 0.29;
      const labelW = 2.95;
      const valueW = leftW - labelW;

      infoRows.forEach((row, index) => {
        const rowY = infoStartY + index * infoRowH;
        const fillColor = index % 2 === 0 ? "E8EDF2" : "D8E0E8";
        slide.addShape(pptx.ShapeType.rect, {
          x: leftX,
          y: rowY,
          w: labelW,
          h: infoRowH,
          fill: { color: fillColor },
          line: { color: "FFFFFF", width: 0.7 },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: leftX + labelW,
          y: rowY,
          w: valueW,
          h: infoRowH,
          fill: { color: "F2F5F8" },
          line: { color: "FFFFFF", width: 0.7 },
        });
        slide.addText(row[0], {
          x: leftX + 0.07,
          y: rowY + 0.06,
          w: labelW - 0.12,
          h: 0.2,
          fontFace: "Century Gothic",
          fontSize: 11,
          bold: true,
          color: "1F2937",
          margin: 0,
          fit: "shrink",
        });
        slide.addText(row[1], {
          x: leftX + labelW + 0.07,
          y: rowY + 0.055,
          w: valueW - 0.12,
          h: 0.21,
          fontFace: "Century Gothic",
          fontSize: 10.5,
          bold: index === 0,
          italic: index === 0,
          color: "111827",
          margin: 0,
          fit: "shrink",
        });
      });

      const sectionY = infoStartY + infoRows.length * infoRowH;
      slide.addShape(pptx.ShapeType.rect, {
        x: leftX,
        y: sectionY,
        w: leftW,
        h: 0.27,
        fill: { color: "31849B" },
        line: { color: "31849B", width: 0.8 },
      });
      slide.addText("Programmation actuelle", {
        x: leftX + 0.07,
        y: sectionY + 0.045,
        w: leftW - 0.14,
        h: 0.18,
        fontFace: "Century Gothic",
        fontSize: 12,
        bold: true,
        color: "FFFFFF",
        margin: 0,
      });

      type ProgramRow = { group: string; item: string; number: string; metric: string; section?: boolean };
      const programRows: ProgramRow[] = [];
      const appendSectionRows = (groupName: string, rows: ProgramRow[]) => {
        rows.forEach((row, index) => {
          programRows.push({
            group: index === 0 ? groupName : "",
            item: row.item,
            number: row.number,
            metric: row.metric,
          });
        });
      };

      const roomProgramRows = (hotelRooms.length > 0 ? hotelRooms : [{ type: "N/A", count: "N/A", surface: "N/A" }]).map((room) => ({
        group: "",
        item: safeText(room.type, "Chambre"),
        number: safeText(room.count, "N/A"),
        metric: room.surface ? `${room.surface} m²/unité` : "N/A",
      }));

      const fnbProgramRows = (hotelFnb.length > 0 ? hotelFnb : [{ name: "N/A", capacity: "N/A" }]).map((item) => ({
        group: "",
        item: safeText(item.name, "N/A"),
        number: item.capacity ? `${item.capacity}` : "N/A",
        metric: safeText(item.type, "N/A"),
      }));

      const miceProgramRows = (hotelMice.length > 0 ? hotelMice : [{ name: "N/A", roomsCount: "N/A", surface: "N/A" }]).map((item) => ({
        group: "",
        item: safeText(item.name, "N/A"),
        number: item.roomsCount || item.capacity || "N/A",
        metric: item.surface ? `${item.surface} m²` : "N/A",
      }));

      const leisureProgramRows = (hotelLeisure.length > 0 ? hotelLeisure : [{ name: "N/A", surface: "N/A" }]).map((item) => ({
        group: "",
        item: safeText(item.name, "N/A"),
        number: item.count || item.capacity || "N/A",
        metric: item.surface ? `${item.surface} m²` : "N/A",
      }));

      appendSectionRows("Hébergement", roomProgramRows.slice(0, 6));
      appendSectionRows("F&B", fnbProgramRows.slice(0, 5));
      appendSectionRows("MICE", miceProgramRows.slice(0, 4));
      appendSectionRows("Loisirs", leisureProgramRows.slice(0, 4));

      const tableHeadY = sectionY + 0.27;
      const colWidths = [1.55, 2.2, 1.2, 2.25];
      const colXs = [
        leftX,
        leftX + colWidths[0],
        leftX + colWidths[0] + colWidths[1],
        leftX + colWidths[0] + colWidths[1] + colWidths[2],
      ];

      slide.addShape(pptx.ShapeType.rect, {
        x: leftX,
        y: tableHeadY,
        w: leftW,
        h: 0.3,
        fill: { color: "CBD6DF" },
        line: { color: "FFFFFF", width: 0.7 },
      });
      slide.addText("", {
        x: colXs[0] + 0.04,
        y: tableHeadY + 0.05,
        w: colWidths[0] - 0.08,
        h: 0.2,
        fontFace: "Century Gothic",
        fontSize: 10,
        bold: true,
        color: "2B3945",
        margin: 0,
      });
      slide.addText("Type de chambre", {
        x: colXs[1] + 0.04,
        y: tableHeadY + 0.05,
        w: colWidths[1] - 0.08,
        h: 0.2,
        fontFace: "Century Gothic",
        fontSize: 10,
        bold: true,
        color: "2B3945",
        margin: 0,
      });
      slide.addText("Nombre", {
        x: colXs[2] + 0.04,
        y: tableHeadY + 0.05,
        w: colWidths[2] - 0.08,
        h: 0.2,
        align: "center",
        fontFace: "Century Gothic",
        fontSize: 10,
        bold: true,
        color: "2B3945",
        margin: 0,
      });
      slide.addText("Surface/Capacité", {
        x: colXs[3] + 0.04,
        y: tableHeadY + 0.05,
        w: colWidths[3] - 0.08,
        h: 0.2,
        align: "center",
        fontFace: "Century Gothic",
        fontSize: 10,
        bold: true,
        color: "2B3945",
        margin: 0,
      });

      const maxRows = 13;
      const finalProgramRows = programRows.slice(0, maxRows);
      const dataRowH = 0.255;
      finalProgramRows.forEach((row, index) => {
        const rowY = tableHeadY + 0.3 + index * dataRowH;
        const fillColor = index % 2 === 0 ? "EEF2F6" : "E2E9F0";

        slide.addShape(pptx.ShapeType.rect, {
          x: leftX,
          y: rowY,
          w: leftW,
          h: dataRowH,
          fill: { color: fillColor },
          line: { color: "FFFFFF", width: 0.7 },
        });

        slide.addText(row.group, {
          x: colXs[0] + 0.06,
          y: rowY + 0.045,
          w: colWidths[0] - 0.1,
          h: 0.16,
          fontFace: "Century Gothic",
          fontSize: 10,
          bold: true,
          color: "3A4A57",
          margin: 0,
          fit: "shrink",
        });
        slide.addText(row.item, {
          x: colXs[1] + 0.06,
          y: rowY + 0.045,
          w: colWidths[1] - 0.1,
          h: 0.16,
          fontFace: "Century Gothic",
          fontSize: 10,
          italic: true,
          color: "4B5563",
          margin: 0,
          fit: "shrink",
        });
        slide.addText(safeText(row.number, "N/A"), {
          x: colXs[2] + 0.03,
          y: rowY + 0.04,
          w: colWidths[2] - 0.06,
          h: 0.16,
          align: "center",
          fontFace: "Century Gothic",
          fontSize: 10,
          bold: true,
          color: "4B5563",
          margin: 0,
          fit: "shrink",
        });
        slide.addText(safeText(row.metric, "N/A"), {
          x: colXs[3] + 0.03,
          y: rowY + 0.04,
          w: colWidths[3] - 0.06,
          h: 0.16,
          align: "center",
          fontFace: "Century Gothic",
          fontSize: 10,
          color: "4B5563",
          margin: 0,
          fit: "shrink",
        });
      });

      colXs.slice(1).forEach((lineX) => {
        const h = 0.3 + finalProgramRows.length * dataRowH;
        slide.addShape(pptx.ShapeType.line, {
          x: lineX,
          y: tableHeadY,
          w: 0,
          h,
          line: { color: "FFFFFF", width: 0.7 },
        });
      });

      slide.addText(`Statut: ${safeText(selectedProject.status, "-")}   •   Localisation: ${safeText([selectedProject.country, selectedProject.city].filter(Boolean).join(", "), "-")}   •   Développeur: ${safeText(selectedProject.developer, "-")}`, {
        x: 0.55,
        y: 7.08,
        w: 12.2,
        h: 0.22,
        fontFace: "Century Gothic",
        fontSize: 9,
        color: "6B7280",
        margin: 0,
        fit: "shrink",
      });

      if (roomCount > 0 && !hotelDetails.keys) {
        slide.addText(`Total chambres recensées: ${roomCount.toLocaleString("fr-FR")}`, {
          x: 0.55,
          y: 6.84,
          w: 3.7,
          h: 0.2,
          fontFace: "Century Gothic",
          fontSize: 9,
          bold: true,
          color: "31849B",
          margin: 0,
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeFileName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hotel-projet";
      await pptx.writeFile({ fileName: `${safeFileName}-export-${timestamp}.pptx` });
      showNotice({
        type: "success",
        title: "Export PPT",
        message: "Le document PowerPoint du projet hôtel a bien été généré.",
        primaryLabel: "OK",
      });
    } catch (error) {
      console.error("Hotel PPT export failed", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      showNotice({
        type: "error",
        title: "Export PPT",
        message: `Impossible de générer le fichier PPT: ${errorMessage}`,
        primaryLabel: "Fermer",
      });
    } finally {
      setIsExporting(false);
    }
  }, [projectExtendedDetails, projectMedia, selectedProject, showNotice]);

  const exportMappingToPpt = useCallback(async () => {
    if (Platform.OS !== "web") {
      showNotice({
        type: "info",
        title: "Export PPT",
        message: "Cette fonctionnalité est disponible sur le web pour le moment.",
        primaryLabel: "OK",
      });
      return;
    }

    if (!mapExportApi || !selectionRect) {
      showNotice({
        type: "warning",
        title: "Export PPT",
        message: "Délimitez d'abord une zone sur la carte.",
        primaryLabel: "Compris",
      });
      return;
    }

    const mapElement = mapExportApi.getContainerElement();
    if (!mapElement) {
      showNotice({
        type: "error",
        title: "Export PPT",
        message: "Carte non disponible pour l'export.",
        primaryLabel: "Fermer",
      });
      return;
    }

    setIsExporting(true);

    try {
      const PptxGenJS = require("pptxgenjs");
      const [{ default: htmlToImage }] = await Promise.all([
        import("html-to-image"),
      ]);

      const fullCanvas = await htmlToImage.toCanvas(mapElement, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          const className = typeof node.className === "string" ? node.className : "";
          return ![
            "leaflet-marker-pane",
            "leaflet-overlay-pane",
            "leaflet-popup-pane",
            "leaflet-shadow-pane",
            "leaflet-control-container",
          ].some((value) => className.includes(value));
        },
      });

      const scaleX = fullCanvas.width / mapElement.clientWidth;
      const scaleY = fullCanvas.height / mapElement.clientHeight;
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(selectionRect.width * scaleX);
      cropCanvas.height = Math.round(selectionRect.height * scaleY);

      const cropContext = cropCanvas.getContext("2d");
      if (!cropContext) {
        throw new Error("Canvas context unavailable");
      }

      cropContext.drawImage(
        fullCanvas,
        selectionRect.x * scaleX,
        selectionRect.y * scaleY,
        selectionRect.width * scaleX,
        selectionRect.height * scaleY,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      const selectedProjects = filteredProjects
        .map((project, index) => {
          const primaryType = getPrimaryFilterType(project.project_type);
          const colorHex = rgbToHex(filterTypeColors[primaryType] || markerColor).replace("#", "");

          return {
            index: index + 1,
            id: project.id,
            name: project.name,
            primaryType,
            markerColor: colorHex,
            point: mapExportApi.latLngToContainerPoint({
              latitude: project.latitude,
              longitude: project.longitude,
            }),
          };
        })
        .filter(({ point }) => (
          point.x >= selectionRect.x &&
          point.x <= selectionRect.x + selectionRect.width &&
          point.y >= selectionRect.y &&
          point.y <= selectionRect.y + selectionRect.height
        ));

      if (selectedProjects.length === 0) {
        showNotice({
          type: "warning",
          title: "Export PPT",
          message: "Aucun projet n'est présent dans la zone sélectionnée.",
          primaryLabel: "OK",
        });
        return;
      }

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      const markerStrokeColor = rgbToHex(markerBorderColor).replace("#", "");
      const mapSlide = pptx.addSlide();
      await addSlideChrome(mapSlide, "OFFRE ACTUELLE - MAPPING", "Page1");

      const mapFrameX = 0.12;
      const mapFrameY = 1.35;
      const mapFrameW = 6.55;
      const mapFrameH = 4.82;
      const selectionRatio = selectionRect.width / selectionRect.height;

      let imageWidth = mapFrameW;
      let imageHeight = imageWidth / selectionRatio;

      if (imageHeight > mapFrameH) {
        imageHeight = mapFrameH;
        imageWidth = imageHeight * selectionRatio;
      }

      const imageX = mapFrameX;
      const imageY = mapFrameY + (mapFrameH - imageHeight) / 2;

      mapSlide.addImage({
        data: cropCanvas.toDataURL("image/png"),
        x: imageX,
        y: imageY,
        w: imageWidth,
        h: imageHeight,
      });

      selectedProjects.forEach(({ index, point, markerColor: projectMarkerColor }) => {
        const relativeX = (point.x - selectionRect.x) / selectionRect.width;
        const relativeY = (point.y - selectionRect.y) / selectionRect.height;
        const markerDiameter = Math.max((markerSize / selectionRect.width) * imageWidth, 0.18);
        const markerX = imageX + relativeX * imageWidth - markerDiameter / 2;
        const markerY = imageY + relativeY * imageHeight - markerDiameter / 2;

        mapSlide.addShape(pptx.ShapeType.ellipse, {
          x: markerX,
          y: markerY,
          w: markerDiameter,
          h: markerDiameter,
          fill: { color: projectMarkerColor },
          line: { color: markerStrokeColor, width: 1.1 },
        });

        mapSlide.addText(index.toString(), {
          x: markerX,
          y: markerY + 0.005,
          w: markerDiameter,
          h: markerDiameter - 0.01,
          align: "center",
          valign: "middle",
          margin: 0,
          bold: true,
          color: "FFFFFF",
          fontFace: "Century Gothic",
          fontSize: Math.max(markerTextSize * 0.58, 8),
        });
      });

      const groupedLegend = FILTER_TYPES
        .map((type) => {
          const items = selectedProjects.filter((project) => project.primaryType === type);
          if (items.length === 0) return null;
          const color = rgbToHex(filterTypeColors[type] || markerColor).replace("#", "");
          return { type, color, items };
        })
        .filter((group): group is { type: FilterType; color: string; items: typeof selectedProjects } => group !== null);

      const compactLegendX = 0.18;
      const compactLegendY = 1.52;
      const compactLegendW = 2.28;
      const compactLegendH = Math.min(0.56 + groupedLegend.length * 0.24, 2.35);

      mapSlide.addShape(pptx.ShapeType.roundRect, {
        x: compactLegendX,
        y: compactLegendY,
        w: compactLegendW,
        h: compactLegendH,
        rectRadius: 0.06,
        fill: { color: "FFFFFF", transparency: 4 },
        line: { color: "4E7F8C", width: 1 },
      });

      groupedLegend.forEach((group, groupIndex) => {
        const rowY = compactLegendY + 0.17 + groupIndex * 0.24;

        mapSlide.addShape(pptx.ShapeType.ellipse, {
          x: compactLegendX + 0.12,
          y: rowY,
          w: 0.14,
          h: 0.14,
          fill: { color: group.color },
          line: { color: markerStrokeColor, width: 0.8 },
        });

        mapSlide.addText(group.type, {
          x: compactLegendX + 0.34,
          y: rowY - 0.01,
          w: compactLegendW - 0.44,
          h: 0.16,
          fontFace: "Century Gothic",
          fontSize: 8.5,
          color: "1C1C1C",
          bold: true,
          margin: 0,
          breakLine: false,
          fit: "shrink",
        });
      });

      const legendSlide = pptx.addSlide();
      await addSlideChrome(legendSlide, "OFFRE ACTUELLE - LÉGENDE", "Page2");

      const legendBoxX = 3.38;
      const legendBoxY = 1.55;
      const legendBoxW = 6.42;
      const legendBoxH = 4.9;

      legendSlide.addShape(pptx.ShapeType.rect, {
        x: legendBoxX,
        y: legendBoxY,
        w: legendBoxW,
        h: legendBoxH,
        fill: { color: "FFFFFF", transparency: 100 },
        line: { color: "6C98A3", width: 1 },
      });
      legendSlide.addShape(pptx.ShapeType.rect, {
        x: legendBoxX,
        y: legendBoxY,
        w: legendBoxW,
        h: 0.23,
        fill: { color: "31849B" },
        line: { color: "31849B", width: 0 },
      });
      legendSlide.addText("LÉGENDE", {
        x: legendBoxX,
        y: legendBoxY + 0.015,
        w: legendBoxW,
        h: 0.18,
        align: "center",
        margin: 0,
        fontFace: "Century Gothic",
        fontSize: 10,
        bold: true,
        color: "FFFFFF",
      });

      const legendSections = groupedLegend.map((group) => ({
        type: group.type,
        color: group.color,
        entries: group.items,
      }));

      const leftSections: typeof legendSections = [];
      const rightSections: typeof legendSections = [];
      let leftUnits = 0;
      let rightUnits = 0;

      legendSections.forEach((section) => {
        const sectionUnits = section.entries.length + 1.4;
        if (leftUnits <= rightUnits) {
          leftSections.push(section);
          leftUnits += sectionUnits;
        } else {
          rightSections.push(section);
          rightUnits += sectionUnits;
        }
      });

      const renderLegendSections = (
        sections: typeof legendSections,
        columnX: number,
        columnW: number,
      ) => {
        let currentY = legendBoxY + 0.36;
        const maxBottom = legendBoxY + legendBoxH - 0.12;

        for (const section of sections) {
          if (currentY > maxBottom - 0.2) break;

          legendSlide.addText(section.type.toUpperCase(), {
            x: columnX,
            y: currentY,
            w: columnW,
            h: 0.17,
            fontFace: "Century Gothic",
            fontSize: 8.5,
            bold: true,
            color: section.color,
            underline: { color: section.color, style: "sng" },
            margin: 0,
            breakLine: false,
          });

          currentY += 0.2;

          for (const entry of section.entries) {
            if (currentY > maxBottom - 0.18) break;

            legendSlide.addShape(pptx.ShapeType.ellipse, {
              x: columnX,
              y: currentY,
              w: 0.22,
              h: 0.22,
              fill: { color: section.color },
              line: { color: markerStrokeColor, width: 0.8 },
            });

            legendSlide.addText(entry.index.toString(), {
              x: columnX,
              y: currentY + 0.005,
              w: 0.22,
              h: 0.19,
              align: "center",
              valign: "middle",
              margin: 0,
              fontFace: "Century Gothic",
              fontSize: 7,
              bold: true,
              color: "FFFFFF",
            });

            legendSlide.addText(entry.name, {
              x: columnX + 0.31,
              y: currentY + 0.015,
              w: columnW - 0.36,
              h: 0.18,
              fontFace: "Century Gothic",
              fontSize: 9,
              color: "111111",
              bold: false,
              margin: 0,
              breakLine: false,
              fit: "shrink",
            });

            currentY += 0.225;
          }

          currentY += 0.06;
        }
      };

      renderLegendSections(leftSections, legendBoxX + 0.14, 2.95);
      renderLegendSections(rightSections, legendBoxX + 3.34, 2.95);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      await pptx.writeFile({ fileName: `mapping-export-${timestamp}.pptx` });
      resetSelectionMode();
    } catch (error) {
      console.error("PPT export failed", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      showNotice({
        type: "error",
        title: "Export PPT",
        message: `Impossible de générer le fichier PPT: ${errorMessage}`,
        primaryLabel: "Fermer",
      });
    } finally {
      setIsExporting(false);
    }
  }, [filterTypeColors, filteredProjects, mapExportApi, markerBorderColor, markerColor, markerSize, markerTextSize, resetSelectionMode, selectionRect, showNotice]);

  return (
    <View style={styles.container}>
      <View style={[styles.topLeftControls, Platform.OS !== "web" && styles.topLeftControlsMobile]}>
        <View style={styles.citySearchRow}>
          <TextInput
            style={styles.citySearchInput}
            value={citySearchQuery}
            onChangeText={setCitySearchQuery}
            placeholder="Rechercher une ville"
            placeholderTextColor={AppColors.gray.dark}
            returnKeyType="search"
            onSubmitEditing={searchCityOnMap}
          />
          <TouchableOpacity style={styles.citySearchButton} onPress={searchCityOnMap}>
            <Text style={styles.citySearchButtonText}>{isSearchingCity ? "..." : "Go"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityFiltersRow}>
          <TouchableOpacity
            style={[styles.cityFilterChip, !selectedCityFilter && styles.cityFilterChipActive]}
            onPress={() => setSelectedCityFilter(null)}
          >
            <Text style={[styles.cityFilterChipText, !selectedCityFilter && styles.cityFilterChipTextActive]}>
              Toutes les villes
            </Text>
          </TouchableOpacity>
          {cityFilterOptions.map((cityOption) => (
            <TouchableOpacity
              key={cityOption}
              style={[styles.cityFilterChip, selectedCityFilter === cityOption && styles.cityFilterChipActive]}
              onPress={() => setSelectedCityFilter(cityOption)}
            >
              <Text style={[styles.cityFilterChipText, selectedCityFilter === cityOption && styles.cityFilterChipTextActive]}>
                {cityOption}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilters.length === FILTER_TYPES.length && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilters([...FILTER_TYPES])}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilters.length === FILTER_TYPES.length && styles.filterChipTextActive,
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>

          {FILTER_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, activeFilters.includes(type) && styles.filterChipActive]}
              onPress={() => toggleFilter(type)}
            >
              <Text style={[styles.filterChipText, activeFilters.includes(type) && styles.filterChipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.filterChip} onPress={() => setShowFiltersModal(true)}>
            <Text style={styles.filterChipText}>Filtres</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        onMapReady={setMapExportApi}
        initialRegion={{
          latitude: 33.5731,
          longitude: -7.5898,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {filteredProjects.map((project, index) => {
          const displayIndex = index + 1;
          const markerRenderKey = `${project.id}-${displayIndex}`;
          // Afficher les numéros SEULEMENT en mode satellite/hybrid
          const isSatelliteMode = mapType === "satellite" || mapType === "hybrid";
          const primaryType = getPrimaryFilterType(project.project_type);
          const projectMarkerColor = filterTypeColors[primaryType] || markerColor;

          if (Platform.OS !== "web") {
            return (
              <Marker
                key={markerRenderKey}
                coordinate={{
                  latitude: project.latitude,
                  longitude: project.longitude,
                }}
                title={project.name}
                onPress={() => handleMarkerPress(project)}
                anchor={{ x: 0.5, y: 0.5 }}
                centerOffset={{ x: 0, y: 0 }}
              >
                {isSatelliteMode ? (
                  <View
                    style={[
                      styles.markerBubble,
                      {
                        width: markerSize,
                        height: markerSize,
                        borderRadius: markerSize / 2,
                        backgroundColor: projectMarkerColor,
                        borderColor: markerBorderColor,
                      },
                    ]}
                  >
                    <Text style={[styles.markerNumber, { fontSize: markerTextSize }]}>{displayIndex}</Text>
                  </View>
                ) : (
                  <Text style={styles.defaultMarkerIcon}>📍</Text>
                )}
              </Marker>
            );
          }

          const iconHtml = isSatelliteMode
            ? `<div style="display:flex;align-items:center;justify-content:center;width:${markerSize}px;height:${markerSize}px;border-radius:${markerSize / 2}px;background:${projectMarkerColor};border:2px solid ${markerBorderColor};color:white;font-size:${markerTextSize}px;font-weight:700;">${displayIndex}</div>`
            : `<div style="font-size:24px;">📍</div>`;

          return (
            <Marker
              key={markerRenderKey}
              coordinate={{
                latitude: project.latitude,
                longitude: project.longitude,
              }}
              title={project.name}
              onPress={() => handleMarkerPress(project)}
              iconHtml={iconHtml}
              iconSize={[markerSize, markerSize]}
              anchor={{ x: 0.5, y: 0.5 }}
            />
          );
        })}
      </MapView>

      {isSelectionMode && (
        <View
          style={styles.selectionOverlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleSelectionGrant}
          onResponderMove={handleSelectionMove}
          onResponderRelease={handleSelectionRelease}
        >
          <View style={styles.selectionBanner}>
            <Text style={styles.selectionBannerTitle}>Export mapping PPT</Text>
            <Text style={styles.selectionBannerText}>{exportInstructionText}</Text>
            <View style={styles.selectionActionsRow}>
              <TouchableOpacity style={styles.selectionCancelButton} onPress={resetSelectionMode}>
                <Text style={styles.selectionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionExportButton,
                  (!selectionRect || isExporting) && styles.selectionExportButtonDisabled,
                ]}
                onPress={exportMappingToPpt}
                disabled={!selectionRect || isExporting}
              >
                <Text style={styles.selectionExportButtonText}>
                  {isExporting ? "Export en cours..." : "Exporter le PPT"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectionRect && (
            <View
              style={[
                styles.selectionBox,
                {
                  left: selectionRect.x,
                  top: selectionRect.y,
                  width: selectionRect.width,
                  height: selectionRect.height,
                },
              ]}
            />
          )}
        </View>
      )}

      {Platform.OS === "web" && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={beginSelectionMode}
          activeOpacity={0.85}
        >
          <Text style={styles.exportButtonText}>Extraire un mapping</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showFiltersModal} transparent animationType="fade">
        <Pressable style={styles.filtersOverlay} onPress={() => setShowFiltersModal(false)}>
          <View style={styles.filtersModalContent}>
            <Text style={styles.filtersModalTitle}>Filtres de type</Text>

            {FILTER_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.filtersModalOption}
                onPress={() => toggleFilter(type)}
              >
                <Text style={styles.filtersModalOptionLabel}>{type}</Text>
                <Text style={styles.filtersModalOptionCheck}>{activeFilters.includes(type) ? "✓" : "○"}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.filtersModalApplyButton}
              onPress={() => {
                setActiveFilters([...FILTER_TYPES]);
                setShowFiltersModal(false);
              }}
            >
              <Text style={styles.filtersModalApplyButtonText}>Réinitialiser (Tous)</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal pour afficher les détails du projet */}
      <Modal visible={selectedProject !== null} transparent animationType="slide">
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContent}>
            <Pressable style={styles.detailsCloseArea} onPress={closeDetailsModal} />

            {selectedProject && isPremiumProjectDetail ? (
              <View style={styles.projectDetailShell}>
                <View style={styles.projectDetailHeader}>
                  <View style={styles.projectGalleryWrapper}>
                    {projectMedia.length > 0 ? (
                      <>
                        <Image
                          source={{ uri: projectMedia[activeProjectMediaIndex]?.media_url || projectMedia[0].media_url }}
                          style={styles.projectDetailImage}
                          resizeMode="cover"
                        />
                        <View style={styles.projectImageCounter}>
                          <Text style={styles.projectImageCounterText}>{`${activeProjectMediaIndex + 1} / ${projectMedia.length}`}</Text>
                        </View>
                        {projectMedia.length > 1 && (
                          <View style={styles.projectImageArrows}>
                            <Pressable
                              style={styles.projectImageArrowButton}
                              onPress={() => setActiveProjectMediaIndex((previous) => (previous === 0 ? projectMedia.length - 1 : previous - 1))}
                            >
                              <Text style={styles.projectImageArrowText}>‹</Text>
                            </Pressable>
                            <Pressable
                              style={styles.projectImageArrowButton}
                              onPress={() => setActiveProjectMediaIndex((previous) => (previous + 1) % projectMedia.length)}
                            >
                              <Text style={styles.projectImageArrowText}>›</Text>
                            </Pressable>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.projectGalleryPlaceholder}>
                        <View style={styles.projectGalleryPlaceholderFrame}>
                          <View style={styles.projectGalleryPlaceholderSun} />
                          <View style={styles.projectGalleryPlaceholderHillA} />
                          <View style={styles.projectGalleryPlaceholderHillB} />
                        </View>
                        <Text style={styles.projectGalleryPlaceholderTitle}>Aucune image disponible</Text>
                        <Text style={styles.projectGalleryPlaceholderText}>Les photos du projet seront affichées ici</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.projectSummaryColumn}>
                    <View style={styles.projectStatusBadge}>
                      <Text style={styles.projectStatusBadgeText}>{selectedProject.status || "Statut non renseigné"}</Text>
                    </View>

                    <Text style={styles.projectSummaryTitle}>{selectedProject.name}</Text>

                    <View style={styles.projectSummaryLine}>
                      <View style={styles.projectSummaryIconPlaceholder}>
                        <Image source={explorerIcons.collectif} style={styles.projectSummaryIconImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.projectSummaryText}>{selectedProject.project_type || "Collectif"}</Text>
                    </View>

                    <View style={styles.projectSummaryLine}>
                      <View style={[styles.projectSummaryIconPlaceholder, styles.projectSummaryIconPin]}>
                        <Image source={explorerIcons.localisation} style={styles.projectSummaryIconImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.projectSummaryText}>{[selectedProject.country, selectedProject.city].filter(Boolean).join(", ") || "Localisation"}</Text>
                    </View>

                    <View style={styles.projectSummaryLine}>
                      <View style={[styles.projectSummaryIconPlaceholder, styles.projectSummaryIconBuilding]}>
                        <Image source={explorerIcons.developer} style={styles.projectSummaryIconImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.projectSummaryText}>{selectedProject.developer || "Développeur non renseigné"}</Text>
                    </View>
                  </View>

                  <View style={styles.projectMiniMapContainer}>
                    <View style={styles.projectMiniMapCard}>
                      <View style={styles.projectMiniMapPin} />
                      <Text style={styles.projectMiniMapText}>{selectedProject.city || "Casablanca"}</Text>
                    </View>
                  </View>

                  <Pressable style={styles.projectCloseButton} onPress={closeDetailsModal}>
                    <Text style={styles.projectCloseButtonText}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.projectTabsRow}>
                  {[
                    "overview",
                    "characteristics",
                    "components",
                    "units",
                    "commercialization",
                    "documents",
                  ].map((tabKey) => {
                    const isActive = activeProjectTab === tabKey;
                    const labels: Record<string, string> = {
                      overview: "Vue d’ensemble",
                      characteristics: "Caractéristiques",
                      components: "Équipements",
                      units: "Unités & Prix",
                      commercialization: "Commercialisation",
                      documents: "Documents & Source",
                    };
                    const iconMap: Record<string, keyof typeof explorerIcons> = {
                      overview: "collectif",
                      characteristics: "characteristic",
                      components: "component",
                      units: "unitsPrice",
                      commercialization: "commercializationRate",
                      documents: "documents",
                    };

                    return (
                      <TouchableOpacity
                        key={tabKey}
                        style={[styles.projectTabButton, isActive && styles.projectTabButtonActive]}
                        onPress={() => handleCollectiveTabPress(tabKey as typeof projectDetailSectionKeys[number])}
                        activeOpacity={0.9}
                      >
                        <View style={styles.projectTabIconSlot}>
                          <Image source={explorerIcons[iconMap[tabKey]]} style={styles.projectTabIconImage} resizeMode="contain" />
                        </View>
                        <Text style={[styles.projectTabText, isActive && styles.projectTabTextActive]}>{labels[tabKey]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <ScrollView
                  ref={projectDetailScrollRef}
                  style={styles.projectTabContentScroll}
                  contentContainerStyle={styles.projectTabContentContainer}
                  showsVerticalScrollIndicator={false}
                  onScroll={({ nativeEvent }) => syncCollectiveDetailTabFromScroll(nativeEvent.contentOffset.y)}
                  scrollEventThrottle={16}
                >
                  {renderActiveProjectTabContent()}
                </ScrollView>

                <View style={styles.projectFooterActions}>
                  <TouchableOpacity style={styles.projectMapAction} onPress={() => { closeDetailsModal(); }}>
                    <Text style={styles.projectMapActionText}>📍 Voir sur la carte</Text>
                  </TouchableOpacity>

                  <View style={styles.projectFooterActionGroup}>
                    <TouchableOpacity
                      style={styles.projectEditAction}
                      onPress={() => {
                        closeDetailsModal();
                        router.push(`/(tabs)/AddProject?projectId=${selectedProject.id}`);
                      }}
                    >
                      <Text style={styles.projectEditActionText}>✏️ Modifier ce projet</Text>
                    </TouchableOpacity>

                    {isHotelProjectDetail ? (
                      <TouchableOpacity
                        style={styles.projectExportAction}
                        onPress={exportHotelProjectToPpt}
                        disabled={isExporting}
                      >
                        <Text style={styles.projectExportActionText}>{isExporting ? "⏳ Export..." : "📤 Exporter"}</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.projectDeleteAction}
                      onPress={() => {
                        deleteProject(selectedProject.id);
                      }}
                    >
                      <Text style={styles.projectDeleteActionText}>🗑️ Supprimer ce projet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : selectedProject ? (
              <>
                <View style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>{selectedProject.name}</Text>
                  <Pressable onPress={closeDetailsModal}>
                    <Text style={styles.detailsCloseButton}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.headerMetaRow}>
                  {selectedProject.project_type ? <Text style={styles.headerMetaPill}>{selectedProject.project_type}</Text> : null}
                  {selectedProject.status ? <Text style={styles.headerMetaPill}>{selectedProject.status}</Text> : null}
                  {selectedProject.country ? <Text style={styles.headerMetaPill}>{selectedProject.country}</Text> : null}
                  {selectedProject.city ? <Text style={styles.headerMetaPill}>{selectedProject.city}</Text> : null}
                </View>

                <ScrollView style={styles.detailsScrollView} scrollEnabled={true}>
                  {projectMedia.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Images</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                        {projectMedia.map((media) => (
                          <View key={media.id} style={styles.mediaCard}>
                            <Image source={{ uri: media.media_url }} style={styles.mediaImage} resizeMode="cover" />
                            {media.caption ? <Text style={styles.mediaCaption}>{media.caption}</Text> : null}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Développeur</Text>
                    <Text style={styles.detailsValue}>{selectedProject.developer || "Développeur non renseigné"}</Text>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Type de projet</Text>
                    <Text style={styles.detailsValue}>{selectedProject.project_type}</Text>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Statut</Text>
                    <Text style={styles.detailsValue}>{selectedProject.status || "Statut non renseigné"}</Text>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Localisation</Text>
                    <Text style={styles.detailsValue}>
                      {[selectedProject.country, selectedProject.city, selectedProject.quartier].filter(Boolean).join(", ")}
                    </Text>
                  </View>

                  {selectedProject.standing_cible && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Standing / Cible</Text>
                      <Text style={styles.detailsValue}>{selectedProject.standing_cible}</Text>
                    </View>
                  )}

                  {selectedProject.business_model && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Business model</Text>
                      <Text style={styles.detailsValue}>{selectedProject.business_model}</Text>
                    </View>
                  )}

                  {selectedProject.source_link && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Source</Text>
                      <TouchableOpacity
                        onPress={() => openSourceLink(selectedProject.source_link || "")}
                        activeOpacity={0.8}
                        style={styles.sourceLinkButton}
                      >
                        <Text style={styles.sourceLinkText}>{selectedProject.source_link}</Text>
                        <Text style={styles.sourceLinkHint}>Ouvrir la source</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedProject.amenities && selectedProject.amenities.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Amenities</Text>
                      <Text style={styles.detailsValue}>{formatArray(selectedProject.amenities)}</Text>
                    </View>
                  )}

                  {selectedProject.project_components && selectedProject.project_components.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Composantes</Text>
                      <Text style={styles.detailsValue}>{formatArray(selectedProject.project_components)}</Text>
                    </View>
                  )}

                  {selectedProject.surface_fonciere_totale && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Surface foncière totale</Text>
                      <Text style={styles.detailsValue}>{selectedProject.surface_fonciere_totale.toLocaleString()} m²</Text>
                    </View>
                  )}

                  {(selectedProject.surface_fonciere_collectif || selectedProject.surface_fonciere_villa || selectedProject.surface_fonciere_lot_villas) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Surfaces foncières par type</Text>
                      {selectedProject.surface_fonciere_collectif && (
                        <Text style={styles.detailsValue}>• Collectif: {selectedProject.surface_fonciere_collectif.toLocaleString()} m²</Text>
                      )}
                      {selectedProject.surface_fonciere_villa && (
                        <Text style={styles.detailsValue}>• Villa: {selectedProject.surface_fonciere_villa.toLocaleString()} m²</Text>
                      )}
                      {selectedProject.surface_fonciere_lot_villas && (
                        <Text style={styles.detailsValue}>• Lot de villas: {selectedProject.surface_fonciere_lot_villas.toLocaleString()} m²</Text>
                      )}
                    </View>
                  )}

                  {selectedProject.total_units && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Nombre total d'unités</Text>
                      <Text style={styles.detailsValue}>{selectedProject.total_units} unités</Text>
                    </View>
                  )}

                  {(selectedProject.total_units_collectif || selectedProject.total_units_villa || selectedProject.total_units_lot_villas) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Total d'unités par type</Text>
                      {selectedProject.total_units_collectif && (
                        <Text style={styles.detailsValue}>• Collectif: {selectedProject.total_units_collectif} unités</Text>
                      )}
                      {selectedProject.total_units_villa && (
                        <Text style={styles.detailsValue}>• Villa: {selectedProject.total_units_villa} unités</Text>
                      )}
                      {selectedProject.total_units_lot_villas && (
                        <Text style={styles.detailsValue}>• Lot de villas: {selectedProject.total_units_lot_villas} unités</Text>
                      )}
                    </View>
                  )}

                  {selectedProject.units_remaining_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Unités restantes</Text>
                      <Text style={styles.detailsValue}>{selectedProject.units_remaining_global} unités</Text>
                    </View>
                  )}

                  {(selectedProject.units_remaining_collectif || selectedProject.units_remaining_villa || selectedProject.units_remaining_lot_villas) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Unités restantes par type</Text>
                      {selectedProject.units_remaining_collectif && (
                        <Text style={styles.detailsValue}>• Collectif: {selectedProject.units_remaining_collectif} unités</Text>
                      )}
                      {selectedProject.units_remaining_villa && (
                        <Text style={styles.detailsValue}>• Villa: {selectedProject.units_remaining_villa} unités</Text>
                      )}
                      {selectedProject.units_remaining_lot_villas && (
                        <Text style={styles.detailsValue}>• Lot de villas: {selectedProject.units_remaining_lot_villas} unités</Text>
                      )}
                    </View>
                  )}

                  {selectedProject.delivery_date && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Date de livraison</Text>
                      <Text style={styles.detailsValue}>{selectedProject.delivery_date}</Text>
                    </View>
                  )}

                  {selectedProject.start_commercial_date && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Début commercialisation</Text>
                      <Text style={styles.detailsValue}>{selectedProject.start_commercial_date}</Text>
                    </View>
                  )}

                  {selectedProject.commercialization_rate_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux de commercialisation global</Text>
                      <Text style={styles.detailsValue}>{selectedProject.commercialization_rate_global}%</Text>
                    </View>
                  )}

                  {(selectedProject.commercialization_rate_collectif || selectedProject.commercialization_rate_villa || selectedProject.commercialization_rate_lot_villas) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux de commercialisation par type</Text>
                      {selectedProject.commercialization_rate_collectif && (
                        <Text style={styles.detailsValue}>• Collectif: {selectedProject.commercialization_rate_collectif}%</Text>
                      )}
                      {selectedProject.commercialization_rate_villa && (
                        <Text style={styles.detailsValue}>• Villa: {selectedProject.commercialization_rate_villa}%</Text>
                      )}
                      {selectedProject.commercialization_rate_lot_villas && (
                        <Text style={styles.detailsValue}>• Lot de villas: {selectedProject.commercialization_rate_lot_villas}%</Text>
                      )}
                    </View>
                  )}

                  {selectedProject.sales_velocity_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux d'écoulement global</Text>
                      <Text style={styles.detailsValue}>{selectedProject.sales_velocity_global} unités/mois</Text>
                    </View>
                  )}

                  {(selectedProject.sales_velocity_collectif || selectedProject.sales_velocity_villa || selectedProject.sales_velocity_lot_villas) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux d'écoulement par type</Text>
                      {selectedProject.sales_velocity_collectif && (
                        <Text style={styles.detailsValue}>• Collectif: {selectedProject.sales_velocity_collectif} unités/mois</Text>
                      )}
                      {selectedProject.sales_velocity_villa && (
                        <Text style={styles.detailsValue}>• Villa: {selectedProject.sales_velocity_villa} unités/mois</Text>
                      )}
                      {selectedProject.sales_velocity_lot_villas && (
                        <Text style={styles.detailsValue}>• Lot de villas: {selectedProject.sales_velocity_lot_villas} unités/mois</Text>
                      )}
                    </View>
                  )}

                  {projectTypologies.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Typologies disponibles</Text>
                      {projectTypologies.map((typology) => (
                        <View key={typology.id} style={styles.typologyDetailItem}>
                          <View style={styles.typologyDetailHeader}>
                            <Text style={styles.typologyName}>{typology.typology}</Text>
                            <Text style={styles.typologyPrice}>{getTypologyPriceLabel(typology)}</Text>
                          </View>
                          {(typology.surface_habitable_min != null || typology.surface_terrasse_min != null || typology.surface_terrain_min != null || typology.units != null || typology.cus != null || typology.cos != null || typology.hauteur || typology.pricing_comment) && (
                            <View style={styles.typologyDetails}>
                              {(typology.surface_habitable_min != null || typology.surface_habitable_max != null) && (
                                <Text style={styles.typologyDetailText}>Surface habitable: {formatRange(typology.surface_habitable_min, typology.surface_habitable_max)} m²</Text>
                              )}
                              {(typology.surface_terrasse_min != null || typology.surface_terrasse_max != null) && (
                                <Text style={styles.typologyDetailText}>Surface terrasse: {formatRange(typology.surface_terrasse_min, typology.surface_terrasse_max)} m²</Text>
                              )}
                              {(typology.surface_terrain_min != null || typology.surface_terrain_max != null) && (
                                <Text style={styles.typologyDetailText}>Surface terrain: {formatRange(typology.surface_terrain_min, typology.surface_terrain_max)} m²</Text>
                              )}
                              {typology.units != null && (
                                <Text style={styles.typologyDetailText}>Nombre d'unités: {typology.units}</Text>
                              )}
                              {(typology.cus != null || typology.cos != null || typology.hauteur) && (
                                <Text style={styles.typologyDetailText}>
                                  {[typology.cus != null ? `CUS: ${typology.cus}%` : null,
                                    typology.cos != null ? `COS: ${typology.cos}%` : null,
                                    typology.hauteur ? `Hauteur: ${typology.hauteur}` : null]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </Text>
                              )}
                              {typology.pricing_comment && (
                                <Text style={styles.typologyDetailText}>{typology.pricing_comment}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {projectTypologies.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Gamme de prix</Text>
                      <View style={styles.priceRange}>
                        <Text style={styles.priceText}>{getPriceRangeText(projectTypologies)}</Text>
                      </View>
                    </View>
                  )}

                  {projectDensity.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Données de densité</Text>
                      {projectDensity.map((density, index) => (
                        <Text key={index} style={styles.detailsValue}>
                          {getDensityLabel(selectedProject.project_type, density.density_type)}
                          {density.density_value}
                          {getDensityUnit(selectedProject.project_type, density.density_type)}
                        </Text>
                      ))}
                    </View>
                  )}

                  {isRetailSelected && (projectRetail || projectExtendedDetails?.retail) && (
                    <>
                      {projectRetail?.opening_date && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectRetail.opening_date}</Text>
                        </View>
                      )}

                      {projectRetail?.gla != null && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>GLA</Text>
                          <Text style={styles.detailsValue}>{projectRetail.gla.toLocaleString()} m²</Text>
                        </View>
                      )}

                      {projectExtendedDetails?.retail?.typology && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Typologie retail</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.retail.typology}</Text>
                        </View>
                      )}

                      {projectRetail?.positionnement && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Positionnement</Text>
                          <Text style={styles.detailsValue}>{projectRetail.positionnement}</Text>
                        </View>
                      )}

                      {projectRetail?.mix_retail && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Mix retail</Text>
                          <Text style={styles.detailsValue}>{projectRetail.mix_retail}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {isOfficeSelected && projectExtendedDetails?.office && (
                    <>
                      {projectExtendedDetails.office.openingDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.office.openingDate}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.office.officeType ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Type de bureau</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.office.officeType}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isHealthSelected && projectExtendedDetails?.health && (
                    <>
                      {projectExtendedDetails.health.openingDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.openingDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isHotelSelected && projectExtendedDetails?.hotel && (
                    <>
                      {projectExtendedDetails.hotel.openingDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.openingDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isSportSelected && projectExtendedDetails?.sport && (
                    <>
                      {(projectExtendedDetails.sport.openingDate || projectExtendedDetails.sport.creationDate || projectExtendedDetails.sport.renovationDate) ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.sport.openingDate || projectExtendedDetails.sport.creationDate || projectExtendedDetails.sport.renovationDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isEducationSelected && projectExtendedDetails?.education && (
                    <>
                      {(projectExtendedDetails.education.openingDate || projectExtendedDetails.education.creationDate || projectExtendedDetails.education.renovationDate) ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.education.openingDate || projectExtendedDetails.education.creationDate || projectExtendedDetails.education.renovationDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isArtCultureSelected && projectExtendedDetails?.artCulture && (
                    <>
                      {(projectExtendedDetails.artCulture.openingDate || projectExtendedDetails.artCulture.creationDate || projectExtendedDetails.artCulture.renovationDate) ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.artCulture.openingDate || projectExtendedDetails.artCulture.creationDate || projectExtendedDetails.artCulture.renovationDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {isLeisureSelected && projectExtendedDetails?.leisure && (
                    <>
                      {(projectExtendedDetails.leisure.openingDate || projectExtendedDetails.leisure.creationDate || projectExtendedDetails.leisure.renovationDate) ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.leisure.openingDate || projectExtendedDetails.leisure.creationDate || projectExtendedDetails.leisure.renovationDate}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  <TouchableOpacity style={styles.editButton} onPress={() => {
                    closeDetailsModal();
                    router.push(`/(tabs)/AddProject?projectId=${selectedProject.id}`);
                  }}>
                    <Text style={styles.editButtonText}>Modifier ce projet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteButton} onPress={() => {
                    deleteProject(selectedProject.id);
                  }}>
                    <Text style={styles.deleteButtonText}>Supprimer ce projet</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  topLeftControls: {
    position: "absolute",
    top: 16,
    left: 12,
    right: 92,
    zIndex: 16,
    gap: 8,
  },

  topLeftControlsMobile: {
    top: 56,
  },

  citySearchRow: {
    flexDirection: "row",
    gap: 8,
  },

  citySearchInput: {
    flex: 1,
    minHeight: 38,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary.light,
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  citySearchText: {
    color: AppColors.ui.text,
    fontSize: 13,
    fontFamily: "Century Gothic",
  },

  citySearchButton: {
    minWidth: 42,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: AppColors.primary.main,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  citySearchButtonText: {
    color: AppColors.ui.background,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    fontSize: 13,
  },

  activeFiltersRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 6,
  },

  cityFiltersRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },

  cityFilterChip: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  cityFilterChipActive: {
    borderColor: AppColors.primary.main,
    backgroundColor: AppColors.primary.light,
  },

  cityFilterChipText: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontWeight: "600",
  },

  cityFilterChipTextActive: {
    color: AppColors.ui.background,
  },

  filterChip: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  filterChipActive: {
    borderColor: AppColors.primary.main,
    backgroundColor: AppColors.primary.main,
  },

  filterChipText: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontWeight: "600",
  },

  filterChipTextActive: {
    color: AppColors.ui.background,
  },

  filtersOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  filtersModalContent: {
    backgroundColor: AppColors.ui.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
    padding: 16,
  },

  filtersModalTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  filtersModalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: AppColors.gray.lightest,
  },

  filtersModalOptionLabel: {
    color: AppColors.ui.text,
    fontSize: 15,
    fontWeight: "600",
  },

  filtersModalOptionCheck: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
  },

  filtersModalApplyButton: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: AppColors.primary.main,
    paddingVertical: 11,
    alignItems: "center",
  },

  filtersModalApplyButtonText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
  },

  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary.main,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#7F7F7F",
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  markerNumber: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  defaultMarkerIcon: {
    fontSize: 32,
    color: "#31849B",
  },

  exportButton: {
    position: "absolute",
    left: 16,
    bottom: 24,
    backgroundColor: AppColors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    zIndex: 14,
    shadowColor: AppColors.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },

  exportButtonText: {
    color: AppColors.ui.background,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 18,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },

  selectionBanner: {
    position: "absolute",
    top: 18,
    left: 14,
    width: 180,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  selectionBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.primary.main,
    marginBottom: 6,
    fontFamily: "Century Gothic",
  },

  selectionBannerText: {
    fontSize: 12,
    lineHeight: 16,
    color: AppColors.ui.text,
    marginBottom: 12,
    fontFamily: "Century Gothic",
  },

  selectionActionsRow: {
    flexDirection: "column",
    gap: 8,
  },

  selectionCancelButton: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: AppColors.gray.lighter,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: AppColors.ui.background,
  },

  selectionCancelButtonText: {
    color: AppColors.ui.text,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Century Gothic",
  },

  selectionExportButton: {
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: AppColors.primary.main,
  },

  selectionExportButtonDisabled: {
    opacity: 0.55,
  },

  selectionExportButtonText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  selectionBox: {
    position: "absolute",
    pointerEvents: "none",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: AppColors.primary.main,
    backgroundColor: "rgba(49, 132, 155, 0.14)",
  },

  projectDetailShell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  projectDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 14,
    backgroundColor: "#F2FAFE",
    borderBottomWidth: 1,
    borderBottomColor: "#bfe1ec",
  },

  projectGalleryWrapper: {
    position: "relative",
    width: 420,
    maxWidth: "38%",
    height: 170,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: AppColors.ui.background,
    backgroundColor: AppColors.gray.lightest,
  },

  projectGalleryPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dfeff7",
    paddingHorizontal: 18,
  },

  projectGalleryPlaceholderFrame: {
    width: 86,
    height: 76,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#4aa6c4",
    backgroundColor: "#edf9ff",
    position: "relative",
    marginBottom: 12,
  },

  projectGalleryPlaceholderSun: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4aa6c4",
    right: 12,
    top: 12,
  },

  projectGalleryPlaceholderHillA: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    height: 24,
    backgroundColor: "#dfeff7",
    borderRadius: 12,
    transform: [{ skewY: "-18deg" }],
  },

  projectGalleryPlaceholderHillB: {
    position: "absolute",
    left: 24,
    right: 18,
    bottom: 10,
    height: 22,
    backgroundColor: "#cfeaf7",
    borderRadius: 12,
    transform: [{ skewY: "18deg" }],
  },

  projectGalleryPlaceholderTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "center",
  },

  projectGalleryPlaceholderText: {
    color: AppColors.primary.main,
    fontSize: 14,
    fontWeight: "400",
    fontFamily: "Century Gothic",
    textAlign: "center",
    marginTop: 4,
  },

  projectDetailImage: {
    width: "100%",
    height: "100%",
  },

  projectImageCounter: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(11, 29, 39, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  projectImageCounterText: {
    color: AppColors.ui.background,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectImageArrows: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    gap: 10,
  },

  projectImageArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  projectImageArrowText: {
    color: AppColors.ui.background,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 26,
  },

  projectSummaryColumn: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  projectStatusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dfeef9",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppColors.primary.light,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },

  projectStatusBadgeText: {
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
    fontSize: 14,
    fontWeight: "700",
  },

  projectSummaryTitle: {
    color: AppColors.primary.main,
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    marginBottom: 10,
  },

  projectSummaryLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },

  projectSummaryIconPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AppColors.primary.main,
    backgroundColor: "rgba(49, 132, 155, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  projectSummaryIconImage: {
    width: 10,
    height: 10,
  },

  projectSummaryIconPin: {
    borderRadius: 9,
    backgroundColor: "rgba(49, 132, 155, 0.18)",
  },

  projectSummaryIconBuilding: {
    borderRadius: 4,
  },

  projectSummaryText: {
    color: "#0b6e8c",
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Century Gothic",
  },

  projectMiniMapContainer: {
    width: 180,
    justifyContent: "center",
    alignItems: "center",
  },

  projectMiniMapCard: {
    width: 178,
    height: 118,
    borderRadius: 16,
    backgroundColor: "rgba(146, 210, 229, 0.14)",
    borderWidth: 1,
    borderColor: "#99d7ea",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  projectMiniMapPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0b7ea2",
    position: "absolute",
    top: 48,
    left: 82,
    borderWidth: 4,
    borderColor: AppColors.ui.background,
  },

  projectMiniMapText: {
    position: "absolute",
    bottom: 18,
    color: "#0b6e8c",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Century Gothic",
  },

  projectCloseButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  projectCloseButtonText: {
    color: AppColors.primary.main,
    fontSize: 20,
    fontWeight: "700",
  },

  projectTabsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#9cd3e6",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },

  projectTabButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7ec6dc",
    backgroundColor: "#F2FAFE",
  },

  projectTabButtonActive: {
    backgroundColor: "#0b879e",
    borderColor: "#0b879e",
  },

  projectTabIconSlot: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  projectTabIcon: {
    color: "#0c7ea3",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 15,
  },

  projectTabIconImage: {
    width: 16,
    height: 16,
  },

  projectTabIconActive: {
    color: "#ffffff",
  },

  projectTabText: {
    color: "#0c7ea3",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "center",
  },

  projectTabTextActive: {
    color: "#ffffff",
  },

  projectCollectiveSectionBlock: {
    marginBottom: 16,
  },

  projectTabContentScroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  projectTabContentContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },

  projectOverviewGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 12,
    alignItems: "stretch",
  },

  projectOverviewCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.42)",
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "rgba(40, 150, 195, 0.16)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  projectOverviewCardIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: "#EAF9FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  explorerIcon: {
    width: 28,
    height: 28,
    tintColor: "#0d7ea4",
  },
  explorerIconSmall: {
    width: 18,
    height: 18,
  },
  explorerIconTiny: {
    width: 14,
    height: 14,
  },
  explorerIconMedium: {
    width: 20,
    height: 20,
  },

  projectOverviewCardContent: {
    flex: 1,
    justifyContent: "center",
  },

  projectOverviewCardLabel: {
    color: "#2a7a9a",
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Century Gothic",
    marginBottom: 4,
    lineHeight: 17,
  },

  projectOverviewCardValue: {
    color: "#0a5e7a",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    lineHeight: 22,
    flexShrink: 1,
  },

  projectCharacteristicsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.42)",
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 0,
    shadowColor: "rgba(40, 150, 195, 0.22)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  projectCharacteristicsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },

  projectCharacteristicsTitleIconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  projectCharacteristicsTitleIcon: {
    color: "#0c7ea3",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 24,
  },

  projectCharacteristicsTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectCharacteristicsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },

  projectCharacteristicsBlock: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 0,
    overflow: "visible",
  },

  projectCharacteristicsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#EAF9FF",
    marginBottom: 12,
  },

  projectCharacteristicsRowLast: {
    marginBottom: 0,
  },

  projectCharacteristicsLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "rgba(64, 180, 220, 0.24)",
  },

  projectCharacteristicsItemIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderRadius: 6,
  },

  projectCharacteristicsItemIcon: {
    color: "#0c7ea3",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 22,
  },

  projectCharacteristicsLabel: {
    color: AppColors.primary.main,
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Century Gothic",
    flexShrink: 1,
    lineHeight: 18,
  },

  projectCharacteristicsValue: {
    color: "#0b6f8f",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "right",
    flexShrink: 1,
    lineHeight: 20,
  },

  projectSectionTitle: {
    color: AppColors.primary.main,
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    marginBottom: 18,
  },

  projectEquipmentLayout: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },

  projectEquipmentBlock: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.42)",
    borderRadius: 18,
    overflow: "hidden",
    paddingBottom: 16,
    shadowColor: "rgba(40, 150, 195, 0.16)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  projectEquipmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },

  projectEquipmentIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  projectEquipmentTitleIcon: {
    width: 26,
    height: 26,
    tintColor: "#0d7ea4",
  },

  projectEquipmentIcon: {
    color: "#0c7ea3",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },

  projectEquipmentTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectComponentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },

  projectComponentItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.45)",
    backgroundColor: "#F3FBFF",
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  projectComponentItemText: {
    color: AppColors.primary.main,
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Century Gothic",
  },

  projectUnitsSectionContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.42)",
    borderRadius: 18,
    overflow: "hidden",
    padding: 10,
    shadowColor: "rgba(40, 150, 195, 0.16)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  projectUnitsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },

  projectUnitsTitleIconWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  projectUnitsSectionIcon: {
    width: 28,
    height: 28,
    tintColor: "#0d7ea4",
  },

  projectUnitsTitleIcon: {
    color: "#0c7ea3",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },

  projectUnitsTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectTypologyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  projectTypologyCard: {
    flexBasis: "31%",
    minWidth: 200,
    maxWidth: "100%",
    backgroundColor: "#F3FBFF",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 146,
    shadowColor: "rgba(40, 150, 195, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  projectTypologyPlanZone: {
    flex: 2.4,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(12, 126, 163, 0.05)",
    borderRadius: 10,
    marginLeft: 10,
    marginRight: 8,
  },

  projectTypologyIconWrap: {
    width: 36,
    height: 36,
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  projectTypologyIconImage: {
    width: 30,
    height: 30,
    tintColor: "#0d7ea4",
  },

  projectTypologyIcon: {
    color: "#0c7ea3",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },

  projectTypologyName: {
    color: "#0b6f8f",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "center",
    flexShrink: 1,
    maxWidth: "100%",
  },

  projectTypologyDivider: {
    width: 1,
    backgroundColor: "rgba(64, 180, 220, 0.22)",
    marginVertical: 8,
    alignSelf: "stretch",
  },

  projectTypologySurfaceZone: {
    flex: 4.2,
    justifyContent: "center",
    paddingVertical: 4,
    paddingLeft: 12,
    minWidth: 0,
  },

  projectTypologyMetaLine: {
    color: AppColors.primary.main,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: "Century Gothic",
  },

  projectTypologyMetaLabel: {
    color: AppColors.primary.main,
    fontWeight: "500",
  },

  projectTypologyMetaValue: {
    color: "#0b6f8f",
    fontWeight: "700",
  },

  projectTypologyPriceZone: {
    flex: 2.6,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingLeft: 10,
    paddingRight: 12,
    minWidth: 0,
  },

  projectTypologyPriceLabel: {
    color: "#FF0066",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Century Gothic",
    marginBottom: 2,
    textAlign: "right",
  },

  projectTypologyPriceValue: {
    color: "#FF0066",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "right",
    marginBottom: 8,
  },

  projectTypologyStartLabel: {
    color: "#d54b9d",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Century Gothic",
    marginBottom: 2,
  },

  projectTypologyStartValue: {
    color: "#d54b9d",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "right",
  },

  emptyStateBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#F2FAFE",
    borderWidth: 1,
    borderColor: "#8ad0e5",
  },

  emptyStateText: {
    color: AppColors.primary.main,
    fontSize: 16,
    fontFamily: "Century Gothic",
  },

  projectGlobalPriceBox: {
    marginTop: 8,
    backgroundColor: "#EAF9FF",
    borderRadius: 14,
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "rgba(40, 150, 195, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  projectGlobalPriceLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  projectGlobalPriceIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  projectGlobalPriceIconImage: {
    width: 24,
    height: 24,
    tintColor: "#0d7ea4",
  },

  projectGlobalPriceIcon: {
    color: "#0c7ea3",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 16,
  },

  projectGlobalPriceLabel: {
    color: AppColors.primary.main,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectGlobalPriceValue: {
    color: "#0b6f8f",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    textAlign: "right",
    flexShrink: 1,
  },

  projectDocumentsLayout: {
    flexDirection: "row",
    gap: 16,
    alignItems: "stretch",
  },

  projectDocumentPanel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 240,
    borderWidth: 1,
    borderColor: "rgba(64, 180, 220, 0.42)",
    shadowColor: "rgba(40, 150, 195, 0.16)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  projectDocumentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },

  projectDocumentHeaderIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  projectDocumentHeaderIcon: {
    color: "#0c7ea3",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },

  projectDocumentHeaderTitle: {
    color: AppColors.primary.main,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectSectionHeaderIcon: {
    width: 26,
    height: 26,
  },

  projectDocumentList: {
    padding: 10,
  },

  projectDocumentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "#EAF9FF",
    borderWidth: 0,
    borderColor: "transparent",
  },

  projectDocumentRowMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  projectDocumentFileBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    padding: 3,
  },

  projectDocumentFileBadgeInner: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  projectDocumentFileBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    color: "#FFFFFF",
    lineHeight: 9,
  },

  projectDocumentInfo: {
    flex: 1,
    minWidth: 0,
  },

  projectDocumentName: {
    color: AppColors.primary.main,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Century Gothic",
    marginBottom: 2,
  },

  projectDocumentMeta: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontFamily: "Century Gothic",
    opacity: 0.82,
  },

  projectDownloadButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7ec6dc",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 124,
    minHeight: 40,
  },

  projectDownloadButtonDisabled: {
    backgroundColor: "#e5ebf0",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.gray.light,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 124,
    minHeight: 40,
  },

  projectDownloadIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },

  projectDownloadButtonText: {
    color: AppColors.primary.main,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectSourceUrlBox: {
    backgroundColor: "#EAF9FF",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 12,
  },

  projectSourceLinkText: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontFamily: "Century Gothic",
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: "wrap",
  },

  projectSourceButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7ec6dc",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginHorizontal: 10,
    marginBottom: 14,
    alignSelf: "flex-start",
  },

  projectOpenSourceIcon: {
    width: 16,
    height: 16,
    marginRight: 7,
  },

  projectSourceButtonIcon: {
    color: AppColors.primary.main,
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },

  projectSourceButtonText: {
    color: AppColors.primary.main,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectSourceNote: {
    backgroundColor: "#EAF9FF",
    borderRadius: 12,
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginBottom: 10,
  },

  projectSourceNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  projectSourceNoteIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 0,
    borderColor: "transparent",
  },

  projectInfoIcon: {
    width: 24,
    height: 24,
  },

  projectSourceNoteIcon: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontWeight: "700",
  },

  projectSourceNoteTitle: {
    color: AppColors.primary.main,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectSourceNoteText: {
    color: AppColors.primary.main,
    fontSize: 12,
    fontFamily: "Century Gothic",
    lineHeight: 18,
  },

  projectFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: AppColors.gray.lighter,
    gap: 18,
    width: "100%",
  },

  projectMapAction: {
    backgroundColor: AppColors.primary.main,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: 210,
    minWidth: 180,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginRight: "auto",
  },

  projectMapActionText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectFooterActionGroup: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginLeft: "auto",
    width: "68%",
    flexShrink: 1,
  },

  projectEditAction: {
    backgroundColor: AppColors.primary.main,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 130,
    maxWidth: 220,
  },

  projectEditActionText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectExportAction: {
    backgroundColor: "#0d9bb5",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    maxWidth: 180,
  },

  projectExportActionText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  projectDeleteAction: {
    backgroundColor: "#d93d3d",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
    maxWidth: 220,
  },

  projectDeleteActionText: {
    color: AppColors.ui.background,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  detailsModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    flexDirection: "column",
  },

  detailsCloseArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  detailsModalContent: {
    backgroundColor: AppColors.ui.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: "85%",
    borderTopWidth: 3,
    borderTopColor: AppColors.primary.light,
    paddingBottom: 0,
    marginTop: 0,
  },

  detailsScrollView: {
    paddingTop: 0,
    paddingBottom: 18,
  },

  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: AppColors.gray.lightest,
  },

  headerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  headerMetaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppColors.primary.light,
    color: AppColors.primary.main,
    backgroundColor: AppColors.gray.lightest,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },

  detailsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
    flex: 1,
    marginRight: 16,
  },

  detailsCloseButton: {
    fontSize: 28,
    color: AppColors.primary.main,
    fontWeight: "700",
  },

  editButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: AppColors.primary.main,
    justifyContent: "center",
    alignItems: "center",
  },

  editButtonText: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
  },

  deleteButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#D83A3A",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteButtonText: {
    color: AppColors.ui.background,
    fontSize: 16,
    fontWeight: "700",
  },

  detailsSection: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    backgroundColor: AppColors.ui.background,
  },

  mediaRow: {
    gap: 10,
    paddingRight: 6,
  },

  mediaCard: {
    width: 220,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: AppColors.gray.lightest,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
  },

  mediaImage: {
    width: "100%",
    height: 150,
  },

  mediaCaption: {
    fontSize: 12,
    color: AppColors.gray.dark,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Century Gothic",
  },

  detailsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary.main,
    marginBottom: 8,
    fontFamily: "Century Gothic",
  },

  detailsValue: {
    fontSize: 15,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
    lineHeight: 22,
  },

  sourceLinkButton: {
    borderWidth: 1,
    borderColor: AppColors.primary.light,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: AppColors.gray.lightest,
  },

  sourceLinkText: {
    color: AppColors.primary.main,
    fontSize: 14,
    textDecorationLine: "underline",
    fontFamily: "Century Gothic",
  },

  sourceLinkHint: {
    marginTop: 6,
    color: AppColors.gray.dark,
    fontSize: 12,
    fontFamily: "Century Gothic",
  },

  typologyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: AppColors.gray.lightest,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary.light,
  },

  typologyName: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },

  typologyPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.accent,
    fontFamily: "Century Gothic",
  },

  priceRange: {
    backgroundColor: AppColors.primary.light,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  priceText: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.ui.background,
    fontFamily: "Century Gothic",
    textAlign: "center",
  },

  typologyDetailItem: {
    backgroundColor: AppColors.gray.lightest,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary.light,
  },

  typologyDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  typologyDetails: {
    borderTopWidth: 1,
    borderTopColor: AppColors.gray.light,
    paddingTop: 8,
  },

  typologyDetailText: {
    fontSize: 13,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
    marginVertical: 4,
    lineHeight: 18,
  },

});