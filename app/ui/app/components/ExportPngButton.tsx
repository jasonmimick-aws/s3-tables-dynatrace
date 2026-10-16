import React, { useState } from "react";
import { toPng } from "html-to-image";

/** Export the entire app content node, independent of the Dynatrace shell iframe. */
export const ExportPngButton = ({ filename }: { filename: string }) => {
  const [state, setState] = useState<"idle" | "exporting" | "error">("idle");

  const capture = async () => {
    const node = document.querySelector<HTMLElement>("main.app-page");
    if (!node) {
      setState("error");
      return;
    }
    setState("exporting");
    try {
      await document.fonts.ready;
      const width = Math.ceil(node.scrollWidth);
      const height = Math.ceil(node.scrollHeight);
      const dataUrl = await toPng(node, {
        backgroundColor: "#15171d",
        cacheBust: true,
        pixelRatio: 2,
        width,
        height,
        style: {
          margin: "0",
          maxWidth: "none",
          width: `${width}px`,
        },
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
      setState("idle");
    } catch (error) {
      console.error("Full-page PNG export failed", error);
      setState("error");
    }
  };

  return (
    <button type="button" className="export-button" onClick={() => void capture()} disabled={state === "exporting"}>
      {state === "exporting" ? "Rendering 2× PNG…" : state === "error" ? "Export failed · Retry" : "Export full PNG ↓"}
    </button>
  );
};
