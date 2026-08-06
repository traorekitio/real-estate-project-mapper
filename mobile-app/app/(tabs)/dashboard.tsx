import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, G, Line, Path, Polygon } from "react-native-svg";

import { AppColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

type ProjectRow = {
  id: string;
  name: string | null;
  city: string | null;
  quartier: string | null;
  project_type: string | null;
  status: string | null;
};

type RetailRow = {
  project_id: string;
  gla: number | null;
};

type ExtendedDetailsRow = {
  project_id: string;
  project_type: string | null;
  details: any;
};

type SliceItem = {
  label: string;
  value: number;
  color: string;
};

type BarItem = {
  label: string;
  value: number;
};

type RadarSeries = {
  label: string;
  values: number[];
  color: string;
};

const CHART_COLORS = ["#31849B", "#FF0066", "#00B050", "#7030A0", "#18424E", "#009999", "#FF6B35", "#8E9091"];

const parseNumeric = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePercent = (value: unknown): number => {
  const parsed = parseNumeric(value);
  if (parsed <= 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
};

const splitList = (value: unknown): string[] => {
  if (typeof value !== "string") return [];
  return value
    .split(/[,;|•]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatNumber = (value: number) =>
  value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatSquareMeters = (value: number) => `${formatNumber(value)} m²`;

const formatRange = (min: number, max: number, unit = "MAD") => {
  if (!min && !max) return "-";
  if (min && max) return `${formatNumber(min)} - ${formatNumber(max)} ${unit}`;
  return `${formatNumber(min || max)} ${unit}`;
};

const buildSlicesFromRecord = (record: Record<string, number>) =>
  Object.entries(record)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({ label, value, color: CHART_COLORS[index % CHART_COLORS.length] }));

const buildTopBars = (record: Record<string, number>, topN = 8): BarItem[] =>
  Object.entries(record)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, value]) => ({ label, value }));

const matchProjectType = (rawType: string | null, target: "retail" | "bureau" | "sante" | "hotel") => {
  const type = (rawType || "").toLowerCase();
  if (target === "retail") return type.includes("retail");
  if (target === "bureau") return type.includes("bureau");
  if (target === "sante") return type.includes("sant");
  return type.includes("hotel") || type.includes("hôtel");
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${x} ${y}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const PieChart = ({ title, slices }: { title: string; slices: SliceItem[] }) => {
  const size = 190;
  const radius = 72;
  const center = size / 2;
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  let start = 0;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {total === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        <>
          <Svg width={size} height={size}>
            <G>
              {slices.map((slice) => {
                const angle = (slice.value / total) * 360;
                const path = describeArc(center, center, radius, start, start + angle);
                const arc = <Path key={`${slice.label}-${start}`} d={path} fill={slice.color} />;
                start += angle;
                return arc;
              })}
              <Circle cx={center} cy={center} r={35} fill={AppColors.ui.background} />
            </G>
          </Svg>

          <View style={styles.legendWrap}>
            {slices.slice(0, 6).map((slice) => (
              <View key={slice.label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={styles.legendText}>
                  {slice.label} ({Math.round((slice.value / total) * 100)}%)
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const HorizontalBars = ({ title, bars, formatter }: { title: string; bars: BarItem[]; formatter?: (value: number) => string }) => {
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <View style={styles.chartCardWide}>
      <Text style={styles.chartTitle}>{title}</Text>
      {bars.length === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        bars.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {bar.label}
              </Text>
              <Text style={styles.barValue}>{formatter ? formatter(bar.value) : formatNumber(bar.value)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${max ? Math.max((bar.value / max) * 100, 4) : 0}%` }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const RadarChart = ({ title, axes, series }: { title: string; axes: string[]; series: RadarSeries[] }) => {
  const size = 260;
  const center = size / 2;
  const levels = 4;
  const radius = 90;

  return (
    <View style={styles.chartCardWide}>
      <Text style={styles.chartTitle}>{title}</Text>
      {series.length === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        <>
          <Svg width={size} height={size}>
            <G>
              {Array.from({ length: levels }).map((_, idx) => {
                const levelRatio = (idx + 1) / levels;
                const points = axes
                  .map((_, axisIdx) => {
                    const angle = (Math.PI * 2 * axisIdx) / axes.length - Math.PI / 2;
                    const x = center + Math.cos(angle) * radius * levelRatio;
                    const y = center + Math.sin(angle) * radius * levelRatio;
                    return `${x},${y}`;
                  })
                  .join(" ");

                return <Polygon key={`grid-${idx}`} points={points} fill="none" stroke={AppColors.gray.lighter} strokeWidth={1} />;
              })}

              {axes.map((axis, axisIdx) => {
                const angle = (Math.PI * 2 * axisIdx) / axes.length - Math.PI / 2;
                const x = center + Math.cos(angle) * radius;
                const y = center + Math.sin(angle) * radius;

                return (
                  <G key={axis}>
                    <Line x1={center} y1={center} x2={x} y2={y} stroke={AppColors.gray.lighter} strokeWidth={1} />
                    <Text
                      style={styles.radarAxisLabel}
                    >
                      {""}
                    </Text>
                  </G>
                );
              })}

              {series.map((item, seriesIdx) => {
                const points = axes
                  .map((_, axisIdx) => {
                    const valueRatio = Math.max(0, Math.min(item.values[axisIdx] || 0, 1));
                    const angle = (Math.PI * 2 * axisIdx) / axes.length - Math.PI / 2;
                    const x = center + Math.cos(angle) * radius * valueRatio;
                    const y = center + Math.sin(angle) * radius * valueRatio;
                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <Polygon
                    key={`${item.label}-${seriesIdx}`}
                    points={points}
                    fill={`${item.color}33`}
                    stroke={item.color}
                    strokeWidth={2}
                  />
                );
              })}
            </G>
          </Svg>

          <View style={styles.legendWrap}>
            {axes.map((axis) => (
              <Text key={axis} style={styles.legendText}>• {axis}</Text>
            ))}
          </View>
          <View style={styles.legendWrap}>
            {series.map((item) => (
              <View key={item.label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

const DataTable = ({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) => (
  <View style={styles.chartCardWide}>
    <Text style={styles.chartTitle}>{title}</Text>
    {rows.length === 0 ? (
      <Text style={styles.emptyText}>Aucune donnee</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.tableWrap}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            {headers.map((header) => (
              <Text key={header} style={[styles.tableCell, styles.tableHeaderCell]}>
                {header}
              </Text>
            ))}
          </View>
          {rows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={styles.tableRow}>
              {row.map((cell, colIdx) => (
                <Text key={`${rowIdx}-${colIdx}`} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    )}
  </View>
);

const HeatmapTable = ({ title, services, rows }: { title: string; services: string[]; rows: { label: string; values: number[] }[] }) => (
  <View style={styles.chartCardWide}>
    <Text style={styles.chartTitle}>{title}</Text>
    {rows.length === 0 || services.length === 0 ? (
      <Text style={styles.emptyText}>Aucune donnee</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.heatmapWrap}>
          <View style={styles.heatmapHeaderRow}>
            <Text style={[styles.heatmapHeaderText, styles.heatmapProjectCol]}>Projet</Text>
            {services.map((service) => (
              <Text key={service} style={styles.heatmapHeaderText} numberOfLines={1}>
                {service}
              </Text>
            ))}
          </View>

          {rows.map((row) => (
            <View key={row.label} style={styles.heatmapDataRow}>
              <Text style={[styles.heatmapProjectText, styles.heatmapProjectCol]} numberOfLines={1}>
                {row.label}
              </Text>
              {row.values.map((value, idx) => {
                const intensity = Math.min(1, Math.max(0, value));
                return (
                  <View
                    key={`${row.label}-${idx}`}
                    style={[
                      styles.heatmapCell,
                      {
                        backgroundColor: `rgba(49,132,155,${0.12 + intensity * 0.72})`,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    )}
  </View>
);

const QuestionBox = ({ items }: { items: string[] }) => (
  <View style={styles.questionCard}>
    <Text style={styles.questionTitle}>Questions metier</Text>
    {items.map((item) => (
      <Text key={item} style={styles.questionItem}>• {item}</Text>
    ))}
  </View>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <View style={styles.sectionWrap}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    {children}
  </View>
);

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<"retail" | "bureau" | "sante" | "hotel">("retail");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [retailRows, setRetailRows] = useState<RetailRow[]>([]);
  const [extendedRows, setExtendedRows] = useState<ExtendedDetailsRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectsResponse, retailResponse, detailsResponse] = await Promise.all([
        supabase.from("projects").select("id, name, city, quartier, project_type, status"),
        supabase.from("projects_retail").select("project_id, gla"),
        supabase.from("projects_extended_details").select("project_id, project_type, details"),
      ]);

      if (projectsResponse.error) throw projectsResponse.error;
      if (retailResponse.error) throw retailResponse.error;
      if (detailsResponse.error) throw detailsResponse.error;

      setProjects((projectsResponse.data as ProjectRow[]) || []);
      setRetailRows((retailResponse.data as RetailRow[]) || []);
      setExtendedRows((detailsResponse.data as ExtendedDetailsRow[]) || []);
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement des dashboards");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const stats = useMemo(() => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const detailsByProjectId = new Map(extendedRows.map((row) => [row.project_id, row.details || {}]));
    const retailByProjectId = new Map(retailRows.map((row) => [row.project_id, row]));

    const retailProjects = projects.filter((project) => matchProjectType(project.project_type, "retail"));
    const officeProjects = projects.filter((project) => matchProjectType(project.project_type, "bureau"));
    const healthProjects = projects.filter((project) => matchProjectType(project.project_type, "sante"));
    const hotelProjects = projects.filter((project) => matchProjectType(project.project_type, "hotel"));

    const retailCategoryCounts: Record<string, number> = {
      Shopping: 0,
      "F&B": 0,
      Services: 0,
      Loisirs: 0,
    };
    const retailGlaByCity: Record<string, number> = {};
    const retailOccupancyByAsset: BarItem[] = [];
    const retailParkingRows: string[][] = [];
    let retailTotalGla = 0;
    let retailOccupancySum = 0;
    let retailOccupancyCount = 0;

    retailProjects.forEach((project) => {
      const city = (project.city || "Non specifiee").trim() || "Non specifiee";
      const details = detailsByProjectId.get(project.id)?.retail || {};
      const retail = retailByProjectId.get(project.id);
      const gla = parseNumeric(retail?.gla);

      const shoppingCount = parseNumeric(details.shoppingCount);
      const foodCount = parseNumeric(details.foodCount);
      const servicesCount = parseNumeric(details.servicesCount);
      const leisureCount = parseNumeric(details.leisureCount);
      const occupancyRate = parsePercent(details.occupancyRate);
      const parkingPlaces = parseNumeric(details.parkingPlaces);

      retailCategoryCounts.Shopping += shoppingCount;
      retailCategoryCounts["F&B"] += foodCount;
      retailCategoryCounts.Services += servicesCount;
      retailCategoryCounts.Loisirs += leisureCount;

      retailTotalGla += gla;
      retailGlaByCity[city] = (retailGlaByCity[city] || 0) + gla;

      if (occupancyRate > 0) {
        retailOccupancySum += occupancyRate;
        retailOccupancyCount += 1;
        retailOccupancyByAsset.push({ label: project.name || "Actif", value: occupancyRate });
      }

      if (gla > 0 && parkingPlaces > 0) {
        const ratio = parkingPlaces / gla;
        retailParkingRows.push([
          project.name || "-",
          formatSquareMeters(gla),
          formatNumber(parkingPlaces),
          ratio.toFixed(3),
        ]);
      }
    });

    const officeSpaceCounts: Record<string, number> = {};
    const officePricingByCityBucket: Record<string, { sum: number; count: number }> = {};
    const officeServicesCount: Record<string, number> = {};
    const officeHeatmapRows: { label: string; values: number[] }[] = [];

    officeProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.office || {};
      const spaces = Array.isArray(details.spaces) ? details.spaces : [];
      const serviceList = splitList(details.services);
      const city = (project.city || "Non specifiee").trim() || "Non specifiee";

      spaces.forEach((space: any) => {
        const label = (space?.space || "Non precise").trim() || "Non precise";
        officeSpaceCounts[label] = (officeSpaceCounts[label] || 0) + 1;

        const min = parseNumeric(space?.pricingMin);
        const max = parseNumeric(space?.pricingMax);
        const avg = max > 0 ? (min + max) / 2 : min;
        if (avg > 0) {
          const current = officePricingByCityBucket[city] || { sum: 0, count: 0 };
          current.sum += avg;
          current.count += 1;
          officePricingByCityBucket[city] = current;
        }
      });

      serviceList.forEach((service) => {
        officeServicesCount[service] = (officeServicesCount[service] || 0) + 1;
      });
    });

    const topOfficeServices = Object.entries(officeServicesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([service]) => service);

    officeProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.office || {};
      const serviceList = splitList(details.services);
      const rowValues = topOfficeServices.map((service) => (serviceList.includes(service) ? 1 : 0));
      officeHeatmapRows.push({ label: project.name || "Projet", values: rowValues });
    });

    const healthSpecialtiesCount: Record<string, number> = {};
    const healthBedsByAsset: BarItem[] = [];
    const healthDoctorsByAsset: BarItem[] = [];
    let healthBedsTotal = 0;
    let healthDoctorsTotal = 0;
    const healthRadarRaw: Array<{ label: string; beds: number; doctors: number; blocks: number; specialties: number; equipments: number }> = [];

    healthProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.health || {};
      const beds = parseNumeric(details.beds);
      const doctors = parseNumeric(details.doctors);
      const blocks = parseNumeric(details.operatingBlocks);
      const specialties = splitList(details.specialties);
      const equipmentsCount = splitList(details.equipments).length;

      healthBedsTotal += beds;
      healthDoctorsTotal += doctors;

      healthBedsByAsset.push({ label: project.name || "Etablissement", value: beds });
      healthDoctorsByAsset.push({ label: project.name || "Etablissement", value: doctors });

      specialties.forEach((specialty) => {
        healthSpecialtiesCount[specialty] = (healthSpecialtiesCount[specialty] || 0) + 1;
      });

      healthRadarRaw.push({
        label: project.name || "Clinique",
        beds,
        doctors,
        blocks,
        specialties: specialties.length,
        equipments: equipmentsCount,
      });
    });

    const maxBeds = Math.max(...healthRadarRaw.map((item) => item.beds), 1);
    const maxDoctors = Math.max(...healthRadarRaw.map((item) => item.doctors), 1);
    const maxBlocks = Math.max(...healthRadarRaw.map((item) => item.blocks), 1);
    const maxSpecialties = Math.max(...healthRadarRaw.map((item) => item.specialties), 1);
    const maxEquipments = Math.max(...healthRadarRaw.map((item) => item.equipments), 1);

    const healthRadarSeries: RadarSeries[] = healthRadarRaw.slice(0, 4).map((item, index) => ({
      label: item.label,
      values: [
        item.beds / maxBeds,
        item.doctors / maxDoctors,
        item.blocks / maxBlocks,
        item.specialties / maxSpecialties,
        item.equipments / maxEquipments,
      ],
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const hotelCategoryCount: Record<string, number> = {};
    const hotelKeysByCity: Record<string, number> = {};
    const hotelEquipmentRows: string[][] = [];
    let hotelTotalKeys = 0;
    let hotelTotalRooms = 0;
    let hotelFnBTotal = 0;
    let hotelMiceTotal = 0;
    let hotelLeisureTotal = 0;

    hotelProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.hotel || {};
      const category = (details.category || "Non specifiee").trim() || "Non specifiee";
      const city = (project.city || "Non specifiee").trim() || "Non specifiee";
      const keys = parseNumeric(details.keys);
      const rooms = Array.isArray(details.rooms) ? details.rooms : [];
      const fnb = Array.isArray(details.fnb) ? details.fnb : [];
      const mice = Array.isArray(details.mice) ? details.mice : [];
      const leisure = Array.isArray(details.leisure) ? details.leisure : [];

      const roomCount = rooms.reduce((sum: number, room: any) => sum + parseNumeric(room?.count), 0);

      hotelCategoryCount[category] = (hotelCategoryCount[category] || 0) + 1;
      hotelKeysByCity[city] = (hotelKeysByCity[city] || 0) + keys;

      hotelTotalKeys += keys;
      hotelTotalRooms += roomCount;
      hotelFnBTotal += fnb.length;
      hotelMiceTotal += mice.length;
      hotelLeisureTotal += leisure.length;

      hotelEquipmentRows.push([
        project.name || "-",
        category,
        `${fnb.length}`,
        `${mice.length}`,
        `${leisure.length}`,
      ]);
    });

    const occupancyAvg = retailOccupancyCount ? retailOccupancySum / retailOccupancyCount : 0;
    const officePricingValues = Object.values(officePricingByCityBucket)
      .map((item) => (item.count ? item.sum / item.count : 0))
      .filter((value) => value > 0);
    const officePricingMin = officePricingValues.length ? Math.min(...officePricingValues) : 0;
    const officePricingMax = officePricingValues.length ? Math.max(...officePricingValues) : 0;
    const topOfficeServicesKpi = Object.entries(officeServicesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service]) => service)
      .join(", ");

    return {
      retail: {
        projectCount: retailProjects.length,
        totalGla: retailTotalGla,
        occupancyAvg,
        enseignesTotal:
          retailCategoryCounts.Shopping +
          retailCategoryCounts["F&B"] +
          retailCategoryCounts.Services +
          retailCategoryCounts.Loisirs,
        categorySlices: buildSlicesFromRecord(retailCategoryCounts),
        glaByCityBars: buildTopBars(retailGlaByCity),
        occupancyByAssetBars: retailOccupancyByAsset.sort((a, b) => b.value - a.value).slice(0, 10),
        parkingRows: retailParkingRows.slice(0, 12),
      },
      office: {
        projectCount: officeProjects.length,
        spaceMixCount: Object.values(officeSpaceCounts).reduce((sum, count) => sum + count, 0),
        pricingRange: formatRange(officePricingMin, officePricingMax, "MAD"),
        topServicesKpi: topOfficeServicesKpi || "-",
        spaceMixSlices: buildSlicesFromRecord(officeSpaceCounts),
        pricingByCityBars: buildTopBars(
          Object.entries(officePricingByCityBucket).reduce<Record<string, number>>((acc, [city, bucket]) => {
            acc[city] = bucket.count ? bucket.sum / bucket.count : 0;
            return acc;
          }, {})
        ),
        heatmapServices: topOfficeServices,
        heatmapRows: officeHeatmapRows.slice(0, 10),
      },
      health: {
        projectCount: healthProjects.length,
        totalBeds: healthBedsTotal,
        totalDoctors: healthDoctorsTotal,
        specialtyCount: Object.keys(healthSpecialtiesCount).length,
        specialtiesSlices: buildSlicesFromRecord(healthSpecialtiesCount),
        bedsBars: healthBedsByAsset.sort((a, b) => b.value - a.value).slice(0, 10),
        doctorsBars: healthDoctorsByAsset.sort((a, b) => b.value - a.value).slice(0, 10),
        radarAxes: ["Lits", "Medecins", "Blocs", "Specialites", "Equipements"],
        radarSeries: healthRadarSeries,
      },
      hotel: {
        projectCount: hotelProjects.length,
        totalKeys: hotelTotalKeys,
        totalRooms: hotelTotalRooms,
        mixKpi: `F&B ${hotelFnBTotal} | MICE ${hotelMiceTotal} | Loisirs ${hotelLeisureTotal}`,
        categorySlices: buildSlicesFromRecord(hotelCategoryCount),
        keysByCityBars: buildTopBars(hotelKeysByCity),
        equipmentRows: hotelEquipmentRows.slice(0, 12),
      },
    };
  }, [projects, retailRows, extendedRows]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Dashboards par type</Text>
      <Text style={styles.pageSubtitle}>Retail, Bureau, Sante et Hotel avec indicateurs metier dedies</Text>

      <View style={styles.segmentRow}>
        <TouchablePill
          label="Retail"
          active={activeDashboard === "retail"}
          onPress={() => setActiveDashboard("retail")}
        />
        <TouchablePill
          label="Bureau"
          active={activeDashboard === "bureau"}
          onPress={() => setActiveDashboard("bureau")}
        />
        <TouchablePill
          label="Sante"
          active={activeDashboard === "sante"}
          onPress={() => setActiveDashboard("sante")}
        />
        <TouchablePill
          label="Hotel"
          active={activeDashboard === "hotel"}
          onPress={() => setActiveDashboard("hotel")}
        />
      </View>

      {loading ? <Text style={styles.stateText}>Chargement des dashboards...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && !error && (
        <>
          {activeDashboard === "retail" && (
          <Section title="Dashboard Retail" subtitle="GLA, occupation, tenant-mix et ratio parking/GLA">
            <View style={styles.kpiGrid}>
              <KpiCard label="Actifs retail" value={formatNumber(stats.retail.projectCount)} />
              <KpiCard label="GLA totale" value={formatSquareMeters(stats.retail.totalGla)} />
              <KpiCard label="Occupation moyenne" value={formatPercent(stats.retail.occupancyAvg)} />
              <KpiCard label="Enseignes totales" value={formatNumber(stats.retail.enseignesTotal)} />
            </View>
            <View style={styles.dualChartRow}>
              <PieChart title="Camembert mix enseignes" slices={stats.retail.categorySlices} />
              <HorizontalBars title="GLA par ville" bars={stats.retail.glaByCityBars} formatter={formatSquareMeters} />
            </View>
            <HorizontalBars
              title="Taux d'occupation par actif"
              bars={stats.retail.occupancyByAssetBars}
              formatter={(value) => `${value.toFixed(1)}%`}
            />
            <DataTable
              title="Tableau ratio parking / GLA"
              headers={["Actif", "GLA", "Places parking", "Ratio"]}
              rows={stats.retail.parkingRows}
            />
            <QuestionBox
              items={[
                "Quel mix attire le plus?",
                "Quels actifs sont sous-occupes?",
                "Ou optimiser le tenant-mix?",
              ]}
            />
          </Section>
          )}

          {activeDashboard === "bureau" && (
          <Section title="Dashboard Bureau" subtitle="Mix des espaces, pricing locatif et services">
            <View style={styles.kpiGrid}>
              <KpiCard label="Actifs bureau" value={formatNumber(stats.office.projectCount)} />
              <KpiCard label="Mix espaces (occurrences)" value={formatNumber(stats.office.spaceMixCount)} />
              <KpiCard label="Fourchette prix locatifs" value={stats.office.pricingRange} />
              <KpiCard label="Services dominants" value={stats.office.topServicesKpi} />
            </View>
            <View style={styles.dualChartRow}>
              <PieChart title="Camembert types d'espaces" slices={stats.office.spaceMixSlices} />
              <HorizontalBars
                title="Barres pricing par zone (ville)"
                bars={stats.office.pricingByCityBars}
                formatter={(value) => `${formatNumber(value)} MAD`}
              />
            </View>
            <HeatmapTable
              title="Heatmap services par projet"
              services={stats.office.heatmapServices}
              rows={stats.office.heatmapRows}
            />
            <QuestionBox
              items={[
                "Quel modele bureau est le plus competitif?",
                "Comment se positionner en prix selon secteur?",
              ]}
            />
          </Section>
          )}

          {activeDashboard === "sante" && (
          <Section title="Dashboard Sante" subtitle="Capacite medicale, specialites, lits et medecins">
            <View style={styles.kpiGrid}>
              <KpiCard label="Etablissements" value={formatNumber(stats.health.projectCount)} />
              <KpiCard label="Nombre de lits" value={formatNumber(stats.health.totalBeds)} />
              <KpiCard label="Nombre de medecins" value={formatNumber(stats.health.totalDoctors)} />
              <KpiCard label="Specialites distinctes" value={formatNumber(stats.health.specialtyCount)} />
            </View>
            <View style={styles.dualChartRow}>
              <PieChart title="Camembert specialites" slices={stats.health.specialtiesSlices} />
              <HorizontalBars title="Lits par etablissement" bars={stats.health.bedsBars} />
            </View>
            <HorizontalBars title="Medecins par etablissement" bars={stats.health.doctorsBars} />
            <RadarChart title="Radar capacite medicale par clinique" axes={stats.health.radarAxes} series={stats.health.radarSeries} />
            <QuestionBox
              items={[
                "Quelle capacite sante par zone?",
                "Quelles specialites manquent localement?",
              ]}
            />
          </Section>
          )}

          {activeDashboard === "hotel" && (
          <Section title="Dashboard Hotel" subtitle="Cles/chambres, categories et mix F&B-MICE-loisirs">
            <View style={styles.kpiGrid}>
              <KpiCard label="Actifs hotel" value={formatNumber(stats.hotel.projectCount)} />
              <KpiCard label="Nombre de cles" value={formatNumber(stats.hotel.totalKeys)} />
              <KpiCard label="Nombre de chambres" value={formatNumber(stats.hotel.totalRooms)} />
              <KpiCard label="Mix services" value={stats.hotel.mixKpi} />
            </View>
            <View style={styles.dualChartRow}>
              <PieChart title="Camembert categories" slices={stats.hotel.categorySlices} />
              <HorizontalBars title="Cles par ville" bars={stats.hotel.keysByCityBars} />
            </View>
            <DataTable
              title="Tableau equipements par hotel"
              headers={["Hotel", "Categorie", "F&B", "MICE", "Loisirs"]}
              rows={stats.hotel.equipmentRows}
            />
            <QuestionBox
              items={[
                "Quelle profondeur d'offre hoteliere par ville?",
                "Quel segment est sature ou sous-represente?",
              ]}
            />
          </Section>
          )}
        </>
      )}
    </ScrollView>
  );
}

const TouchablePill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Text
    onPress={onPress}
    style={[
      styles.segmentPill,
      active ? styles.segmentPillActive : styles.segmentPillInactive,
    ]}
  >
    {label}
  </Text>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.gray.lightest,
  },
  content: {
    padding: 16,
    paddingBottom: 42,
    gap: 14,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },
  pageSubtitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 16,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
    lineHeight: 22,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  segmentPill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Century Gothic",
    fontWeight: "700",
    overflow: "hidden",
  },
  segmentPillActive: {
    color: AppColors.ui.background,
    backgroundColor: AppColors.primary.main,
    borderColor: AppColors.primary.main,
  },
  segmentPillInactive: {
    color: AppColors.primary.main,
    backgroundColor: AppColors.ui.background,
    borderColor: AppColors.primary.light,
  },
  stateText: {
    color: AppColors.primary.main,
    fontSize: 17,
    fontFamily: "Century Gothic",
  },
  errorText: {
    color: AppColors.accent,
    fontSize: 16,
    fontFamily: "Century Gothic",
  },
  sectionWrap: {
    backgroundColor: AppColors.ui.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },
  sectionSubtitle: {
    fontSize: 15,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
    lineHeight: 22,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "100%",
    backgroundColor: AppColors.gray.lightest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  kpiLabel: {
    fontSize: 13,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },
  dualChartRow: {
    gap: 10,
  },
  chartCard: {
    backgroundColor: AppColors.ui.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    padding: 12,
    alignItems: "center",
  },
  chartCardWide: {
    backgroundColor: AppColors.ui.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    padding: 12,
    marginTop: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: AppColors.gray.dark,
    fontFamily: "Century Gothic",
  },
  legendWrap: {
    width: "100%",
    marginTop: 6,
    gap: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
  },
  radarAxisLabel: {
    display: "none",
  },
  barRow: {
    marginBottom: 10,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  barLabel: {
    flex: 1,
    fontSize: 14,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
  },
  barValue: {
    fontSize: 14,
    color: AppColors.primary.main,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  barTrack: {
    width: "100%",
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: AppColors.gray.lighter,
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: AppColors.primary.main,
  },
  tableWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.gray.lighter,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray.lighter,
    backgroundColor: AppColors.ui.background,
  },
  tableHeaderRow: {
    backgroundColor: AppColors.gray.lightest,
  },
  tableCell: {
    minWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
  },
  tableHeaderCell: {
    color: AppColors.primary.main,
    fontWeight: "700",
  },
  heatmapWrap: {
    gap: 6,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heatmapDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heatmapProjectCol: {
    minWidth: 170,
  },
  heatmapHeaderText: {
    minWidth: 92,
    fontSize: 12,
    color: AppColors.primary.main,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  heatmapProjectText: {
    minWidth: 170,
    fontSize: 13,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
  },
  heatmapCell: {
    minWidth: 92,
    height: 20,
    borderRadius: 4,
  },
  questionCard: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary.light,
    backgroundColor: `${AppColors.primary.light}22`,
    padding: 10,
    gap: 4,
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary.main,
    fontFamily: "Century Gothic",
  },
  questionItem: {
    fontSize: 14,
    color: AppColors.ui.text,
    fontFamily: "Century Gothic",
    lineHeight: 22,
  },
});
