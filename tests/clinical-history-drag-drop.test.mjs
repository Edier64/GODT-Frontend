import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Logic mirroring DonationProcessListView.vue drag & drop and intake file validations
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/x-ms-bmp",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function validateIntakeFile(file) {
  if (!file) {
    return { valid: false, error: "No se proporcionó ningún archivo." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "El archivo está vacío (0 bytes)." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido de 20 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  const name = file.name || "";
  const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";

  const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const hasValidMime = file.type ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : false;

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Formato de archivo no admitido (${ext || "sin extensión"}). Use PDF, DOCX, JPG, PNG, WEBP, TIFF o BMP.`,
    };
  }

  return { valid: true, error: null };
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

class DragDropStateManager {
  constructor() {
    this.isDragging = false;
    this.dragCounter = 0;
    this.selectedFile = null;
    this.isSubmitting = false;
  }

  onDragEnter(event) {
    event.preventDefault();
    this.dragCounter++;
    this.isDragging = true;
  }

  onDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  onDragLeave(event) {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging = false;
    }
  }

  onDrop(event) {
    event.preventDefault();
    this.isDragging = false;
    this.dragCounter = 0;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const validation = validateIntakeFile(files[0]);
      if (validation.valid) {
        this.selectedFile = files[0];
        return { success: true, file: files[0] };
      }
      return { success: false, error: validation.error };
    }
    return { success: false, error: "No se soltaron archivos." };
  }

  replaceFile(newFile) {
    const validation = validateIntakeFile(newFile);
    if (validation.valid) {
      this.selectedFile = newFile;
      return { success: true, file: newFile };
    }
    return { success: false, error: validation.error };
  }

  removeFile() {
    this.selectedFile = null;
  }

  submit(formDataBuilder) {
    if (this.isSubmitting) {
      return { success: false, error: "Envío ya en progreso." };
    }
    if (!this.selectedFile) {
      return { success: false, error: "Seleccione un archivo primero." };
    }

    this.isSubmitting = true;
    try {
      const formData = formDataBuilder(this.selectedFile);
      return { success: true, formData };
    } finally {
      this.isSubmitting = false;
    }
  }
}

describe("GODT Frontend — Drag & Drop e Ingesta Multimodal de Historia Clínica", () => {
  it("acepta todos los formatos admitidos (PDF, DOCX, JPG, PNG, WEBP, TIFF, BMP)", () => {
    const testCases = [
      { name: "historia.pdf", type: "application/pdf", size: 1024 * 100 },
      {
        name: "epicrisis.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 50 * 1024,
      },
      { name: "Historia_Clinica_SURA.png", type: "image/png", size: 646 * 1024 },
      { name: "ingreso_urgencias.jpg", type: "image/jpeg", size: 200 * 1024 },
      { name: "foto_evolucion.jpeg", type: "image/jpeg", size: 350 * 1024 },
      { name: "escaneo_reciente.webp", type: "image/webp", size: 150 * 1024 },
      { name: "laboratorio.tif", type: "image/tiff", size: 500 * 1024 },
      { name: "paraclinicos.tiff", type: "image/tiff", size: 800 * 1024 },
      { name: "triage.bmp", type: "image/bmp", size: 1200 * 1024 },
    ];

    for (const file of testCases) {
      const result = validateIntakeFile(file);
      assert.strictEqual(
        result.valid,
        true,
        `El archivo ${file.name} debería ser válido pero falló: ${result.error}`
      );
    }
  });

  it("rechaza archivos con formatos no admitidos", () => {
    const invalidFiles = [
      { name: "script.exe", type: "application/x-msdownload", size: 1024 },
      { name: "archivo.zip", type: "application/zip", size: 2048 },
      { name: "notas.txt", type: "text/plain", size: 512 },
      { name: "video.mp4", type: "video/mp4", size: 5 * 1024 * 1024 },
      { name: "sin_extension", type: "", size: 1024 },
    ];

    for (const file of invalidFiles) {
      const result = validateIntakeFile(file);
      assert.strictEqual(
        result.valid,
        false,
        `El archivo ${file.name} debió ser rechazado`
      );
      assert.match(result.error, /Formato de archivo no admitido/);
    }
  });

  it("rechaza archivos vacíos (0 bytes) y archivos que exceden 20 MB", () => {
    const emptyFile = { name: "vacio.pdf", type: "application/pdf", size: 0 };
    const emptyResult = validateIntakeFile(emptyFile);
    assert.strictEqual(emptyResult.valid, false);
    assert.match(emptyResult.error, /vacío/);

    const oversizedFile = {
      name: "gigante.pdf",
      type: "application/pdf",
      size: 21 * 1024 * 1024,
    };
    const overResult = validateIntakeFile(oversizedFile);
    assert.strictEqual(overResult.valid, false);
    assert.match(overResult.error, /excede el tamaño máximo/);

    const exact20MB = {
      name: "limite.png",
      type: "image/png",
      size: 20 * 1024 * 1024,
    };
    const exactResult = validateIntakeFile(exact20MB);
    assert.strictEqual(exactResult.valid, true);
  });

  it("formatea tamaños de archivo de forma legible (B, KB, MB)", () => {
    assert.strictEqual(formatFileSize(0), "0 B");
    assert.strictEqual(formatFileSize(500), "500 B");
    assert.strictEqual(formatFileSize(1024), "1 KB");
    assert.strictEqual(formatFileSize(646 * 1024), "646 KB");
    assert.strictEqual(formatFileSize(10 * 1024 * 1024), "10 MB");
  });

  it("gestiona el ciclo de eventos Drag & Drop correctamente sin parpadeos", () => {
    const manager = new DragDropStateManager();
    const mockEvent = {
      preventDefault: () => {},
      dataTransfer: { dropEffect: "" },
    };

    assert.strictEqual(manager.isDragging, false);

    // Arrastre entra a la zona
    manager.onDragEnter(mockEvent);
    assert.strictEqual(manager.isDragging, true);
    assert.strictEqual(manager.dragCounter, 1);

    // Arrastre pasa sobre un hijo (child element)
    manager.onDragEnter(mockEvent);
    assert.strictEqual(manager.isDragging, true);
    assert.strictEqual(manager.dragCounter, 2);

    // Arrastre sale del hijo pero sigue en el contenedor
    manager.onDragLeave(mockEvent);
    assert.strictEqual(manager.isDragging, true);
    assert.strictEqual(manager.dragCounter, 1);

    // Dragover establece dropEffect = copy
    manager.onDragOver(mockEvent);
    assert.strictEqual(mockEvent.dataTransfer.dropEffect, "copy");

    // Drop exitoso
    const testFile = {
      name: "Historia_Clinica_SURA.png",
      type: "image/png",
      size: 661504,
    };
    const dropEvent = {
      preventDefault: () => {},
      dataTransfer: { files: [testFile] },
    };
    const dropResult = manager.onDrop(dropEvent);

    assert.strictEqual(dropResult.success, true);
    assert.strictEqual(manager.isDragging, false);
    assert.strictEqual(manager.dragCounter, 0);
    assert.strictEqual(manager.selectedFile.name, "Historia_Clinica_SURA.png");
  });

  it("permite reemplazar y eliminar el archivo seleccionado", () => {
    const manager = new DragDropStateManager();
    const fileA = { name: "historia_A.pdf", type: "application/pdf", size: 1024 };
    const fileB = { name: "historia_B.png", type: "image/png", size: 2048 };

    manager.replaceFile(fileA);
    assert.strictEqual(manager.selectedFile.name, "historia_A.pdf");

    manager.replaceFile(fileB);
    assert.strictEqual(manager.selectedFile.name, "historia_B.png");

    manager.removeFile();
    assert.strictEqual(manager.selectedFile, null);
  });

  it("empaqueta el archivo binario en FormData y previene envíos duplicados", () => {
    const manager = new DragDropStateManager();
    const testFile = {
      name: "Historia_Clinica_SURA.png",
      type: "image/png",
      size: 661504,
    };
    manager.selectedFile = testFile;

    const mockFormData = new Map();
    const formDataBuilder = (file) => {
      mockFormData.set("file", file);
      mockFormData.set("source", "DRAG_AND_DROP_UI");
      return mockFormData;
    };

    const submitResult = manager.submit(formDataBuilder);
    assert.strictEqual(submitResult.success, true);
    assert.strictEqual(submitResult.formData.get("file").name, "Historia_Clinica_SURA.png");
    assert.strictEqual(submitResult.formData.get("source"), "DRAG_AND_DROP_UI");

    // Simular doble submit bloqueado si isSubmitting está activo
    manager.isSubmitting = true;
    const duplicateSubmit = manager.submit(formDataBuilder);
    assert.strictEqual(duplicateSubmit.success, false);
    assert.strictEqual(duplicateSubmit.error, "Envío ya en progreso.");
  });
});

