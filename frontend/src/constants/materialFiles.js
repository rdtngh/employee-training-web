export const MATERIAL_FILE_EXTENSIONS = [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "rtf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp4",
  "webm",
];

export const MATERIAL_FILE_ACCEPT = MATERIAL_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(",");

export const MATERIAL_FILE_FORMAT_LABEL =
  "PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX, TXT/RTF, JPG/PNG/WEBP, MP4/WEBM";

export const MATERIAL_FILE_MAX_SIZE_MB = 50;
