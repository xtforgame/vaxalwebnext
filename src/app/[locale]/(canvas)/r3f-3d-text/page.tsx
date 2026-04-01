'use client';

import dynamic from "next/dynamic";

const R3f3dTextScene = dynamic(
  () => import("@/components/r3f-3d-text/R3f3dTextScene"),
  { ssr: false }
);

export default function R3f3dTextPage() {
  return (
    <main>
      <R3f3dTextScene />
    </main>
  );
}
