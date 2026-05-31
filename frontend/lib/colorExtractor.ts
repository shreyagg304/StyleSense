export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Convert Hex to RGB
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Calculate Euclidean distance between two colors
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
}

// Map any RGB color to the closest standard StyleSense color name
export function mapRgbToStyleSenseColor(rgb: RGB): string {
  const standardColors: Record<string, RGB> = {
    white: { r: 245, g: 245, b: 240 },
    black: { r: 26, g: 26, b: 26 },
    gray: { r: 136, g: 136, b: 136 },
    red: { r: 220, g: 60, b: 60 },
    green: { r: 50, g: 150, b: 90 },
    blue: { r: 50, g: 90, b: 180 },
    yellow: { r: 235, g: 190, b: 60 },
    purple: { r: 130, g: 80, b: 180 },
    orange: { r: 230, g: 110, b: 40 }
  };

  let closestColor = "unknown";
  let minDistance = Infinity;

  // Classify based on brightness/saturation first for neutral colors
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  
  // High brightness and very low saturation -> white
  if (max > 210 && delta < 35) return "white";
  // Low brightness -> black
  if (max < 55) return "black";
  // Moderate brightness and very low saturation -> gray
  if (delta < 28) return "gray";

  for (const [name, colorRgb] of Object.entries(standardColors)) {
    const dist = colorDistance(rgb, colorRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closestColor = name;
    }
  }

  return closestColor;
}

// Extract dominant colors from an image file using HTML5 Canvas
export function extractColorPalette(file: File, maxColors = 5): Promise<{ hex: string; styleSenseColor: string }[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create 2d canvas context"));
          return;
        }

        // Downsample to 64x64 to optimize speed and smooth out noise
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imgData = ctx.getImageData(0, 0, 64, 64).data;
        const pixels: RGB[] = [];

        // Accumulate pixel colors, ignoring semi-transparent pixels
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          const a = imgData[i+3];

          if (a < 128) continue; // Skip highly transparent pixels

          // Only collect pixels that aren't extreme background colors if possible
          pixels.push({ r, g, b });
        }

        if (pixels.length === 0) {
          resolve([{ hex: "#888888", styleSenseColor: "gray" }]);
          return;
        }

        // K-Means clustering in JS
        let centroids: RGB[] = [];
        const step = Math.floor(pixels.length / maxColors);
        for (let k = 0; k < maxColors; k++) {
          centroids.push({ ...pixels[(k * step) % pixels.length] });
        }

        const maxIterations = 8;
        for (let iter = 0; iter < maxIterations; iter++) {
          const clusters: RGB[][] = Array.from({ length: maxColors }, () => []);

          // Assign pixels to closest centroid
          for (const pixel of pixels) {
            let minDistance = Infinity;
            let bestCluster = 0;
            for (let k = 0; k < maxColors; k++) {
              const dist = colorDistance(pixel, centroids[k]);
              if (dist < minDistance) {
                minDistance = dist;
                bestCluster = k;
              }
            }
            clusters[bestCluster].push(pixel);
          }

          // Recalculate centroids
          for (let k = 0; k < maxColors; k++) {
            const cluster = clusters[k];
            if (cluster.length > 0) {
              let sumR = 0, sumG = 0, sumB = 0;
              for (const pixel of cluster) {
                sumR += pixel.r;
                sumG += pixel.g;
                sumB += pixel.b;
              }
              centroids[k] = {
                r: Math.round(sumR / cluster.length),
                g: Math.round(sumG / cluster.length),
                b: Math.round(sumB / cluster.length)
              };
            }
          }
        }

        // Convert centroids to Hex and map them to StyleSense standard colors
        const palette = centroids.map(c => {
          const hex = rgbToHex(c.r, c.g, c.b);
          const styleSenseColor = mapRgbToStyleSenseColor(c);
          return { hex, styleSenseColor };
        });

        // Deduplicate the palette based on Hex color
        const uniqueHexes = new Set<string>();
        const finalPalette: { hex: string; styleSenseColor: string }[] = [];
        for (const item of palette) {
          if (!uniqueHexes.has(item.hex)) {
            uniqueHexes.add(item.hex);
            finalPalette.push(item);
          }
        }

        // URL cleanup
        URL.revokeObjectURL(img.src);
        resolve(finalPalette.slice(0, maxColors));
      } catch (err) {
        URL.revokeObjectURL(img.src);
        reject(err);
      }
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}
