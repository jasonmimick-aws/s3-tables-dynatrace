import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { QueryState } from "../components/QueryState";
import {
  SCHEMA_EVENTS,
  LATEST_SCHEMA_STATE,
  type SchemaEventRecord,
} from "../queries";

interface SchemaFieldRow {
  id: number;
  name: string;
  type: string;
}

const eventColumns: DataTableColumnDef<SchemaEventRecord>[] = [
  { id: "timestamp", header: "Timestamp", accessor: "timestamp", width: "1.2fr" },
  { id: "eventName", header: "Event", accessor: (r) => r["event.name"], width: "1.4fr" },
  { id: "schema_id", header: "Schema ID", accessor: "schema_id", width: "0.7fr" },
  { id: "row_count", header: "Rows", accessor: "row_count", width: "0.9fr" },
  { id: "file_count", header: "Files", accessor: "file_count", width: "0.7fr" },
  { id: "snapshot_count", header: "Snapshots", accessor: "snapshot_count", width: "0.8fr" },
  { id: "added", header: "Added", accessor: "added", width: "1fr" },
  { id: "removed", header: "Removed", accessor: "removed", width: "1fr" },
];

const fieldColumns: DataTableColumnDef<SchemaFieldRow>[] = [
  { id: "num", header: "#", accessor: "id", width: 60 },
  { id: "name", header: "Field", accessor: "name", width: "1fr" },
  { id: "type", header: "Type", accessor: "type", width: "1fr" },
];

export const SchemaTimeline = () => {
  const events = useDql<SchemaEventRecord>({ query: SCHEMA_EVENTS });
  const latest = useDql({ query: LATEST_SCHEMA_STATE });

  const eventRows = useMemo(() => events.data?.records ?? [], [events.data]);

  // Parse the current schema field list from the latest "schema state" event.
  // `fields` is a CSV of `name:type` pairs.
  const fieldRows = useMemo<SchemaFieldRow[]>(() => {
    const raw = latest.data?.records?.[0]?.fields as string | undefined;
    if (!raw) return [];
    return raw
      .split(",")
      .map((pair, i) => {
        const [name, ...rest] = pair.trim().split(":");
        return { id: i + 1, name: name?.trim() ?? "", type: rest.join(":").trim() || "—" };
      })
      .filter((f) => f.name.length > 0);
  }, [latest.data]);

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Schema timeline</Heading>
        <Paragraph>
          Iceberg schema evolution and table-state events, newest first. Current schema derived
          from the latest <code>S3 Tables schema state</code> event.
        </Paragraph>
      </Flex>

      <Heading level={5}>Current schema fields</Heading>
      <Surface style={{ padding: 16 }}>
        {latest.isLoading || latest.error ? (
          <QueryState isLoading={latest.isLoading} error={latest.error} />
        ) : fieldRows.length > 0 ? (
          <DataTable data={fieldRows} columns={fieldColumns} sortable />
        ) : (
          <Paragraph>No schema-state event found in the selected timeframe.</Paragraph>
        )}
      </Surface>

      <Heading level={5}>Schema change &amp; state events</Heading>
      <Surface style={{ padding: 16 }}>
        {events.isLoading || events.error ? (
          <QueryState isLoading={events.isLoading} error={events.error} />
        ) : eventRows.length > 0 ? (
          <DataTable data={eventRows} columns={eventColumns} sortable lineWrap fullWidth />
        ) : (
          <Paragraph>No schema events found in the selected timeframe.</Paragraph>
        )}
      </Surface>
    </Flex>
  );
};
