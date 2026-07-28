import React from "react";
import { Platform, View, Text, StyleSheet } from "react-native";

let MapViewComponent: any = ({ style, children, ...props }: any) => (
  <View style={[styles.container, style]}>
    <Text style={styles.text}>Carte non disponible sur le web</Text>
  </View>
);

let Marker: any = ({ children }: any) => <>{children}</>;

if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapViewComponent = RNMaps.default;
  Marker = RNMaps.Marker;
}

export default MapViewComponent;
export { Marker };

const styles = StyleSheet.create({
  container: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  text: {
    color: "#333",
    fontSize: 16,
    fontWeight: "700",
  },
});
