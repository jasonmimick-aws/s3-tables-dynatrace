export interface LakehouseDataset {
  key: string;
  namespace: string;
  table: string;
  label: string;
  shortLabel: string;
  domain: string;
  accent: string;
  description: string;
}

export const LAKEHOUSE_DATASETS: LakehouseDataset[] = [
  {
    key: "ops/flights",
    namespace: "ops",
    table: "flights",
    label: "Airline on-time performance",
    shortLabel: "Flights",
    domain: "Operations",
    accent: "#73e5ff",
    description: "Flight activity, delays, cancellations, routes, and emissions.",
  },
  {
    key: "rides/trips",
    namespace: "rides",
    table: "trips",
    label: "Urban mobility trips",
    shortLabel: "Trips",
    domain: "Mobility",
    accent: "#a9f27c",
    description: "Trip volume, distance, fares, tips, zones, and payment methods.",
  },
  {
    key: "retail/orders",
    namespace: "retail",
    table: "orders",
    label: "E-commerce orders",
    shortLabel: "Orders",
    domain: "Retail",
    accent: "#ffc857",
    description: "Orders, product mix, channels, countries, revenue, and status.",
  },
  {
    key: "iot/sensor_readings",
    namespace: "iot",
    table: "sensor_readings",
    label: "Device telemetry",
    shortLabel: "Sensors",
    domain: "IoT",
    accent: "#a995ff",
    description: "Device health, temperature, humidity, battery, and site signals.",
  },
  {
    key: "security/auth_events",
    namespace: "security",
    table: "auth_events",
    label: "Authentication events",
    shortLabel: "Auth",
    domain: "Security",
    accent: "#ff7f7f",
    description: "Authentication outcomes, actions, geography, MFA, and risk scores.",
  },
];

export const datasetByKey = (key: string) =>
  LAKEHOUSE_DATASETS.find((dataset) => dataset.key === key);

export const allDatasetKeys = () => LAKEHOUSE_DATASETS.map((dataset) => dataset.key);

const ACCENTS = ["#73e5ff", "#a9f27c", "#ffc857", "#a995ff", "#ff7f7f", "#67d8b5", "#f49ac2"];

const titleCase = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

/** Build a customer-neutral descriptor for any namespace/table discovered at runtime. */
export const describeDataset = (namespace: string, table: string, index = 0): LakehouseDataset => {
  const key = `${namespace}/${table}`;
  const known = datasetByKey(key);
  if (known) return known;
  return {
    key,
    namespace,
    table,
    label: titleCase(table),
    shortLabel: titleCase(table),
    domain: titleCase(namespace),
    accent: ACCENTS[index % ACCENTS.length],
    description: `Iceberg table in the ${namespace} namespace.`,
  };
};
