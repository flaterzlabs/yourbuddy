export async function exportChartAsPng(
  container: HTMLElement,
  fileName: string,
  options: { backgroundColor?: string } = {},
) {
  const svgElement = container.querySelector("svg");
  if (!svgElement) {
    throw new Error("Chart element not found");
  }

  const boundingBox = svgElement.getBoundingClientRect();
  const width = Math.max(Math.round(boundingBox.width), 1);
  const height = Math.max(Math.round(boundingBox.height), 1);

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clonedSvg.setAttribute("width", `${width}`);
  clonedSvg.setAttribute("height", `${height}`);

  if (!clonedSvg.getAttribute("viewBox")) {
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas context unavailable");
  }

  context.scale(scale, scale);

  const backgroundColor = options.backgroundColor ?? "#ffffff";
  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
        resolve();
      };

      image.onerror = () => {
        reject(new Error("Failed to load chart image"));
      };

      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  link.click();
}
