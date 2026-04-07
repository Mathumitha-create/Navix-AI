export const chennai = {
  name: "Chennai",
  lat: 13.0827,
  lng: 80.2707,
};

export const bangalore = {
  name: "Bangalore",
  lat: 12.9716,
  lng: 77.5946,
};

export const routeCenter = {
  lat: (chennai.lat + bangalore.lat) / 2,
  lng: (chennai.lng + bangalore.lng) / 2,
};

export const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#05070a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#05070a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6f7a88" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#151922" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#96a2b4" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b8c5d9" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#596273" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0b1516" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#131820" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#11161d" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7d899a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#16303b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#214a5a" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c7e7f6" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#071826" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f708a" }],
  },
];
