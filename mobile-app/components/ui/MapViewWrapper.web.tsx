import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";

let LoadedMapContainer: any = null;
let LoadedTileLayer: any = null;
let LoadedMarker: any = null;
let LoadedPopup: any = null;
let LoadedUseMapEvent: any = null;
let LoadedUseMap: any = null;
let LoadedL: any = null;

const ensureLeafletStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("leaflet-css")) return;

  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
};

const loadLeaflet = async () => {
  if (typeof window === "undefined") return;
  if (LoadedMapContainer) return;

  ensureLeafletStyles();
  const reactLeaflet = await import("react-leaflet");
  const L = await import("leaflet");

  const defaultIcon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  L.Marker.prototype.options.icon = defaultIcon;

  LoadedL = L;
  LoadedMapContainer = reactLeaflet.MapContainer;
  LoadedTileLayer = reactLeaflet.TileLayer;
  LoadedMarker = reactLeaflet.Marker;
  LoadedPopup = reactLeaflet.Popup;
  LoadedUseMapEvent = reactLeaflet.useMapEvent;
  LoadedUseMap = reactLeaflet.useMap;
};

const regionToZoom = (latitudeDelta?: number) => {
  if (!latitudeDelta || latitudeDelta <= 0) return 10;
  const rawZoom = Math.round(Math.log2(360 / latitudeDelta));
  return Math.max(2, Math.min(20, rawZoom));
};

function MapEvents({ onPress }: { onPress?: (...args: any[]) => void }) {
  if (!LoadedUseMapEvent) return null;

  LoadedUseMapEvent("click", (event: any) => {
    if (typeof onPress !== "function") return;
    onPress({
      nativeEvent: {
        coordinate: {
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        },
      },
    });
  });

  return null;
}

function MapRegionController({ region }: { region?: any }) {
  const map = LoadedUseMap();

  useEffect(() => {
    if (!region || !region.latitude || !region.longitude) return;

    const center: [number, number] = [region.latitude, region.longitude];
    const zoom = regionToZoom(region.latitudeDelta);
    map.setView(center, zoom, { animate: true });
  }, [map, region]);

  return null;
}

function MapReadyController({ onMapReady }: { onMapReady?: (api: any) => void }) {
  const map = LoadedUseMap();

  useEffect(() => {
    if (!onMapReady || !LoadedL) return;

    onMapReady({
      getContainerElement: () => map.getContainer(),
      latLngToContainerPoint: (coordinate: { latitude: number; longitude: number }) => {
        const point = map.latLngToContainerPoint([coordinate.latitude, coordinate.longitude]);
        return { x: point.x, y: point.y };
      },
      animateToRegion: (region: any) => {
        if (!region?.latitude || !region?.longitude) return;
        map.setView([region.latitude, region.longitude], regionToZoom(region.latitudeDelta), {
          animate: true,
        });
      },
    });
  }, [map, onMapReady]);

  return null;
}

export function Marker(props: any) {
  if (!LoadedMarker || !LoadedL) return null;

  const { coordinate, onPress, iconHtml, iconSize = [36, 36], anchor, ...rest } = props;
  const position = coordinate
    ? [coordinate.latitude, coordinate.longitude]
    : undefined;

  const eventHandlers = onPress
    ? {
        click: (event: any) => {
          onPress({
            nativeEvent: {
              coordinate: {
                latitude: event.latlng.lat,
                longitude: event.latlng.lng,
              },
            },
          });
        },
      }
    : undefined;

  let icon = undefined;
  if (iconHtml) {
    const normalizedSize = Array.isArray(iconSize) ? iconSize : [iconSize, iconSize];
    const anchorPixels = anchor && typeof anchor === "object"
      ? [normalizedSize[0] * (anchor.x ?? 0.5), normalizedSize[1] * (anchor.y ?? 0.5)]
      : [normalizedSize[0] / 2, normalizedSize[1] / 2];

    icon = LoadedL.divIcon({
      html: iconHtml,
      className: "",
      iconSize: normalizedSize,
      iconAnchor: anchorPixels,
    });
  }

  return <LoadedMarker position={position} icon={icon} eventHandlers={eventHandlers} {...rest} />;
}

export function Popup(props: any) {
  if (!LoadedPopup) return null;
  return <LoadedPopup {...props} />;
}

const MapViewWrapper = forwardRef<any, any>(function MapViewWrapper({ children, style, onMapReady, ...props }, ref) {
  const [ready, setReady] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.5731, -7.5898]);
  const mapRef = useRef<any>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    if (props.initialRegion?.latitude && props.initialRegion?.longitude) {
      return [props.initialRegion.latitude, props.initialRegion.longitude];
    }
    return [33.5731, -7.5898];
  }, [props.initialRegion]);

  const tileLayerUrl = useMemo(() => {
    switch (props.mapType) {
      case "satellite":
      case "hybrid":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      case "terrain":
        return "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      default:
        return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    }
  }, [props.mapType]);

  const tileAttribution = useMemo(() => {
    switch (props.mapType) {
      case "satellite":
      case "hybrid":
        return 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
      case "terrain":
        return 'Map data &copy; OpenStreetMap contributors, CC-BY-SA, SRTM | Tiles &copy; OpenTopoMap (CC-BY-SA)';
      default:
        return '&copy; OpenStreetMap contributors &copy; CARTO';
    }
  }, [props.mapType]);

  useEffect(() => {
    loadLeaflet().then(() => setReady(true));
  }, []);

  useEffect(() => {
    setMapCenter(initialCenter);
  }, [initialCenter]);

  useEffect(() => {
    if (props.region && Array.isArray(props.region)) return;
    if (!props.region || !props.region.latitude || !props.region.longitude) return;
    setMapCenter([props.region.latitude, props.region.longitude]);
  }, [props.region]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      if (!mapRef.current || !region?.latitude || !region?.longitude) return;
      mapRef.current.setView([region.latitude, region.longitude], regionToZoom(region.latitudeDelta), {
        animate: true,
      });
    },
  }));

  if (!ready || !LoadedMapContainer || !LoadedTileLayer) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <LoadedMapContainer
        center={mapCenter}
        zoom={regionToZoom(props.initialRegion?.latitudeDelta)}
        style={styles.map}
        ref={mapRef}
      >
        <LoadedTileLayer
          attribution={tileAttribution}
          url={tileLayerUrl}
          crossOrigin="anonymous"
        />
        <MapEvents onPress={props.onPress} />
        <MapRegionController region={props.region} />
        <MapReadyController onMapReady={onMapReady} />
        {children}
      </LoadedMapContainer>
    </View>
  );
});

export default MapViewWrapper;

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
