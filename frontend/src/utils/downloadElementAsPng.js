import { downloadFile } from "./downloadFile";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });

const waitForImages = async (root) => {
  const images = [...root.querySelectorAll("img")];

  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );
};

const inlineImages = async (root) => {
  const images = [...root.querySelectorAll("img")];

  await Promise.all(
    images.map(async (image) => {
      const source = image.currentSrc || image.src;
      if (!source || source.startsWith("data:")) return;

      const response = await fetch(source, {
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Gambar sertifikat tidak bisa diproses untuk download.");
      }

      const dataUrl = await readBlobAsDataUrl(await response.blob());
      image.removeAttribute("srcset");
      image.setAttribute("src", dataUrl);
    })
  );
};

const inlineComputedStyles = (source, target) => {
  const computedStyle = window.getComputedStyle(source);
  const cssText = [...computedStyle]
    .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
    .join("");

  target.setAttribute("style", cssText);

  [...source.children].forEach((sourceChild, index) => {
    inlineComputedStyles(sourceChild, target.children[index]);
  });
};

const imageFromSvg = (svg) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

    image.addEventListener(
      "load",
      () => {
        URL.revokeObjectURL(url);
        resolve(image);
      },
      { once: true }
    );
    image.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        reject(new Error("Sertifikat gagal dirender menjadi gambar."));
      },
      { once: true }
    );

    image.src = url;
  });

export async function downloadElementAsPng(element, filename, options = {}) {
  if (!element) {
    throw new Error("Sertifikat belum siap untuk didownload.");
  }

  await document.fonts?.ready;
  await waitForImages(element);

  const width = options.width ?? element.offsetWidth;
  const height = options.height ?? element.offsetHeight;
  const pixelRatio = options.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2);
  const clone = element.cloneNode(true);

  inlineComputedStyles(element, clone);
  clone.style.transform = "none";
  clone.style.transformOrigin = "top left";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;

  await inlineImages(clone);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", XHTML_NAMESPACE);
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);

  const serializedNode = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="${SVG_NAMESPACE}" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="${width}" height="${height}">${serializedNode}</foreignObject>
    </svg>
  `;
  const image = await imageFromSvg(svg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) {
    throw new Error("Sertifikat gagal dibuat menjadi file PNG.");
  }

  downloadFile({ blob, filename });
}
