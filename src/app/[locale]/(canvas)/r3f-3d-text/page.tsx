'use client';

import dynamic from "next/dynamic";
import { Suspense } from "react";

const R3f3dTextScene = dynamic(
  () => import("@/components/r3f-3d-text/R3f3dTextScene"),
  { ssr: false }
);

export default function R3f3dTextPage() {
  return (
    <Suspense fallback={<div style={{ width: "100vw", height: "100vh", background: "#171720" }} />}>
      <R3f3dTextScene />
    </Suspense>
  );
}
