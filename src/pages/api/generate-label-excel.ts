// src/pages/api/generate-excel.ts
import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';

interface BarcodeData {
  barcode: string;
  brand: string;
  reference: string;
  color: string;
  size?: string;
  total?: number;
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { barcodes }: { barcodes: BarcodeData[] } = await request.json();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Barcodes");

    // Encabezados
    sheet.addRow(["Barcode", "Brand", "Reference", "Color", "Size", "Total Init"]);

    // Agregar datos
    barcodes.forEach(({ barcode, brand, reference, color, size, total }) => {
      sheet.addRow([
        barcode.toUpperCase(),
        brand.toUpperCase(),
        reference.toUpperCase(),
        color.toUpperCase(),
        size ? size.toUpperCase() : "N/A",
        total !== undefined ? total.toString().toUpperCase() : "N/A",
      ]);
    });

    // Convertir a CSV
    const csvBuffer = await workbook.csv.writeBuffer();

    return new Response(csvBuffer, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=barcodes.csv",
      },
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    return new Response(JSON.stringify({ error: "Failed to generate CSV file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
