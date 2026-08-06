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
  rooms?: Array<{ type?: string; count?: string; surface?: string }>;
  fnb?: Array<{ name?: string; type?: string; capacity?: string }>;
  mice?: Array<{ name?: string; type?: string; roomsCount?: string; capacity?: string; surface?: string }>;
  leisure?: Array<{ name?: string; type?: string; count?: string; surface?: string; capacity?: string }>;
};

type ProjectExtendedDetails = {
  retail?: ExtendedRetailDetails;
  office?: ExtendedOfficeDetails;
  health?: ExtendedHealthDetails;
  hotel?: ExtendedHotelDetails;
};

type MapViewProps = {
  mapType?: "standard" | "satellite" | "hybrid" | "terrain";
  markerSize?: number;
  markerColor?: string;
  projectTypeColors?: Record<"Collectif" | "Villa" | "Lot de villas" | "Retail" | "Bureau" | "Santé" | "Hotel", string>;
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

const FILTER_TYPES = ["Collectif", "Villa", "Lot de villas", "Retail", "Bureau", "Santé", "Hotel"] as const;
type FilterType = (typeof FILTER_TYPES)[number];

const PROJECT_TYPE_DEFAULT_COLORS: Record<FilterType, string> = {
  Collectif: "#31849B",
  Villa: "#FF0066",
  "Lot de villas": "#00CCEE",
  Retail: "#00B050",
  Bureau: "#18424E",
  "Santé": "#009999",
  Hotel: "#7030A0",
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
    setProjectMedia([]);
    setProjectExtendedDetails(null);
    await Promise.all([
      fetchProjectTypologies(project.id),
      fetchProjectDensity(project.id),
      fetchProjectRetail(project.id),
      fetchProjectMedia(project.id),
      fetchProjectExtendedDetails(project.id),
    ]);
  };

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
  const isRetailSelected = selectedTypeFilters.includes("Retail");
  const isOfficeSelected = selectedTypeFilters.includes("Bureau");
  const isHealthSelected = selectedTypeFilters.includes("Santé");
  const isHotelSelected = selectedTypeFilters.includes("Hotel");

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
      const [{ default: PptxGenJS }, htmlToImage] = await Promise.all([
        import("pptxgenjs"),
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
        .map((project, index) => ({
          index: index + 1,
          name: project.name,
          point: mapExportApi.latLngToContainerPoint({
            latitude: project.latitude,
            longitude: project.longitude,
          }),
        }))
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

      const markerFillColor = rgbToHex(markerColor).replace("#", "");
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

      selectedProjects.forEach(({ index, point }) => {
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
          fill: { color: markerFillColor },
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

      const legendSlide = pptx.addSlide();
      await addSlideChrome(legendSlide, "OFFRE ACTUELLE - LÉGENDE", "Page2");

      const [leftColumnProjects, rightColumnProjects] = splitProjectsIntoColumns(selectedProjects);
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
        fill: { color: markerFillColor },
        line: { color: markerFillColor, width: 0 },
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

      const renderLegendColumn = (entries: typeof selectedProjects, columnX: number) => {
        entries.forEach(({ index, name }, entryIndex) => {
          const itemY = legendBoxY + 0.42 + entryIndex * 0.23;

          legendSlide.addShape(pptx.ShapeType.ellipse, {
            x: columnX,
            y: itemY,
            w: 0.23,
            h: 0.23,
            fill: { color: markerFillColor },
            line: { color: markerStrokeColor, width: 0.8 },
          });
          legendSlide.addText(index.toString(), {
            x: columnX,
            y: itemY + 0.005,
            w: 0.23,
            h: 0.2,
            align: "center",
            valign: "middle",
            margin: 0,
            fontFace: "Century Gothic",
            fontSize: 7,
            bold: true,
            color: "FFFFFF",
          });
          legendSlide.addText(name, {
            x: columnX + 0.33,
            y: itemY + 0.015,
            w: 2.55,
            h: 0.18,
            fontFace: "Century Gothic",
            fontSize: 9.5,
            color: "111111",
            bold: false,
            margin: 0,
            breakLine: false,
            fit: "shrink",
          });
        });
      };

      renderLegendColumn(leftColumnProjects, legendBoxX + 0.14);
      renderLegendColumn(rightColumnProjects, legendBoxX + 3.47);

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
  }, [filteredProjects, mapExportApi, markerBorderColor, markerColor, markerSize, markerTextSize, resetSelectionMode, selectionRect, showNotice]);

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
            <Pressable 
              style={styles.detailsCloseArea}
              onPress={closeDetailsModal}
            />

            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{selectedProject?.name}</Text>
              <Pressable onPress={closeDetailsModal}>
                <Text style={styles.detailsCloseButton}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.headerMetaRow}>
              {selectedProject?.project_type ? <Text style={styles.headerMetaPill}>{selectedProject.project_type}</Text> : null}
              {selectedProject?.status ? <Text style={styles.headerMetaPill}>{selectedProject.status}</Text> : null}
              {selectedProject?.city ? <Text style={styles.headerMetaPill}>{selectedProject.city}</Text> : null}
            </View>

            <ScrollView style={styles.detailsScrollView} scrollEnabled={true}>
              {selectedProject && (
                <>
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

                  {/* === INFORMATIONS GÉNÉRALES === */}
                  
                  {/* Développeur */}
                  {selectedProject.developer && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Développeur</Text>
                      <Text style={styles.detailsValue}>{selectedProject.developer}</Text>
                    </View>
                  )}

                  {/* Type de projet */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Type de projet</Text>
                    <Text style={styles.detailsValue}>{selectedProject.project_type}</Text>
                  </View>

                  {/* Statut */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Statut</Text>
                    <Text style={styles.detailsValue}>{selectedProject.status || "Non spécifié"}</Text>
                  </View>

                  {/* Localisation */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Localisation</Text>
                    <Text style={styles.detailsValue}>
                      {selectedProject.city}{selectedProject.quartier ? `, ${selectedProject.quartier}` : ""}
                    </Text>
                  </View>

                  {/* Standing / Cible */}
                  {selectedProject.standing_cible && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Standing / Cible</Text>
                      <Text style={styles.detailsValue}>{selectedProject.standing_cible}</Text>
                    </View>
                  )}

                  {/* Business model */}
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

                  {/* Amenities */}
                  {selectedProject.amenities && selectedProject.amenities.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Amenities</Text>
                      <Text style={styles.detailsValue}>{formatArray(selectedProject.amenities)}</Text>
                    </View>
                  )}

                  {/* Composantes */}
                  {selectedProject.project_components && selectedProject.project_components.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Composantes</Text>
                      <Text style={styles.detailsValue}>{formatArray(selectedProject.project_components)}</Text>
                    </View>
                  )}

                  {/* === DONNÉES PHYSIQUES === */}

                  {/* Surface foncière totale */}
                  {selectedProject.surface_fonciere_totale && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Surface foncière totale</Text>
                      <Text style={styles.detailsValue}>{selectedProject.surface_fonciere_totale.toLocaleString()} m²</Text>
                    </View>
                  )}

                  {/* Surfaces foncières par type */}
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

                  {/* Total d'unités global */}
                  {selectedProject.total_units && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Nombre total d'unités</Text>
                      <Text style={styles.detailsValue}>{selectedProject.total_units} unités</Text>
                    </View>
                  )}

                  {/* Total d'unités par type */}
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

                  {/* Unités restantes global */}
                  {selectedProject.units_remaining_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Unités restantes</Text>
                      <Text style={styles.detailsValue}>{selectedProject.units_remaining_global} unités</Text>
                    </View>
                  )}

                  {/* Unités restantes par type */}
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

                  {/* === DATES ET COMMERCIALISATION === */}

                  {/* Date de livraison */}
                  {selectedProject.delivery_date && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Date de livraison</Text>
                      <Text style={styles.detailsValue}>{selectedProject.delivery_date}</Text>
                    </View>
                  )}

                  {/* Début commercialisation */}
                  {selectedProject.start_commercial_date && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Début commercialisation</Text>
                      <Text style={styles.detailsValue}>{selectedProject.start_commercial_date}</Text>
                    </View>
                  )}

                  {/* Taux de commercialisation global */}
                  {selectedProject.commercialization_rate_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux de commercialisation global</Text>
                      <Text style={styles.detailsValue}>{selectedProject.commercialization_rate_global}%</Text>
                    </View>
                  )}

                  {/* Taux de commercialisation par type */}
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

                  {/* Taux d'écoulement global */}
                  {selectedProject.sales_velocity_global && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Taux d'écoulement global</Text>
                      <Text style={styles.detailsValue}>{selectedProject.sales_velocity_global} unités/mois</Text>
                    </View>
                  )}

                  {/* Taux d'écoulement par type */}
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

                  {/* === TYPOLOGIES ET PRIX === */}

                  {/* Typologies disponibles */}
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
                                <Text style={styles.typologyDetailText}>
                                  Surface habitable: {formatRange(typology.surface_habitable_min, typology.surface_habitable_max)} m²
                                </Text>
                              )}
                              {(typology.surface_terrasse_min != null || typology.surface_terrasse_max != null) && (
                                <Text style={styles.typologyDetailText}>
                                  Surface terrasse: {formatRange(typology.surface_terrasse_min, typology.surface_terrasse_max)} m²
                                </Text>
                              )}
                              {(typology.surface_terrain_min != null || typology.surface_terrain_max != null) && (
                                <Text style={styles.typologyDetailText}>
                                  Surface terrain: {formatRange(typology.surface_terrain_min, typology.surface_terrain_max)} m²
                                </Text>
                              )}
                              {typology.units != null && (
                                <Text style={styles.typologyDetailText}>
                                  Nombre d'unités: {typology.units}
                                </Text>
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
                                <Text style={styles.typologyDetailText}>
                                  {typology.pricing_comment}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Gamme de prix */}
                  {projectTypologies.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Gamme de prix</Text>
                      <View style={styles.priceRange}>
                        <Text style={styles.priceText}>{getPriceRangeText(projectTypologies)}</Text>
                      </View>
                    </View>
                  )}

                  {/* === DENSITÉ === */}

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

                  {/* === RETAIL === */}

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

                      {(projectExtendedDetails?.retail?.shoppingCount || projectExtendedDetails?.retail?.shoppingBrands) && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Shopping</Text>
                          {projectExtendedDetails?.retail?.shoppingCount ? <Text style={styles.detailsValue}>Enseignes: {projectExtendedDetails.retail.shoppingCount}</Text> : null}
                          {projectExtendedDetails?.retail?.shoppingBrands ? <Text style={styles.detailsValue}>{projectExtendedDetails.retail.shoppingBrands}</Text> : null}
                        </View>
                      )}

                      {(projectExtendedDetails?.retail?.foodCount || projectExtendedDetails?.retail?.foodTypologies?.length || projectExtendedDetails?.retail?.foodBrands) && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Food & Beverage</Text>
                          {projectExtendedDetails?.retail?.foodCount ? <Text style={styles.detailsValue}>Enseignes: {projectExtendedDetails.retail.foodCount}</Text> : null}
                          {projectExtendedDetails?.retail?.foodTypologies?.length ? <Text style={styles.detailsValue}>{projectExtendedDetails.retail.foodTypologies.join(" • ")}</Text> : null}
                          {projectExtendedDetails?.retail?.foodBrands ? <Text style={styles.detailsValue}>{projectExtendedDetails.retail.foodBrands}</Text> : null}
                        </View>
                      )}

                      {(projectExtendedDetails?.retail?.servicesCount || projectExtendedDetails?.retail?.servicesBrands) && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Services</Text>
                          {projectExtendedDetails?.retail?.servicesCount ? <Text style={styles.detailsValue}>Enseignes: {projectExtendedDetails.retail.servicesCount}</Text> : null}
                          {projectExtendedDetails?.retail?.servicesBrands ? <Text style={styles.detailsValue}>{projectExtendedDetails.retail.servicesBrands}</Text> : null}
                        </View>
                      )}

                      {(projectExtendedDetails?.retail?.leisureCount || projectExtendedDetails?.retail?.leisureBrands) && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Loisirs</Text>
                          {projectExtendedDetails?.retail?.leisureCount ? <Text style={styles.detailsValue}>Enseignes: {projectExtendedDetails.retail.leisureCount}</Text> : null}
                          {projectExtendedDetails?.retail?.leisureBrands ? <Text style={styles.detailsValue}>{projectExtendedDetails.retail.leisureBrands}</Text> : null}
                        </View>
                      )}

                      {(projectExtendedDetails?.retail?.niveaux || projectExtendedDetails?.retail?.parkingPlaces || projectExtendedDetails?.retail?.parkingType || projectExtendedDetails?.retail?.parkingRatio) && (
                        <View style={styles.detailsSection}>
                          {projectExtendedDetails?.retail?.niveaux ? <Text style={styles.detailsValue}>Niveaux: {projectExtendedDetails.retail.niveaux}</Text> : null}
                          {projectExtendedDetails?.retail?.parkingPlaces ? <Text style={styles.detailsValue}>Places parking: {projectExtendedDetails.retail.parkingPlaces}</Text> : null}
                          {projectExtendedDetails?.retail?.parkingType ? <Text style={styles.detailsValue}>Type parking: {projectExtendedDetails.retail.parkingType}</Text> : null}
                          {projectExtendedDetails?.retail?.parkingRatio ? <Text style={styles.detailsValue}>Ratio parking: {projectExtendedDetails.retail.parkingRatio}</Text> : null}
                        </View>
                      )}

                      {(projectExtendedDetails?.retail?.mainTenants || projectRetail?.enseignes || projectExtendedDetails?.retail?.occupancyRate) && (
                        <View style={styles.detailsSection}>
                          {projectExtendedDetails?.retail?.mainTenants ? <Text style={styles.detailsValue}>Locataires principaux: {projectExtendedDetails.retail.mainTenants}</Text> : null}
                          {projectRetail?.enseignes ? <Text style={styles.detailsValue}>Enseignes clés: {projectRetail.enseignes}</Text> : null}
                          {projectExtendedDetails?.retail?.occupancyRate ? <Text style={styles.detailsValue}>Taux d'occupation: {projectExtendedDetails.retail.occupancyRate}%</Text> : null}
                        </View>
                      )}
                    </>
                  )}

                  {/* === BUREAU === */}
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

                      {projectExtendedDetails.office.concept ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Concept</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.office.concept}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.office.target ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Cible</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.office.target}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.office.services ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Services</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.office.services}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.office.spaces && projectExtendedDetails.office.spaces.length > 0 && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Espaces de travail</Text>
                          {projectExtendedDetails.office.spaces.map((space, index) => (
                            <View key={`${space.space || "espace"}-${index}`} style={styles.typologyDetailItem}>
                              <Text style={styles.typologyName}>{space.space || `Espace ${index + 1}`}</Text>
                              {space.description ? <Text style={styles.typologyDetailText}>{space.description}</Text> : null}
                              <Text style={styles.typologyDetailText}>{formatOfficeSpacePricing(space)}</Text>
                              {space.pricingComment ? <Text style={styles.typologyDetailText}>{space.pricingComment}</Text> : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* === SANTE === */}
                  {isHealthSelected && projectExtendedDetails?.health && (
                    <>
                      {projectExtendedDetails.health.openingDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.openingDate}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.clinicTypology ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Typologie</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.clinicTypology}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.description ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Description</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.description}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.specialties ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Spécialités</Text>
                          {projectExtendedDetails.health.specialties
                            .split(/\n+/)
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .map((item, index) => (
                              <Text key={`${item}-${index}`} style={styles.detailsValue}>• {item}</Text>
                            ))}
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.beds ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Nombre de lits</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.beds}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.doctors ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Nombre de médecins</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.doctors}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.operatingBlocks ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Blocs opératoires</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.operatingBlocks}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.bedTypes?.length ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Typologies de lits</Text>
                          <Text style={styles.detailsValue}>{formatCountTypePairs(projectExtendedDetails.health.bedTypes)}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.doctorTypes?.length ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Typologies de médecins</Text>
                          <Text style={styles.detailsValue}>{formatCountTypePairs(projectExtendedDetails.health.doctorTypes)}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.equipments ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Équipements</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.equipments}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.health.complementaryRooms ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Salles complémentaires</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.health.complementaryRooms}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {/* === HOTEL === */}
                  {isHotelSelected && projectExtendedDetails?.hotel && (
                    <>
                      {projectExtendedDetails.hotel.openingDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date d'ouverture</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.openingDate}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.subtype ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Sous-type</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.subtype}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.category ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Catégorie</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.category}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.bookingNote ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Note Booking</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.bookingNote}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.operator ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Opérateur</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.operator}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.investor ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Investisseur</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.investor}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.manager ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Gestionnaire</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.manager}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.renovationDate ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Date de rénovation</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.renovationDate}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.keys ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Clés</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.keys}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.floors ? (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Étages</Text>
                          <Text style={styles.detailsValue}>{projectExtendedDetails.hotel.floors}</Text>
                        </View>
                      ) : null}

                      {projectExtendedDetails.hotel.rooms && projectExtendedDetails.hotel.rooms.length > 0 && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Chambres</Text>
                          {projectExtendedDetails.hotel.rooms.map((room, index) => (
                            <Text key={`${room.type || "room"}-${index}`} style={styles.detailsValue}>
                              • {room.type || `Type ${index + 1}`}{room.count ? ` - ${room.count}` : ""}{room.surface ? ` - ${room.surface} m²` : ""}
                            </Text>
                          ))}
                        </View>
                      )}

                      {projectExtendedDetails.hotel.fnb && projectExtendedDetails.hotel.fnb.length > 0 && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>F&B</Text>
                          {projectExtendedDetails.hotel.fnb.map((item, index) => (
                            <Text key={`${item.name || "fnb"}-${index}`} style={styles.detailsValue}>
                              • {item.name || `Item ${index + 1}`}{item.type ? ` (${item.type})` : ""}{item.capacity ? ` - ${item.capacity}` : ""}
                            </Text>
                          ))}
                        </View>
                      )}

                      {projectExtendedDetails.hotel.mice && projectExtendedDetails.hotel.mice.length > 0 && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>MICE</Text>
                          {projectExtendedDetails.hotel.mice.map((item, index) => (
                            <Text key={`${item.name || "mice"}-${index}`} style={styles.detailsValue}>
                              • {item.name || `Espace ${index + 1}`}{item.type ? ` (${item.type})` : ""}{item.roomsCount ? ` - ${item.roomsCount} salles` : ""}{item.capacity ? ` - ${item.capacity}` : ""}{item.surface ? ` - ${item.surface} m²` : ""}
                            </Text>
                          ))}
                        </View>
                      )}

                      {projectExtendedDetails.hotel.leisure && projectExtendedDetails.hotel.leisure.length > 0 && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Loisirs</Text>
                          {projectExtendedDetails.hotel.leisure.map((item, index) => (
                            <Text key={`${item.name || "loisir"}-${index}`} style={styles.detailsValue}>
                              • {item.name || `Loisir ${index + 1}`}{item.type ? ` (${item.type})` : ""}{item.count ? ` - ${item.count}` : ""}{item.surface ? ` - ${item.surface} m²` : ""}{item.capacity ? ` - ${item.capacity}` : ""}
                            </Text>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  closeDetailsModal();
                  router.push(`/(tabs)/AddProject?projectId=${selectedProject?.id}`);
                }}
              >
                <Text style={styles.editButtonText}>Modifier ce projet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  if (!selectedProject?.id) return;
                  deleteProject(selectedProject.id);
                }}
              >
                <Text style={styles.deleteButtonText}>Supprimer ce projet</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
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

  detailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(49, 132, 155, 0.4)",
    justifyContent: "flex-end",
    flexDirection: "column",
  },

  detailsCloseArea: {
    flex: 1,
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