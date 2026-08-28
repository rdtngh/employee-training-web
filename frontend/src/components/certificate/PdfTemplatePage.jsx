import { useEffect, useRef, useState } from "react";

function PdfTemplatePage({ src, pageNumber, className = "" }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    let renderTask;

    async function renderPage() {
      try {
        setError("");
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`PDF request failed with status ${response.status}`);
        }

        const pdfData = new Uint8Array(await response.arrayBuffer());
        const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
          import("pdfjs-dist/build/pdf.mjs"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = getDocument({ data: pdfData });
        const document = await loadingTask.promise;
        const page = await document.getPage(pageNumber);
        const initialViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 841 / initialViewport.width });
        const canvas = canvasRef.current;

        if (cancelled || !canvas) return;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
        await renderTask.promise;
      } catch (renderError) {
        if (!cancelled && renderError?.name !== "RenderingCancelledException") {
          console.error("Failed to render certificate PDF template", renderError);
          setError("Halaman PDF gagal ditampilkan.");
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      loadingTask?.destroy();
    };
  }, [pageNumber, src]);

  return error ? (
    <p className="manage-material-training-name">{error}</p>
  ) : (
    <canvas ref={canvasRef} className={className} aria-label={`Halaman ${pageNumber} template PDF`} />
  );
}

export default PdfTemplatePage;
