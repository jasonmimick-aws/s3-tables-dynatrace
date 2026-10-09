import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { describeDataset } from "../datasets";
import { scopedCatalogQuery, type ScopedDatasetRow } from "../queries";

/** Discover available datasets from live IRC-derived metric dimensions. */
export const useDatasetCatalog = () => {
  const result = useDql<ScopedDatasetRow>({ query: scopedCatalogQuery([]) });
  const datasets = useMemo(
    () =>
      (result.data?.records ?? []).map((row, index) =>
        describeDataset(String(row.ns), String(row.table), index),
      ),
    [result.data],
  );
  return { ...result, datasets };
};
