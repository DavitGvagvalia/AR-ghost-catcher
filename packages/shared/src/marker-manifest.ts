import type { MarkerId } from "./constants.js";

export interface MarkerDefinition {
  id: MarkerId;
  patternPath: `/markers/patterns/${string}.patt`;
  printablePath: `/markers/printable/${string}.${"jpg" | "png" | "svg"}`;
}

export const MARKER_MANIFEST = [
  {
    id: "marker-01",
    patternPath: "/markers/patterns/ar_marker-1.patt",
    printablePath: "/markers/printable/ar_marker-1.jpg",
  },
  {
    id: "marker-02",
    patternPath: "/markers/patterns/ar_marker-2.patt",
    printablePath: "/markers/printable/ar_marker-2.jpg",
  },
  {
    id: "marker-03",
    patternPath: "/markers/patterns/ar_marker-3.patt",
    printablePath: "/markers/printable/ar_marker-3.jpg",
  },
  {
    id: "marker-04",
    patternPath: "/markers/patterns/ar_marker-4.patt",
    printablePath: "/markers/printable/ar_marker-4.jpg",
  },
  {
    id: "marker-05",
    patternPath: "/markers/patterns/ar_marker-5.patt",
    printablePath: "/markers/printable/ar_marker-5.jpg",
  },
  {
    id: "marker-06",
    patternPath: "/markers/patterns/ar_marker-6.patt",
    printablePath: "/markers/printable/ar_marker-6.jpg",
  },
  {
    id: "marker-07",
    patternPath: "/markers/patterns/ar_marker-7.patt",
    printablePath: "/markers/printable/ar_marker-7.jpg",
  },
  {
    id: "marker-08",
    patternPath: "/markers/patterns/ar_marker-8.patt",
    printablePath: "/markers/printable/ar_marker-8.jpg",
  },
  {
    id: "marker-09",
    patternPath: "/markers/patterns/ar_marker-9.patt",
    printablePath: "/markers/printable/ar_marker-9.jpg",
  },
  {
    id: "marker-10",
    patternPath: "/markers/patterns/ar_marker-10.patt",
    printablePath: "/markers/printable/ar_marker-10.jpg",
  },
  {
    id: "marker-11",
    patternPath: "/markers/patterns/ar_marker-11.patt",
    printablePath: "/markers/printable/ar_marker-11.jpg",
  },
  {
    id: "marker-12",
    patternPath: "/markers/patterns/ar_marker-12.patt",
    printablePath: "/markers/printable/ar_marker-12.jpg",
  },
  {
    id: "marker-13",
    patternPath: "/markers/patterns/ar_marker-13.patt",
    printablePath: "/markers/printable/ar_marker-13.jpg",
  },
  {
    id: "marker-14",
    patternPath: "/markers/patterns/ar_marker-14.patt",
    printablePath: "/markers/printable/ar_marker-14.jpg",
  },
  {
    id: "marker-15",
    patternPath: "/markers/patterns/ar_marker-15.patt",
    printablePath: "/markers/printable/ar_marker-15.jpg",
  },
  {
    id: "marker-16",
    patternPath: "/markers/patterns/ar_marker-16.patt",
    printablePath: "/markers/printable/ar_marker-16.jpg",
  },
  {
    id: "marker-17",
    patternPath: "/markers/patterns/ar_marker-17.patt",
    printablePath: "/markers/printable/ar_marker-17.jpg",
  },
  {
    id: "marker-18",
    patternPath: "/markers/patterns/ar_marker-18.patt",
    printablePath: "/markers/printable/ar_marker-18.jpg",
  },
  {
    id: "marker-19",
    patternPath: "/markers/patterns/ar_marker-19.patt",
    printablePath: "/markers/printable/ar_marker-19.jpg",
  },
  {
    id: "marker-20",
    patternPath: "/markers/patterns/ar_marker-20.patt",
    printablePath: "/markers/printable/ar_marker-20.jpg",
  },
  {
    id: "marker-21",
    patternPath: "/markers/patterns/ar_marker-21.patt",
    printablePath: "/markers/printable/ar_marker-21.jpg",
  },
  {
    id: "marker-22",
    patternPath: "/markers/patterns/ar_marker-22.patt",
    printablePath: "/markers/printable/ar_marker-22.jpg",
  },
  {
    id: "marker-23",
    patternPath: "/markers/patterns/ar_marker-23.patt",
    printablePath: "/markers/printable/ar_marker-23.jpg",
  },
  {
    id: "marker-24",
    patternPath: "/markers/patterns/ar_marker-24.patt",
    printablePath: "/markers/printable/ar_marker-24.jpg",
  },
  {
    id: "marker-25",
    patternPath: "/markers/patterns/ar_marker-25.patt",
    printablePath: "/markers/printable/ar_marker-25.jpg",
  },
  {
    id: "marker-26",
    patternPath: "/markers/patterns/ar_marker-26.patt",
    printablePath: "/markers/printable/ar_marker-26.jpg",
  },
  {
    id: "marker-27",
    patternPath: "/markers/patterns/ar_marker-27.patt",
    printablePath: "/markers/printable/ar_marker-27.jpg",
  },
  {
    id: "marker-28",
    patternPath: "/markers/patterns/ar_marker-28.patt",
    printablePath: "/markers/printable/ar_marker-28.jpg",
  },
  {
    id: "marker-29",
    patternPath: "/markers/patterns/ar_marker-29.patt",
    printablePath: "/markers/printable/ar_marker-29.jpg",
  },
  {
    id: "marker-30",
    patternPath: "/markers/patterns/ar_marker-30.patt",
    printablePath: "/markers/printable/ar_marker-30.jpg",
  },
] as const satisfies readonly MarkerDefinition[];
