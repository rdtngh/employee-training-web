import { certificateAssets } from "../components/certificate/certificateAssets";
import { downloadFile } from "./downloadFile";

const WIDTH = 841;
const HEIGHT = 595;
const ROMAN_MONTHS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

const DEFAULT_TEMPLATE_FIELDS = {
  certificate_number: {
    x: 140,
    y: 154,
    width: 561,
    fontSize: 12,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "400",
  },
  employee_name: {
    x: 90,
    y: 220,
    width: 661,
    fontSize: 62,
    color: "#b99645",
    align: "center",
    fontFamily: "script",
    fontWeight: "400",
  },
  training_title: {
    x: 175,
    y: 340,
    width: 491,
    fontSize: 17,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "700",
  },
  completion_date: {
    x: 175,
    y: 408,
    width: 491,
    fontSize: 14,
    color: "#000000",
    align: "center",
    fontFamily: "sans",
    fontWeight: "400",
  },
};

const FONT_FAMILIES = {
  sans: "Poppins, sans-serif",
  montserrat: "Montserrat, sans-serif",
  serif: "Playfair Display, Georgia, serif",
  merriweather: "Merriweather, Georgia, serif",
  lora: "Lora, Georgia, serif",
  cinzel: "Cinzel, Georgia, serif",
  cormorant: "Cormorant Garamond, Georgia, serif",
  script: "Great Vibes, Brush Script MT, cursive",
  dancing: "Dancing Script, Brush Script MT, cursive",
  allura: "Allura, Brush Script MT, cursive",
  pacifico: "Pacifico, Brush Script MT, cursive",
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });

const imageFromSource = async (source) => {
  const response = await fetch(source, {
    mode: "cors",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Gambar sertifikat tidak bisa diproses untuk download.");
  }

  const dataUrl = await readBlobAsDataUrl(await response.blob());

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("Gambar sertifikat gagal dimuat.")),
      { once: true }
    );
    image.src = dataUrl;
  });
};

const drawImage = async (context, source, x, y, width, height, opacity = 1) => {
  if (!source) return;

  const image = await imageFromSource(source);
  context.save();
  context.globalAlpha = opacity;
  context.drawImage(image, x, y, width, height);
  context.restore();
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatIndonesianDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatCertificateName = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/(^|[\s-])(\S)/g, (match) => match.toLocaleUpperCase("id-ID"));

const formatRomanMonth = (value, fallbackDate) => {
  if (value) {
    const month = Number(value);
    if (Number.isInteger(month) && month >= 1 && month <= 12) return ROMAN_MONTHS[month];
    return String(value).trim().toUpperCase();
  }

  const date = parseDateValue(fallbackDate);
  return date ? ROMAN_MONTHS[date.getMonth() + 1] : "";
};

const buildCertificateNumber = ({
  certificateNumber,
  sequenceNumber,
  romanMonth,
  year,
  completionDate,
}) => {
  const rawNumber = String(certificateNumber || "").trim();
  const rawSequence = String(sequenceNumber || "").trim();
  const completion = parseDateValue(completionDate);
  const displayMonth = formatRomanMonth(romanMonth, completionDate);
  const displayYear = year || (completion ? completion.getFullYear() : "");

  if (rawSequence && displayMonth && displayYear) {
    return `NO: ${rawSequence}/DIKLATLIT-RSABL/${displayMonth}/${displayYear}`;
  }

  if (!rawNumber) return "";
  if (rawNumber.toUpperCase().startsWith("NO:")) return rawNumber;
  return `NO: ${rawNumber}`;
};

const canvasFont = (field, fallbackFamily = "sans") => {
  const family = FONT_FAMILIES[field.fontFamily] ?? FONT_FAMILIES[fallbackFamily];
  return `${field.fontWeight || "400"} ${field.fontSize}px ${family}`;
};

const textX = (field) => {
  if (field.align === "right") return field.x + field.width;
  if (field.align === "center") return field.x + field.width / 2;
  return field.x;
};

const drawFieldText = (context, text, field) => {
  if (!text) return;

  context.save();
  context.fillStyle = field.color || "#000000";
  context.font = canvasFont(field);
  context.textAlign = field.align || "left";
  context.textBaseline = "top";
  context.fillText(String(text), textX(field), field.y, field.width);
  context.restore();
};

const drawCenteredText = (
  context,
  text,
  x,
  y,
  width,
  font,
  color = "#000000",
  maxWidth = width
) => {
  if (!text) return;

  context.save();
  context.fillStyle = color;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(String(text), x + width / 2, y, maxWidth);
  context.restore();
};

const drawMultilineCenteredText = (context, text, x, y, width, lineHeight, maxLines) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= width || !current) {
      current = next;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);

  lines.slice(0, maxLines).forEach((line, index) => {
    context.fillText(line, x + width / 2, y + index * lineHeight, width);
  });
};

const templateField = (certificateTemplate, fieldName) => ({
  ...DEFAULT_TEMPLATE_FIELDS[fieldName],
  ...(certificateTemplate?.settings?.fields?.[fieldName] ?? {}),
});

const drawCustomCertificate = async (context, data) => {
  const certificateTemplate = data.certificate_template;
  const completionDateText = formatIndonesianDate(data.completion_date || data.issued_at);

  await drawImage(context, certificateTemplate.background_url, 0, 0, WIDTH, HEIGHT);
  drawFieldText(context, data.certificate_number, templateField(certificateTemplate, "certificate_number"));
  drawFieldText(context, data.employee_name, templateField(certificateTemplate, "employee_name"));
  drawFieldText(context, data.training_title, templateField(certificateTemplate, "training_title"));

  if (completionDateText) {
    drawFieldText(
      context,
      `Bandar Lampung, ${completionDateText}`,
      templateField(certificateTemplate, "completion_date")
    );
  }
};

const drawDefaultCertificate = async (context, data) => {
  await drawImage(context, certificateAssets.frameGold, 0, 0, WIDTH, HEIGHT);
  await drawImage(context, certificateAssets.bgDaun, 160, 49, 521, 421, 0.5);
  await drawImage(context, certificateAssets.sudutAtas, 0, 0, 206, 335);
  await drawImage(context, certificateAssets.sudutBawah, 635, 260, 206, 335);
  await drawImage(context, certificateAssets.daunKananAtas, 635, 4, 198, 196, 0.38);
  await drawImage(context, certificateAssets.piagam, 90, 325, 130, 150);
  await drawImage(context, certificateAssets.garisGold, 132, 120, 577, 51);
  await drawImage(context, certificateAssets.logoRsabl, 689, 50, 60, 60);

  const employeeName = data.employee_name || "Nama Karyawan";
  const trainingTitle = data.training_title || "Judul Pelatihan";
  const completionDateText = formatIndonesianDate(data.completion_date || data.issued_at);

  drawCenteredText(
    context,
    "SERTIFIKAT",
    0,
    54,
    WIDTH,
    "700 58px Playfair Display, Georgia, serif"
  );
  drawCenteredText(
    context,
    "PENGHARGAAN",
    0,
    116,
    WIDTH,
    "500 26px Playfair Display, Georgia, serif"
  );
  drawCenteredText(context, "Rumah Sakit Advent", 631, 115, 175, "700 15px Poppins, sans-serif", "#327537");
  drawCenteredText(context, "Bandar Lampung", 631, 133, 175, "700 15px Poppins, sans-serif", "#327537");
  drawCenteredText(context, data.certificate_number, 140, 164, 561, "400 11px Poppins, sans-serif");
  drawCenteredText(
    context,
    "Sertifikat ini diberikan kepada:",
    140,
    220,
    561,
    "400 14px Poppins, sans-serif"
  );
  drawCenteredText(
    context,
    employeeName,
    110,
    252,
    621,
    "400 60px Great Vibes, Brush Script MT, cursive",
    "#b99645",
    621
  );

  context.save();
  context.fillStyle = "#b99645";
  context.fillRect(270, 330, 300, 2);
  context.restore();

  drawCenteredText(context, "Telah mengikuti dan dinyatakan lulus pada", 175, 345, 491, "400 14px Poppins, sans-serif");

  context.save();
  context.fillStyle = "#000000";
  context.font = "700 15px Poppins, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  drawMultilineCenteredText(context, trainingTitle, 175, 368, 491, 20, 2);
  context.restore();

  if (completionDateText) {
    drawCenteredText(
      context,
      `pada tanggal ${completionDateText}`,
      175,
      407,
      491,
      "400 14px Poppins, sans-serif"
    );
    drawCenteredText(context, "BANDAR LAMPUNG", 175, 426, 491, "600 12px Poppins, sans-serif");
  }

  await drawImage(context, certificateAssets.ttdDirektur, 331, 431, 180, 70);

  context.save();
  context.strokeStyle = "#000000";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(360, 501);
  context.lineTo(482, 501);
  context.stroke();
  context.restore();

  drawCenteredText(context, "Dr. Charles Z. Suoth, MARS", 291, 508, 260, "400 13px Poppins, sans-serif");
  drawCenteredText(context, "Direktur RSABL", 291, 528, 260, "400 15px Poppins, sans-serif");
};

export const buildCertificatePngFilename = (data, trainingId) => {
  const name = String(data.employee_name || "sertifikat")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${name || "sertifikat"}-${trainingId || "pelatihan"}.png`;
};

export async function downloadCertificateAsPng(data, filename) {
  await document.fonts?.ready;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const normalizedData = {
    ...data,
    employee_name: formatCertificateName(data.employee_name),
    certificate_number: buildCertificateNumber({
      certificateNumber: data.certificate_number,
      sequenceNumber: data.sequence_number,
      romanMonth: data.roman_month,
      year: data.year,
      completionDate: data.completion_date || data.issued_at,
    }),
  };

  if (normalizedData.certificate_template?.background_url) {
    await drawCustomCertificate(context, normalizedData);
  } else {
    await drawDefaultCertificate(context, normalizedData);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) {
    throw new Error("Sertifikat gagal dibuat menjadi file PNG.");
  }

  downloadFile({ blob, filename });
}
