import React from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch projects from Supabase
  useEffect(() => {
    const fetchProjects = async () => {
      let { data, error } = await supabase.from("projects").select("*");
      if (error) {
        console.log("Error fetching projects:", error);
      } else {
        setProjects(data as Project[]);
      }
    };

    fetchProjects();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 33.5731, // Casablanca centre
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
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});