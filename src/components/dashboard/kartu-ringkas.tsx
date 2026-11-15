import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Acara, DataDashboard } from "../../lib/dashboard";
import { buatFormatUang } from "../../lib/format";
import { formatJam, formatTenggat } from "../../lib/waktu";
import { C, IkonJam, KondisiKosong, PanelKartu, TagTitik } from "./panel-kartu";

const BATAS = 6;

const LABEL_PRIORITAS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};
const WARNA_PRIORITAS: Record<string, string> = {
  high: C.brand,
  medium: C.aqua,
  low: C.lilac,
};

/* ---------------- Tugas ---------------- */

export function KartuTugas({ data }: { data: DataDashboard }) {
  const langkah = [
    ...data.tugasTerlambat.map((t) => ({ t, telat: true, nanti: false })),
    ...data.tugasHariIni.map((t) => ({ t, telat: false, nanti: false })),
    ...data.tugasMendatang.map((t) => ({ t, telat: false, nanti: true })),
  ];
  const tampil = langkah.slice(0, BATAS);

  return (
    <PanelKartu judul="Tugas" sub="Hari ini dan yang terdekat" rute="/tugas">
      {data.galatTugas ? (
        <Text style={s.galat}>Tugas gagal dimuat. Tarik layar ke bawah untuk memuat ulang.</Text>
      ) : langkah.length === 0 ? (
        <KondisiKosong
          warna={C.aqua}
          judul="Belum ada tugas terdekat"
          deskripsi="Tidak ada tugas dengan tenggat hari ini atau dalam waktu dekat."
        />
      ) : (
        <>
          {tampil.map(({ t, telat, nanti }) => (
            <View key={t.id} style={s.baris}>
              <View
                style={[
                  s.kotakIkon,
                  telat
                    ? { backgroundColor: C.lilac }
                    : { backgroundColor: C.ink, borderWidth: 1, borderColor: C.line },
                ]}
              >
                {telat ? (
                  <IkonJam warna={C.ink} />
                ) : (
                  <View
                    style={[
                      s.titikPrioritas,
                      { backgroundColor: WARNA_PRIORITAS[t.priority] ?? C.mist },
                    ]}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.judulBaris} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={s.subBaris}>
                  Prioritas {LABEL_PRIORITAS[t.priority] ?? t.priority}
                </Text>
              </View>
              <Text style={s.kanan}>
                {telat || nanti
                  ? formatTenggat(t.due_date, t.due_time)
                  : t.due_time
                    ? t.due_time.slice(0, 5)
                    : "Hari ini"}
              </Text>
            </View>
          ))}
          {langkah.length > tampil.length ? (
            <Text style={s.lainnya}>
              +{langkah.length - tampil.length} tugas lainnya
            </Text>
          ) : null}
        </>
      )}
    </PanelKartu>
  );
}

/* ---------------- Jadwal ---------------- */

function statusAcara(a: Acara, sekarang: number): "selesai" | "terlewat" | null {
  if (a.status === "completed") return "selesai";
  if (new Date(a.end_at).getTime() < sekarang) return "terlewat";
  return null;
}

function LabelStatusAcara({ status }: { status: "selesai" | "terlewat" }) {
  const selesai = status === "selesai";
  return (
    <View style={s.labelStatus}>
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={selesai ? C.aqua : C.lilac}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {selesai ? (
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M12 7v5l3 2" />
          </>
        )}
      </Svg>
      <Text style={s.teksStatus}>{selesai ? "Selesai" : "Terlewat"}</Text>
    </View>
  );
}

export function KartuJadwal({ data }: { data: DataDashboard }) {
  const router = useRouter();
  const sekarang = Date.now();

  function infoWaktu(e: Acara) {
    if (e.all_day) return "Sepanjang hari";
    const mulai = new Date(e.start_at).getTime();
    const akhir = new Date(e.end_at).getTime();
    if (mulai <= sekarang && sekarang < akhir) {
      return `Sampai ${formatJam(e.end_at, data.zona)}`;
    }
    const selisih = Math.round((mulai - sekarang) / 60000);
    if (selisih > 0 && selisih < 60) return `Mulai dalam ${selisih} menit`;
    return `${formatJam(e.start_at, data.zona)} – ${formatJam(e.end_at, data.zona)}`;
  }

  return (
    <PanelKartu judul="Jadwal" sub="Agenda hari ini" rute="/kalender">
      {data.galatAgenda ? (
        <Text style={s.galat}>Agenda gagal dimuat. Tarik layar ke bawah untuk memuat ulang.</Text>
      ) : data.agenda.length === 0 ? (
        <KondisiKosong
          warna={C.brand}
          judul="Belum ada agenda"
          deskripsi="Tambahkan agenda dari halaman Kalender."
          aksi="Buka kalender"
          onAksi={() => router.navigate("/kalender" as never)}
        />
      ) : (
        data.agenda.map((e) => {
          const status = statusAcara(e, sekarang);
          const berlangsung =
            new Date(e.start_at).getTime() <= sekarang &&
            sekarang < new Date(e.end_at).getTime();
          return (
            <View
              key={e.id}
              style={[s.barisAgenda, status === "selesai" && { opacity: 0.75 }]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    s.judulBaris,
                    status === "selesai" && { textDecorationLine: "line-through" },
                  ]}
                  numberOfLines={1}
                >
                  {e.title}
                </Text>
                <Text style={s.subBaris} numberOfLines={1}>
                  {infoWaktu(e)}
                  {e.location ? ` · ${e.location}` : ""}
                </Text>
              </View>
              {status ? (
                <LabelStatusAcara status={status} />
              ) : (
                <TagTitik
                  label={berlangsung ? "Berlangsung" : "Akan datang"}
                  warna={berlangsung ? C.aqua : C.brand}
                />
              )}
            </View>
          );
        })
      )}
    </PanelKartu>
  );
}

/* ---------------- Anggaran ---------------- */

export function KartuAnggaran({ data }: { data: DataDashboard }) {
  const router = useRouter();
  const { batas, sisa, pengeluaran } = data.keuangan;
  const formatUang = buatFormatUang(data.mataUang);
  const persen =
    batas && batas > 0 ? Math.min(Math.round((pengeluaran / batas) * 100), 100) : 0;
  const lebih = sisa !== null && sisa < 0;

  return (
    <PanelKartu
      judul="Anggaran"
      sub="Sisa anggaran bulan ini"
      rute="/keuangan"
    >
      {batas === null ? (
        <KondisiKosong
          warna="rgba(167,139,250,0.3)"
          judul="Batas bulan ini belum diatur"
          deskripsi="Atur batas pengeluaranmu di halaman Keuangan."
          aksi="Atur anggaran"
          onAksi={() => router.navigate("/keuangan" as never)}
        />
      ) : (
        <View style={s.kotakAnggaran}>
          <View>
            <Text style={s.subBaris}>Sisa anggaran</Text>
            <Text style={s.angkaAnggaran}>{formatUang(sisa ?? 0)}</Text>
          </View>
          <View style={{ marginTop: 24 }}>
            <View style={s.jalurBar}>
              <View
                style={[
                  s.isiBar,
                  { width: `${persen}%`, backgroundColor: lebih ? C.lilac : C.aqua },
                ]}
              />
            </View>
            <Text style={[s.subBaris, { marginTop: 8 }]}>
              {lebih ? "Melebihi batas · " : ""}
              Terpakai {formatUang(pengeluaran)} dari {formatUang(batas)}
            </Text>
          </View>
        </View>
      )}
    </PanelKartu>
  );
}

const s = StyleSheet.create({
  galat: { fontSize: 14, color: C.snow },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: C.baris,
  },
  barisAgenda: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: C.baris,
  },
  kotakIkon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titikPrioritas: { width: 10, height: 10, borderRadius: 5 },
  judulBaris: { fontSize: 14, fontWeight: "500", color: C.snow },
  subBaris: { marginTop: 2, fontSize: 12, color: C.mist },
  kanan: { fontSize: 12, color: C.mist, textAlign: "right" },
  lainnya: { paddingHorizontal: 4, paddingTop: 4, fontSize: 12, color: C.mist },
  labelStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  teksStatus: { fontSize: 12, color: C.mist },
  kotakAnggaran: {
    minHeight: 170,
    borderRadius: 16,
    backgroundColor: C.baris,
    padding: 20,
    justifyContent: "space-between",
  },
  angkaAnggaran: { marginTop: 4, fontSize: 24, fontWeight: "600", color: C.snow },
  jalurBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(8,11,22,0.6)",
    overflow: "hidden",
  },
  isiBar: { height: 6, borderRadius: 3 },
});