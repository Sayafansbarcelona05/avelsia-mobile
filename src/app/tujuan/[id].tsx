import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import AksiTimer, {
  type PenangananTimer,
} from "../../components/belajar/aksi-timer";
import AlarmSesi, {
  type InfoAlarm,
} from "../../components/belajar/alarm-sesi";
import DialogTes, { type TargetTes } from "../../components/belajar/dialog-tes";
import FormSesi, {
  type KonfigFormSesi,
} from "../../components/belajar/form-sesi";
import FormTopik, {
  type KonfigFormTopik,
} from "../../components/belajar/form-topik";
import {
  IkonBawah,
  IkonBuku,
  IkonBulat,
  IkonJam,
  IkonKalender,
  IkonKembali,
  IkonPlay,
  IkonSilang,
  IkonTanda,
} from "../../components/belajar/ikon";
import LatarGradien from "../../components/belajar/latar-gradien";
import MenuSesi, {
  type KelolaSesi,
} from "../../components/belajar/menu-sesi";
import MenuTopik, {
  type KelolaTopik,
} from "../../components/belajar/menu-topik";
import { C } from "../../components/dashboard/panel-kartu";
import { toast, WadahToast } from "../../components/toast";
import { useAuth } from "../../lib/auth";
import { formatTanggalPendek } from "../../lib/belajar";
import {
  buatSesi,
  buatTopik,
  geserTopik,
  hapusSesi,
  hapusTopik,
  hentikanTimer,
  mulaiTimer,
  ubahSesi,
  ubahStatusSesi,
  ubahStatusTopik,
  ubahTopik,
  type HasilBelajar,
  type MasukanSesi,
  type MasukanTopik,
} from "../../lib/belajar-aksi";
import {
  hitungAktivitas,
  hitungDetail,
  sisaHariKe,
  useDetailTujuan,
  type AktivitasMingguan,
  type JadwalSesi,
  type NodeAnak,
  type NodeTopik,
  type SesiDetail,
} from "../../lib/belajar-detail";
import { formatHari, formatMenit } from "../../lib/format";

const BATAS_SESI = 6;
const WARNA_TOPIK = [C.lilac, C.aqua, C.brand];

const LABEL_LEVEL: Record<string, string> = {
  pemula: "Pemula",
  menengah: "Menengah",
  mahir: "Mahir",
};
const LABEL_STATUS_TUJUAN: Record<string, string> = {
  active: "Aktif",
  completed: "Selesai",
  archived: "Diarsipkan",
};
const LABEL_STATUS_TOPIK: Record<string, string> = {
  not_started: "Belum mulai",
  in_progress: "Sedang dipelajari",
  done: "Selesai",
};
const LABEL_STATUS_SESI: Record<string, string> = {
  planned: "Direncanakan",
  running: "Sedang berjalan",
  done: "Selesai",
  skipped: "Dilewati",
};

function warnaStatus(status: string) {
  if (status === "done") return C.aqua;
  if (status === "in_progress" || status === "running") return C.lilac;
  if (status === "planned") return C.brand;
  return C.mist;
}

function teksWaktu(est: number | null, dip: number) {
  if (est != null) return `${formatMenit(dip)} / ${formatMenit(est)}`;
  return dip > 0 ? formatMenit(dip) : "—";
}

function ringkasJadwalTeks(jadwal: JadwalSesi[]) {
  const aktif = jadwal.filter((j) => j.status !== "skipped");
  if (aktif.length === 0) return "Belum dijadwalkan";
  const awal = aktif[0].tanggal;
  const akhir = aktif[aktif.length - 1].tanggal;
  const rentang =
    awal === akhir
      ? formatTanggalPendek(awal)
      : `${formatTanggalPendek(awal)} – ${formatTanggalPendek(akhir)}`;
  return `${rentang} · ${aktif.length} sesi`;
}

/* ---------- Komponen kecil ---------- */

function IkonStatus({
  status,
  ukuran = 14,
}: {
  status: string;
  ukuran?: number;
}) {
  const w = warnaStatus(status);
  if (status === "done") return <IkonTanda warna={w} ukuran={ukuran} />;
  if (status === "running") return <IkonPlay warna={w} ukuran={ukuran} />;
  if (status === "skipped") return <IkonSilang warna={w} ukuran={ukuran} />;
  if (status === "in_progress" || status === "planned") {
    return <IkonJam warna={w} ukuran={ukuran} />;
  }
  return <IkonBulat warna={w} ukuran={ukuran} />;
}

function Lencana({ status, label }: { status: string; label: string }) {
  const w = warnaStatus(status);
  return (
    <View style={[s.lencana, { backgroundColor: `${w}26` }]}>
      <IkonStatus status={status} ukuran={12} />
      <Text style={[s.teksLencana, { color: w }]}>{label}</Text>
    </View>
  );
}

function Batang({ persen, warna }: { persen: number; warna: string }) {
  return (
    <View style={s.jalur}>
      <View
        style={[s.isiJalur, { width: `${persen}%`, backgroundColor: warna }]}
      />
    </View>
  );
}

function Cincin({ persen, ukuran = 84 }: { persen: number; ukuran?: number }) {
  const r = 18;
  const keliling = 2 * Math.PI * r;
  return (
    <View style={{ width: ukuran, height: ukuran }}>
      <Svg
        viewBox="0 0 44 44"
        width={ukuran}
        height={ukuran}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={22}
          cy={22}
          r={r}
          fill="none"
          stroke={C.line}
          strokeWidth={4.5}
        />
        <Circle
          cx={22}
          cy={22}
          r={r}
          fill="none"
          stroke={C.aqua}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - persen / 100)}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.tengahCincin]}>
        <Text style={s.teksCincin}>{persen}%</Text>
      </View>
    </View>
  );
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.labelBagian}>{judul}</Text>
      {children}
    </View>
  );
}

function ChipJadwal({
  jadwal,
  hariIni,
}: {
  jadwal: JadwalSesi[];
  hariIni: string;
}) {
  const aktif = jadwal.filter((j) => j.status !== "skipped");
  if (aktif.length === 0) {
    return (
      <View style={s.info}>
        <IkonKalender warna={C.mist} ukuran={14} />
        <Text style={s.kecil}>Belum dijadwalkan</Text>
      </View>
    );
  }
  const tampil = aktif.slice(0, 6);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.info}>
        <IkonKalender warna={C.mist} ukuran={14} />
        <Text style={s.kecil}>Jadwal belajar</Text>
      </View>
      <View style={s.barisChip}>
        {tampil.map((j, i) => {
          const terlewat = j.status === "planned" && j.tanggal < hariIni;
          const label =
            j.status === "done"
              ? "Selesai"
              : j.status === "running"
                ? "Berjalan"
                : terlewat
                  ? "Terlewat"
                  : "Terjadwal";
          const w = warnaStatus(j.status);
          return (
            <View
              key={`${j.tanggal}-${j.jam ?? ""}-${i}`}
              style={[s.chip, { backgroundColor: `${w}26` }]}
            >
              <Text style={[s.teksChip, { color: w }]}>
                {formatHari(j.tanggal)}
                {j.jam ? ` · ${j.jam.slice(0, 5)}` : ""}
                {j.menit != null ? ` · ${formatMenit(j.menit)}` : ""}
                {` · ${label}`}
              </Text>
            </View>
          );
        })}
      </View>
      {aktif.length > 6 ? (
        <Text style={s.kecil}>
          +{aktif.length - 6} sesi lagi (lihat di tab Sesi belajar)
        </Text>
      ) : null}
    </View>
  );
}

/* ---------- Tab Topik ---------- */

function PilBuka({ buka }: { buka: boolean }) {
  return (
    <View style={s.pilBuka}>
      <Text style={s.teksPil}>{buka ? "Tutup" : "Lihat detail"}</Text>
      <View style={{ transform: [{ rotate: buka ? "180deg" : "0deg" }] }}>
        <IkonBawah warna={C.mist} ukuran={14} />
      </View>
    </View>
  );
}

function BarisAnak({
  a,
  nomor,
  jumlah,
  warna,
  hariIni,
  onKelola,
}: {
  a: NodeAnak;
  nomor: number;
  jumlah: number;
  warna: string;
  hariIni: string;
  onKelola: (k: KelolaTopik) => void;
}) {
  const [buka, setBuka] = useState(false);
  const st = a.topik.study_status;
  return (
    <View style={s.kartuAnak}>
      <Pressable
        onPress={() => setBuka(!buka)}
        accessibilityRole="button"
        accessibilityState={{ expanded: buka }}
        style={s.kepalaAnak}
      >
        <View style={[s.bulatStatus, { backgroundColor: `${warnaStatus(st)}26` }]}>
          <IkonStatus status={st} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={s.barisAtasTopik}>
            <Text
              style={[s.judulAnak, { flex: 1 }, st === "done" && s.dicoret]}
            >
              {nomor}. {a.topik.title}
            </Text>
            <PilBuka buka={buka} />
          </View>
          <View style={{ alignSelf: "flex-start" }}>
            <Lencana status={st} label={LABEL_STATUS_TOPIK[st] ?? st} />
          </View>
          <Batang persen={a.persen} warna={warna} />
          <Text style={s.kecil}>
            <Text style={s.tebal}>{a.persen}%</Text>
            {"  ·  "}Waktu belajar {teksWaktu(a.topik.estimated_minutes, a.dip)}
          </Text>
        </View>
      </Pressable>
      {buka ? (
        <View style={[s.isiAnak, { gap: 12 }]}>
          <ChipJadwal jadwal={a.jadwal} hariIni={hariIni} />
          <Pressable
            onPress={() =>
              onKelola({
                id: a.topik.id,
                judul: a.topik.title,
                status: st,
                punyaAnak: false,
                subtopik: true,
                pertama: nomor === 1,
                terakhir: nomor === jumlah,
                estimasiSendiri: a.topik.estimated_minutes,
              })
            }
            accessibilityRole="button"
            style={s.tombolKelola}
          >
            <Text style={s.teksKelola}>Kelola sub topik</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function KartuTopik({
  n,
  nomor,
  jumlah,
  hariIni,
  onKelola,
}: {
  n: NodeTopik;
  nomor: number;
  jumlah: number;
  hariIni: string;
  onKelola: (k: KelolaTopik) => void;
}) {
  const [buka, setBuka] = useState(n.status === "in_progress");
  const warna = WARNA_TOPIK[(nomor - 1) % WARNA_TOPIK.length];
  return (
    <View style={s.kartuTopik}>
      <Pressable
        onPress={() => setBuka(!buka)}
        accessibilityRole="button"
        accessibilityState={{ expanded: buka }}
        style={s.kepalaTopik}
      >
        <View style={[s.nomor, { backgroundColor: `${warna}33` }]}>
          <Text style={[s.teksNomor, { color: warna }]}>{nomor}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={s.barisAtasTopik}>
            <Text
              style={[
                s.judulTopik,
                { flex: 1 },
                n.status === "done" && s.dicoret,
              ]}
            >
              {n.topik.title}
            </Text>
            <PilBuka buka={buka} />
          </View>
          <View style={{ alignSelf: "flex-start" }}>
            <Lencana
              status={n.status}
              label={LABEL_STATUS_TOPIK[n.status] ?? n.status}
            />
          </View>
          <Batang persen={n.persen} warna={warna} />
          <Text style={s.kecil}>
            <Text style={s.tebal}>{n.persen}%</Text>
            {"  ·  "}Waktu belajar {teksWaktu(n.est, n.dip)}
          </Text>
          <Text style={s.kecil}>
            {n.anak.length > 0 ? `${n.anak.length} sub topik` : "Tanpa sub topik"}
          </Text>
          <View style={s.info}>
            <IkonKalender warna={C.mist} ukuran={14} />
            <Text style={[s.kecil, { flexShrink: 1 }]}>
              {ringkasJadwalTeks(n.jadwal)}
            </Text>
          </View>
        </View>
      </Pressable>

      {buka ? (
        <View style={s.isiTopik}>
          <ChipJadwal jadwal={n.jadwal} hariIni={hariIni} />
          <Pressable
            onPress={() =>
              onKelola({
                id: n.topik.id,
                judul: n.topik.title,
                status: n.status,
                punyaAnak: n.anak.length > 0,
                subtopik: false,
                pertama: nomor === 1,
                terakhir: nomor === jumlah,
                estimasiSendiri: n.topik.estimated_minutes,
              })
            }
            accessibilityRole="button"
            style={s.tombolKelola}
          >
            <Text style={s.teksKelola}>Kelola topik</Text>
          </Pressable>
          {n.anak.length > 0 ? (
            <Bagian judul={`SUB TOPIK (${n.anak.length})`}>
              {n.anak.map((a, j) => (
                <BarisAnak
                  key={a.topik.id}
                  a={a}
                  nomor={j + 1}
                  jumlah={n.anak.length}
                  warna={warna}
                  hariIni={hariIni}
                  onKelola={onKelola}
                />
              ))}
            </Bagian>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Tab Sesi belajar ---------- */

function BarisSesi({
  x,
  namaLengkap,
  onKelola,
  timer,
}: {
  x: SesiDetail;
  namaLengkap: Map<string, string>;
  onKelola: (k: KelolaSesi) => void;
  timer: PenangananTimer;
}) {
  const berjalan = x.status === "running";
  const [buka, setBuka] = useState(berjalan);
  const nama = x.topic_id ? namaLengkap.get(x.topic_id) : null;
  const label =
    x.status === "planned" && x.elapsed_seconds > 0
      ? "Dijeda"
      : (LABEL_STATUS_SESI[x.status] ?? x.status);
  const persen =
    x.status === "done" && !x.planned_minutes
      ? 100
      : x.planned_minutes
        ? Math.min(100, Math.round((x.actual_minutes / x.planned_minutes) * 100))
        : 0;
  // Sesi selesai menampilkan waktu nyata; yang belum selesai menampilkan rencananya
  const menitBaris =
    x.status === "done" ? x.actual_minutes : (x.planned_minutes ?? x.actual_minutes);
  const info = [
    formatTanggalPendek(x.session_date),
    x.start_time ? `Jam ${x.start_time.slice(0, 5)}` : null,
    formatMenit(menitBaris),
  ]
    .filter(Boolean)
    .join(" · ");
  const w = warnaStatus(x.status);

  return (
    <View style={[s.kartuSesi, berjalan && { borderColor: `${C.lilac}66` }]}>
      <Pressable
        onPress={() => setBuka(!buka)}
        accessibilityRole="button"
        accessibilityState={{ expanded: buka }}
        style={s.kepalaSesi}
      >
        <View style={[s.bulatStatus, { backgroundColor: `${w}26` }]}>
          <IkonStatus status={x.status} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.judulSesi} numberOfLines={2}>
            {nama ?? "Sesi tanpa topik"}
          </Text>
          <Text style={s.kecil} numberOfLines={1}>
            {info}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: buka ? "180deg" : "0deg" }] }}>
          <IkonBawah warna={C.mist} ukuran={18} />
        </View>
      </Pressable>

      {buka ? (
        <View style={s.isiSesi}>
          <View style={s.barisChip}>
            <Lencana status={x.status} label={label} />
            <Text style={[s.kecil, { alignSelf: "center" }]}>
              {formatMenit(x.actual_minutes)}
              {x.planned_minutes != null
                ? ` / ${formatMenit(x.planned_minutes)}`
                : ""}
            </Text>
          </View>
          {x.notes ? <Text style={s.redup}>{x.notes}</Text> : null}
          <View style={s.barisPersen}>
            <View style={{ flex: 1 }}>
              <Batang persen={persen} warna={w} />
            </View>
            <Text style={[s.tebal, { color: w, fontSize: 12 }]}>{persen}%</Text>
          </View>
          <AksiTimer
            x={x}
            timer={timer}
            ringkas={`${formatTanggalPendek(x.session_date)}${nama ? ` · ${nama}` : ""}`}
          />
          <Pressable
            onPress={() =>
              onKelola({
                id: x.id,
                ringkas: `${formatTanggalPendek(x.session_date)}${nama ? ` · ${nama}` : ""}`,
                status: x.status,
                adaJeda: x.elapsed_seconds > 0,
                topic_id: x.topic_id,
                session_date: x.session_date,
                start_time: x.start_time,
                planned_minutes: x.planned_minutes,
                actual_minutes: x.actual_minutes,
                notes: x.notes,
                namaTopik: nama ?? null,
              })
            }
            accessibilityRole="button"
            style={s.tombolKelola}
          >
            <Text style={s.teksKelola}>Kelola sesi</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function GrupSesi({
  judul,
  items,
  namaLengkap,
  onKelola,
  timer,
  lipat,
}: {
  judul: string;
  items: SesiDetail[];
  namaLengkap: Map<string, string>;
  onKelola: (k: KelolaSesi) => void;
  timer: PenangananTimer;
  lipat?: boolean;
}) {
  const [terbuka, setTerbuka] = useState(!lipat);
  const [semua, setSemua] = useState(false);
  const tampil = semua ? items : items.slice(0, BATAS_SESI);
  const sisa = items.length - BATAS_SESI;

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={lipat ? () => setTerbuka(!terbuka) : undefined}
        accessibilityRole={lipat ? "button" : undefined}
        style={s.kepalaGrup}
      >
        <Text style={s.labelBagian}>{judul.toUpperCase()}</Text>
        <View style={s.hitung}>
          <Text style={s.teksHitung}>{items.length}</Text>
        </View>
        {lipat ? (
          <View
            style={{
              marginLeft: "auto",
              transform: [{ rotate: terbuka ? "180deg" : "0deg" }],
            }}
          >
            <IkonBawah warna={C.mist} ukuran={18} />
          </View>
        ) : null}
      </Pressable>

      {terbuka ? (
        <View style={{ gap: 8 }}>
          {tampil.map((x) => (
            <BarisSesi
              key={x.id}
              x={x}
              namaLengkap={namaLengkap}
              onKelola={onKelola}
              timer={timer}
            />
          ))}
          {sisa > 0 ? (
            <Pressable
              onPress={() => setSemua(!semua)}
              accessibilityRole="button"
              style={s.tombolLebih}
            >
              <Text style={s.teksLebih}>
                {semua ? "Sembunyikan" : `Tampilkan ${sisa} sesi lainnya`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Layar ---------- */

export default function DetailTujuan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    hariIni,
    tujuan,
    topik,
    sesi,
    lulus,
    tesBerjalan,
    tesSelesai,
    memuat,
    menyegarkan,
    galat,
    tidakAda,
    muat,
    segarkan,
  } = useDetailTujuan(id);
  const [tab, setTab] = useState<"topik" | "sesi">("topik");

  const { session } = useAuth();
  const idUser = session?.user.id ?? "";
  const [formTopik, setFormTopik] = useState<KonfigFormTopik | null>(null);
  const [menuTopik, setMenuTopik] = useState<KelolaTopik | null>(null);
  const [tesTarget, setTesTarget] = useState<TargetTes | null>(null);
  const setelahTesTutup = useRef<(() => void) | null>(null);

  // Tombol Tes: topik tanpa sub topik, sudah punya sesi selesai, belum lulus
  function bukaMenuTopik(k: KelolaTopik) {
    setMenuTopik({
      ...k,
      bisaTes:
        !k.punyaAnak &&
        sesi.some((x) => x.topic_id === k.id && x.status === "done"),
      sudahLulus: lulus.includes(k.id),
      sedangTes: tesBerjalan.includes(k.id),
      adaHasilTes: tesSelesai.includes(k.id),
    });
  }
  // Dipakai untuk membuka form setelah panel menu selesai menutup
  const setelahMenuTutup = useRef<(() => void) | null>(null);

  async function hasilAksi(hasil: HasilBelajar): Promise<HasilBelajar> {
    if (hasil.ok) {
      toast.sukses(hasil.pesan);
      await muat();
    }
    return hasil;
  }

  async function simpanTopik(n: MasukanTopik): Promise<HasilBelajar> {
    const kf = formTopik;
    if (!kf || !tujuan) {
      return { ok: false, pesan: "Terjadi kesalahan. Coba lagi." };
    }
    if (kf.mode === "edit") {
      return hasilAksi(await ubahTopik(idUser, kf.topik.id, n));
    }
    return hasilAksi(
      await buatTopik(
        idUser,
        tujuan.id,
        kf.mode === "sub" ? kf.induk.id : null,
        n
      )
    );
  }

  const [formSesi, setFormSesi] = useState<KonfigFormSesi | null>(null);
  const [menuSesi, setMenuSesi] = useState<KelolaSesi | null>(null);
  const setelahMenuSesiTutup = useRef<(() => void) | null>(null);

  async function simpanSesi(n: MasukanSesi): Promise<HasilBelajar> {
    const kf = formSesi;
    if (!kf || !tujuan) {
      return { ok: false, pesan: "Terjadi kesalahan. Coba lagi." };
    }
    if (kf.mode === "edit") {
      return hasilAksi(await ubahSesi(idUser, kf.sesi.id, n));
    }
    return hasilAksi(await buatSesi(idUser, tujuan.id, n));
  }

  const [alarm, setAlarm] = useState<InfoAlarm | null>(null);

  const timer: PenangananTimer = {
    alarm: setAlarm,
    mulai: async (id) => hasilAksi(await mulaiTimer(idUser, id)),
    hentikan: async (id, selesai) => {
      const hasil = await hasilAksi(await hentikanTimer(idUser, id, selesai));
      if (!hasil.ok) await muat();
      return hasil;
    },
  };

  function bukaFormSesiSetelahMenu(konfig: KonfigFormSesi) {
    setelahMenuSesiTutup.current = () => setFormSesi(konfig);
    setMenuSesi(null);
  }

  function lanjutTesSetelahMenu(k: KelolaTopik) {
    if (!tujuan) return;
    setelahMenuTutup.current = () =>
      router.push(`/tes/${k.id}?goalId=${tujuan.id}` as never);
    setMenuTopik(null);
  }

  function bukaTesSetelahMenu(k: KelolaTopik) {
    if (!tujuan) return;
    setelahMenuTutup.current = () =>
      setTesTarget({
        topicId: k.id,
        goalId: tujuan.id,
        judul: k.judul,
        kata: k.subtopik ? "sub topik" : "topik",
      });
    setMenuTopik(null);
  }

  function bukaFormSetelahMenu(konfig: KonfigFormTopik) {
    setelahMenuTutup.current = () => setFormTopik(konfig);
    setMenuTopik(null);
  }

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const r = useMemo(
    () => (tujuan ? hitungDetail(topik, sesi) : null),
    [tujuan, topik, sesi]
  );

  const aktivitas = useMemo(
    () => (hariIni ? hitungAktivitas(sesi, hariIni) : null),
    [sesi, hariIni]
  );

  function kembali() {
    if (router.canGoBack()) router.back();
    else router.replace("/belajar" as never);
  }

  const header = (
    <View style={s.header}>
      <Pressable
        onPress={kembali}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        style={s.tombolKembali}
      >
        <IkonKembali warna={C.snow} ukuran={20} />
      </Pressable>
      <Text style={s.judulHeader}>Detail tujuan</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (memuat && !tujuan) {
    return (
      <View style={[s.layar, { paddingTop: insets.top }]}>
        {header}
        <View style={s.tengah}>
          <ActivityIndicator color={C.aqua} />
        </View>
      </View>
    );
  }

  if (!tujuan || !r) {
    return (
      <View style={[s.layar, { paddingTop: insets.top }]}>
        {header}
        <View style={s.tengah}>
          <Text style={s.redup}>
            {tidakAda
              ? "Tujuan tidak ditemukan."
              : galat
                ? "Data tujuan belum bisa dimuat. Periksa koneksi lalu coba lagi."
                : "Memuat..."}
          </Text>
          {galat ? (
            <Pressable onPress={muat} style={s.tombolUlang} accessibilityRole="button">
              <Text style={s.teksTombolUlang}>Coba lagi</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const jumlahSesi = sesi.length;

  return (
    <View style={[s.layar, { paddingTop: insets.top }]}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.isi, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={menyegarkan}
            onRefresh={segarkan}
            tintColor={C.aqua}
            colors={[C.aqua]}
          />
        }
      >
        {/* Kartu utama tujuan */}
        <View style={s.kartuUtama}>
          <View style={s.glow} pointerEvents="none">
            <LatarGradien
              dari={C.brand}
              ke={C.brand}
              opasDari={0.3}
              opasKe={0}
              vertikal
            />
          </View>
          <View style={s.barisChip}>
            {tujuan.starting_level ? (
              <View style={[s.lencana, { backgroundColor: `${C.aqua}26` }]}>
                <Text style={[s.teksLencana, { color: C.aqua }]}>
                  {LABEL_LEVEL[tujuan.starting_level] ?? tujuan.starting_level}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                s.lencana,
                { backgroundColor: `${warnaStatus(tujuan.status === "active" ? "in_progress" : tujuan.status === "completed" ? "done" : "x")}26` },
              ]}
            >
              <Text
                style={[
                  s.teksLencana,
                  {
                    color: warnaStatus(
                      tujuan.status === "active"
                        ? "in_progress"
                        : tujuan.status === "completed"
                          ? "done"
                          : "x"
                    ),
                  },
                ]}
              >
                {LABEL_STATUS_TUJUAN[tujuan.status] ?? tujuan.status}
              </Text>
            </View>
            {tujuan.target_date ? (
              <View style={s.info}>
                <IkonKalender warna={C.mist} ukuran={14} />
                <Text style={s.kecil}>
                  Target {formatTanggalPendek(tujuan.target_date)}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={kembali}
              accessibilityRole="button"
              style={s.tombolSemua}
            >
              <IkonKembali warna={C.ink} ukuran={16} />
              <Text style={s.teksSemua}>Semua tujuan</Text>
            </Pressable>
          </View>

          <View style={s.barisJudulTujuan}>
            <View style={s.ubinBuku}>
              <IkonBuku warna={C.snow} ukuran={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.judulTujuan}>{tujuan.title}</Text>
              <Text style={s.kecil}>{r.pohon.length} topik</Text>
            </View>
          </View>

          {tujuan.target_outcome ? (
            <Text style={s.redup}>{tujuan.target_outcome}</Text>
          ) : null}
          {tujuan.completion_criteria ? (
            <Text style={s.redup}>
              <Text style={s.tebal}>Selesai jika:</Text>{" "}
              {tujuan.completion_criteria}
            </Text>
          ) : null}

          <View style={s.kotakProgres}>
            <Cincin persen={r.persenSelesai} />
            <View style={{ flex: 1 }}>
              <Text style={s.judulProgres}>Progres topik</Text>
              <Text style={s.kecil}>
                {r.selesai} dari {r.pohon.length} topik selesai
              </Text>
            </View>
          </View>

          <View style={s.barisAngka}>
            <Angka label="Total belajar" nilai={formatMenit(r.totalMenit)} sorot />
            <Angka
              label="Estimasi total"
              nilai={r.totalEstimasi > 0 ? formatMenit(r.totalEstimasi) : "—"}
            />
            <Angka
              label="Sisa waktu"
              nilai={r.totalEstimasi > 0 ? formatMenit(r.sisaEstimasi) : "—"}
            />
          </View>
        </View>

        {/* Tab Topik / Sesi belajar */}
        <View style={s.barTab}>
          <Pressable
            onPress={() => setTab("topik")}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "topik" }}
            style={[s.tab, tab === "topik" && s.tabOn]}
          >
            <Text style={[s.teksTab, tab === "topik" && s.teksTabOn]}>Topik</Text>
            <View style={s.hitung}>
              <Text style={s.teksHitung}>{r.pohon.length}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setTab("sesi")}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "sesi" }}
            style={[s.tab, tab === "sesi" && s.tabOn]}
          >
            <Text style={[s.teksTab, tab === "sesi" && s.teksTabOn]}>
              Sesi belajar
            </Text>
            <View style={s.hitung}>
              <Text style={s.teksHitung}>{jumlahSesi}</Text>
            </View>
          </Pressable>
        </View>

        {tab === "topik" ? (
          <View style={s.panel}>
            <View style={[s.info, { gap: 8 }]}>
              <Text style={s.judulPanel}>Topik</Text>
              <View style={s.hitung}>
                <Text style={s.teksHitung}>{r.pohon.length}</Text>
              </View>
            </View>
            <Text style={s.kecil}>
              Tiap topik menunjukkan progres belajarmu. Tekan &quot;Lihat
              detail&quot; untuk membuka sub topik dan jadwalnya.
            </Text>
            <Pressable
              onPress={() => setFormTopik({ mode: "tambah" })}
              accessibilityRole="button"
              style={s.tombolTambah}
            >
              <Text style={s.teksTambah}>Tambah topik</Text>
            </Pressable>
            {r.pohon.length === 0 ? (
              <View style={s.kosong}>
                <Text style={s.teksKosong}>Belum ada topik.</Text>
                <Text style={s.redup}>
                  Tekan &quot;Tambah topik&quot; untuk memulai.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12, marginTop: 8 }}>
                {r.pohon.map((n, i) => (
                  <KartuTopik
                    key={n.topik.id}
                    n={n}
                    nomor={i + 1}
                    jumlah={r.pohon.length}
                    hariIni={hariIni}
                    onKelola={bukaMenuTopik}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.panel}>
            <Text style={s.judulPanel}>Sesi belajar</Text>
            <Text style={s.kecil}>
              Catatan waktu belajar kamu. Ketuk sebuah sesi untuk detailnya.
            </Text>
            <Pressable
              onPress={() => setFormSesi({ mode: "tambah" })}
              accessibilityRole="button"
              style={s.tombolTambah}
            >
              <Text style={s.teksTambah}>Tambah sesi</Text>
            </Pressable>
            {jumlahSesi === 0 ? (
              <View style={s.kosong}>
                <Text style={s.teksKosong}>Belum ada sesi belajar.</Text>
              </View>
            ) : (
              <View style={{ gap: 18, marginTop: 8 }}>
                {r.berjalan.length > 0 ? (
                  <GrupSesi
                    judul="Sedang berjalan"
                    items={r.berjalan}
                    namaLengkap={r.namaLengkap}
                    onKelola={setMenuSesi}
                    timer={timer}
                  />
                ) : null}
                {r.akanDatang.length > 0 ? (
                  <GrupSesi
                    judul="Akan datang"
                    items={r.akanDatang}
                    namaLengkap={r.namaLengkap}
                    onKelola={setMenuSesi}
                    timer={timer}
                  />
                ) : null}
                {r.riwayat.length > 0 ? (
                  <GrupSesi
                    judul="Riwayat"
                    items={r.riwayat}
                    namaLengkap={r.namaLengkap}
                    onKelola={setMenuSesi}
                    timer={timer}
                    lipat
                  />
                ) : null}
              </View>
            )}
          </View>
        )}

        {aktivitas ? <KartuAktivitas a={aktivitas} /> : null}
        <KartuTarget
          targetDate={tujuan.target_date}
          level={tujuan.starting_level}
          menitMingguan={tujuan.weekly_minutes}
          hariIni={hariIni}
        />
      </ScrollView>

      <FormTopik
        konfig={formTopik}
        hariIni={hariIni}
        onTutup={() => setFormTopik(null)}
        onSimpan={simpanTopik}
      />
      <DialogTes
        target={tesTarget}
        onTutup={() => setTesTarget(null)}
        onSiap={(t) => {
          setelahTesTutup.current = () =>
            router.push(`/tes/${t.topicId}?goalId=${t.goalId}` as never);
          setTesTarget(null);
        }}
        onSelesaiTutup={() => {
          const lanjut = setelahTesTutup.current;
          setelahTesTutup.current = null;
          lanjut?.();
        }}
      />
      <MenuTopik
        konfig={menuTopik}
        onTutup={() => setMenuTopik(null)}
        onSelesaiTutup={() => {
          const lanjut = setelahMenuTutup.current;
          setelahMenuTutup.current = null;
          lanjut?.();
        }}
        onUbahStatus={async (id, status) =>
          hasilAksi(await ubahStatusTopik(idUser, id, status))
        }
        onGeser={async (id, arah) =>
          hasilAksi(await geserTopik(idUser, tujuan.id, id, arah))
        }
        onHapus={async (id) => hasilAksi(await hapusTopik(idUser, id))}
        onEdit={(k) =>
          bukaFormSetelahMenu({
            mode: "edit",
            topik: {
              id: k.id,
              title: k.judul,
              estimated_minutes: k.estimasiSendiri,
            },
            punyaAnak: k.punyaAnak,
            subtopik: k.subtopik,
          })
        }
        onMulaiTes={bukaTesSetelahMenu}
        onLanjutTes={lanjutTesSetelahMenu}
        onLihatHasil={lanjutTesSetelahMenu}
        onTambahSub={(k) =>
          bukaFormSetelahMenu({
            mode: "sub",
            induk: {
              id: k.id,
              judul: k.judul,
              estimasiSendiri: k.estimasiSendiri,
            },
          })
        }
      />
      <FormSesi
        konfig={formSesi}
        topik={
          formSesi?.mode === "edit"
            ? r.opsiTopik
            : r.opsiTopik.filter(
                (o) => o.estimasi == null || o.dipelajari < o.estimasi
              )
        }
        hariIni={hariIni}
        onTutup={() => setFormSesi(null)}
        onSimpan={simpanSesi}
      />
      <MenuSesi
        konfig={menuSesi}
        onTutup={() => setMenuSesi(null)}
        onSelesaiTutup={() => {
          const lanjut = setelahMenuSesiTutup.current;
          setelahMenuSesiTutup.current = null;
          lanjut?.();
        }}
        onUbahStatus={async (id, status) =>
          hasilAksi(await ubahStatusSesi(idUser, id, status))
        }
        onHapus={async (id) => hasilAksi(await hapusSesi(idUser, id))}
        onEdit={(k) =>
          bukaFormSesiSetelahMenu({
            mode: "edit",
            sesi: {
              id: k.id,
              topic_id: k.topic_id,
              session_date: k.session_date,
              start_time: k.start_time,
              planned_minutes: k.planned_minutes,
              actual_minutes: k.actual_minutes,
              status: k.status,
              notes: k.notes,
            },
            namaTopikSekarang: k.namaTopik,
          })
        }
      />
      <AlarmSesi alarm={alarm} onMatikan={() => setAlarm(null)} />
      <WadahToast atas={insets.top + 8} />
    </View>
  );
}

function KartuAktivitas({ a }: { a: AktivitasMingguan }) {
  const TINGGI = 120;
  return (
    <View style={s.panel}>
      <Text style={s.judulPanel}>Aktivitas belajar</Text>
      <Text style={s.kecil}>
        7 hari terakhir · total {formatMenit(a.total)}
      </Text>

      <View
        style={s.grafik}
        accessibilityLabel={`Menit belajar 7 hari terakhir, total ${formatMenit(a.total)}`}
      >
        {a.hari.map((h, i) => {
          const tertinggi = h.menit > 0 && h.menit === a.menitTertinggi;
          const tinggi =
            h.menit === 0
              ? 4
              : Math.max(10, Math.round((h.menit / a.menitTertinggi) * TINGGI));
          const warna =
            h.menit === 0
              ? C.line
              : tertinggi
                ? C.brand
                : `${WARNA_TOPIK[i % WARNA_TOPIK.length]}CC`;
          return (
            <View key={h.kunci} style={s.kolomGrafik}>
              {tertinggi ? (
                <View style={s.labelTertinggi}>
                  <Text style={s.teksTertinggi} numberOfLines={1}>
                    {formatMenit(h.menit)}
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  width: "100%",
                  height: tinggi,
                  borderRadius: 10,
                  backgroundColor: warna,
                }}
              />
              <Text style={s.hariGrafik}>{h.hari}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function KartuTarget({
  targetDate,
  level,
  menitMingguan,
  hariIni,
}: {
  targetDate: string | null;
  level: string | null;
  menitMingguan: number | null;
  hariIni: string;
}) {
  const sisa = targetDate && hariIni ? sisaHariKe(targetDate, hariIni) : null;
  const info = [
    {
      label: "Level awal",
      nilai: level ? (LABEL_LEVEL[level] ?? level) : null,
    },
    {
      label: "Waktu per minggu",
      nilai: menitMingguan != null ? formatMenit(menitMingguan) : null,
    },
  ].filter((x) => x.nilai);

  return (
    <View style={s.panel}>
      <Text style={s.judulPanel}>Target waktu</Text>

      {targetDate && sisa != null ? (
        <View style={s.barisTarget}>
          <View style={s.kotakTanggal}>
            <Text style={s.kecil}>Target selesai</Text>
            <Text style={s.tanggalTarget}>{formatTanggalPendek(targetDate)}</Text>
          </View>
          <View style={s.kotakSisa}>
            <Text style={s.labelSisa}>{sisa < 0 ? "Terlambat" : "Sisa hari"}</Text>
            <Text style={s.angkaSisa}>
              {String(Math.abs(sisa)).padStart(2, "0")}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.kotakTanggal}>
          <Text style={s.redup}>
            Target tanggal belum diatur. Atur lewat tombol Edit di daftar tujuan.
          </Text>
        </View>
      )}

      {info.map((x) => (
        <View key={x.label} style={s.barisInfoTarget}>
          <Text style={s.kecil}>{x.label}</Text>
          <Text style={s.nilaiInfo}>{x.nilai}</Text>
        </View>
      ))}
    </View>
  );
}

function Angka({
  label,
  nilai,
  sorot,
}: {
  label: string;
  nilai: string;
  sorot?: boolean;
}) {
  return (
    <View style={s.angka}>
      <Text style={s.kecil}>{label}</Text>
      <Text style={[s.nilaiAngka, sorot && { color: C.aqua }]} numberOfLines={1}>
        {nilai}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: C.ink },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tombolKembali: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  judulHeader: { fontSize: 16, fontWeight: "600", color: C.snow },
  isi: { padding: 16, gap: 16 },
  tengah: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  redup: { fontSize: 14, lineHeight: 20, color: C.mist },
  kecil: { fontSize: 12, color: C.mist },
  tebal: { fontWeight: "700", color: C.snow },
  dicoret: { color: C.mist, textDecorationLine: "line-through" },
  tombolUlang: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.aqua,
  },
  teksTombolUlang: { fontSize: 14, fontWeight: "600", color: C.ink },

  kartuUtama: {
    padding: 18,
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.ink,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
  },
  tombolSemua: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.snow,
  },
  teksSemua: { fontSize: 13, fontWeight: "600", color: C.ink },
  barisJudulTujuan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  ubinBuku: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,108,255,0.25)",
  },
  barisAtasTopik: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pilBuka: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  teksPil: { fontSize: 11, fontWeight: "500", color: C.mist },
  barisChip: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  info: { flexDirection: "row", alignItems: "center", gap: 5 },
  judulTujuan: { fontSize: 22, fontWeight: "700", color: C.snow },
  kotakProgres: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 14,
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  judulProgres: { fontSize: 15, fontWeight: "600", color: C.snow },
  tengahCincin: { alignItems: "center", justifyContent: "center" },
  teksCincin: { fontSize: 15, fontWeight: "700", color: C.snow },
  barisAngka: {
    gap: 8,
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  angka: {
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  nilaiAngka: { fontSize: 22, fontWeight: "700", color: C.snow },

  lencana: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  teksLencana: { fontSize: 11, fontWeight: "600" },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  teksChip: { fontSize: 11, fontWeight: "600" },

  barTab: { flexDirection: "row", gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tabOn: { backgroundColor: C.snow },
  teksTab: { fontSize: 14, fontWeight: "600", color: C.mist },
  teksTabOn: { color: C.ink },
  hitung: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(128,138,170,0.25)",
    alignItems: "center",
  },
  teksHitung: { fontSize: 11, fontWeight: "600", color: C.mist },

  panel: {
    padding: 14,
    gap: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  judulPanel: { fontSize: 16, fontWeight: "600", color: C.snow },
  kosong: {
    marginTop: 8,
    padding: 24,
    gap: 4,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  teksKosong: { fontSize: 14, fontWeight: "600", color: C.snow },
  labelBagian: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: C.mist,
  },

  kartuTopik: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  kepalaTopik: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  nomor: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teksNomor: { fontSize: 16, fontWeight: "700" },
  barisJudul: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  judulTopik: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: C.snow },
  isiTopik: {
    gap: 16,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  jalur: {
    height: 8,
    borderRadius: 999,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  isiJalur: { height: "100%", borderRadius: 999 },

  kartuAnak: {
    borderRadius: 14,
    backgroundColor: "rgba(8,11,22,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  kepalaAnak: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  bulatStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  judulAnak: { flexShrink: 1, fontSize: 14, fontWeight: "500", color: C.snow },
  isiAnak: { padding: 12, borderTopWidth: 1, borderTopColor: C.line },

  kepalaGrup: { flexDirection: "row", alignItems: "center", gap: 8 },
  kartuSesi: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  kepalaSesi: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  judulSesi: { fontSize: 14, fontWeight: "500", color: C.snow },
  isiSesi: {
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  barisPersen: { flexDirection: "row", alignItems: "center", gap: 10 },
  grafik: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 170,
    marginTop: 14,
  },
  kolomGrafik: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  labelTertinggi: {
    width: 76,
    alignItems: "center",
    marginBottom: 6,
  },
  teksTertinggi: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: C.lilac,
    fontSize: 10,
    fontWeight: "700",
    color: C.ink,
  },
  hariGrafik: { marginTop: 8, fontSize: 11, color: C.mist },
  barisTarget: { flexDirection: "row", alignItems: "stretch", gap: 8, marginTop: 8 },
  kotakTanggal: {
    flex: 1,
    gap: 4,
    padding: 14,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tanggalTarget: { fontSize: 17, fontWeight: "700", color: C.snow },
  kotakSisa: {
    width: 96,
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
  },
  labelSisa: {
    alignSelf: "stretch",
    textAlign: "center",
    paddingVertical: 6,
    fontSize: 11,
    color: C.mist,
    backgroundColor: C.ink,
  },
  angkaSisa: {
    alignSelf: "stretch",
    textAlign: "center",
    paddingVertical: 10,
    fontSize: 24,
    fontWeight: "700",
    color: C.ink,
    backgroundColor: C.aqua,
  },
  barisInfoTarget: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nilaiInfo: { fontSize: 14, fontWeight: "600", color: C.snow },
  tombolTambah: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: C.aqua,
  },
  teksTambah: { fontSize: 14, fontWeight: "600", color: C.ink },
  tombolKelola: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  teksKelola: { fontSize: 13, fontWeight: "600", color: C.snow },
  tombolLebih: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  teksLebih: { fontSize: 12, fontWeight: "600", color: C.mist },
});