/**
 * SVG Circuit Parser
 *
 * Parses a circuit-pattern SVG (containing <path>, <line>, <circle>)
 * and outputs structured data for the shader.
 *
 * Usage:  npx tsx src/app/\[locale\]/\(canvas\)/circuit/parseSvgCircuit.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface Point {
  x: number;
  y: number;
}

interface CircuitData {
  viewBox: { width: number; height: number };
  /** Each path is an array of [x, y] points forming a polyline */
  paths: [number, number][][];
  /** Endpoint circles */
  endpoints: { x: number; y: number; r: number }[];
  /** Flattened line segments [x1, y1, x2, y2] for shader texture */
  segments: [number, number, number, number][];
  stats: {
    totalPaths: number;
    totalSegments: number;
    totalEndpoints: number;
  };
}

function parseSvg(svgContent: string): CircuitData {
  // Extract width/height from <svg> tag
  const widthMatch = svgContent.match(/width="(\d+)"/);
  const heightMatch = svgContent.match(/height="(\d+)"/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 800;
  const height = heightMatch ? parseInt(heightMatch[1]) : 600;

  const paths: [number, number][][] = [];
  const endpoints: { x: number; y: number; r: number }[] = [];

  // Parse <path d="M x y L x y L x y ..."> elements
  const pathRegex = /<path\s+d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const d = match[1];
    const points: [number, number][] = [];
    // Match M/L commands followed by coordinates
    const cmdRegex = /([ML])\s+([\d.+-]+)\s+([\d.+-]+)/g;
    let cmd;
    while ((cmd = cmdRegex.exec(d)) !== null) {
      points.push([parseFloat(cmd[2]), parseFloat(cmd[3])]);
    }
    if (points.length >= 2) {
      paths.push(points);
    }
  }

  // Parse <line x1="..." y1="..." x2="..." y2="..."> elements
  const lineRegex =
    /<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"/g;
  while ((match = lineRegex.exec(svgContent)) !== null) {
    const p1: [number, number] = [
      parseFloat(match[1]),
      parseFloat(match[2]),
    ];
    const p2: [number, number] = [
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
    paths.push([p1, p2]);
  }

  // Parse <circle cx="..." cy="..." r="..."> elements
  const circleRegex =
    /<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"/g;
  while ((match = circleRegex.exec(svgContent)) !== null) {
    endpoints.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      r: parseFloat(match[3]),
    });
  }

  // Flatten all paths into individual line segments
  const segments: [number, number, number, number][] = [];
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      segments.push([path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]]);
    }
  }

  return {
    viewBox: { width, height },
    paths,
    endpoints,
    segments,
    stats: {
      totalPaths: paths.length,
      totalSegments: segments.length,
      totalEndpoints: endpoints.length,
    },
  };
}

// --- Run ---
const svgPath = resolve(process.cwd(), 'public/images/circuit-pattern.svg');
const svgContent = readFileSync(svgPath, 'utf-8');
const data = parseSvg(svgContent);

console.log('Circuit SVG parsed:');
console.log(`  Paths:     ${data.stats.totalPaths}`);
console.log(`  Segments:  ${data.stats.totalSegments}`);
console.log(`  Endpoints: ${data.stats.totalEndpoints}`);
console.log(`  ViewBox:   ${data.viewBox.width} x ${data.viewBox.height}`);

const outPath = resolve(process.cwd(), 'src/app/[locale]/(canvas)/circuit/circuitData.json');
writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to: ${outPath}`);
