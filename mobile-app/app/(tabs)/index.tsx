import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ImageBackground,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppColors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { LogoHeader } from '@/components/LogoHeader';

const { width, height } = Dimensions.get('window');

type Stats = {
  totalProjects: number;
  collectifProjects: number;
  villaProjects: number;
  lotProjects: number;
  retailProjects: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    collectifProjects: 0,
    villaProjects: 0,
    lotProjects: 0,
    retailProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('project_type');
      
      if (error) {
        console.log('Error fetching stats:', error);
        return;
      }

      if (data) {
        const stats: Stats = {
          totalProjects: data.length,
          collectifProjects: data.filter((p: any) => p.project_type?.includes('Collectif')).length,
          villaProjects: data.filter((p: any) => p.project_type?.includes('Villa')).length,
          lotProjects: data.filter((p: any) => p.project_type?.includes('Lot')).length,
          retailProjects: data.filter((p: any) => p.project_type?.includes('Retail')).length,
        };
        setStats(stats);
      }
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* === HEADER HÉROÏQUE === */}
      <View style={styles.heroHeader}>
        <View style={styles.heroOverlay}>
          <LogoHeader size="large" showText={true} centered={true} />
          <Text style={styles.heroTitle}>Real Estate Mapper</Text>
          <Text style={styles.heroSubtitle}>Cartographie Immobilière Intelligente</Text>
          <Text style={styles.heroDescription}>
            Explorez, analysez et gérez vos projets immobiliers en un coup d'œil
          </Text>
        </View>
      </View>

      {/* === SECTION ACTIONS PRINCIPALES === */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={() => navigateTo('/(tabs)/explore')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionCardIcon}>🗺️</Text>
          <Text style={styles.actionCardTitle}>Explorer la Carte</Text>
          <Text style={styles.actionCardDesc}>Visualisez tous les projets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardSecondary]}
          onPress={() => navigateTo('/(tabs)/AddProject')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionCardIcon}>➕</Text>
          <Text style={styles.actionCardTitle}>Ajouter Projet</Text>
          <Text style={styles.actionCardDesc}>Créez un nouveau projet</Text>
        </TouchableOpacity>
      </View>

      {/* === STATISTIQUES === */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Vue d'ensemble</Text>

        {/* Stat principale */}
        <View style={styles.mainStat}>
          <Text style={styles.mainStatNumber}>{stats.totalProjects}</Text>
          <Text style={styles.mainStatLabel}>Projets Total</Text>
          <View style={styles.statBarContainer}>
            <View
              style={[
                styles.statBar,
                { width: `${Math.min((stats.totalProjects / 20) * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Stats par type */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardIcon}>🏢</Text>
            <Text style={styles.statCardNumber}>{stats.collectifProjects}</Text>
            <Text style={styles.statCardLabel}>Collectif</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardIcon}>🏡</Text>
            <Text style={styles.statCardNumber}>{stats.villaProjects}</Text>
            <Text style={styles.statCardLabel}>Villa</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardIcon}>🏘️</Text>
            <Text style={styles.statCardNumber}>{stats.lotProjects}</Text>
            <Text style={styles.statCardLabel}>Lots</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardIcon}>🛍️</Text>
            <Text style={styles.statCardNumber}>{stats.retailProjects}</Text>
            <Text style={styles.statCardLabel}>Retail</Text>
          </View>
        </View>
      </View>

      {/* === FONCTIONNALITÉS CLÉS === */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>✨ Fonctionnalités</Text>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>🎯</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Marqueurs Personnalisables</Text>
            <Text style={styles.featureDescription}>
              Ajustez la taille, couleur et style des marqueurs selon vos besoins
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>🛰️</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Vues Multiples</Text>
            <Text style={styles.featureDescription}>
              Standard, Satellite, Hybrid et Relief pour une analyse complète
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>📋</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Données Détaillées</Text>
            <Text style={styles.featureDescription}>
              Toutes les informations d'un projet au même endroit
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>💾</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Synchronisation Temps Réel</Text>
            <Text style={styles.featureDescription}>
              Vos données sont toujours à jour et accessibles
            </Text>
          </View>
        </View>
      </View>

      {/* === INFO CARDS === */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>💡 À Savoir</Text>

        <View style={[styles.infoCard, { borderLeftColor: AppColors.accent }]}>
          <Text style={styles.infoCardTitle}>Commencez Maintenant</Text>
          <Text style={styles.infoCardText}>
            Cliquez sur "Ajouter Projet" pour créer votre premier projet immobilier
          </Text>
        </View>

        <View style={[styles.infoCard, { borderLeftColor: AppColors.primary.light }]}>
          <Text style={styles.infoCardTitle}>Personnalisez</Text>
          <Text style={styles.infoCardText}>
            Explorez les paramètres des marqueurs pour adapter l'affichage à vos préférences
          </Text>
        </View>

        <View style={[styles.infoCard, { borderLeftColor: AppColors.primary.main }]}>
          <Text style={styles.infoCardTitle}>Analysez</Text>
          <Text style={styles.infoCardText}>
            Cliquez sur chaque marqueur pour voir les détails complets du projet
          </Text>
        </View>
      </View>

      {/* === FOOTER === */}
      <View style={styles.footer}>
        <LogoHeader size="small" showText={true} centered={true} />
        <Text style={styles.footerText}>
          Real Estate Mapper v1.0
        </Text>
        <Text style={styles.footerSubtext}>
          Plateforme de gestion immobilière innovante
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.ui.background,
  },

  // === HERO HEADER ===
  heroHeader: {
    backgroundColor: AppColors.primary.main,
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },

  heroOverlay: {
    alignItems: 'center',
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: AppColors.ui.background,
    fontFamily: 'Century Gothic',
    marginBottom: 8,
    textAlign: 'center',
  },

  heroSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primary.light,
    fontFamily: 'Century Gothic',
    marginBottom: 12,
    textAlign: 'center',
  },

  heroDescription: {
    fontSize: 14,
    color: AppColors.gray.lightest,
    fontFamily: 'Century Gothic',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // === ACTIONS SECTION ===
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
    gap: 12,
  },

  actionCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  actionCardPrimary: {
    backgroundColor: AppColors.primary.main,
  },

  actionCardSecondary: {
    backgroundColor: AppColors.primary.light,
  },

  actionCardIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  actionCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.ui.background,
    fontFamily: 'Century Gothic',
    marginBottom: 4,
  },

  actionCardDesc: {
    fontSize: 13,
    color: AppColors.gray.lightest,
    fontFamily: 'Century Gothic',
  },

  // === STATS SECTION ===
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    marginBottom: 16,
  },

  mainStat: {
    backgroundColor: AppColors.gray.lightest,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: AppColors.primary.main,
  },

  mainStatNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    marginBottom: 8,
  },

  mainStatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.ui.text,
    fontFamily: 'Century Gothic',
    marginBottom: 12,
  },

  statBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.gray.light,
    borderRadius: 4,
    overflow: 'hidden',
  },

  statBar: {
    height: '100%',
    backgroundColor: AppColors.primary.light,
    borderRadius: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  statCard: {
    width: '48%',
    backgroundColor: AppColors.ui.background,
    borderWidth: 2,
    borderColor: AppColors.primary.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  statCardNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    marginBottom: 4,
  },

  statCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.ui.text,
    fontFamily: 'Century Gothic',
    textAlign: 'center',
  },

  // === FEATURES SECTION ===
  featuresSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 12,
  },

  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: AppColors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: 28,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    marginBottom: 4,
  },

  featureDescription: {
    fontSize: 13,
    color: AppColors.ui.text,
    fontFamily: 'Century Gothic',
    lineHeight: 18,
  },

  // === INFO SECTION ===
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  infoCard: {
    backgroundColor: AppColors.gray.lightest,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
  },

  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.primary.main,
    fontFamily: 'Century Gothic',
    marginBottom: 6,
  },

  infoCardText: {
    fontSize: 13,
    color: AppColors.ui.text,
    fontFamily: 'Century Gothic',
    lineHeight: 18,
  },

  // === FOOTER ===
  footer: {
    backgroundColor: AppColors.primary.main,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },

  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.ui.background,
    fontFamily: 'Century Gothic',
    marginBottom: 4,
  },

  footerSubtext: {
    fontSize: 12,
    color: AppColors.primary.light,
    fontFamily: 'Century Gothic',
  },
});
