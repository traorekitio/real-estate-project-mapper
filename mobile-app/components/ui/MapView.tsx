import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import { useFocusEffect } from "@react-navigation/native"; // <-- import

type Project = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type MapViewProps = {
  mapType?: "standard" | "satellite" | "hybrid" | "terrain";
};

export default function MapScreen({ mapType = "standard" }: MapViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch projects depuis Supabase chaque fois que l'écran est focus
  const fetchProjects = async () => {
    const { data, error } = await supabase.from("projects").select("*");
    if (error) {
      console.log("Error fetching projects:", error);
    } else {
      setProjects(data as Project[]);
    }
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
        {projects.map((project) => (
          <Marker
            key={project.id}
            coordinate={{
              latitude: project.latitude,
              longitude: project.longitude,
            }}
            title={project.name}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});