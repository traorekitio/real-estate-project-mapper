import React, { useCallback, useMemo, useState } from "react";
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import { AppColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

const DASHBOARD_HERO_IMAGE = require("../../assets/images/home/hero-city.jpeg");
const DASHBOARD_MAP_IMAGE = require("../../assets/images/home/hero-map.png");

type ProjectRow = {
  id: string;
  name: string | null;
  country: string | null;
  city: string | null;
  quartier: string | null;
  developer: string | null;
  standing_cible: string | null;
  total_units: number | null;
  delivery_date: string | null;
  project_type: string | null;
  status: string | null;
};

type RetailRow = {
  project_id: string;
  gla: number | null;
  opening_date: string | null;
  positionnement: string | null;
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

type StackedIntervalBin = {
  label: string;
  total: number;
  segments: SliceItem[];
};

const CHART_COLORS = ["#2486A2", "#F2187A", "#1CB466", "#6B58D7", "#F4B740", "#31B7D5", "#193F63", "#A1AAB3"];

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

const normalizeText = (value: string | null | undefined) => (value || "").toLowerCase();

const isPipelineStatus = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  return ["pipeline", "future", "futur", "planned", "planifie", "en projet", "coming", "annonce", "annonc"].some((token) => normalized.includes(token));
};

const parseYearFromDate = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const match = value.match(/(19|20)\d{2}/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const formatNumber = (value: number) =>
  value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatCompactPercent = (value: number) => `${Math.round(value)}%`;
const formatSquareMeters = (value: number) => `${formatNumber(value)} m²`;
const formatDecimal = (value: number, digits = 1) =>
  value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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

const normalizeHotelTypology = (category: unknown, standing: unknown) => {
  const normalized = normalizeText(typeof category === "string" && category.trim() ? category : typeof standing === "string" ? standing : "");
  if (!normalized) return "Non specifie";
  if (normalized.includes("luxe")) return "Luxe";
  if (normalized.includes("mh") && normalized.includes("cat") && normalized.includes("1")) return "MH Cat 1";
  if (normalized.includes("5") && (normalized.includes("*") || normalized.includes("etoile") || normalized.includes("star"))) return "5*";
  if (normalized.includes("4") && (normalized.includes("*") || normalized.includes("etoile") || normalized.includes("star"))) return "4*";
  if (normalized.includes("3") && (normalized.includes("*") || normalized.includes("etoile") || normalized.includes("star"))) return "3*";
  return typeof category === "string" && category.trim() ? category.trim() : typeof standing === "string" && standing.trim() ? standing.trim() : "Non specifie";
};

const findHotelRoomByTokens = (rooms: any[], tokens: string[]) =>
  rooms.find((room) => {
    const type = normalizeText(room?.type);
    return tokens.some((token) => type.includes(token));
  });

const normalizeRoomTypeLabel = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Non specifie";
  const normalized = normalizeText(raw);
  if (normalized.includes("standard")) return "Chambre standard";
  if (normalized.includes("superieure") || normalized.includes("superieur") || normalized.includes("superior")) return "Chambre superieure";
  if (normalized.includes("executive")) return "Chambre executive";
  if (normalized.includes("deluxe")) return "Chambre deluxe";
  if (normalized.includes("junior") && normalized.includes("suite")) return "Junior suite";
  if (normalized.includes("suite")) return "Suite";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatHotelTypologyLabel = (value: string) => {
  const normalized = normalizeText(value);
  if (normalized === "5*") return "5 etoiles";
  if (normalized === "4*") return "4 etoiles";
  if (normalized === "3*") return "3 etoiles";
  return value;
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

const PieChart = ({ title, slices, containerStyle }: { title: string; slices: SliceItem[]; containerStyle?: any }) => {
  const size = 200;
  const radius = 74;
  const center = size / 2;
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  let start = 0;

  return (
    <View style={[styles.chartCard, containerStyle]}>
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
              <Circle cx={center} cy={center} r={40} fill={AppColors.ui.background} />
            </G>
          </Svg>
          <View style={styles.legendWrap}>
            {slices.slice(0, 4).map((slice) => (
              <View key={slice.label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={styles.legendText}>{slice.label}</Text>
                <Text style={styles.legendValue}>{Math.round((slice.value / total) * 100)}%</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartFooter}>Total: {formatSquareMeters(total)}</Text>
        </>
      )}
    </View>
  );
};

const HorizontalBars = ({ title, bars, formatter, containerStyle }: { title: string; bars: BarItem[]; formatter?: (value: number) => string; containerStyle?: any }) => {
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <View style={[styles.chartCardWide, containerStyle]}>
      <Text style={styles.chartTitle}>{title}</Text>
      {bars.length === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        bars.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel} numberOfLines={1}>{bar.label}</Text>
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

const CompareBars = ({ title, leftLabel, leftValue, rightLabel, rightValue, containerStyle }: { title: string; leftLabel: string; leftValue: number; rightLabel: string; rightValue: number; containerStyle?: any }) => {
  const max = Math.max(leftValue, rightValue, 1);
  const leftHeight = Math.max((leftValue / max) * 100, leftValue > 0 ? 8 : 0);
  const rightHeight = Math.max((rightValue / max) * 100, rightValue > 0 ? 8 : 0);

  return (
    <View style={[styles.chartCard, containerStyle]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.compareWrap}>
        <View style={styles.compareCol}>
          <Text style={styles.compareValue}>{formatNumber(leftValue)}</Text>
          <View style={styles.compareTrack}><View style={[styles.compareBar, { height: `${leftHeight}%`, backgroundColor: "#7DBBD0" }]} /></View>
          <Text style={styles.compareLabel}>{leftLabel}</Text>
        </View>
        <View style={styles.compareCol}>
          <Text style={styles.compareValue}>{formatNumber(rightValue)}</Text>
          <View style={styles.compareTrack}><View style={[styles.compareBar, { height: `${rightHeight}%`, backgroundColor: AppColors.primary.main }]} /></View>
          <Text style={styles.compareLabel}>{rightLabel}</Text>
        </View>
      </View>
    </View>
  );
};

const StackedIntervalBars = ({ title, bins, legend }: { title: string; bins: StackedIntervalBin[]; legend: string[] }) => {
  const max = Math.max(...bins.map((bin) => bin.total), 1);

  return (
    <View style={styles.chartCardWide}>
      <Text style={styles.chartTitle}>{title}</Text>
      {bins.every((bin) => bin.total === 0) ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        <>
          <View style={styles.stackedChartWrap}>
            {bins.map((bin) => (
              <View key={bin.label} style={styles.stackedCol}>
                <Text style={styles.stackedTotal}>{bin.total > 0 ? formatNumber(bin.total) : ""}</Text>
                <View style={styles.stackedTrack}>
                  {bin.segments.map((segment) => (
                    <View
                      key={`${bin.label}-${segment.label}`}
                      style={[
                        styles.stackedSegment,
                        {
                          height: `${Math.max((segment.value / max) * 100, segment.value > 0 ? 8 : 0)}%`,
                          backgroundColor: segment.color,
                        },
                      ]}
                    >
                      {segment.value > 0 ? <Text style={styles.stackedSegmentText}>{formatNumber(segment.value)}</Text> : null}
                    </View>
                  ))}
                </View>
                <Text style={styles.stackedLabel}>{bin.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.stackedLegendWrap}>
            {legend.map((item, idx) => (
              <View key={item} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }]} />
                <Text style={styles.legendText}>{item}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const StandardPriceCategoryChart = ({ title, city, bars, containerStyle }: { title: string; city: string; bars: BarItem[]; containerStyle?: any }) => {
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const barWidth = 72;
  const barGap = 22;
  const graphHeight = 250;
  const maxBarHeight = 155;
  const topPadding = 68;
  const baselineY = graphHeight - 20;
  const graphWidth = bars.length * barWidth + Math.max(0, bars.length - 1) * barGap;
  const barHeights = bars.map((bar) => Math.max((bar.value / max) * maxBarHeight, 8));
  const barCenters = bars.map((_, idx) => idx * (barWidth + barGap) + barWidth / 2);
  const barTops = barHeights.map((height) => baselineY - height);
  const connectorColors = ["#31849B", "#8CC7D3", "#1EB9D5", "#2AB36B", "#F2187A"];

  const comparisonArrows = bars.slice(0, -1).map((bar, idx) => {
    const nextBar = bars[idx + 1];
    const source = bar.value;
    const target = nextBar.value;
    const deltaPct = source > 0 ? ((target - source) / source) * 100 : 0;
    const sourceTopY = barTops[idx];
    const targetTopY = barTops[idx + 1];
    const levelY = topPadding + idx * 18;
    return {
      key: `${bar.label}-${nextBar.label}`,
      color: connectorColors[idx % connectorColors.length],
      fromX: barCenters[idx] + 4,
      toX: barCenters[idx + 1],
      fromY: sourceTopY,
      toY: targetTopY,
      levelY,
      label: `${deltaPct > 0 ? "+" : ""}${Math.round(deltaPct)}%`,
    };
  });

  return (
    <View style={[styles.chartCardWide, containerStyle]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtle}>Base: prix des chambres standard uniquement {city && city !== "-" ? `(${city})` : ""}</Text>
      {bars.length === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        <>
          <View style={styles.priceChartShell}>
            <View style={[styles.priceBarsWrap, { width: graphWidth }]}> 
              {bars.map((bar, index) => {
                const height = barHeights[index];
                return (
                  <View key={bar.label} style={[styles.priceBarCol, { width: barWidth }]}> 
                    <View style={[styles.priceBarTrack, { height: graphHeight - 36 }]}> 
                      <View style={[styles.priceBarFill, { height, backgroundColor: connectorColors[index % connectorColors.length] }]} />
                    </View>
                    <Text style={styles.priceBarLabel}>{formatHotelTypologyLabel(bar.label)}</Text>
                  </View>
                );
              })}
              <Svg width={graphWidth} height={graphHeight} style={styles.priceArrowOverlay}>
                {bars.map((bar, idx) => (
                  <SvgText
                    key={`value-${bar.label}`}
                    x={barCenters[idx]}
                    y={Math.max(18, barTops[idx] - 8)}
                    fontSize="12"
                    fontWeight="700"
                    fill="#294D68"
                    textAnchor="middle"
                  >
                    {formatNumber(Math.round(bar.value))}
                  </SvgText>
                ))}
                {comparisonArrows.map((item) => {
                  const labelWidth = 46;
                  const labelHeight = 18;
                  const labelX = Math.max(2, (item.fromX + item.toX) / 2 - labelWidth / 2);
                  const labelY = Math.max(4, item.levelY - labelHeight - 4);
                  return (
                    <G key={item.key}>
                      <Line x1={item.fromX} y1={item.fromY - 2} x2={item.fromX} y2={item.levelY} stroke={item.color} strokeWidth={1.2} />
                      <Line x1={item.fromX} y1={item.levelY} x2={item.toX} y2={item.levelY} stroke={item.color} strokeWidth={1.2} />
                      <Polygon points={`${item.toX},${item.levelY} ${item.toX - 6},${item.levelY - 4} ${item.toX - 6},${item.levelY + 4}`} fill={item.color} />
                      <Line x1={item.toX} y1={item.levelY} x2={item.toX} y2={item.toY - 4} stroke={item.color} strokeWidth={1.2} />
                      <Polygon points={`${item.toX},${item.toY - 2} ${item.toX - 4},${item.toY - 8} ${item.toX + 4},${item.toY - 8}`} fill={item.color} />
                      <Rect x={labelX} y={labelY} width={labelWidth} height={labelHeight} rx={4} ry={4} fill="#BDE5EF" stroke={item.color} strokeWidth={0.8} />
                      <SvgText x={labelX + labelWidth / 2} y={labelY + 12.5} fontSize="11" fontWeight="700" fill="#1F5F76" textAnchor="middle">
                        {item.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>
          </View>
        </>
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
                return <Line key={axis} x1={center} y1={center} x2={x} y2={y} stroke={AppColors.gray.lighter} strokeWidth={1} />;
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
                return <Polygon key={`${item.label}-${seriesIdx}`} points={points} fill={`${item.color}33`} stroke={item.color} strokeWidth={2} />;
              })}
            </G>
          </Svg>
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

const TopToolbar = () => (
  <View style={styles.topToolbar}>
    <View style={styles.brandWrap}>
      <View style={styles.brandBadge}><Text style={styles.brandBadgeText}>RE</Text></View>
      <Text style={styles.brandText}>Real Estate Mapper</Text>
    </View>
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>o</Text>
      <TextInput value="" editable={false} placeholder="Rechercher un projet, une localite..." placeholderTextColor="#7F95A8" style={styles.searchInput} />
    </View>
    <View style={styles.toolbarRight}>
      <View style={styles.toolCircle}><Text style={styles.toolCircleText}>C</Text></View>
      <View style={styles.toolCircle}><Text style={styles.toolCircleText}>N</Text></View>
      <View style={styles.userPill}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>A</Text></View>
        <View>
          <Text style={styles.userName}>Admin</Text>
          <Text style={styles.userRole}>Super Admin</Text>
        </View>
      </View>
    </View>
  </View>
);

const ToolbarButton = ({ label }: { label: string }) => (
  <TouchableOpacity activeOpacity={0.88} style={styles.toolbarButton}>
    <Text style={styles.toolbarButtonIcon}>[]</Text>
    <Text style={styles.toolbarButtonText}>{label}</Text>
  </TouchableOpacity>
);

const MetricCard = ({ label, value, sublabel, accent }: { label: string; value: string; sublabel: string; accent?: "pink" | "green" | "purple" }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricValueRow}>
      <View style={styles.metricTextCol}>
        <Text style={[styles.metricValue, accent === "pink" ? styles.metricValuePink : null, accent === "green" ? styles.metricValueGreen : null, accent === "purple" ? styles.metricValuePurple : null]}>{value}</Text>
        <Text style={styles.metricSubLabel}>{sublabel}</Text>
      </View>
      <View style={[styles.metricIconBubble, accent === "pink" ? styles.metricIconPink : null, accent === "green" ? styles.metricIconGreen : null, accent === "purple" ? styles.metricIconPurple : null]}><Text style={styles.metricIconText}>[]</Text></View>
    </View>
  </View>
);

const SnapshotStat = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <View style={styles.snapshotStat}>
    <Text style={styles.snapshotStatLabel}>{label}</Text>
    <Text style={styles.snapshotStatValue}>{value}</Text>
    <Text style={styles.snapshotStatHint}>{hint}</Text>
  </View>
);

const MiniMetric = ({ label, value, sublabel }: { label: string; value: string; sublabel: string }) => (
  <View style={styles.miniMetricCard}>
    <Text style={styles.miniMetricLabel}>{label}</Text>
    <Text style={styles.miniMetricValue}>{value}</Text>
    <Text style={styles.miniMetricSub}>{sublabel}</Text>
  </View>
);

const TableCard = ({ title, ctaLabel, children }: { title: string; ctaLabel?: string; children: React.ReactNode }) => (
  <View style={styles.tableCard}>
    <View style={styles.tableCardHeader}>
      <Text style={styles.tableCardTitle}>{title}</Text>
      {ctaLabel ? <Text style={styles.tableCardCta}>{ctaLabel}</Text> : null}
    </View>
    {children}
  </View>
);

const RingMetric = ({ label, value }: { label: string; value: number }) => {
  const radius = 42;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={styles.ringMetricItem}>
      <Svg width={104} height={104}>
        <Circle cx={52} cy={52} r={radius} stroke="#DCEAF3" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={52} cy={52} r={radius} stroke={AppColors.primary.main} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" rotation="-90" origin="52, 52" />
      </Svg>
      <View style={styles.ringMetricCenter}><Text style={styles.ringMetricValue}>{formatCompactPercent(clamped)}</Text></View>
      <Text style={styles.ringMetricLabel}>{label}</Text>
    </View>
  );
};

const PerformanceBanner = () => (
  <ImageBackground source={DASHBOARD_HERO_IMAGE} style={styles.performanceBanner} imageStyle={styles.performanceBannerImage}>
    <View style={styles.performanceOverlay}>
      <Text style={styles.performanceTitle}>Performance retail</Text>
      <Text style={styles.performanceText}>Suivez la performance de votre portefeuille</Text>
      <TouchableOpacity activeOpacity={0.88} style={styles.performanceButton}>
        <Text style={styles.performanceButtonText}>Voir le comparatif detaille</Text>
      </TouchableOpacity>
    </View>
  </ImageBackground>
);

const DataTable = ({ headers, rows, columnWidths, rightAlignedColumns }: { headers: string[]; rows: string[][]; columnWidths?: number[]; rightAlignedColumns?: number[] }) => (
  <View style={styles.tableInnerWrap}>
    {rows.length === 0 ? (
      <Text style={styles.emptyText}>Aucune donnee</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.tableWrap}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            {headers.map((header, headerIdx) => (
              <Text key={header} numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell, columnWidths && columnWidths[headerIdx] ? { width: columnWidths[headerIdx] } : null, rightAlignedColumns?.includes(headerIdx) ? styles.tableCellRight : null]}>{header}</Text>
            ))}
          </View>
          {rows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowAlt : null]}>
              {row.map((cell, colIdx) => (
                <Text key={`${rowIdx}-${colIdx}`} numberOfLines={1} ellipsizeMode="tail" style={[styles.tableCell, columnWidths && columnWidths[colIdx] ? { width: columnWidths[colIdx] } : null, rightAlignedColumns?.includes(colIdx) ? styles.tableCellRight : null]}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    )}
  </View>
);

const HotelBenchmarkTable = ({ roomTypes, rows }: { roomTypes: string[]; rows: string[][] }) => {
  const baseWidths = [300, 86, 86, 88, 118, 86];
  const groupedColWidth = 92;
  const allWidths = [...baseWidths, ...Array.from({ length: roomTypes.length * 3 }, () => groupedColWidth)];
  const isAverageRow = (row: string[]) => normalizeText(row[0]) === "moyenne";

  return (
    <View style={styles.tableInnerWrap}>
      {rows.length === 0 ? (
        <Text style={styles.emptyText}>Aucune donnee</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={[styles.tableRow, styles.hotelBenchmarkMainHeaderRow]}>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[0] }]}>Etablissements</Text>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[1] }]}>Pays</Text>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[2] }]}>Ville</Text>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[3] }]}>Standing</Text>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[4] }]}>Note booking</Text>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, { width: baseWidths[5] }]}>Capacite</Text>
              {roomTypes.map((roomType, roomTypeIdx) => (
                <Text
                  key={`head-${roomType}`}
                  style={[
                    styles.tableCell,
                    styles.hotelBenchmarkCellBase,
                    styles.hotelBenchmarkGroupHeaderCell,
                    roomTypeIdx === 0 ? styles.hotelBenchmarkGroupStartEdge : null,
                    styles.hotelBenchmarkGroupEndEdge,
                    { width: groupedColWidth * 3 },
                  ]}
                >
                  {roomType}
                </Text>
              ))}
            </View>

            <View style={[styles.tableRow, styles.hotelBenchmarkSubHeaderRow]}>
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[0] }]} />
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[1] }]} />
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[2] }]} />
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[3] }]} />
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[4] }]} />
              <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkMainHeaderCell, styles.hotelBenchmarkEmptyHeadCell, { width: baseWidths[5] }]} />
              {roomTypes.map((roomType, roomTypeIdx) => (
                <React.Fragment key={`sub-${roomType}`}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.hotelBenchmarkCellBase,
                      styles.hotelBenchmarkSubHeaderCell,
                      roomTypeIdx === 0 ? styles.hotelBenchmarkGroupStartEdge : null,
                      styles.hotelBenchmarkSubHeaderCellStart,
                      { width: groupedColWidth },
                    ]}
                  >
                    Surface
                  </Text>
                  <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkSubHeaderCell, { width: groupedColWidth }]}>Nombre</Text>
                  <Text style={[styles.tableCell, styles.hotelBenchmarkCellBase, styles.hotelBenchmarkSubHeaderCell, styles.hotelBenchmarkSubHeaderCellEnd, styles.hotelBenchmarkGroupEndEdge, { width: groupedColWidth }]}>Prix TTC</Text>
                </React.Fragment>
              ))}
            </View>

            {rows.map((row, rowIdx) => {
              const isAverage = isAverageRow(row);
              return (
                <View key={`bench-${rowIdx}`} style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowAlt : null, isAverage ? styles.hotelBenchmarkAverageRow : null]}>
                  {row.map((cell, colIdx) => (
                    <Text
                      key={`${rowIdx}-${colIdx}`}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.tableCell,
                        styles.hotelBenchmarkCellBase,
                        { width: allWidths[colIdx] || groupedColWidth },
                        colIdx >= 4 ? styles.tableCellRight : null,
                        colIdx === 0 ? styles.hotelBenchmarkEntityCell : null,
                        colIdx >= 6 && ((colIdx - 6) % 3 !== 0) ? styles.hotelBenchmarkStrongNumberCell : null,
                        colIdx >= 6 && (colIdx - 6) % 3 === 0 ? styles.hotelBenchmarkGroupedCellStart : null,
                        colIdx >= 6 && (colIdx - 6) % 3 === 2 ? styles.hotelBenchmarkGroupedCellEnd : null,
                        isAverage ? styles.hotelBenchmarkAverageCell : null,
                      ]}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

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
            {services.map((service) => <Text key={service} style={styles.heatmapHeaderText}>{service}</Text>)}
          </View>
          {rows.map((row) => (
            <View key={row.label} style={styles.heatmapDataRow}>
              <Text style={[styles.heatmapProjectText, styles.heatmapProjectCol]} numberOfLines={1}>{row.label}</Text>
              {row.values.map((value, idx) => <View key={`${row.label}-${idx}`} style={[styles.heatmapCell, { backgroundColor: `rgba(49,132,155,${0.12 + Math.min(1, Math.max(0, value)) * 0.72})` }]} />)}
            </View>
          ))}
        </View>
      </ScrollView>
    )}
  </View>
);

const InsightBoard = ({ title, items }: { title: string; items: string[] }) => (
  <View style={styles.insightBoard}>
    <Text style={styles.insightBoardTitle}>{title}</Text>
    {items.map((item, index) => (
      <View key={`${item}-${index}`} style={styles.insightRow}>
        <View style={styles.insightIndexPill}><Text style={styles.insightIndexText}>{index + 1}</Text></View>
        <Text style={styles.insightText}>{item}</Text>
      </View>
    ))}
  </View>
);

const QuestionBox = ({ items }: { items: string[] }) => (
  <View style={styles.questionCard}>
    <Text style={styles.questionTitle}>Questions metier</Text>
    {items.map((item) => <Text key={item} style={styles.questionItem}>• {item}</Text>)}
  </View>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <View style={styles.sectionWrap}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    {children}
  </View>
);

const TouchablePill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Text onPress={onPress} style={[styles.segmentPill, active ? styles.segmentPillActive : styles.segmentPillInactive]}>{label}</Text>
);

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<"retail" | "bureau" | "sante" | "hotel">("retail");
  const [retailCountryFilter, setRetailCountryFilter] = useState("all");
  const [retailCityFilter, setRetailCityFilter] = useState("all");
  const [retailTypologyFilter, setRetailTypologyFilter] = useState("all");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [retailRows, setRetailRows] = useState<RetailRow[]>([]);
  const [extendedRows, setExtendedRows] = useState<ExtendedDetailsRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsResponse, retailResponse, detailsResponse] = await Promise.all([
        supabase.from("projects").select("id, name, country, city, quartier, developer, standing_cible, total_units, delivery_date, project_type, status"),
        supabase.from("projects_retail").select("project_id, gla, opening_date, positionnement"),
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

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const stats = useMemo(() => {
    const detailsByProjectId = new Map(extendedRows.map((row) => [row.project_id, row.details || {}]));
    const retailByProjectId = new Map(retailRows.map((row) => [row.project_id, row]));
    const retailProjects = projects.filter((project) => matchProjectType(project.project_type, "retail"));
    const officeProjects = projects.filter((project) => matchProjectType(project.project_type, "bureau"));
    const healthProjects = projects.filter((project) => matchProjectType(project.project_type, "sante"));
    const hotelProjects = projects.filter((project) => matchProjectType(project.project_type, "hotel"));

    const retailCategoryCounts: Record<string, number> = { Shopping: 0, "F&B": 0, Services: 0, Loisirs: 0 };
    const retailGlaByCity: Record<string, number> = {};
    const retailOccupancyByAsset: BarItem[] = [];
    let retailTotalGla = 0;
    let retailOccupancySum = 0;
    let retailOccupancyCount = 0;

    retailProjects.forEach((project) => {
      const city = (project.city || "Non specifiee").trim() || "Non specifiee";
      const details = detailsByProjectId.get(project.id)?.retail || {};
      const retail = retailByProjectId.get(project.id);
      const gla = parseNumeric(retail?.gla);
      retailCategoryCounts.Shopping += parseNumeric(details.shoppingCount);
      retailCategoryCounts["F&B"] += parseNumeric(details.foodCount);
      retailCategoryCounts.Services += parseNumeric(details.servicesCount);
      retailCategoryCounts.Loisirs += parseNumeric(details.leisureCount);
      retailTotalGla += gla;
      retailGlaByCity[city] = (retailGlaByCity[city] || 0) + gla;
      const occupancyRate = parsePercent(details.occupancyRate);
      if (occupancyRate > 0) {
        retailOccupancySum += occupancyRate;
        retailOccupancyCount += 1;
        retailOccupancyByAsset.push({ label: project.name || "Actif", value: occupancyRate });
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
      serviceList.forEach((service) => { officeServicesCount[service] = (officeServicesCount[service] || 0) + 1; });
    });

    const topOfficeServices = Object.entries(officeServicesCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([service]) => service);
    officeProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.office || {};
      const serviceList = splitList(details.services);
      officeHeatmapRows.push({ label: project.name || "Projet", values: topOfficeServices.map((service) => (serviceList.includes(service) ? 1 : 0)) });
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
      specialties.forEach((specialty) => { healthSpecialtiesCount[specialty] = (healthSpecialtiesCount[specialty] || 0) + 1; });
      healthRadarRaw.push({ label: project.name || "Clinique", beds, doctors, blocks, specialties: specialties.length, equipments: equipmentsCount });
    });

    const maxBeds = Math.max(...healthRadarRaw.map((item) => item.beds), 1);
    const maxDoctors = Math.max(...healthRadarRaw.map((item) => item.doctors), 1);
    const maxBlocks = Math.max(...healthRadarRaw.map((item) => item.blocks), 1);
    const maxSpecialties = Math.max(...healthRadarRaw.map((item) => item.specialties), 1);
    const maxEquipments = Math.max(...healthRadarRaw.map((item) => item.equipments), 1);
    const healthRadarSeries: RadarSeries[] = healthRadarRaw.slice(0, 4).map((item, index) => ({ label: item.label, values: [item.beds / maxBeds, item.doctors / maxDoctors, item.blocks / maxBlocks, item.specialties / maxSpecialties, item.equipments / maxEquipments], color: CHART_COLORS[index % CHART_COLORS.length] }));

    const hotelCategoryCount: Record<string, number> = {};
    const hotelTypologyCount: Record<string, number> = {};
    const hotelKeysByCity: Record<string, number> = {};
    const hotelEquipmentRows: string[][] = [];
    const hotelStandardIntervalCounts: Record<string, Record<string, number>> = {
      "10 - 50": {},
      "51 - 100": {},
      "101 - 150": {},
      "151 - 200+": {},
    };
    const hotelStandardPriceByCategory: Record<string, { sum: number; count: number }> = {};
    const hotelBenchmarkRawRows: Array<{
      name: string;
      country: string;
      city: string;
      standing: string;
      booking: number;
      capacity: number;
      roomMetrics: Record<string, { surface: number; count: number; price: number }>;
      standardPrice: number;
    }> = [];
    const hotelRoomTypesSet = new Set<string>();
    let hotelTotalKeys = 0;
    let hotelTotalRooms = 0;
    let hotelFnBTotal = 0;
    let hotelMiceTotal = 0;
    let hotelLeisureTotal = 0;
    hotelProjects.forEach((project) => {
      const details = detailsByProjectId.get(project.id)?.hotel || {};
      const category = (details.category || "Non specifiee").trim() || "Non specifiee";
      const typology = normalizeHotelTypology(details.category, project.standing_cible);
      const city = (project.city || "Non specifiee").trim() || "Non specifiee";
      const country = (project.country || "Non specifie").trim() || "Non specifie";
      const keys = parseNumeric(details.keys);
      const rooms = Array.isArray(details.rooms) ? details.rooms : [];
      const fnb = Array.isArray(details.fnb) ? details.fnb : [];
      const mice = Array.isArray(details.mice) ? details.mice : [];
      const leisure = Array.isArray(details.leisure) ? details.leisure : [];
      const roomCount = rooms.reduce((sum: number, room: any) => sum + parseNumeric(room?.count), 0);
      const bookingScore = parseNumeric(details.bookingNote);

      const standardRoom = findHotelRoomByTokens(rooms, ["standard"]);
      const standardCount = parseNumeric(standardRoom?.count);
      const standardPrice = parseNumeric(standardRoom?.pricePerNight);

      const roomMetrics: Record<string, { surface: number; count: number; price: number }> = {};
      rooms.forEach((room: any) => {
        const roomType = normalizeRoomTypeLabel(room?.type);
        const existing = roomMetrics[roomType] || { surface: 0, count: 0, price: 0 };
        const roomCountValue = parseNumeric(room?.count);
        const roomSurfaceValue = parseNumeric(room?.surface);
        const roomPriceValue = parseNumeric(room?.pricePerNight);
        roomMetrics[roomType] = {
          surface: existing.surface + roomSurfaceValue,
          count: existing.count + roomCountValue,
          price: existing.price + roomPriceValue,
        };
        hotelRoomTypesSet.add(roomType);
      });

      hotelCategoryCount[category] = (hotelCategoryCount[category] || 0) + 1;
      hotelTypologyCount[typology] = (hotelTypologyCount[typology] || 0) + 1;
      hotelKeysByCity[city] = (hotelKeysByCity[city] || 0) + keys;
      hotelTotalKeys += keys;
      hotelTotalRooms += roomCount;
      hotelFnBTotal += fnb.length;
      hotelMiceTotal += mice.length;
      hotelLeisureTotal += leisure.length;
      hotelEquipmentRows.push([project.name || "-", category, `${fnb.length}`, `${mice.length}`, `${leisure.length}`]);

      if (standardCount >= 10 && standardCount <= 50) {
        hotelStandardIntervalCounts["10 - 50"][typology] = (hotelStandardIntervalCounts["10 - 50"][typology] || 0) + 1;
      } else if (standardCount >= 51 && standardCount <= 100) {
        hotelStandardIntervalCounts["51 - 100"][typology] = (hotelStandardIntervalCounts["51 - 100"][typology] || 0) + 1;
      } else if (standardCount >= 101 && standardCount <= 150) {
        hotelStandardIntervalCounts["101 - 150"][typology] = (hotelStandardIntervalCounts["101 - 150"][typology] || 0) + 1;
      } else if (standardCount >= 151) {
        hotelStandardIntervalCounts["151 - 200+"][typology] = (hotelStandardIntervalCounts["151 - 200+"][typology] || 0) + 1;
      }

      if (standardPrice > 0) {
        const current = hotelStandardPriceByCategory[typology] || { sum: 0, count: 0 };
        current.sum += standardPrice;
        current.count += 1;
        hotelStandardPriceByCategory[typology] = current;
      }

      hotelBenchmarkRawRows.push({
        name: project.name || "-",
        country,
        city,
        standing: typology,
        booking: bookingScore,
        capacity: keys > 0 ? keys : roomCount,
        roomMetrics,
        standardPrice,
      });
    });

    const preferredRoomTypeOrder = ["Chambre standard", "Chambre superieure", "Chambre deluxe", "Chambre executive", "Suite", "Junior suite", "Non specifie"];
    const benchmarkRoomTypes = Array.from(hotelRoomTypesSet).sort((a, b) => {
      const orderA = preferredRoomTypeOrder.findIndex((item) => normalizeText(item) === normalizeText(a));
      const orderB = preferredRoomTypeOrder.findIndex((item) => normalizeText(item) === normalizeText(b));
      if (orderA >= 0 && orderB >= 0) return orderA - orderB;
      if (orderA >= 0) return -1;
      if (orderB >= 0) return 1;
      return a.localeCompare(b);
    });

    const preferredHotelTypologies = ["Luxe", "MH Cat 1", "5*", "4*", "3*"];
    const typologiesInIntervals = Array.from(
      new Set(
        Object.values(hotelStandardIntervalCounts)
          .flatMap((record) => Object.keys(record))
          .filter(Boolean)
      )
    );
    const standardIntervalLegend = [
      ...preferredHotelTypologies.filter((item) => typologiesInIntervals.includes(item)),
      ...typologiesInIntervals.filter((item) => !preferredHotelTypologies.includes(item)),
    ];

    const standardRoomIntervalBins: StackedIntervalBin[] = ["10 - 50", "51 - 100", "101 - 150", "151 - 200+"].map((label) => {
      const record = hotelStandardIntervalCounts[label] || {};
      const segments = standardIntervalLegend
        .map((item, index) => ({
          label: item,
          value: record[item] || 0,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .filter((segment) => segment.value > 0);
      return {
        label,
        total: segments.reduce((sum, segment) => sum + segment.value, 0),
        segments,
      };
    });

    const preferredPriceCompareOrder = ["5*", "4*", "3*", "Luxe", "MH Cat 1"];
    const standardPriceCategoryBars = Object.entries(hotelStandardPriceByCategory)
      .map(([label, bucket]) => ({ label, value: bucket.count > 0 ? bucket.sum / bucket.count : 0 }))
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        const orderA = preferredPriceCompareOrder.indexOf(a.label);
        const orderB = preferredPriceCompareOrder.indexOf(b.label);
        if (orderA >= 0 && orderB >= 0) return orderA - orderB;
        if (orderA >= 0) return -1;
        if (orderB >= 0) return 1;
        return b.value - a.value;
      });

    const benchmarkRows = hotelBenchmarkRawRows
      .slice()
      .sort((a, b) => b.standardPrice - a.standardPrice)
      .slice(0, 12)
      .map((row) => {
        const cells = [
          row.name,
          row.country,
          row.city,
          row.standing,
          row.booking > 0 ? formatDecimal(row.booking, 1) : "-",
          row.capacity > 0 ? formatNumber(row.capacity) : "-",
        ];
        benchmarkRoomTypes.forEach((roomType) => {
          const metric = row.roomMetrics[roomType];
          cells.push(metric && metric.surface > 0 ? formatNumber(metric.surface) : "-");
          cells.push(metric && metric.count > 0 ? formatNumber(metric.count) : "-");
          cells.push(metric && metric.price > 0 ? formatNumber(metric.price) : "-");
        });
        return cells;
      });

    const benchmarkAverageRow = hotelBenchmarkRawRows.length
      ? (() => {
          const count = hotelBenchmarkRawRows.length;
          const bookingSum = hotelBenchmarkRawRows.reduce((sum, row) => sum + (row.booking > 0 ? row.booking : 0), 0);
          const bookingCount = hotelBenchmarkRawRows.reduce((sum, row) => sum + (row.booking > 0 ? 1 : 0), 0);
          const capacitySum = hotelBenchmarkRawRows.reduce((sum, row) => sum + row.capacity, 0);
          const cells = [
            "Moyenne",
            "-",
            "-",
            "-",
            bookingCount > 0 ? formatDecimal(bookingSum / bookingCount, 1) : "-",
            formatNumber(Math.round(capacitySum / count)),
          ];
          benchmarkRoomTypes.forEach((roomType) => {
            const rowsWithType = hotelBenchmarkRawRows.filter((row) => !!row.roomMetrics[roomType]);
            if (rowsWithType.length === 0) {
              cells.push("-", "-", "-");
              return;
            }
            const surfaceAvg = rowsWithType.reduce((sum, row) => sum + row.roomMetrics[roomType].surface, 0) / rowsWithType.length;
            const countAvg = rowsWithType.reduce((sum, row) => sum + row.roomMetrics[roomType].count, 0) / rowsWithType.length;
            const priceAvg = rowsWithType.reduce((sum, row) => sum + row.roomMetrics[roomType].price, 0) / rowsWithType.length;
            cells.push(surfaceAvg > 0 ? formatNumber(Math.round(surfaceAvg)) : "-");
            cells.push(countAvg > 0 ? formatNumber(Math.round(countAvg)) : "-");
            cells.push(priceAvg > 0 ? formatNumber(Math.round(priceAvg)) : "-");
          });
          return cells;
        })()
      : null;

    const occupancyAvg = retailOccupancyCount ? retailOccupancySum / retailOccupancyCount : 0;
    const officePricingValues = Object.values(officePricingByCityBucket).map((item) => (item.count ? item.sum / item.count : 0)).filter((value) => value > 0);
    const officePricingMin = officePricingValues.length ? Math.min(...officePricingValues) : 0;
    const officePricingMax = officePricingValues.length ? Math.max(...officePricingValues) : 0;
    const topOfficeServicesKpi = Object.entries(officeServicesCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([service]) => service).join(", ");

    return {
      retail: {
        projectCount: retailProjects.length,
        totalGla: retailTotalGla,
        occupancyAvg,
        enseignesTotal: retailCategoryCounts.Shopping + retailCategoryCounts["F&B"] + retailCategoryCounts.Services + retailCategoryCounts.Loisirs,
        categorySlices: buildSlicesFromRecord(retailCategoryCounts),
        glaByCityBars: buildTopBars(retailGlaByCity),
        occupancyByAssetBars: retailOccupancyByAsset.sort((a, b) => b.value - a.value).slice(0, 10),
      },
      office: {
        projectCount: officeProjects.length,
        spaceMixCount: Object.values(officeSpaceCounts).reduce((sum, count) => sum + count, 0),
        pricingRange: formatRange(officePricingMin, officePricingMax, "MAD"),
        topServicesKpi: topOfficeServicesKpi || "-",
        spaceMixSlices: buildSlicesFromRecord(officeSpaceCounts),
        pricingByCityBars: buildTopBars(Object.entries(officePricingByCityBucket).reduce<Record<string, number>>((acc, [city, bucket]) => { acc[city] = bucket.count ? bucket.sum / bucket.count : 0; return acc; }, {})),
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
        typologySlices: buildSlicesFromRecord(hotelTypologyCount),
        keysByCityBars: buildTopBars(hotelKeysByCity),
        equipmentRows: hotelEquipmentRows.slice(0, 12),
        standardRoomIntervalBins,
        standardRoomIntervalLegend: standardIntervalLegend,
        standardPriceCategoryBars,
        standardPriceCity: "Portefeuille global",
        benchmarkRoomTypes,
        benchmarkRows: benchmarkAverageRow ? [...benchmarkRows, benchmarkAverageRow] : benchmarkRows,
      },
    };
  }, [projects, retailRows, extendedRows]);

  const retailUx = useMemo(() => {
    const detailsByProjectId = new Map(extendedRows.map((row) => [row.project_id, row.details || {}]));
    const retailByProjectId = new Map(retailRows.map((row) => [row.project_id, row]));
    const currentYear = new Date().getFullYear();

    const retailAssets = projects.filter((project) => matchProjectType(project.project_type, "retail")).map((project) => {
      const retail = retailByProjectId.get(project.id);
      const details = detailsByProjectId.get(project.id)?.retail || {};
      const country = (project.country || "Non specifie").trim() || "Non specifie";
      const city = (project.city || "Non specifie").trim() || "Non specifie";
      const district = (project.quartier || project.city || "Non specifie").trim() || "Non specifie";
      const standing = (project.standing_cible || retail?.positionnement || "Non specifie").trim() || "Non specifie";
      const retailTypology = (details.typology || "Non specifie").trim() || "Non specifie";
      const developer = (project.developer || "-").trim() || "-";
      const totalUnits = parseNumeric(project.total_units);
      const gla = parseNumeric(retail?.gla);
      const occupancyRate = parsePercent(details.occupancyRate);
      const openingDate = retail?.opening_date || "-";
      const deliveryDate = project.delivery_date || "-";
      const openingYearFromRetail = parseYearFromDate(retail?.opening_date);
      const announcedOpeningYear = parseYearFromDate(project.delivery_date);
      const parkingPlaces = parseNumeric(details.parkingPlaces);
      const parkingRatioRaw = typeof details.parkingRatio === "string" ? details.parkingRatio.trim() : "";
      const isAnnounced = normalizeText(project.status).includes("annonc");
      const isPipeline = isAnnounced || isPipelineStatus(project.status) || ((announcedOpeningYear ?? openingYearFromRetail) !== null && (announcedOpeningYear ?? openingYearFromRetail)! > currentYear);
      return { name: (project.name || "Actif").trim() || "Actif", country, city, district, standing, retailTypology, developer, totalUnits, gla, openingDate, deliveryDate, openingYearFromRetail, announcedOpeningYear, occupancyRate, parkingPlaces, parkingRatioRaw, isAnnounced, isPipeline };
    });

    const countryOptions = Array.from(new Set(retailAssets.map((item) => item.country))).sort((a, b) => a.localeCompare(b));
    const cityOptions = Array.from(new Set(retailAssets.map((item) => item.city))).sort((a, b) => a.localeCompare(b));
    const typologyOptions = Array.from(new Set(retailAssets.map((item) => item.retailTypology))).sort((a, b) => a.localeCompare(b));

    const filteredAssets = retailAssets.filter((item) => {
      if (retailCountryFilter !== "all" && item.country !== retailCountryFilter) return false;
      if (retailCityFilter !== "all" && item.city !== retailCityFilter) return false;
      if (retailTypologyFilter !== "all" && item.retailTypology !== retailTypologyFilter) return false;
      return true;
    });

    const districtByGla: Record<string, number> = {};
    const cityByGla: Record<string, number> = {};
    const standingByGla: Record<string, number> = {};
    const typologyByGla: Record<string, number> = {};
    const existingDestinationRows: string[][] = [];
    const futureDestinationRows: string[][] = [];
    const pipelineOpeningByYear: Record<string, number> = {};
    const announcedAssets = filteredAssets.filter((item) => item.isAnnounced);

    let existingGla = 0;
    let pipelineGla = 0;
    let occupancySum = 0;
    let occupancyCount = 0;
    let midMassCount = 0;
    let parkingRatioSum = 0;
    let parkingRatioCount = 0;

    filteredAssets.forEach((item) => {
      districtByGla[item.district] = (districtByGla[item.district] || 0) + item.gla;
      cityByGla[item.city] = (cityByGla[item.city] || 0) + item.gla;
      standingByGla[item.standing] = (standingByGla[item.standing] || 0) + item.gla;
      typologyByGla[item.retailTypology] = (typologyByGla[item.retailTypology] || 0) + item.gla;
      if (item.isPipeline) pipelineGla += item.gla; else existingGla += item.gla;
      if (item.isPipeline && item.openingYearFromRetail && item.openingYearFromRetail > currentYear) {
        const yearKey = String(item.openingYearFromRetail);
        pipelineOpeningByYear[yearKey] = (pipelineOpeningByYear[yearKey] || 0) + item.gla;
      }
      if (item.occupancyRate > 0) {
        occupancySum += item.occupancyRate;
        occupancyCount += 1;
      }
      if (normalizeText(item.standing).includes("mid") || normalizeText(item.standing).includes("mass")) midMassCount += 1;
      const parkingRatioValue = item.parkingRatioRaw ? parseNumeric(item.parkingRatioRaw) : item.gla > 0 && item.parkingPlaces > 0 ? item.parkingPlaces / item.gla : 0;
      if (parkingRatioValue > 0) {
        parkingRatioSum += parkingRatioValue;
        parkingRatioCount += 1;
      }
    });

    filteredAssets.slice().sort((a, b) => b.gla - a.gla).slice(0, 12).forEach((item) => {
      const parkingRatio = item.parkingRatioRaw || (item.gla > 0 && item.parkingPlaces > 0 ? (item.parkingPlaces / item.gla).toFixed(3) : "-");
      const rowBase = [item.name, item.retailTypology, item.developer, `${item.country} / ${item.city}`, formatSquareMeters(item.gla), item.totalUnits > 0 ? formatNumber(item.totalUnits) : "-", item.parkingPlaces > 0 ? formatNumber(item.parkingPlaces) : "-", parkingRatio, item.standing];
      if (item.isPipeline) futureDestinationRows.push([...rowBase, item.deliveryDate]); else existingDestinationRows.push([...rowBase, item.openingDate]);
    });

    const districtSlices = buildSlicesFromRecord(districtByGla);
    const standingSlices = buildSlicesFromRecord(standingByGla);
    const districtBars = buildTopBars(districtByGla, 3);
    const districtLeader = districtBars[0]?.label || "-";
    const cityLeader = buildTopBars(cityByGla, 1)[0]?.label || "-";
    const topTypology = buildTopBars(typologyByGla, 1)[0]?.label || "-";
    const topStandingEntry = Object.entries(standingByGla).sort((a, b) => b[1] - a[1])[0] || null;
    const secondDistrictEntry = Object.entries(districtByGla).sort((a, b) => b[1] - a[1])[1] || null;
    const occupancyAvg = occupancyCount ? occupancySum / occupancyCount : 0;
    const midMassShare = filteredAssets.length ? (midMassCount / filteredAssets.length) * 100 : 0;
    const growthPct = existingGla > 0 ? (pipelineGla / existingGla) * 100 : 0;
    const totalGla = existingGla + pipelineGla;
    const topDistrictShare = districtBars[0] && totalGla > 0 ? Math.round((districtBars[0].value / totalGla) * 100) : 0;
    const averageParkingRatio = parkingRatioCount ? parkingRatioSum / parkingRatioCount : 0;
    const announcedDeliveryYears = announcedAssets.map((item) => item.announcedOpeningYear).filter((year): year is number => year !== null);
    const futureProjectionYear = announcedDeliveryYears.length ? Math.max(...announcedDeliveryYears) : currentYear;
    const currentYearGla = filteredAssets.filter((item) => !item.isPipeline).reduce((sum, item) => sum + item.gla, 0);
    const projectedFutureGla = currentYearGla + announcedAssets.filter((item) => item.announcedOpeningYear !== null && item.announcedOpeningYear <= futureProjectionYear).reduce((sum, item) => sum + item.gla, 0);

    return {
      countryOptions,
      cityOptions,
      typologyOptions,
      filteredCount: filteredAssets.length,
      existingGla,
      pipelineGla,
      totalGla,
      growthPct,
      currentYear,
      currentYearGla,
      futureProjectionYear,
      projectedFutureGla,
      occupancyAvg,
      midMassShare,
      averageParkingRatio,
      districtLeader,
      cityLeader,
      topTypology,
      topStandingEntry,
      secondDistrictEntry,
      topDistrictShare,
      districtSlices,
      standingSlices,
      districtBars,
      openingBars: Object.entries(pipelineOpeningByYear).sort((a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10)).map(([label, value]) => ({ label, value })),
      existingDestinationRows,
      futureDestinationRows,
      insights: [
        districtBars[0] ? `${districtBars[0].label} concentre ${topDistrictShare}% de l'offre analysee.` : "La concentration par district sera visible des que les GLA sont renseignees.",
        `Le segment Mid-range/Mass market represente ${formatPercent(midMassShare)} des actifs filtres.`,
        `Projection ${futureProjectionYear}: ${formatSquareMeters(projectedFutureGla)} contre ${formatSquareMeters(currentYearGla)} en ${currentYear}.`,
      ],
    };
  }, [projects, retailRows, extendedRows, retailCountryFilter, retailCityFilter, retailTypologyFilter]);

  const isWide = width >= 1200;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TopToolbar />
      <Text style={styles.pageTitle}>Dashboards par type</Text>
      <Text style={styles.pageSubtitle}>Retail, Bureau, Sante et Hotel avec indicateurs metier dedies</Text>

      <View style={styles.segmentRow}>
        <TouchablePill label="Retail" active={activeDashboard === "retail"} onPress={() => setActiveDashboard("retail")} />
        <TouchablePill label="Bureau" active={activeDashboard === "bureau"} onPress={() => setActiveDashboard("bureau")} />
        <TouchablePill label="Sante" active={activeDashboard === "sante"} onPress={() => setActiveDashboard("sante")} />
        <TouchablePill label="Hotel" active={activeDashboard === "hotel"} onPress={() => setActiveDashboard("hotel")} />
      </View>

      {loading ? <Text style={styles.stateText}>Chargement des dashboards...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && !error && activeDashboard === "retail" ? (
        <>
          <ImageBackground source={DASHBOARD_HERO_IMAGE} style={styles.dashboardHero} imageStyle={styles.dashboardHeroImage}>
            <View style={styles.dashboardHeroOverlay}>
              <View style={styles.dashboardHeroContent}>
                <Text style={styles.dashboardHeroTitle}>Dashboard Retail</Text>
                <Text style={styles.dashboardHeroSubtitle}>Vue executive: offre existante, pipeline, repartition territoriale et standing</Text>
              </View>
              <Image source={DASHBOARD_MAP_IMAGE} style={styles.dashboardHeroMap} />
            </View>
          </ImageBackground>

          <View style={styles.retailTopBar}>
            <View style={styles.retailTitleWrap}>
              <View style={styles.retailTitleIcon}><Text style={styles.retailTitleIconText}>[]</Text></View>
              <View>
                <Text style={styles.sectionTitle}>Dashboard Retail</Text>
                <Text style={styles.sectionSubtitle}>Vue executive: offre existante, pipeline, repartition territoriale et standing</Text>
              </View>
            </View>
            <View style={styles.retailTopActions}>
              <ToolbarButton label={`Annee: ${retailUx.futureProjectionYear}`} />
              <ToolbarButton label="Exporter" />
              <ToolbarButton label="Filtres avances" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Actifs analyses" value={formatNumber(retailUx.filteredCount)} sublabel="100% du perimetre" />
            <MetricCard label="GLA existante" value={formatSquareMeters(retailUx.existingGla)} sublabel={`${retailUx.currentYear} YTD: ${formatSquareMeters(retailUx.currentYearGla)}`} />
            <MetricCard label="GLA pipeline" value={formatSquareMeters(retailUx.pipelineGla)} sublabel={`+${formatCompactPercent(retailUx.growthPct)} potentiel`} accent="pink" />
            <MetricCard label="Croissance potentielle" value={formatPercent(retailUx.growthPct)} sublabel={`vs ${retailUx.currentYear}`} accent="green" />
            <MetricCard label="Taux d'occupation moyen" value={formatPercent(retailUx.occupancyAvg)} sublabel="Existant" accent="purple" />
            <MetricCard label="Enseignes totales" value={formatNumber(stats.retail.enseignesTotal)} sublabel="Actives" />
          </View>

          <View style={styles.snapshotPanel}>
            <View style={styles.snapshotContent}>
              <Text style={styles.snapshotEyebrow}>Executive snapshot</Text>
              <Text style={styles.snapshotTitle}>Retail Supply Intelligence</Text>
              <Text style={styles.snapshotDescription}>{retailUx.filteredCount > 0 ? `${formatSquareMeters(retailUx.totalGla)} analyses sur ${formatNumber(retailUx.filteredCount)} actifs, avec ${formatPercent(retailUx.growthPct)} de croissance potentielle.` : "Ajoute des actifs retail pour activer les indicateurs de marche."}</Text>
              <View style={styles.snapshotStatsGrid}>
                <SnapshotStat label="District leader" value={retailUx.districtLeader} hint={`${retailUx.topDistrictShare}% de la GLA analysee`} />
                <SnapshotStat label="Pays" value={retailCountryFilter === "all" ? retailUx.countryOptions[0] || "-" : retailCountryFilter} hint="Perimetre courant" />
                <SnapshotStat label="Ville leader" value={retailUx.cityLeader} hint="GLA dominante" />
                <SnapshotStat label="Typologie dominante" value={retailUx.topTypology} hint="Plus forte GLA" />
              </View>
            </View>
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.snapshotArt} /> : null}
          </View>

          <View style={styles.filterBlockPremium}>
            <View style={styles.filterHeaderRow}>
              <Text style={styles.filterTitle}>Filtres retail</Text>
              <TouchableOpacity activeOpacity={0.88} style={styles.resetButton} onPress={() => { setRetailCountryFilter("all"); setRetailCityFilter("all"); setRetailTypologyFilter("all"); }}>
                <Text style={styles.resetButtonText}>Reinitialiser</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}><Text style={styles.filterLabel}>Pays</Text><TouchablePill label="Tous" active={retailCountryFilter === "all"} onPress={() => setRetailCountryFilter("all")} />{retailUx.countryOptions.map((option) => <TouchablePill key={option} label={option} active={retailCountryFilter === option} onPress={() => setRetailCountryFilter(option)} />)}</View>
            <View style={styles.filterRow}><Text style={styles.filterLabel}>Ville</Text><TouchablePill label="Tous" active={retailCityFilter === "all"} onPress={() => setRetailCityFilter("all")} />{retailUx.cityOptions.map((option) => <TouchablePill key={option} label={option} active={retailCityFilter === option} onPress={() => setRetailCityFilter(option)} />)}</View>
            <View style={styles.filterRow}><Text style={styles.filterLabel}>Typologie retail</Text><TouchablePill label="Tous" active={retailTypologyFilter === "all"} onPress={() => setRetailTypologyFilter("all")} />{retailUx.typologyOptions.map((option) => <TouchablePill key={option} label={option} active={retailTypologyFilter === option} onPress={() => setRetailTypologyFilter(option)} />)}</View>
          </View>

          <View style={styles.chartGrid}>
            <PieChart title="Distribution GLA par district" slices={retailUx.districtSlices} />
            <PieChart title="Distribution GLA par standing" slices={retailUx.standingSlices} />
            <HorizontalBars title="GLA par district" bars={retailUx.districtBars} formatter={formatSquareMeters} />
            <CompareBars title="Pipeline par annee d'ouverture" leftLabel={`${retailUx.currentYear} YTD`} leftValue={retailUx.currentYearGla} rightLabel={`${retailUx.futureProjectionYear}`} rightValue={retailUx.projectedFutureGla} />
          </View>

          <View style={styles.miniMetricsRow}>
            <MiniMetric label="Part Mid/Mass" value={formatPercent(retailUx.midMassShare)} sublabel="Mid / Mass market" />
            <MiniMetric label="Enseignes totales" value={formatNumber(stats.retail.enseignesTotal)} sublabel="Actives" />
            <MiniMetric label="Ratio moyen" value={retailUx.averageParkingRatio.toFixed(3)} sublabel="Moyenne" />
            <MiniMetric label="Part haut de gamme +" value={retailUx.topStandingEntry && retailUx.totalGla > 0 ? formatPercent((retailUx.topStandingEntry[1] / retailUx.totalGla) * 100) : "0.0%"} sublabel="Du GLA total" />
            <MiniMetric label={`GLA ${retailUx.districtLeader}`} value={formatSquareMeters(retailUx.districtSlices[0]?.value || 0)} sublabel={`${retailUx.topDistrictShare}% du total`} />
            <MiniMetric label={retailUx.secondDistrictEntry ? `GLA ${retailUx.secondDistrictEntry[0]}` : "GLA secondaire"} value={formatSquareMeters(retailUx.secondDistrictEntry?.[1] || 0)} sublabel={retailUx.secondDistrictEntry && retailUx.totalGla > 0 ? `${formatCompactPercent((retailUx.secondDistrictEntry[1] / retailUx.totalGla) * 100)} du total` : "-"} />
          </View>

          <View style={styles.lowerAnalyticsRow}>
            <HorizontalBars title="Mix enseignes" bars={stats.retail.categorySlices.map((item) => ({ label: item.label, value: item.value }))} />
            <View style={styles.chartCardWide}>
              <Text style={styles.chartTitle}>Taux d'occupation par actif</Text>
              <View style={styles.ringMetricRow}>{stats.retail.occupancyByAssetBars.slice(0, 2).map((item) => <RingMetric key={item.label} label={item.label} value={item.value} />)}</View>
            </View>
            <PerformanceBanner />
          </View>

          <TableCard title="Major organized retail destinations (existants)" ctaLabel="Voir tout">
            <DataTable headers={["Etablissement", "Typologie", "Developpeur / Proprietaire", "Pays / Ville", "GLA", "Unites", "Parking", "Ratio", "Standing", "Ouverture"]} rows={retailUx.existingDestinationRows} columnWidths={[160, 150, 240, 170, 110, 90, 90, 80, 150, 120]} rightAlignedColumns={[4, 5, 6, 7]} />
          </TableCard>

          <TableCard title="Major organized retail destinations (futurs)" ctaLabel="Voir tout">
            <DataTable headers={["Etablissement", "Typologie", "Developpeur / Proprietaire", "Pays / Ville", "GLA", "Unites", "Parking", "Ratio", "Standing", "Date de livraison annoncee"]} rows={retailUx.futureDestinationRows} columnWidths={[160, 150, 240, 170, 110, 90, 90, 80, 150, 180]} rightAlignedColumns={[4, 5, 6, 7]} />
          </TableCard>

          <View style={styles.insightBanner}>
            <InsightBoard title="Insights cles" items={retailUx.insights} />
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.insightArt} /> : null}
          </View>
        </>
      ) : null}

      {!loading && !error && activeDashboard === "bureau" ? (
        <>
          <ImageBackground source={DASHBOARD_HERO_IMAGE} style={styles.dashboardHero} imageStyle={styles.dashboardHeroImage}>
            <View style={styles.dashboardHeroOverlay}>
              <View style={styles.dashboardHeroContent}>
                <Text style={styles.dashboardHeroTitle}>Dashboard Bureau</Text>
                <Text style={styles.dashboardHeroSubtitle}>Vue executive: mix d'espaces, pricing locatif et profondeur des services</Text>
              </View>
              <Image source={DASHBOARD_MAP_IMAGE} style={styles.dashboardHeroMap} />
            </View>
          </ImageBackground>

          <View style={styles.retailTopBar}>
            <View style={styles.retailTitleWrap}>
              <View style={styles.retailTitleIcon}><Text style={styles.retailTitleIconText}>[]</Text></View>
              <View>
                <Text style={styles.sectionTitle}>Dashboard Bureau</Text>
                <Text style={styles.sectionSubtitle}>Structure du parc, niveau de prix et offre de services</Text>
              </View>
            </View>
            <View style={styles.retailTopActions}>
              <ToolbarButton label="Benchmark" />
              <ToolbarButton label="Exporter" />
              <ToolbarButton label="Filtres avances" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Actifs bureau" value={formatNumber(stats.office.projectCount)} sublabel="Portefeuille analyse" />
            <MetricCard label="Mix espaces" value={formatNumber(stats.office.spaceMixCount)} sublabel="Occurrences detectees" />
            <MetricCard label="Fourchette prix" value={stats.office.pricingRange} sublabel="Niveau locatif" accent="pink" />
            <MetricCard label="Villes couvertes" value={formatNumber(stats.office.pricingByCityBars.length)} sublabel="Avec signal prix" accent="green" />
            <MetricCard label="Services trackes" value={formatNumber(stats.office.heatmapServices.length)} sublabel="Top services" accent="purple" />
            <MetricCard label="Services dominants" value={stats.office.topServicesKpi || "-"} sublabel="Top 3" />
          </View>

          <View style={styles.snapshotPanel}>
            <View style={styles.snapshotContent}>
              <Text style={styles.snapshotEyebrow}>Executive snapshot</Text>
              <Text style={styles.snapshotTitle}>Office Market Signal</Text>
              <Text style={styles.snapshotDescription}>{stats.office.projectCount > 0 ? `${formatNumber(stats.office.projectCount)} actifs bureau suivis, ${formatNumber(stats.office.spaceMixCount)} occurrences d'espaces et une fourchette de prix ${stats.office.pricingRange}.` : "Ajoute des projets bureau pour activer les indicateurs de marche."}</Text>
              <View style={styles.snapshotStatsGrid}>
                <SnapshotStat label="Ville leader" value={stats.office.pricingByCityBars[0]?.label || "-"} hint="Prix moyen le plus eleve" />
                <SnapshotStat label="Prix leader" value={stats.office.pricingByCityBars[0] ? `${formatNumber(stats.office.pricingByCityBars[0].value)} MAD` : "-"} hint="Reference observee" />
                <SnapshotStat label="Service #1" value={stats.office.heatmapServices[0] || "-"} hint="Le plus recurrent" />
                <SnapshotStat label="Service #2" value={stats.office.heatmapServices[1] || "-"} hint="Deuxieme plus frequent" />
              </View>
            </View>
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.snapshotArt} /> : null}
          </View>

          <View style={styles.chartGrid}>
            <PieChart title="Distribution du mix d'espaces" slices={stats.office.spaceMixSlices} />
            <HorizontalBars title="Pricing moyen par ville" bars={stats.office.pricingByCityBars} formatter={(value) => `${formatNumber(value)} MAD`} />
            <HeatmapTable title="Intensite des services par projet" services={stats.office.heatmapServices} rows={stats.office.heatmapRows} />
            <HorizontalBars
              title="Couverture services par projet"
              bars={stats.office.heatmapRows.map((row) => ({ label: row.label, value: row.values.reduce((sum, item) => sum + item, 0) })).sort((a, b) => b.value - a.value).slice(0, 8)}
              formatter={(value) => `${formatNumber(value)} services`}
            />
          </View>

          <View style={styles.miniMetricsRow}>
            <MiniMetric label="Top ville" value={stats.office.pricingByCityBars[0]?.label || "-"} sublabel="Niveau de prix leader" />
            <MiniMetric label="Ecart prix" value={stats.office.pricingByCityBars.length > 1 ? `${formatNumber(Math.abs(stats.office.pricingByCityBars[0].value - stats.office.pricingByCityBars[stats.office.pricingByCityBars.length - 1].value))} MAD` : "-"} sublabel="Entre villes observees" />
            <MiniMetric label="Top service" value={stats.office.heatmapServices[0] || "-"} sublabel="Le plus present" />
            <MiniMetric label="Projets heatmap" value={formatNumber(stats.office.heatmapRows.length)} sublabel="Avec details services" />
            <MiniMetric label="Mix categories" value={formatNumber(stats.office.spaceMixSlices.length)} sublabel="Types d'espaces" />
            <MiniMetric label="Profondeur data" value={formatPercent(stats.office.projectCount > 0 ? (stats.office.heatmapRows.length / stats.office.projectCount) * 100 : 0)} sublabel="Projets documentes" />
          </View>

          <TableCard title="Bench office services par projet" ctaLabel="Voir tout">
            <DataTable
              headers={["Projet", "Services actifs", "Services max", "Score couverture"]}
              rows={stats.office.heatmapRows.map((row) => {
                const activeServices = row.values.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0);
                const maxServices = stats.office.heatmapServices.length;
                const score = maxServices > 0 ? (activeServices / maxServices) * 100 : 0;
                return [row.label, formatNumber(activeServices), formatNumber(maxServices), formatPercent(score)];
              })}
              columnWidths={[220, 140, 120, 150]}
              rightAlignedColumns={[1, 2, 3]}
            />
          </TableCard>

          <View style={styles.insightBanner}>
            <InsightBoard
              title="Insights cles"
              items={[
                stats.office.pricingByCityBars[0] ? `${stats.office.pricingByCityBars[0].label} ressort comme place premium sur le signal prix.` : "Le benchmark prix apparaitra des que les villes sont renseignees.",
                `Les ${stats.office.heatmapServices.length} services les plus frequents structurent la competitivite des actifs bureau.`,
                stats.office.heatmapRows.length > 0 ? `${formatNumber(stats.office.heatmapRows.filter((row) => row.values.reduce((sum, item) => sum + item, 0) >= 3).length)} projets presentent une offre de services dense.` : "Renseigne les services pour activer le scoring de couverture.",
              ]}
            />
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.insightArt} /> : null}
          </View>
        </>
      ) : null}

      {!loading && !error && activeDashboard === "sante" ? (
        <>
          <ImageBackground source={DASHBOARD_HERO_IMAGE} style={styles.dashboardHero} imageStyle={styles.dashboardHeroImage}>
            <View style={styles.dashboardHeroOverlay}>
              <View style={styles.dashboardHeroContent}>
                <Text style={styles.dashboardHeroTitle}>Dashboard Sante</Text>
                <Text style={styles.dashboardHeroSubtitle}>Vue executive: capacite medicale, specialites et charge clinique</Text>
              </View>
              <Image source={DASHBOARD_MAP_IMAGE} style={styles.dashboardHeroMap} />
            </View>
          </ImageBackground>

          <View style={styles.retailTopBar}>
            <View style={styles.retailTitleWrap}>
              <View style={styles.retailTitleIcon}><Text style={styles.retailTitleIconText}>[]</Text></View>
              <View>
                <Text style={styles.sectionTitle}>Dashboard Sante</Text>
                <Text style={styles.sectionSubtitle}>Capacite, specialites et performance clinique</Text>
              </View>
            </View>
            <View style={styles.retailTopActions}>
              <ToolbarButton label="Benchmark" />
              <ToolbarButton label="Exporter" />
              <ToolbarButton label="Filtres avances" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Etablissements" value={formatNumber(stats.health.projectCount)} sublabel="Parc analyse" />
            <MetricCard label="Nombre de lits" value={formatNumber(stats.health.totalBeds)} sublabel="Capacite totale" />
            <MetricCard label="Nombre de medecins" value={formatNumber(stats.health.totalDoctors)} sublabel="Effectif total" accent="pink" />
            <MetricCard label="Specialites" value={formatNumber(stats.health.specialtyCount)} sublabel="Distinctes" accent="green" />
            <MetricCard label="Lits / etablissement" value={stats.health.projectCount > 0 ? formatNumber(Math.round(stats.health.totalBeds / stats.health.projectCount)) : "0"} sublabel="Moyenne" accent="purple" />
            <MetricCard label="Medecins / etablissement" value={stats.health.projectCount > 0 ? formatNumber(Math.round(stats.health.totalDoctors / stats.health.projectCount)) : "0"} sublabel="Moyenne" />
          </View>

          <View style={styles.snapshotPanel}>
            <View style={styles.snapshotContent}>
              <Text style={styles.snapshotEyebrow}>Executive snapshot</Text>
              <Text style={styles.snapshotTitle}>Healthcare Capacity Pulse</Text>
              <Text style={styles.snapshotDescription}>{stats.health.projectCount > 0 ? `${formatNumber(stats.health.projectCount)} etablissements totalisent ${formatNumber(stats.health.totalBeds)} lits, ${formatNumber(stats.health.totalDoctors)} medecins et ${formatNumber(stats.health.specialtyCount)} specialites distinctes.` : "Ajoute des actifs sante pour activer les indicateurs cliniques."}</Text>
              <View style={styles.snapshotStatsGrid}>
                <SnapshotStat label="Etablissement leader" value={stats.health.bedsBars[0]?.label || "-"} hint="Plus grande capacite lits" />
                <SnapshotStat label="Lits max" value={formatNumber(stats.health.bedsBars[0]?.value || 0)} hint="Capacite de pointe" />
                <SnapshotStat label="Medecins max" value={formatNumber(stats.health.doctorsBars[0]?.value || 0)} hint="Dotation medicale" />
                <SnapshotStat label="Profil dominant" value={stats.health.specialtiesSlices[0]?.label || "-"} hint="Specialite la plus representee" />
              </View>
            </View>
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.snapshotArt} /> : null}
          </View>

          <View style={styles.chartGrid}>
            <PieChart title="Distribution des specialites" slices={stats.health.specialtiesSlices} />
            <HorizontalBars title="Lits par etablissement" bars={stats.health.bedsBars} />
            <HorizontalBars title="Medecins par etablissement" bars={stats.health.doctorsBars} />
            <RadarChart title="Radar capacite medicale" axes={stats.health.radarAxes} series={stats.health.radarSeries} />
          </View>

          <View style={styles.miniMetricsRow}>
            <MiniMetric label="Top specialite" value={stats.health.specialtiesSlices[0]?.label || "-"} sublabel="La plus presente" />
            <MiniMetric label="Part top specialite" value={stats.health.specialtiesSlices.length > 0 ? formatPercent((stats.health.specialtiesSlices[0].value / Math.max(1, stats.health.specialtiesSlices.reduce((sum, slice) => sum + slice.value, 0))) * 100) : "0.0%"} sublabel="Sur total specialites" />
            <MiniMetric label="Top etablissement lits" value={stats.health.bedsBars[0]?.label || "-"} sublabel="Capacite de reference" />
            <MiniMetric label="Top etablissement medecins" value={stats.health.doctorsBars[0]?.label || "-"} sublabel="Dotation de reference" />
            <MiniMetric label="Lits / medecin" value={stats.health.totalDoctors > 0 ? (stats.health.totalBeds / stats.health.totalDoctors).toFixed(2) : "0.00"} sublabel="Ratio global" />
            <MiniMetric label="Profondeur radar" value={formatNumber(stats.health.radarSeries.length)} sublabel="Cliniques comparees" />
          </View>

          <TableCard title="Benchmark capacite clinique" ctaLabel="Voir tout">
            <DataTable
              headers={["Etablissement", "Lits", "Medecins", "Ratio lits/medecin"]}
              rows={stats.health.bedsBars.map((bedItem) => {
                const doctorItem = stats.health.doctorsBars.find((item) => item.label === bedItem.label);
                const doctors = doctorItem?.value || 0;
                const ratio = doctors > 0 ? (bedItem.value / doctors).toFixed(2) : "-";
                return [bedItem.label, formatNumber(bedItem.value), formatNumber(doctors), ratio];
              })}
              columnWidths={[220, 120, 120, 170]}
              rightAlignedColumns={[1, 2, 3]}
            />
          </TableCard>

          <View style={styles.insightBanner}>
            <InsightBoard
              title="Insights cles"
              items={[
                stats.health.bedsBars[0] ? `${stats.health.bedsBars[0].label} concentre la plus grande capacite en lits.` : "Renseigne les capacites pour faire ressortir les leaders.",
                stats.health.totalDoctors > 0 ? `Le ratio global s'etablit a ${(stats.health.totalBeds / stats.health.totalDoctors).toFixed(2)} lits par medecin.` : "Les ratios medecins/lits apparaitront avec des effectifs documentes.",
                stats.health.specialtiesSlices[0] ? `${stats.health.specialtiesSlices[0].label} reste la specialite dominante du portefeuille.` : "La dominance par specialite apparaitra des que les donnees sont disponibles.",
              ]}
            />
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.insightArt} /> : null}
          </View>
        </>
      ) : null}

      {!loading && !error && activeDashboard === "hotel" ? (
        <>
          <ImageBackground source={DASHBOARD_HERO_IMAGE} style={styles.dashboardHero} imageStyle={styles.dashboardHeroImage}>
            <View style={styles.dashboardHeroOverlay}>
              <View style={styles.dashboardHeroContent}>
                <Text style={styles.dashboardHeroTitle}>Dashboard Hotel</Text>
                <Text style={styles.dashboardHeroSubtitle}>Vue executive: capacite d'accueil, categories et mix de services</Text>
              </View>
              <Image source={DASHBOARD_MAP_IMAGE} style={styles.dashboardHeroMap} />
            </View>
          </ImageBackground>

          <View style={styles.retailTopBar}>
            <View style={styles.retailTitleWrap}>
              <View style={styles.retailTitleIcon}><Text style={styles.retailTitleIconText}>[]</Text></View>
              <View>
                <Text style={styles.sectionTitle}>Dashboard Hotel</Text>
                <Text style={styles.sectionSubtitle}>Structure du parc, profondeur d'offre et services a valeur</Text>
              </View>
            </View>
            <View style={styles.retailTopActions}>
              <ToolbarButton label="Benchmark" />
              <ToolbarButton label="Exporter" />
              <ToolbarButton label="Filtres avances" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Actifs hotel" value={formatNumber(stats.hotel.projectCount)} sublabel="Portefeuille analyse" />
            <MetricCard label="Nombre de cles" value={formatNumber(stats.hotel.totalKeys)} sublabel="Capacite totale" />
            <MetricCard label="Nombre de chambres" value={formatNumber(stats.hotel.totalRooms)} sublabel="Inventaire total" accent="pink" />
            <MetricCard label="Categories" value={formatNumber(stats.hotel.categorySlices.length)} sublabel="Segments observes" accent="green" />
            <MetricCard label="Cles / actif" value={stats.hotel.projectCount > 0 ? formatNumber(Math.round(stats.hotel.totalKeys / stats.hotel.projectCount)) : "0"} sublabel="Moyenne" accent="purple" />
            <MetricCard label="Mix services" value={stats.hotel.mixKpi} sublabel="F&B / MICE / Loisirs" />
          </View>

          <View style={styles.snapshotPanel}>
            <View style={styles.snapshotContent}>
              <Text style={styles.snapshotEyebrow}>Executive snapshot</Text>
              <Text style={styles.snapshotTitle}>Hospitality Depth Tracker</Text>
              <Text style={styles.snapshotDescription}>{stats.hotel.projectCount > 0 ? `${formatNumber(stats.hotel.projectCount)} actifs totalisent ${formatNumber(stats.hotel.totalKeys)} cles et ${formatNumber(stats.hotel.totalRooms)} chambres, avec un mix service ${stats.hotel.mixKpi}.` : "Ajoute des actifs hotel pour activer les indicateurs de capacite."}</Text>
              <View style={styles.snapshotStatsGrid}>
                <SnapshotStat label="Ville leader" value={stats.hotel.keysByCityBars[0]?.label || "-"} hint="Plus grand stock de cles" />
                <SnapshotStat label="Cles leader" value={formatNumber(stats.hotel.keysByCityBars[0]?.value || 0)} hint="Capacite dominante" />
                <SnapshotStat label="Categorie #1" value={stats.hotel.categorySlices[0]?.label || "-"} hint="La plus representee" />
                <SnapshotStat label="Part categorie #1" value={stats.hotel.categorySlices.length > 0 ? formatPercent((stats.hotel.categorySlices[0].value / Math.max(1, stats.hotel.categorySlices.reduce((sum, slice) => sum + slice.value, 0))) * 100) : "0.0%"} hint="Poids du portefeuille" />
              </View>
            </View>
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.snapshotArt} /> : null}
          </View>

          <View style={styles.chartGrid}>
            <View style={styles.hotelChartRow}>
              <PieChart title="Repartition de l'offre par typologie d'etablissement" slices={stats.hotel.typologySlices} containerStyle={styles.hotelCardThird} />
              <StandardPriceCategoryChart title="Comparaison prix publics par categorie - Chambre standard" city={stats.hotel.standardPriceCity} bars={stats.hotel.standardPriceCategoryBars} containerStyle={styles.hotelCardThirdWide} />
              <HorizontalBars title="Cles par ville" bars={stats.hotel.keysByCityBars} containerStyle={styles.hotelCardThird} />
            </View>
            <View style={styles.hotelChartRow}>
              <CompareBars title="Comparatif capacite" leftLabel="Cles" leftValue={stats.hotel.totalKeys} rightLabel="Chambres" rightValue={stats.hotel.totalRooms} containerStyle={styles.hotelCardHalf} />
              <HorizontalBars
                title="Mix services par actif"
                bars={stats.hotel.equipmentRows.map((row) => ({ label: row[0], value: parseNumeric(row[2]) + parseNumeric(row[3]) + parseNumeric(row[4]) })).sort((a, b) => b.value - a.value).slice(0, 8)}
                formatter={(value) => `${formatNumber(value)} services`}
                containerStyle={styles.hotelCardHalf}
              />
            </View>
          </View>

          <TableCard title="Matrice services hoteliers" ctaLabel="Voir tout">
            <DataTable
              headers={["Hotel", "Categorie", "F&B", "MICE", "Loisirs", "Total services"]}
              rows={stats.hotel.equipmentRows.map((row) => {
                const totalServices = parseNumeric(row[2]) + parseNumeric(row[3]) + parseNumeric(row[4]);
                return [row[0], row[1], row[2], row[3], row[4], formatNumber(totalServices)];
              })}
              columnWidths={[210, 150, 90, 90, 90, 130]}
              rightAlignedColumns={[2, 3, 4, 5]}
            />
          </TableCard>

          <TableCard title="Benchmark prix publics hoteliers" ctaLabel="Tous types de chambres">
            <HotelBenchmarkTable roomTypes={stats.hotel.benchmarkRoomTypes} rows={stats.hotel.benchmarkRows} />
          </TableCard>

          <View style={styles.insightBanner}>
            <InsightBoard
              title="Insights cles"
              items={[
                stats.hotel.keysByCityBars[0] ? `${stats.hotel.keysByCityBars[0].label} concentre la plus forte capacite hoteliere.` : "Le leadership geographique apparaitra des que les cles sont renseignees.",
                stats.hotel.categorySlices[0] ? `${stats.hotel.categorySlices[0].label} domine la structure de l'offre hoteliere.` : "La dominance categorie apparaitra avec plus de details.",
                `Le mix services global ressort a ${stats.hotel.mixKpi}, a monitorer pour la differenciation des actifs.`,
              ]}
            />
            {isWide ? <Image source={DASHBOARD_MAP_IMAGE} style={styles.insightArt} /> : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FD" },
  content: { padding: 16, paddingBottom: 42, gap: 16 },
  topToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, backgroundColor: AppColors.ui.background, borderRadius: 20, borderWidth: 1, borderColor: "#E2ECF5", paddingHorizontal: 18, paddingVertical: 12 },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
  brandBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: AppColors.primary.main, alignItems: "center", justifyContent: "center" },
  brandBadgeText: { color: AppColors.ui.background, fontSize: 11, fontWeight: "700", fontFamily: "Century Gothic" },
  brandText: { color: "#234A68", fontSize: 15, fontWeight: "700", fontFamily: "Century Gothic" },
  searchWrap: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E1EAF3", backgroundColor: "#FBFDFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  searchIcon: { color: "#94A7B7", fontSize: 16, marginRight: 8, fontFamily: "Century Gothic" },
  searchInput: { flex: 1, color: "#5E7388", fontSize: 14, fontFamily: "Century Gothic" },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toolCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#E0E9F2", backgroundColor: AppColors.ui.background, alignItems: "center", justifyContent: "center" },
  toolCircleText: { color: "#648198", fontWeight: "700", fontFamily: "Century Gothic" },
  userPill: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 4 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCEAF3", alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: "#234A68", fontWeight: "700", fontFamily: "Century Gothic" },
  userName: { color: "#234A68", fontSize: 13, fontWeight: "700", fontFamily: "Century Gothic" },
  userRole: { color: "#8FA0AE", fontSize: 11, fontFamily: "Century Gothic" },
  pageTitle: { fontSize: 34, fontWeight: "700", color: AppColors.primary.main, fontFamily: "Century Gothic" },
  pageSubtitle: { marginTop: 4, marginBottom: 8, fontSize: 16, color: AppColors.gray.dark, fontFamily: "Century Gothic", lineHeight: 22 },
  dashboardHero: { minHeight: 146, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#E0EAF4" },
  dashboardHeroImage: { resizeMode: "cover" },
  dashboardHeroOverlay: { flex: 1, flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.80)" },
  dashboardHeroContent: { flex: 1, paddingHorizontal: 22, paddingVertical: 18, justifyContent: "center" },
  dashboardHeroTitle: { color: AppColors.primary.main, fontSize: 34, fontWeight: "700", fontFamily: "Century Gothic" },
  dashboardHeroSubtitle: { marginTop: 6, color: "#5B7590", fontSize: 15, lineHeight: 22, fontFamily: "Century Gothic" },
  dashboardHeroMap: { width: 260, height: "100%", opacity: 0.95 },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  segmentPill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, fontSize: 14, fontFamily: "Century Gothic", fontWeight: "700", overflow: "hidden" },
  segmentPillActive: { color: AppColors.ui.background, backgroundColor: AppColors.primary.main, borderColor: AppColors.primary.main },
  segmentPillInactive: { color: AppColors.primary.main, backgroundColor: AppColors.ui.background, borderColor: AppColors.primary.light },
  stateText: { color: AppColors.primary.main, fontSize: 17, fontFamily: "Century Gothic" },
  errorText: { color: AppColors.accent, fontSize: 16, fontFamily: "Century Gothic" },
  retailTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  retailTitleWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  retailTitleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F3EEFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E0D8FF" },
  retailTitleIconText: { color: "#6C5AD8", fontWeight: "700", fontFamily: "Century Gothic" },
  retailTopActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  toolbarButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#E1EAF3", backgroundColor: AppColors.ui.background },
  toolbarButtonIcon: { color: AppColors.primary.main, fontSize: 11, fontWeight: "700", fontFamily: "Century Gothic" },
  toolbarButtonText: { color: "#32536D", fontSize: 13, fontWeight: "700", fontFamily: "Century Gothic" },
  sectionWrap: { backgroundColor: AppColors.ui.background, borderRadius: 18, borderWidth: 1, borderColor: "#E1EAF3", padding: 16, gap: 12 },
  sectionTitle: { fontSize: 28, fontWeight: "700", color: "#1C5377", fontFamily: "Century Gothic" },
  sectionSubtitle: { fontSize: 14, color: "#657E95", fontFamily: "Century Gothic", lineHeight: 22 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "32%", minWidth: 210, flexGrow: 1, borderRadius: 18, borderWidth: 1, borderColor: "#E2ECF5", backgroundColor: AppColors.ui.background, padding: 16, shadowColor: "#123456", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  metricLabel: { color: "#617A91", fontSize: 13, marginBottom: 12, fontFamily: "Century Gothic" },
  metricValueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  metricTextCol: { flex: 1 },
  metricValue: { color: "#173A5B", fontSize: 30, lineHeight: 34, fontWeight: "700", fontFamily: "Century Gothic" },
  metricValuePink: { color: AppColors.accent },
  metricValueGreen: { color: "#2EAC69" },
  metricValuePurple: { color: "#6C5AD8" },
  metricSubLabel: { marginTop: 8, color: "#90A1AF", fontSize: 12, fontFamily: "Century Gothic" },
  metricIconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F4FA", alignItems: "center", justifyContent: "center" },
  metricIconPink: { backgroundColor: "#FFE8F2" },
  metricIconGreen: { backgroundColor: "#E8F8EE" },
  metricIconPurple: { backgroundColor: "#F0EBFF" },
  metricIconText: { color: AppColors.primary.main, fontWeight: "700", fontFamily: "Century Gothic" },
  snapshotPanel: { borderRadius: 18, borderWidth: 1, borderColor: "#D9EAF3", backgroundColor: "#F5FBFF", padding: 18, flexDirection: "row", gap: 18, overflow: "hidden" },
  snapshotContent: { flex: 1 },
  snapshotEyebrow: { color: "#3D8EAA", textTransform: "uppercase", fontSize: 11, fontWeight: "700", letterSpacing: 0.4, fontFamily: "Century Gothic" },
  snapshotTitle: { marginTop: 8, color: AppColors.primary.main, fontSize: 30, fontWeight: "700", fontFamily: "Century Gothic" },
  snapshotDescription: { marginTop: 10, color: "#517089", fontSize: 14, lineHeight: 22, fontFamily: "Century Gothic" },
  snapshotStatsGrid: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  snapshotStat: { width: "48%", minWidth: 190, backgroundColor: AppColors.ui.background, borderRadius: 14, borderWidth: 1, borderColor: "#E1EDF5", padding: 14 },
  snapshotStatLabel: { color: "#8EA4B6", fontSize: 12, fontFamily: "Century Gothic" },
  snapshotStatValue: { marginTop: 8, color: "#1B4768", fontSize: 24, fontWeight: "700", fontFamily: "Century Gothic" },
  snapshotStatHint: { marginTop: 6, color: "#7190A7", fontSize: 12, fontFamily: "Century Gothic" },
  snapshotArt: { width: 220, height: 200, alignSelf: "flex-end", opacity: 0.95 },
  filterBlockPremium: { borderRadius: 18, borderWidth: 1, borderColor: "#E1EAF3", backgroundColor: AppColors.ui.background, padding: 16, gap: 12 },
  filterHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filterTitle: { fontSize: 14, color: AppColors.primary.main, fontWeight: "700", fontFamily: "Century Gothic" },
  resetButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#D6E6F0", backgroundColor: "#F8FBFD" },
  resetButtonText: { color: "#537089", fontSize: 12, fontWeight: "700", fontFamily: "Century Gothic" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  filterLabel: { fontSize: 13, color: AppColors.gray.dark, fontFamily: "Century Gothic", marginRight: 6, minWidth: 110 },
  chartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  hotelChartRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  hotelCardThird: { flex: 1, minWidth: 280 },
  hotelCardThirdWide: { flex: 1.2, minWidth: 360 },
  hotelCardHalf: { flex: 1, minWidth: 320 },
  chartCard: { width: "24%", minWidth: 220, flexGrow: 1, backgroundColor: AppColors.ui.background, borderRadius: 16, borderWidth: 1, borderColor: "#E1EAF3", padding: 16, alignItems: "center" },
  chartCardWide: { flex: 1, minWidth: 240, backgroundColor: AppColors.ui.background, borderRadius: 16, borderWidth: 1, borderColor: "#E1EAF3", padding: 16 },
  chartTitle: { fontSize: 18, fontWeight: "700", color: "#1C5377", fontFamily: "Century Gothic", marginBottom: 12 },
  chartSubtle: { marginTop: -6, marginBottom: 12, fontSize: 12, color: "#6A8298", fontFamily: "Century Gothic" },
  emptyText: { fontSize: 15, color: AppColors.gray.dark, fontFamily: "Century Gothic" },
  legendWrap: { width: "100%", marginTop: 6, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 13, color: AppColors.ui.text, fontFamily: "Century Gothic" },
  legendValue: { fontSize: 13, color: "#4C728F", fontWeight: "700", fontFamily: "Century Gothic" },
  chartFooter: { marginTop: 10, color: "#5B7590", fontSize: 12, fontFamily: "Century Gothic" },
  dualChartRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: { width: "48%", backgroundColor: "#F8FBFD", borderRadius: 14, borderWidth: 1, borderColor: "#E1EAF3", paddingVertical: 14, paddingHorizontal: 12 },
  kpiLabel: { fontSize: 13, color: AppColors.gray.dark, fontFamily: "Century Gothic", marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: "700", color: AppColors.primary.main, fontFamily: "Century Gothic" },
  barRow: { marginBottom: 12 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 },
  barLabel: { flex: 1, fontSize: 14, color: AppColors.ui.text, fontFamily: "Century Gothic" },
  barValue: { fontSize: 14, color: AppColors.primary.main, fontWeight: "700", fontFamily: "Century Gothic" },
  barTrack: { width: "100%", height: 7, borderRadius: 99, overflow: "hidden", backgroundColor: "#EAF1F6" },
  barFill: { height: "100%", borderRadius: 99, backgroundColor: AppColors.primary.main },
  compareWrap: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", gap: 18, paddingHorizontal: 8, paddingTop: 8, flex: 1 },
  compareCol: { flex: 1, alignItems: "center", gap: 6 },
  compareTrack: { width: "62%", maxWidth: 84, height: 150, borderBottomWidth: 1, borderBottomColor: "#D8E4EE", justifyContent: "flex-end" },
  compareBar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  compareValue: { fontSize: 22, color: AppColors.primary.main, fontWeight: "700", fontFamily: "Century Gothic" },
  compareLabel: { fontSize: 14, color: AppColors.gray.dark, fontFamily: "Century Gothic" },
  stackedChartWrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, minHeight: 220 },
  stackedCol: { flex: 1, alignItems: "center", minWidth: 74 },
  stackedTotal: { marginBottom: 8, fontSize: 12, color: "#5D7890", fontFamily: "Century Gothic", fontWeight: "700" },
  stackedTrack: { width: "90%", height: 160, borderBottomWidth: 1, borderBottomColor: "#D8E4EE", justifyContent: "flex-end", gap: 2 },
  stackedSegment: { width: "100%", alignItems: "center", justifyContent: "center" },
  stackedSegmentText: { fontSize: 12, color: AppColors.ui.background, fontWeight: "700", fontFamily: "Century Gothic" },
  stackedLabel: { marginTop: 10, fontSize: 12, color: AppColors.gray.dark, fontFamily: "Century Gothic", textAlign: "center" },
  stackedLegendWrap: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceChartShell: { alignItems: "center" },
  priceBarsWrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 22, minHeight: 260, position: "relative", paddingTop: 6 },
  priceArrowOverlay: { position: "absolute", left: 0, top: 0 },
  priceBarCol: { alignItems: "center", position: "relative" },
  priceBarTrack: { width: "100%", borderBottomWidth: 1, borderBottomColor: "#D8E4EE", justifyContent: "flex-end" },
  priceBarFill: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  priceBarLabel: { marginTop: 8, fontSize: 12, color: AppColors.gray.dark, fontFamily: "Century Gothic" },
  priceDeltaRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deltaPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#CBE3EE", backgroundColor: "#EFF8FC" },
  deltaText: { fontSize: 12, color: "#2D728F", fontWeight: "700", fontFamily: "Century Gothic" },
  priceComparisonChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#D9EAF3", backgroundColor: "#F8FBFE", paddingHorizontal: 10, paddingVertical: 6 },
  priceComparisonLabel: { color: "#355D79", fontSize: 12, fontFamily: "Century Gothic" },
  priceComparisonArrow: { color: "#6B8AA1", fontSize: 12, fontWeight: "700", fontFamily: "Century Gothic" },
  miniMetricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  miniMetricCard: { width: "15.8%", minWidth: 150, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: "#E1EAF3", backgroundColor: AppColors.ui.background, padding: 14 },
  miniMetricLabel: { color: "#6B8297", fontSize: 12, fontFamily: "Century Gothic" },
  miniMetricValue: { marginTop: 12, color: "#173A5B", fontSize: 26, lineHeight: 30, fontWeight: "700", fontFamily: "Century Gothic" },
  miniMetricSub: { marginTop: 10, color: "#90A1AF", fontSize: 12, fontFamily: "Century Gothic" },
  lowerAnalyticsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  ringMetricRow: { flexDirection: "row", justifyContent: "space-around", gap: 14, flexWrap: "wrap" },
  ringMetricItem: { alignItems: "center", width: 130, position: "relative" },
  ringMetricCenter: { position: "absolute", top: 34, left: 0, right: 0, alignItems: "center" },
  ringMetricValue: { color: AppColors.primary.main, fontSize: 22, fontWeight: "700", fontFamily: "Century Gothic" },
  ringMetricLabel: { marginTop: 8, color: "#567287", fontSize: 12, textAlign: "center", fontFamily: "Century Gothic" },
  performanceBanner: { flex: 1, minWidth: 260, minHeight: 214, borderRadius: 18, overflow: "hidden" },
  performanceBannerImage: { borderRadius: 18 },
  performanceOverlay: { flex: 1, backgroundColor: "rgba(17,47,72,0.72)", padding: 20, justifyContent: "center" },
  performanceTitle: { color: AppColors.ui.background, fontSize: 30, fontWeight: "700", fontFamily: "Century Gothic" },
  performanceText: { marginTop: 8, color: "#D8E9F2", fontSize: 14, fontFamily: "Century Gothic" },
  performanceButton: { alignSelf: "flex-start", marginTop: 22, backgroundColor: AppColors.ui.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  performanceButtonText: { color: "#173A5B", fontSize: 13, fontWeight: "700", fontFamily: "Century Gothic" },
  tableCard: { borderRadius: 18, borderWidth: 1, borderColor: "#E1EAF3", backgroundColor: AppColors.ui.background, padding: 14, gap: 10 },
  tableCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  tableCardTitle: { color: "#1C5377", fontSize: 18, fontWeight: "700", fontFamily: "Century Gothic" },
  tableCardCta: { color: AppColors.primary.main, fontSize: 13, fontWeight: "700", fontFamily: "Century Gothic" },
  tableInnerWrap: { gap: 8 },
  tableWrap: { borderRadius: 14, borderWidth: 1, borderColor: "#E1EAF3", overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E8EFF5", backgroundColor: AppColors.ui.background },
  tableRowAlt: { backgroundColor: "#F8FBFD" },
  tableHeaderRow: { backgroundColor: AppColors.primary.main },
  tableCell: { minWidth: 130, paddingHorizontal: 12, paddingVertical: 13, fontSize: 12, color: "#2A5A79", fontFamily: "Century Gothic", borderRightWidth: 1, borderRightColor: "#E8EFF5" },
  tableHeaderCell: { color: AppColors.ui.background, fontWeight: "700", borderRightColor: "rgba(255,255,255,0.18)" },
  tableCellRight: { textAlign: "right" },
  hotelBenchmarkMainHeaderRow: { backgroundColor: "#8FBCCA", minHeight: 66 },
  hotelBenchmarkCellBase: { minWidth: 0, paddingHorizontal: 10 },
  hotelBenchmarkMainHeaderCell: { color: AppColors.ui.background, fontWeight: "700", borderRightColor: "rgba(255,255,255,0.48)", textAlign: "center", textAlignVertical: "center", backgroundColor: "#8FBCCA", fontSize: 12.5 },
  hotelBenchmarkGroupHeaderCell: { color: AppColors.ui.background, fontWeight: "700", borderRightColor: "rgba(255,255,255,0.48)", textAlign: "center", textAlignVertical: "center", backgroundColor: "#33859E", fontSize: 12.5 },
  hotelBenchmarkGroupStartEdge: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.72)" },
  hotelBenchmarkGroupEndEdge: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.72)" },
  hotelBenchmarkSubHeaderRow: { backgroundColor: "#33859E", minHeight: 52 },
  hotelBenchmarkSubHeaderCell: { color: AppColors.ui.background, fontWeight: "700", borderRightColor: "rgba(255,255,255,0.30)", textAlign: "center", textAlignVertical: "center", backgroundColor: "#33859E", fontSize: 12 },
  hotelBenchmarkSubHeaderCellStart: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.72)" },
  hotelBenchmarkSubHeaderCellEnd: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.72)" },
  hotelBenchmarkEmptyHeadCell: { color: "transparent", borderTopWidth: 0 },
  hotelBenchmarkEntityCell: { color: "#111B25", fontSize: 15, fontWeight: "700" },
  hotelBenchmarkStrongNumberCell: { color: "#132A3A", fontWeight: "700" },
  hotelBenchmarkGroupedCellStart: { borderLeftWidth: 1, borderLeftColor: "#D1E4EE" },
  hotelBenchmarkGroupedCellEnd: { borderRightWidth: 1, borderRightColor: "#D1E4EE" },
  hotelBenchmarkAverageRow: { backgroundColor: "#8BC8D4" },
  hotelBenchmarkAverageCell: { fontWeight: "700", color: "#0E2D3E" },
  insightBanner: { flexDirection: "row", gap: 14, alignItems: "stretch" },
  insightBoard: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: "#D9EAF3", backgroundColor: "#F5FBFF", padding: 14, gap: 10 },
  insightBoardTitle: { fontSize: 16, fontWeight: "700", color: AppColors.primary.main, fontFamily: "Century Gothic" },
  insightRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  insightIndexPill: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: AppColors.primary.main },
  insightIndexText: { color: AppColors.ui.background, fontSize: 12, fontWeight: "700", fontFamily: "Century Gothic" },
  insightText: { flex: 1, fontSize: 14, lineHeight: 22, color: AppColors.ui.text, fontFamily: "Century Gothic" },
  insightArt: { width: 180, height: 140, alignSelf: "center", opacity: 0.95 },
  heatmapWrap: { gap: 6 },
  heatmapHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heatmapDataRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heatmapProjectCol: { minWidth: 170 },
  heatmapHeaderText: { minWidth: 92, fontSize: 12, color: AppColors.primary.main, fontWeight: "700", fontFamily: "Century Gothic" },
  heatmapProjectText: { minWidth: 170, fontSize: 13, color: AppColors.ui.text, fontFamily: "Century Gothic" },
  heatmapCell: { minWidth: 92, height: 20, borderRadius: 4 },
  questionCard: { marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: AppColors.primary.light, backgroundColor: `${AppColors.primary.light}22`, padding: 10, gap: 4 },
  questionTitle: { fontSize: 14, fontWeight: "700", color: AppColors.primary.main, fontFamily: "Century Gothic" },
  questionItem: { fontSize: 14, color: AppColors.ui.text, fontFamily: "Century Gothic", lineHeight: 22 },
});
