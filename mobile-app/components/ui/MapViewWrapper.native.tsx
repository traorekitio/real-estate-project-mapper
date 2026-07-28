import React from "react";
import MapView, { Marker } from "react-native-maps";
import type { MapViewProps } from "react-native-maps";

const MapViewWrapper = React.forwardRef<any, MapViewProps & { onMapReady?: (api: any) => void }>(
  ({ onMapReady, ...props }, ref) => <MapView ref={ref} {...props} />
);
MapViewWrapper.displayName = "MapViewWrapper";

export default MapViewWrapper;
export { Marker };
