import { createClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY;

type ReportScope = "usuarios" | "aulas" | "reservas" | "horarios";
type ReportType = "csv" | "pdf";

type ReportRow = Record<string, string | number | null | undefined>;

const utf8Value = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r?\n/g, " ").trim();
};

const asCsv = (rows: ReportRow[], headers: string[]) => {
  const csvLines = [headers.join(",")];

  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        const value = row[header] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");

    csvLines.push(line);
  });

  return `${csvLines.join("\n")}\n`;
};

const getPdfBuffer = async (rows: ReportRow[], headers: string[]) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Reporte institucional", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Registros: ${rows.length}`);
    doc.moveDown();

    const tableRows = rows.slice(0, 20);
    tableRows.forEach((row, index) => {
      const line = headers
        .map((header) => `${header}: ${utf8Value(row[header])}`)
        .join(" | ");
      doc.fontSize(9).text(`${index + 1}. ${line}`);
      doc.moveDown(0.2);
    });

    if (!tableRows.length) {
      doc.text("No hay datos disponibles para este reporte.");
    }

    doc.end();
  });
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") ?? "reservas") as ReportScope;
  const type = (searchParams.get("type") ?? "csv") as ReportType;

  const allowedScopes: ReportScope[] = ["usuarios", "aulas", "reservas", "horarios"];
  const allowedTypes: ReportType[] = ["csv", "pdf"];

  if (!allowedScopes.includes(scope) || !allowedTypes.includes(type)) {
    return NextResponse.json({ error: "Parámetros no válidos." }, { status: 400 });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no está configurado en Vercel. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      );
    }

    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    let query = client.from("reservas").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").order("fecha_reserva", { ascending: false });

    if (scope === "usuarios") {
      const { data, error } = await client.from("usuarios").select("id_usuario, nombre, apellido, email, estado, id_rol").order("nombre", { ascending: true });
      if (error) throw new Error(error.message);

      const rows = (data ?? []).map((usuario) => ({
        Nombre: utf8Value(usuario.nombre),
        Apellido: utf8Value(usuario.apellido),
        Email: utf8Value(usuario.email),
        Estado: utf8Value(usuario.estado),
        Rol: utf8Value(usuario.id_rol),
      }));

      const headers = ["Nombre", "Apellido", "Email", "Estado", "Rol"];
      if (type === "csv") {
        return new NextResponse(asCsv(rows, headers), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=${scope}.csv`,
          },
        });
      }

      const pdfBuffer = await getPdfBuffer(rows, headers);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=${scope}.pdf`,
        },
      });
    }

    if (scope === "aulas") {
      const { data, error } = await client.from("aulas").select("id_aula, nombre_aula, codigo_aula, estado").order("nombre_aula", { ascending: true });
      if (error) throw new Error(error.message);

      const rows = (data ?? []).map((aula) => ({
        Aula: utf8Value(aula.nombre_aula),
        Codigo: utf8Value(aula.codigo_aula),
        Estado: utf8Value(aula.estado),
      }));

      const headers = ["Aula", "Codigo", "Estado"];
      if (type === "csv") {
        return new NextResponse(asCsv(rows, headers), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=${scope}.csv`,
          },
        });
      }

      const pdfBuffer = await getPdfBuffer(rows, headers);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=${scope}.pdf`,
        },
      });
    }

    if (scope === "horarios") {
      query = client.from("reservas").select("*, usuarios(nombre, apellido, email), aulas(nombre_aula, codigo_aula)").order("fecha_reserva", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const reservations = (data ?? []) as Array<Record<string, any>>;
    const rows = reservations.map((reserva) => ({
      Fecha: utf8Value(reserva.fecha_reserva),
      Docente: `${utf8Value(reserva.usuarios?.nombre)} ${utf8Value(reserva.usuarios?.apellido)}`.trim() || utf8Value(reserva.usuarios?.email),
      Aula: utf8Value(reserva.aulas?.nombre_aula) || utf8Value(reserva.aulas?.codigo_aula),
      Estado: utf8Value(reserva.estado),
      Horario: `${utf8Value(reserva.hora_inicio)} - ${utf8Value(reserva.hora_fin)}`,
    }));

    const headers = ["Fecha", "Docente", "Aula", "Estado", "Horario"];

    if (type === "csv") {
      return new NextResponse(asCsv(rows, headers), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=${scope}.csv`,
        },
      });
    }

    const pdfBuffer = await getPdfBuffer(rows, headers);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${scope}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generando exportación:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo generar el archivo solicitado.",
      },
      { status: 500 },
    );
  }
}
