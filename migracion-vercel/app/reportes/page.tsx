"use client";

import RoleSidebar from "@/components/role-sidebar";
import { isAdminSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReservaRecord = {
  id_reserva: number;
  id_usuario?: number;
  id_aula?: number;
  estado: string;
  motivo: string | null;
  fecha_reserva: string;
  hora_inicio?: string;
  hora_fin?: string;
  usuarios?: { nombre?: string; apellido?: string; email?: string } | null;
  aulas?: { nombre_aula?: string; codigo_aula?: string } | null;
};

const fallbackReservas: ReservaRecord[] = [
  { id_reserva: 1, id_usuario: 1, id_aula: 1, estado: "Aprobada", motivo: "Clase de programación", fecha_reserva: "2026-10-15", hora_inicio: "09:00", hora_fin: "11:00", usuarios: { nombre: "Admin", apellido: "Sistema", email: "admin@sistema.com" }, aulas: { nombre_aula: "Aula 101", codigo_aula: "A-101" } },
  { id_reserva: 2, id_usuario: 2, id_aula: 2, estado: "Pendiente", motivo: "Reunión de coordinación", fecha_reserva: "2026-10-16", hora_inicio: "12:00", hora_fin: "14:00", usuarios: { nombre: "Ana", apellido: "Gómez", email: "ana.gomez@institucion.edu" }, aulas: { nombre_aula: "Laboratorio 2", codigo_aula: "LAB-2" } },
  { id_reserva: 3, id_usuario: 3, id_aula: 3, estado: "Rechazada", motivo: "Conferencia", fecha_reserva: "2026-10-18", hora_inicio: "15:00", hora_fin: "17:00", usuarios: { nombre: "Luis", apellido: "Pérez", email: "luis.perez@institucion.edu" }, aulas: { nombre_aula: "Salón de grados", codigo_aula: "S-1" } },
];

export default function ReportesPage() {
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaRecord[]>([]);

  const loadData = async () => {
    const savedReservas = JSON.parse(localStorage.getItem("cache-reservas") ?? "null") as ReservaRecord[] | null;

    if (!supabase) {
      setReservas(savedReservas?.length ? savedReservas : []);
      return;
    }

    const { data, error } = await supabase
      .from("reservas")
      .select("*, usuarios!fk_reservas_usuarios(nombre, apellido, email), aulas!fk_reservas_aulas(nombre_aula, codigo_aula)")
      .order("fecha_reserva", { ascending: false });

    if (error) {
      setReservas(savedReservas?.length ? savedReservas : []);
      return;
    }

    setReservas((data as ReservaRecord[]) ?? (savedReservas?.length ? savedReservas : []));
  };

  useEffect(() => {
    const role = localStorage.getItem("session-role");

    if (!isAdminSession()) {
      if (role === "Profesor") {
        router.replace("/dashboard");
        return;
      }

      router.replace("/login");
      return;
    }

    const updateData = () => {
      void loadData();
    };

    updateData();
    window.addEventListener("reservas-updated", updateData);

    return () => {
      window.removeEventListener("reservas-updated", updateData);
    };
  }, [router]);

  const summary = useMemo(() => {
    const counts = { Pendiente: 0, Aprobada: 0, Rechazada: 0, Cancelada: 0 };
    reservas.forEach((reserva) => {
      const key = reserva.estado as keyof typeof counts;
      if (key in counts) {
        counts[key] += 1;
      }
    });
    return counts;
  }, [reservas]);

  const total = reservas.length;
  const recent = [...reservas].slice(0, 6);

  return (
    <main className="page-shell">
      <RoleSidebar />

      <section className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h1>Reportes</h1>
          </div>
        </header>

        <div className="stats-grid">
          <article className="stat-card accent">
            <p>Total reservas</p>
            <strong>{total}</strong>
          </article>
          <article className="stat-card">
            <p>Pendientes</p>
            <strong>{summary.Pendiente}</strong>
          </article>
          <article className="stat-card">
            <p>Aprobadas</p>
            <strong>{summary.Aprobada}</strong>
          </article>
          <article className="stat-card">
            <p>Rechazadas</p>
            <strong>{summary.Rechazada}</strong>
          </article>
        </div>

        <div className="card-grid">
          <article className="info-card">
            <h3>Estado de reservas</h3>
            <ul className="list">
              <li>Pendientes: {summary.Pendiente}</li>
              <li>Aprobadas: {summary.Aprobada}</li>
              <li>Rechazadas: {summary.Rechazada}</li>
              <li>Canceladas: {summary.Cancelada}</li>
            </ul>
          </article>

          <article className="info-card">
            <h3>Últimas reservas</h3>
            <ul className="list">
              {recent.length ? recent.map((item) => (
                <li key={item.id_reserva}>
                  {item.usuarios?.nombre ?? "Docente"} {item.usuarios?.apellido ?? ""} · {item.aulas?.nombre_aula ?? "Aula"} · {item.fecha_reserva} · {item.estado}
                </li>
              )) : <li>No hay reservas registradas.</li>}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
