import React, { useCallback, useState } from "react";
import { StyleSheet, View, Text, Modal, Pressable, ScrollView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { AppColors } from "@/constants/colors";

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
};

type Typology = {
  id: string;
  typology: string;
  pricing: string;
  surface_habitable?: number;
  surface_terrasse?: number;
  surface_terrain?: number;
  units?: number;
};

type DensityInfo = {
  density_type: string;
  density_value: number;
};

type RetailInfo = {
  gla?: number;
  positionnement?: string;
  mix_retail?: string;
  enseignes?: string;
};

type MapViewProps = {
  mapType?: "standard" | "satellite" | "hybrid" | "terrain";
  markerSize?: number;
  markerColor?: string;
  markerBorderColor?: string;
  markerTextSize?: number;
};

export default function MapScreen({ 
  mapType = "standard",
  markerSize = 36,
  markerColor = "#31849B",
  markerBorderColor = "#7F7F7F",
  markerTextSize = 16
}: MapViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTypologies, setProjectTypologies] = useState<Typology[]>([]);
  const [projectDensity, setProjectDensity] = useState<DensityInfo[]>([]);
  const [projectRetail, setProjectRetail] = useState<RetailInfo | null>(null);

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

  const handleMarkerPress = async (project: Project) => {
    setSelectedProject(project);
    await Promise.all([
      fetchProjectTypologies(project.id),
      fetchProjectDensity(project.id),
      fetchProjectRetail(project.id),
    ]);
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

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 33.5731,
          longitude: -7.5898,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {projects.map((project, index) => {
          // Afficher les numéros SEULEMENT en mode satellite/hybrid
          const isSatelliteMode = mapType === "satellite" || mapType === "hybrid";

          return (
            <Marker
              key={project.id}
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
                // Mode Satellite/Hybrid : bulle numérotée (centrée, sans flèche)
                <View style={[
                  styles.markerBubble,
                  {
                    width: markerSize,
                    height: markerSize,
                    borderRadius: markerSize / 2,
                    backgroundColor: markerColor,
                    borderColor: markerBorderColor,
                  }
                ]}>
                  <Text style={[styles.markerNumber, { fontSize: markerTextSize }]}>{index + 1}</Text>
                </View>
              ) : (
                // Mode Standard/Terrain : icône de localisation colorée
                <Text style={styles.defaultMarkerIcon}>📍</Text>
              )}
            </Marker>
          );
        })}
      </MapView>

      {/* Modal pour afficher les détails du projet */}
      <Modal visible={selectedProject !== null} transparent animationType="slide">
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContent}>
            <Pressable 
              style={styles.detailsCloseArea}
              onPress={() => setSelectedProject(null)}
            />
            
            <ScrollView style={styles.detailsScrollView} scrollEnabled={true}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>{selectedProject?.name}</Text>
                <Pressable onPress={() => setSelectedProject(null)}>
                  <Text style={styles.detailsCloseButton}>✕</Text>
                </Pressable>
              </View>

              {selectedProject && (
                <>
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
                            <Text style={styles.typologyPrice}>{formatPrice(typology.pricing)}</Text>
                          </View>
                          {(typology.surface_habitable || typology.surface_terrasse || typology.surface_terrain || typology.units) && (
                            <View style={styles.typologyDetails}>
                              {typology.surface_habitable && (
                                <Text style={styles.typologyDetailText}>
                                  Surface habitable: {typology.surface_habitable} m²
                                </Text>
                              )}
                              {typology.surface_terrasse && (
                                <Text style={styles.typologyDetailText}>
                                  Surface terrasse: {typology.surface_terrasse} m²
                                </Text>
                              )}
                              {typology.surface_terrain && (
                                <Text style={styles.typologyDetailText}>
                                  Surface terrain: {typology.surface_terrain} m²
                                </Text>
                              )}
                              {typology.units && (
                                <Text style={styles.typologyDetailText}>
                                  Nombre d'unités: {typology.units}
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
                        <Text style={styles.priceText}>
                          {projectTypologies.length === 1 
                            ? formatPrice(projectTypologies[0].pricing)
                            : `${formatPrice(projectTypologies[0].pricing)} à ${formatPrice(projectTypologies[projectTypologies.length - 1].pricing)}`}
                        </Text>
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

                  {projectRetail && (
                    <>
                      <View style={styles.sectionDivider}>
                        <Text style={styles.sectionDividerText}>INFORMATIONS RETAIL</Text>
                      </View>

                      {projectRetail.gla && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>GLA (Gross Leasable Area)</Text>
                          <Text style={styles.detailsValue}>{projectRetail.gla.toLocaleString()} m²</Text>
                        </View>
                      )}

                      {projectRetail.positionnement && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Positionnement</Text>
                          <Text style={styles.detailsValue}>{projectRetail.positionnement}</Text>
                        </View>
                      )}

                      {projectRetail.mix_retail && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Mix retail</Text>
                          <Text style={styles.detailsValue}>{projectRetail.mix_retail}</Text>
                        </View>
                      )}

                      {projectRetail.enseignes && (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>Enseignes</Text>
                          <Text style={styles.detailsValue}>{projectRetail.enseignes}</Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

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
  },

  detailsScrollView: {
    paddingTop: 0,
    paddingBottom: 20,
  },

  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: AppColors.gray.lightest,
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

  detailsSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray.lightest,
  },

  detailsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary.main,
    marginBottom: 8,
    fontFamily: "Century Gothic",
  },

  detailsValue: {
    fontSize: 16,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
    lineHeight: 24,
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

  sectionDivider: {
    backgroundColor: AppColors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 20,
    alignItems: "center",
  },

  sectionDividerText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.ui.background,
    fontFamily: "Century Gothic",
    letterSpacing: 0.5,
  },
});