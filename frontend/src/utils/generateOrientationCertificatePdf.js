import { jsPDF } from "jspdf";

const WIDTH = 841;
const HEIGHT = 595;
const FONT_FAMILIES = {
  sans: '"Poppins", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  merriweather: '"Merriweather", Georgia, serif',
  lora: '"Lora", Georgia, serif',
  cinzel: '"Cinzel", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  script: '"Great Vibes", cursive',
  dancing: '"Dancing Script", cursive',
  allura: '"Allura", cursive',
  pacifico: '"Pacifico", cursive',
};

const formatDate = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const renderTemplatePages = async (source) => {
  const response = await fetch(source, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Template PDF sertifikat gagal dimuat.");

  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
  const document = await task.promise;
  if (document.numPages !== 2) throw new Error("Template Orientasi Umum harus terdiri dari dua halaman.");

  const canvases = [];
  for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const initial = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: WIDTH / initial.width });
    const canvas = window.document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    await page.render({ canvasContext: context, viewport }).promise;
    canvases.push(canvas);
  }
  await task.destroy();
  return canvases;
};

const drawField = (context, value, field) => {
  if (!value || !field) return;
  context.save();
  context.fillStyle = field.color || "#000000";
  context.font = `${field.fontWeight || "400"} ${field.fontSize}px ${FONT_FAMILIES[field.fontFamily] || FONT_FAMILIES.sans}`;
  context.textAlign = field.align || "center";
  context.textBaseline = "top";
  const x = field.align === "left" ? field.x : field.align === "right" ? field.x + field.width : field.x + field.width / 2;
  context.fillText(String(value), x, field.y, field.width);
  context.restore();
};

const drawMaterials = (context, materials, settings) => {
  const rows = ["MATERI", ...(materials || [])];
  const numberWidth = settings.width * 0.08;
  context.save();
  context.strokeStyle = "#000";
  context.fillStyle = "#000";
  context.lineWidth = 1;
  context.textBaseline = "middle";

  rows.forEach((material, index) => {
    const y = settings.y + index * settings.rowHeight;
    context.strokeRect(settings.x, y, numberWidth, settings.rowHeight);
    context.strokeRect(settings.x + numberWidth, y, settings.width - numberWidth, settings.rowHeight);
    context.font = `${index === 0 ? "700" : "400"} ${settings.fontSize}px ${FONT_FAMILIES.sans}`;
    context.textAlign = "center";
    context.fillText(index === 0 ? "NO" : String(index), settings.x + numberWidth / 2, y + settings.rowHeight / 2);
    context.fillText(material, settings.x + numberWidth + (settings.width - numberWidth) / 2, y + settings.rowHeight / 2, settings.width - numberWidth - 8);
  });
  context.restore();
};

export async function generateOrientationCertificatePdf(data) {
  const template = data.certificate_template || data.training?.certificate_template;
  if (!template?.background_url) throw new Error("Template sertifikat belum tersedia.");

  await document.fonts?.ready;
  const [firstPage, secondPage] = await renderTemplatePages(template.background_url);
  const fields = template.settings?.fields || {};
  const employeeName = data.employee_name || data.employee?.name || "";
  const trainingTitle = data.training_title || data.training?.title || "";
  const date = formatDate(data.completion_date || data.issued_at);

  drawField(firstPage.getContext("2d"), data.certificate_number, fields.certificate_number);
  drawField(firstPage.getContext("2d"), employeeName, fields.employee_name);
  drawField(firstPage.getContext("2d"), trainingTitle.toLocaleUpperCase("id-ID"), fields.training_title);
  drawField(firstPage.getContext("2d"), date ? `Diselenggarakan pada tanggal ${date}` : "", fields.completion_date);
  drawMaterials(secondPage.getContext("2d"), data.orientation_materials, template.settings?.materials_table);

  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [WIDTH, HEIGHT], hotfixes: ["px_scaling"] });
  pdf.addImage(firstPage, "PNG", 0, 0, WIDTH, HEIGHT);
  pdf.addPage([WIDTH, HEIGHT], "landscape");
  pdf.addImage(secondPage, "PNG", 0, 0, WIDTH, HEIGHT);
  return { blob: pdf.output("blob"), filename: `sertifikat-${data.training?.id || data.training_id || "orientasi-umum"}.pdf` };
}
