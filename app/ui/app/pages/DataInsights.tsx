import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { MetricTile } from "../components/MetricTile";
import { QueryState } from "../components/QueryState";
import {
  DATA_SINGLE_VALUE,
  DATA_BY_CARRIER,
  DATA_TOP_ROUTES,
  type CarrierRow,
  type RouteRow,
} from "../queries";

const num = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Math.round(Number(v)).toLocaleString();
const min1 = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(2)} min`;

interface CarrierDisplay {
  carrier: string;
  flights: string;
  dep_delay: string;
}
const carrierColumns: DataTableColumnDef<CarrierDisplay>[] = [
  { id: "carrier", header: "Carrier", accessor: "carrier", width: "1fr" },
  { id: "flights", header: "Flights (sample)", accessor: "flights", width: "1fr" },
  { id: "dep_delay", header: "Avg departure delay", accessor: "dep_delay", width: "1.5fr" },
];

interface RouteDisplay {
  route: string;
  flights: string;
}
const routeColumns: DataTableColumnDef<RouteDisplay>[] = [
  { id: "route", header: "Route", accessor: "route", width: "1fr" },
  { id: "flights", header: "Flights (sample)", accessor: "flights", width: "1fr" },
];

export const DataInsights = () => {
  const carriers = useDql<CarrierRow>({ query: DATA_BY_CARRIER });
  const routes = useDql<RouteRow>({ query: DATA_TOP_ROUTES });

  const carrierRows = useMemo<CarrierDisplay[]>(
    () =>
      (carriers.data?.records ?? []).map((r) => ({
        carrier: String(r.carrier ?? "—"),
        flights: num(r.flights_n),
        dep_delay: min1(r.dep_delay),
      })),
    [carriers.data],
  );

  const routeRows = useMemo<RouteDisplay[]>(
    () =>
      (routes.data?.records ?? []).map((r) => ({
        route: String(r.route ?? "—"),
        flights: num(r.flights),
      })),
    [routes.data],
  );

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Data insights</Heading>
        <Paragraph>
          Business aggregates computed from the actual Iceberg table rows (sampled) and ingested
          as <code>s3tables.data.*</code> metrics — the data-level signal beyond storage and
          schema. Flight counts reflect the analyzed sample.
        </Paragraph>
      </Flex>

      <Heading level={5}>Fleet summary</Heading>
      <Flex gap={16} flexFlow="wrap">
        <MetricTile {...DATA_SINGLE_VALUE.rowsAnalyzed} label="Rows analyzed" />
        <MetricTile {...DATA_SINGLE_VALUE.distinctCarriers} label="Distinct carriers" />
        <MetricTile {...DATA_SINGLE_VALUE.avgDepDelay} label="Avg departure delay (min)" format="raw" />
        <MetricTile {...DATA_SINGLE_VALUE.cancelRate} label="Cancellation rate (%)" format="raw" />
      </Flex>

      <Flex gap={24} flexFlow="wrap" alignItems="flex-start">
        <Flex flexDirection="column" gap={8} style={{ flex: "1 1 420px", minWidth: 360 }}>
          <Heading level={5}>Flights &amp; delays by carrier</Heading>
          <Surface style={{ padding: 16 }}>
            {carriers.isLoading || carriers.error ? (
              <QueryState isLoading={carriers.isLoading} error={carriers.error} />
            ) : (
              <DataTable data={carrierRows} columns={carrierColumns} />
            )}
          </Surface>
        </Flex>

        <Flex flexDirection="column" gap={8} style={{ flex: "1 1 360px", minWidth: 320 }}>
          <Heading level={5}>Top routes</Heading>
          <Surface style={{ padding: 16 }}>
            {routes.isLoading || routes.error ? (
              <QueryState isLoading={routes.isLoading} error={routes.error} />
            ) : (
              <DataTable data={routeRows} columns={routeColumns} />
            )}
          </Surface>
        </Flex>
      </Flex>
    </Flex>
  );
};
