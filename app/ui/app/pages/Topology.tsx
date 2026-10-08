import React, { useEffect, useMemo, useState } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface, Divider } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Strong, Text } from "@dynatrace/strato-components/typography";
import { SingleValue } from "@dynatrace/strato-components/charts";
import Colors from "@dynatrace/strato-design-tokens/colors";
import Borders from "@dynatrace/strato-design-tokens/borders";
import { QueryState } from "../components/QueryState";
import { TOPOLOGY_STATE, type TableStateRecord } from "../queries";

const keyOf = (r: TableStateRecord) => `${r.bucket}/${r.ns}/${r.table}`;

const num = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Math.round(Number(v)).toLocaleString();

export const Topology = () => {
  const { data, error, isLoading } = useDql<TableStateRecord>({ query: TOPOLOGY_STATE });
  const records = useMemo(() => data?.records ?? [], [data]);
  const [selected, setSelected] = useState<string | null>(null);

  // Default-select the first table once data arrives.
  useEffect(() => {
    if (!selected && records.length > 0) {
      setSelected(keyOf(records[0]));
    }
  }, [records, selected]);

  // Group bucket -> namespace -> tables.
  const tree = useMemo(() => {
    const buckets = new Map<string, Map<string, TableStateRecord[]>>();
    for (const r of records) {
      if (!buckets.has(r.bucket)) buckets.set(r.bucket, new Map());
      const nsMap = buckets.get(r.bucket)!;
      if (!nsMap.has(r.ns)) nsMap.set(r.ns, []);
      nsMap.get(r.ns)!.push(r);
    }
    return buckets;
  }, [records]);

  const selectedRecord = records.find((r) => keyOf(r) === selected);

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Topology</Heading>
        <Paragraph>
          Browse table bucket → namespace → table. Select a table to see its current Iceberg state.
        </Paragraph>
      </Flex>

      {isLoading || error ? (
        <QueryState isLoading={isLoading} error={error} />
      ) : records.length === 0 ? (
        <Paragraph>No S3 Tables metrics found in the selected timeframe.</Paragraph>
      ) : (
        <Flex gap={24} flexFlow="wrap" alignItems="flex-start">
          {/* Tree */}
          <Surface style={{ padding: 16, minWidth: 300, flex: "0 1 340px" }}>
            {[...tree.entries()].map(([bucket, nsMap]) => (
              <Flex key={bucket} flexDirection="column" gap={4} style={{ marginBottom: 12 }}>
                <Text>
                  🪣 <Strong>{bucket}</Strong>
                </Text>
                {[...nsMap.entries()].map(([ns, tables]) => (
                  <Flex key={ns} flexDirection="column" gap={2} style={{ paddingLeft: 16 }}>
                    <Text>📁 {ns}</Text>
                    {tables.map((t) => {
                      const k = keyOf(t);
                      const isSel = k === selected;
                      return (
                        <div
                          key={k}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(k)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setSelected(k);
                          }}
                          style={{
                            cursor: "pointer",
                            marginLeft: 16,
                            padding: "4px 8px",
                            borderRadius: Borders.Radius.Field.Default,
                            background: isSel ? Colors.Background.Container.Primary.Emphasized : "transparent",
                            color: isSel ? Colors.Text.Primary.Default : Colors.Text.Neutral.Default,
                          }}
                        >
                          📄 {t.table}
                        </div>
                      );
                    })}
                  </Flex>
                ))}
              </Flex>
            ))}
          </Surface>

          {/* Detail */}
          <Surface style={{ padding: 16, flex: "1 1 420px", minWidth: 360 }}>
            {selectedRecord ? (
              <Flex flexDirection="column" gap={16}>
                <Heading level={5}>
                  {selectedRecord.bucket} / {selectedRecord.ns} / {selectedRecord.table}
                </Heading>
                <Divider />
                <Flex gap={16} flexFlow="wrap">
                  <SingleValue data={num(selectedRecord.current_rows)} label="Flight records" alignment="start" />
                  <SingleValue data={num(selectedRecord.current_files)} label="Data files" alignment="start" />
                  <SingleValue data={num(selectedRecord.current_snapshots)} label="Snapshots" alignment="start" />
                  <SingleValue data={num(selectedRecord.current_schema_fields)} label="Schema fields" alignment="start" />
                  <SingleValue data={num(selectedRecord.current_bytes)} label="Storage bytes" alignment="start" unit="B" />
                </Flex>
              </Flex>
            ) : (
              <Paragraph>Select a table from the tree.</Paragraph>
            )}
          </Surface>
        </Flex>
      )}
    </Flex>
  );
};
