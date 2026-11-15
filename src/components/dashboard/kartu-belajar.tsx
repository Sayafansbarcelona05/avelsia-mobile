import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../lib/auth";
import type { DataDashboard } from "../../lib/dashboard";
import { akhirJam, formatHari, formatMenit, keMenit } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { formatJam } from "../../lib/waktu";
import { C, PanelKartu, TagTitik } from "./panel-kartu";

const BATAS = 4;

const KOLOM =
  "id, goal_id, topic_id, session_date, start_time, planned_minutes, actual_minutes, elapsed_seconds, status";

type Sesi = {
  id: string;
  goal_id: string;
  topic_id: string | null;
  session_date: string;
  start_time: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  elapsed_seconds: number;
  status: string;
};

type Label = "Selesai" | "Berjalan" | "Dijeda" | "Terlewat" | "Terjadwal";

const WARNA_LABEL: Record<Label, string> = {
  Selesai: C.aqua,
  Berjalan: C.lilac,
  Dijeda: C.lilac,
  Terlewat: C.mist,
  Terjadwal: C.brand,
};

function labelSesi(s: Sesi, hariIni: string, sekarangMenit: number): Label {
  if (s.status === "done") return "Selesai";
  if (s.status === "running") return "Berjalan";
  if (s.elapsed_seconds > 0) return "Dijeda";
  if (
    s.session_date === hariIni &&
    s.start_time &&
    s.planned_minutes &&
    keMenit(s.start_time) + s.planned_minutes < sekarangMenit
  ) {
    return "Terlewat";
  }
  return "Terjadwal";
}

type Hasil = {
  hari: Sesi[];
  depan: Sesi[];
  topik: Record<string, string>;
  tujuan: Record<string, string>;
};

export default function KartuBelajar({ data }: { data: DataDashboard }) {
  const router = useRouter();
  const { session } = useAuth();
  const idUser = session?.user.id;
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState(false);

  // data berganti objek setiap dashboard dimuat ulang, jadi kartu ini ikut dimuat ulang
  useEffect(() => {
    if (!idUser) return;
    let aktif = true;

    async function muat() {
      const [hari, depan] = await Promise.all([
        supabase
          .from("study_sessions")
          .select(KOLOM)
          .eq("user_id", idUser)
          .eq("session_date", data.hariIni)
          .in("status", ["planned", "running", "done"])
          .order("start_time", { nullsFirst: false })
          .order("created_at"),
        supabase
          .from("study_sessions")
          .select(KOLOM)
          .eq("user_id", idUser)
          .gt("session_date", data.hariIni)
          .in("status", ["planned", "running"])
          .order("session_date")
          .order("start_time", { nullsFirst: false })
          .limit(30),
      ]);
      if (!aktif) return;
      if (hari.error || depan.error) {
        setGalat(true);
        return;
      }

      const sesiHari = (hari.data ?? []) as Sesi[];
      const semuaDepan = (depan.data ?? []) as Sesi[];
      const tanggalDekat = semuaDepan[0]?.session_date;
      const sesiDekat = semuaDepan.filter((x) => x.session_date === tanggalDekat);

      // Nama topik dan tujuan untuk sesi yang mungkin tampil
      const tampil = [...sesiHari.slice(0, BATAS), ...sesiDekat.slice(0, BATAS)];
      const topikIds = [
        ...new Set(tampil.map((x) => x.topic_id).filter((x): x is string => !!x)),
      ];
      const goalIds = [...new Set(tampil.map((x) => x.goal_id))];

      const [rt, rg] = await Promise.all([
        topikIds.length > 0
          ? supabase.from("learning_topics").select("id, title").in("id", topikIds)
          : null,
        goalIds.length > 0
          ? supabase.from("learning_goals").select("id, title").in("id", goalIds)
          : null,
      ]);
      if (!aktif) return;

      const topik: Record<string, string> = {};
      for (const r of rt?.data ?? []) topik[r.id as string] = r.title as string;
      const tujuan: Record<string, string> = {};
      for (const r of rg?.data ?? []) tujuan[r.id as string] = r.title as string;

      setHasil({ hari: sesiHari, depan: semuaDepan, topik, tujuan });
      setGalat(false);
    }

    muat();
    return () => {
      aktif = false;
    };
  }, [idUser, data]);

  const sekarangMenit = keMenit(formatJam(new Date().toISOString(), data.zona));

  function Baris({ s }: { s: Sesi }) {
    const label = labelSesi(s, data.hariIni, sekarangMenit);
    const selesai = s.status === "done";
    const menit = selesai ? s.actual_minutes : s.planned_minutes;
    const jam = s.start_time ? s.start_time.slice(0, 5) : null;
    const waktu = jam
      ? menit
        ? `${jam} – ${akhirJam(jam, menit)}`
        : jam
      : "Tanpa jam";
    const namaTopik = s.topic_id ? hasil?.topik[s.topic_id] : undefined;
    const namaTujuan = hasil?.tujuan[s.goal_id];

    return (
      <Pressable
        onPress={() => router.navigate("/belajar" as never)}
        style={[s2.baris, selesai && { opacity: 0.75 }]}
      >
        <Text
          style={[s2.judulBaris, selesai && { textDecorationLine: "line-through" }]}
        >
          {namaTopik ?? "Sesi tanpa topik"}
        </Text>
        <Text style={s2.subBaris}>
          {waktu}
          {menit ? ` · ${formatMenit(menit)}` : ""}
        </Text>
        {namaTujuan ? (
          <Text style={s2.subBaris} numberOfLines={1}>
            {namaTujuan}
          </Text>
        ) : null}
        <View style={s2.kananBawah}>
          <TagTitik label={label} warna={WARNA_LABEL[label]} />
        </View>
      </Pressable>
    );
  }

  let isi: React.ReactNode;

  if (galat) {
    isi = (
      <Text style={s2.galat}>
        Sesi belajar gagal dimuat. Tarik layar ke bawah untuk memuat ulang.
      </Text>
    );
  } else if (!hasil) {
    isi = <Text style={s2.teks}>Memuat…</Text>;
  } else {
    const sisaHariIni = hasil.hari.filter((x) => {
      const l = labelSesi(x, data.hariIni, sekarangMenit);
      return l !== "Selesai" && l !== "Terlewat";
    }).length;

    const tanggalDekat = hasil.depan[0]?.session_date ?? null;
    const sesiDekat =
      sisaHariIni === 0 && tanggalDekat
        ? hasil.depan.filter((x) => x.session_date === tanggalDekat)
        : [];

    isi = (
      <>
        <Text style={s2.penanda}>Hari ini</Text>
        {hasil.hari.length > 0 ? (
          <>
            {hasil.hari.slice(0, BATAS).map((x) => (
              <Baris key={x.id} s={x} />
            ))}
            {hasil.hari.length > BATAS ? (
              <Text style={s2.lainnya}>
                +{hasil.hari.length - BATAS} sesi lagi
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={s2.teks}>Tidak ada sesi belajar hari ini.</Text>
        )}

        {sesiDekat.length > 0 && tanggalDekat ? (
          <>
            <Text style={[s2.penanda, { marginTop: 12 }]}>
              Terdekat: {formatHari(tanggalDekat)}
            </Text>
            {sesiDekat.slice(0, BATAS).map((x) => (
              <Baris key={x.id} s={x} />
            ))}
            {sesiDekat.length > BATAS ? (
              <Text style={s2.lainnya}>
                +{sesiDekat.length - BATAS} sesi lagi
              </Text>
            ) : null}
          </>
        ) : null}

        {hasil.hari.length === 0 && sesiDekat.length === 0 ? (
          <Text style={s2.teks}>
            Belum ada sesi belajar yang terjadwal. Atur dari halaman Belajar.
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <PanelKartu judul="Belajar" sub="Sesi hari ini dan terdekat" rute="/belajar">
      {isi}
    </PanelKartu>
  );
}

const s2 = StyleSheet.create({
  penanda: { fontSize: 12, color: C.mist },
  teks: { fontSize: 14, color: C.mist },
  galat: { fontSize: 14, color: C.snow },
  lainnya: { fontSize: 12, color: C.mist, paddingHorizontal: 4 },
  baris: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.baris,
  },
  judulBaris: { fontSize: 14, fontWeight: "500", color: C.snow },
  subBaris: { marginTop: 4, fontSize: 12, color: C.mist },
  kananBawah: { marginTop: 12, alignItems: "flex-end" },
});