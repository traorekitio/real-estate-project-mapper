import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { AppColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

const HERO_CITY_IMAGE = require("../../assets/images/home/hero-city.jpeg");
const HERO_MAP_IMAGE = require("../../assets/images/home/hero-map.png");

const QUICK_MAP_IMAGE = {
  uri: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80",
};

const QUICK_PROJECT_IMAGE = {
  uri: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
};

const QUICK_DASHBOARD_IMAGE = {
  uri: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
};

const PPT_PREVIEW_IMAGE = {
  uri: "https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1000&q=80",
};

type Stats = {
  totalProjects: number;
  collectifProjects: number;
  villaProjects: number;
  lotProjects: number;
  retailProjects: number;
  bureauProjects: number;
  santeProjects: number;
  hotelProjects: number;
  loisirProjects: number;
  sportProjects: number;
  educationProjects: number;
  artCultureProjects: number;
};

const SIDEBAR_WIDTH = 88;

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    collectifProjects: 0,
    villaProjects: 0,
    lotProjects: 0,
    retailProjects: 0,
    bureauProjects: 0,
    santeProjects: 0,
    hotelProjects: 0,
    loisirProjects: 0,
    sportProjects: 0,
    educationProjects: 0,
    artCultureProjects: 0,
  });

  const fetchStats = async () => {
    const { data, error } = await supabase.from("projects").select("project_type");

    if (error || !data) return;

    setStats({
      totalProjects: data.length,
      collectifProjects: data.filter((p: any) => p.project_type?.includes("Collectif")).length,
      villaProjects: data.filter((p: any) => p.project_type?.includes("Villa")).length,
      lotProjects: data.filter((p: any) => p.project_type?.includes("Lot")).length,
      retailProjects: data.filter((p: any) => p.project_type?.includes("Retail")).length,
      bureauProjects: data.filter((p: any) => p.project_type?.includes("Bureau")).length,
      santeProjects: data.filter((p: any) => {
        const type = (p.project_type || "").toLowerCase();
        return type.includes("sante") || type.includes("santé");
      }).length,
      hotelProjects: data.filter((p: any) => p.project_type?.includes("Hotel") || p.project_type?.includes("Hôtel")).length,
      loisirProjects: data.filter((p: any) => p.project_type?.includes("Loisir")).length,
      sportProjects: data.filter((p: any) => p.project_type?.includes("Sport")).length,
      educationProjects: data.filter((p: any) => p.project_type?.includes("Education")).length,
      artCultureProjects: data.filter((p: any) => p.project_type?.includes("Art et culture")).length,
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const progress = useMemo(() => {
    const maxTarget = 20;
    return Math.min((stats.totalProjects / maxTarget) * 100, 100);
  }, [stats.totalProjects]);

  const isCompact = Dimensions.get("window").width < 940;
  const overviewStats = [
    { icon: "🏢", value: stats.collectifProjects, label: "Collectif" },
    { icon: "🏡", value: stats.villaProjects, label: "Villa" },
    { icon: "🏘", value: stats.lotProjects, label: "Lots" },
    { icon: "🛍", value: stats.retailProjects, label: "Retail" },
    { icon: "🏬", value: stats.bureauProjects, label: "Bureau" },
    { icon: "🩺", value: stats.santeProjects, label: "Sante" },
    { icon: "🏨", value: stats.hotelProjects, label: "Hotel" },
    { icon: "🎯", value: stats.loisirProjects, label: "Loisir" },
    { icon: "⚽", value: stats.sportProjects, label: "Sport" },
    { icon: "🎓", value: stats.educationProjects, label: "Education" },
    { icon: "🎭", value: stats.artCultureProjects, label: "Art et culture" },
  ];

  return (
    <View style={styles.screen}>
      {!isCompact && (
        <View style={styles.sidebar}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/logos/logo.png")} style={styles.logoImage} />
            <Text style={styles.logoText}>Real Estate Mapper</Text>
          </View>

          <View style={styles.sidebarNav}>
            <SidebarItem label="Accueil" icon="⌂" active />
            <SidebarItem label="Explorer la Carte" icon="◧" onPress={() => router.push("/(tabs)/explore")} />
            <SidebarItem label="Ajouter Projet" icon="+" onPress={() => router.push("/(tabs)/AddProject")} />
            <SidebarItem label="Dashboards" icon="▥" onPress={() => router.push("/(tabs)/dashboard")} />
          </View>

          <View style={styles.sidebarFooter}>
            <Text style={styles.sidebarFooterText}>Mon compte</Text>
            <View style={styles.modePill}>
              <View style={styles.modeDotOff} />
              <View style={styles.modeDotOn} />
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground source={HERO_CITY_IMAGE} style={[styles.hero, isCompact && styles.heroCompact]} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay}>
            <View style={styles.heroSoftLight} />
            <View style={[styles.heroLeft, isCompact && styles.heroLeftCompact]}>
              <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Pilotez vos projets immobiliers{"\n"}avec intelligence.</Text>
              <Text style={[styles.heroSubtitle, isCompact && styles.heroSubtitleCompact]}>
                Cartographiez, analysez et prenez les meilleures decisions a partir d'une plateforme unique et intuitive.
              </Text>
              <View style={styles.badgesRow}>
                <Badge text="Donnees fiables" />
                <Badge text="Vue terrain instantanee" />
                <Badge text="Decisions eclairees" />
              </View>
            </View>

            <View style={[styles.heroRightClip, isCompact && styles.heroRightClipCompact]}>
              <View style={styles.heroCurveRim} />
              <Image source={HERO_MAP_IMAGE} style={styles.heroMapImage} />
            </View>
          </View>
        </ImageBackground>

        <Text style={styles.sectionHeading}>Acces rapides</Text>
        <View style={[styles.quickRow, isCompact && styles.quickColumn]}>
          <QuickCard
            title="Explorer la Carte"
            subtitle="Visualisez tous les projets sur la carte interactive"
            buttonLabel="Explorer"
            imageSource={QUICK_MAP_IMAGE}
            onPress={() => router.push("/(tabs)/explore")}
            icon="⌖"
          />
          <QuickCard
            title="Ajouter un Projet"
            subtitle="Creez et geolocalisez un nouveau projet"
            buttonLabel="Ajouter"
            imageSource={QUICK_PROJECT_IMAGE}
            onPress={() => router.push("/(tabs)/AddProject")}
            icon="✚"
          />
          <QuickCard
            title="Dashboards"
            subtitle="Suivez vos KPIs et analysez vos donnees"
            buttonLabel="Consulter"
            imageSource={QUICK_DASHBOARD_IMAGE}
            onPress={() => router.push("/(tabs)/dashboard")}
            icon="▤"
          />
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Vue d'ensemble</Text>
          <View style={[styles.overviewGrid, isCompact && styles.overviewStack]}>
            <View style={styles.overviewMainCol}>
              <Text style={styles.overviewBigNumber}>{stats.totalProjects}</Text>
              <Text style={styles.overviewMainLabel}>Projets Total</Text>
              <View style={styles.progressLineTrack}>
                <View style={[styles.progressLineFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.overviewStatsWrap}>
              {overviewStats.map((item) => (
                <StatMini key={item.label} icon={item.icon} value={item.value} label={item.label} />
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.bottomRow, isCompact && styles.quickColumn]}>
          <View style={styles.bottomLeftCol}>
            <View style={styles.infoCardBlock}>
              <Text style={styles.bottomBlockTitle}>Fonctionnalites cles</Text>
              <View style={styles.featureGrid}>
                <FeaturePill icon="🎯" title="Marqueurs Personnalisables" subtitle="Ajustez taille, couleur et style" />
                <FeaturePill icon="🛰" title="Vues Multiples" subtitle="Standard, Satellite, Hybrid" />
                <FeaturePill icon="📋" title="Donnees Detaillees" subtitle="Toutes les infos au meme endroit" />
                <FeaturePill icon="🔄" title="Synchronisation Temps Reel" subtitle="Toujours a jour et accessibles" />
              </View>
            </View>

            <View style={styles.infoCardBlock}>
              <Text style={styles.bottomBlockTitle}>A savoir</Text>
              <KnowItem title="Commencez Maintenant" text="Cliquez sur Ajouter Projet pour creer votre premier projet immobilier" tone="pink" />
              <KnowItem title="Personnalisez" text="Explorez les parametres des marqueurs pour adapter l'affichage" tone="blue" />
              <KnowItem title="Analysez" text="Cliquez sur chaque marqueur pour voir les details complets" tone="teal" />
            </View>
          </View>

          <View style={styles.pptCard}>
            <Text style={styles.evolutionLabel}>Prochaine evolution</Text>
            <Text style={styles.pptTitle}>Export Benchmark PPT</Text>
            <Text style={styles.pptDesc}>
              Generez automatiquement des decks de benchmark professionnels a partir de vos donnees.
            </Text>
            <Image source={PPT_PREVIEW_IMAGE} style={styles.pptImage} />
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88}>
              <Text style={styles.primaryButtonText}>En savoir plus</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SidebarItem = ({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.sidebarItem, active && styles.sidebarItemActive]}
  >
    <Text style={[styles.sidebarIcon, active && styles.sidebarIconActive]}>{icon}</Text>
    <Text style={[styles.sidebarItemText, active && styles.sidebarItemTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Badge = ({ text }: { text: string }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

const QuickCard = ({
  title,
  subtitle,
  buttonLabel,
  imageSource,
  onPress,
  icon,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  imageSource: { uri: string };
  onPress: () => void;
  icon: string;
}) => (
  <View style={styles.quickCard}>
    <View style={styles.quickCardTop}>
      <View style={styles.quickTitleRow}>
        <View style={styles.quickIconWrap}>
          <Text style={styles.quickIcon}>{icon}</Text>
        </View>
        <View style={styles.quickTitleCol}>
          <Text style={styles.quickCardTitle}>{title}</Text>
          <Text style={styles.quickCardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Image source={imageSource} style={styles.quickCardImage} />
    </View>

    <TouchableOpacity style={styles.secondaryButton} onPress={onPress} activeOpacity={0.88}>
      <Text style={styles.secondaryButtonText}>{buttonLabel}</Text>
    </TouchableOpacity>
  </View>
);

const StatMini = ({ icon, value, label }: { icon: string; value: number; label: string }) => (
  <View style={styles.statMiniCard}>
    <Text style={styles.statMiniIcon}>{icon}</Text>
    <Text style={styles.statMiniValue}>{value}</Text>
    <Text style={styles.statMiniLabel}>{label}</Text>
  </View>
);

const FeaturePill = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <View style={styles.featurePill}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureTextWrap}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const KnowItem = ({ title, text, tone }: { title: string; text: string; tone: "pink" | "blue" | "teal" }) => (
  <View
    style={[
      styles.knowItem,
      tone === "pink" && styles.knowPink,
      tone === "blue" && styles.knowBlue,
      tone === "teal" && styles.knowTeal,
    ]}
  >
    <View style={styles.knowTextWrap}>
      <Text style={styles.knowTitle}>{title}</Text>
      <Text style={styles.knowDesc}>{text}</Text>
    </View>
    <Text style={styles.knowArrow}>›</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F8FC",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: "#08365A",
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  logoWrap: {
    alignItems: "center",
    gap: 6,
  },
  logoImage: {
    width: 54,
    height: 54,
    borderRadius: 14,
  },
  logoText: {
    color: "#D4E9F5",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  sidebarNav: {
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  sidebarItem: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  sidebarItemActive: {
    backgroundColor: "#1E5E87",
  },
  sidebarIcon: {
    color: "#B7D1E3",
    fontSize: 14,
    fontWeight: "700",
  },
  sidebarIconActive: {
    color: "#FFFFFF",
  },
  sidebarItemText: {
    color: "#D4E9F5",
    fontSize: 10,
    textAlign: "center",
    fontWeight: "600",
  },
  sidebarItemTextActive: {
    color: "#FFFFFF",
  },
  sidebarFooter: {
    alignItems: "center",
    gap: 8,
  },
  sidebarFooterText: {
    color: "#D4E9F5",
    fontSize: 10,
    fontWeight: "600",
  },
  modePill: {
    width: 50,
    height: 24,
    borderRadius: 14,
    backgroundColor: "#0E4A72",
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modeDotOff: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FFED7A",
  },
  modeDotOn: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#74D1FF",
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 14,
    gap: 12,
  },
  hero: {
    minHeight: 252,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCEAF3",
  },
  heroCompact: {
    minHeight: 220,
  },
  heroImage: {
    resizeMode: "cover",
    opacity: 0.98,
  },
  heroOverlay: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  heroSoftLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245,250,255,0.06)",
  },
  heroLeft: {
    width: "64%",
    paddingVertical: 24,
    paddingHorizontal: 28,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  heroLeftCompact: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    width: "66%",
  },
  heroRightClip: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "40.5%",
    borderTopLeftRadius: 210,
    borderBottomLeftRadius: 210,
    overflow: "hidden",
    backgroundColor: "#E4F1FA",
  },
  heroRightClipCompact: {
    width: "41.5%",
    borderTopLeftRadius: 142,
    borderBottomLeftRadius: 142,
  },
  heroCurveRim: {
    position: "absolute",
    top: -4,
    bottom: -4,
    left: -42,
    width: 78,
    borderTopRightRadius: 210,
    borderBottomRightRadius: 210,
    backgroundColor: "rgba(255,255,255,0.78)",
    zIndex: 2,
  },
  heroMapImage: {
    width: "100%",
    height: "100%",
    opacity: 0.98,
  },
  heroTitle: {
    color: "#11365B",
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    fontFamily: "Century Gothic",
    maxWidth: 700,
  },
  heroTitleCompact: {
    fontSize: 30,
    lineHeight: 36,
    maxWidth: 480,
  },
  heroSubtitle: {
    color: "#355B77",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 9,
    maxWidth: 620,
    fontFamily: "Century Gothic",
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 420,
    marginTop: 8,
  },
  badgesRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "#D8EAF5",
  },
  badgeText: {
    color: "#2D5876",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Century Gothic",
  },
  sectionHeading: {
    color: "#1A3E5A",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Century Gothic",
    marginTop: 6,
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickColumn: {
    flexDirection: "column",
  },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    minHeight: 130,
  },
  quickCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  quickTitleRow: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#E7F4FB",
    alignItems: "center",
    justifyContent: "center",
  },
  quickIcon: {
    color: "#0D88AF",
    fontWeight: "700",
    fontSize: 18,
  },
  quickTitleCol: {
    flex: 1,
  },
  quickCardTitle: {
    color: "#1A3E5A",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  quickCardSubtitle: {
    color: "#54728B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    fontFamily: "Century Gothic",
  },
  quickCardImage: {
    width: 120,
    height: 78,
    borderRadius: 10,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#1094B7",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Century Gothic",
  },
  overviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  overviewTitle: {
    color: "#1A3E5A",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
    fontFamily: "Century Gothic",
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  overviewStack: {
    flexWrap: "wrap",
  },
  overviewMainCol: {
    minWidth: 180,
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: "#E6F0F7",
    paddingRight: 10,
    justifyContent: "center",
  },
  overviewStatsWrap: {
    flex: 1.8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  overviewBigNumber: {
    color: "#1094B7",
    fontSize: 52,
    lineHeight: 54,
    fontWeight: "800",
    fontFamily: "Century Gothic",
  },
  overviewMainLabel: {
    color: "#35607A",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 8,
    fontFamily: "Century Gothic",
  },
  progressLineTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: "#E3EEF6",
    overflow: "hidden",
  },
  progressLineFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#1094B7",
  },
  progressText: {
    color: "#5C7C93",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  statMiniCard: {
    width: "31%",
    minWidth: 102,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0ECF5",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCFEFF",
  },
  statMiniIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  statMiniValue: {
    color: "#1C4E72",
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "800",
    fontFamily: "Century Gothic",
  },
  statMiniLabel: {
    color: "#567287",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
    fontFamily: "Century Gothic",
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  bottomLeftCol: {
    flex: 1.6,
    gap: 12,
  },
  infoCardBlock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  bottomBlockTitle: {
    color: "#1A3E5A",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    fontFamily: "Century Gothic",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featurePill: {
    width: "48.5%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2EDF6",
    backgroundColor: "#FBFDFF",
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: "#18476A",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  featureSubtitle: {
    color: "#5A768D",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
    fontFamily: "Century Gothic",
  },
  knowItem: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
  },
  knowTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  knowTitle: {
    color: "#194C6F",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Century Gothic",
  },
  knowDesc: {
    color: "#5B758A",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Century Gothic",
  },
  knowArrow: {
    color: "#3A6A86",
    fontSize: 18,
    fontWeight: "700",
  },
  knowPink: {
    backgroundColor: "#FFF3F7",
    borderColor: "#FAD4E1",
  },
  knowBlue: {
    backgroundColor: "#F2FAFF",
    borderColor: "#D1E9F8",
  },
  knowTeal: {
    backgroundColor: "#EFFCFB",
    borderColor: "#CBF1EC",
  },
  pptCard: {
    flex: 1,
    minWidth: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCEAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  evolutionLabel: {
    color: "#6E90A9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Century Gothic",
  },
  pptTitle: {
    color: "#1A3E5A",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 4,
    fontFamily: "Century Gothic",
  },
  pptDesc: {
    color: "#4C6D84",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 10,
    fontFamily: "Century Gothic",
  },
  pptImage: {
    width: "100%",
    height: 145,
    borderRadius: 10,
    marginBottom: 10,
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0E89AF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Century Gothic",
  },
});
