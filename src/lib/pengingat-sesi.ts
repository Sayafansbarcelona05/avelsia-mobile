import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SALURAN = "alarm-belajar";
const SUARA = "alarm.wav";

// Saat app terbuka, alarm di dalam app yang berbunyi. Notifikasi tidak ikut tampil.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let saluranSiap = false;

// Di Android 13+, saluran harus dibuat dulu sebelum izin notifikasi bisa diminta
async function siapkanSaluran() {
  if (Platform.OS !== "android" || saluranSiap) return;
  await Notifications.setNotificationChannelAsync(SALURAN, {
    name: "Alarm sesi belajar",
    importance: Notifications.AndroidImportance.MAX,
    sound: SUARA,
    vibrationPattern: [0, 700, 500, 700],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  saluranSiap = true;
}

async function izinDiberikan(): Promise<boolean> {
  const sekarang = await Notifications.getPermissionsAsync();
  if (sekarang.granted) return true;
  if (!sekarang.canAskAgain) return false;
  const baru = await Notifications.requestPermissionsAsync();
  return baru.granted;
}

const idPengingat = (sesiId: string) => `sesi-${sesiId}`;

export async function batalkanPengingat(sesiId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(idPengingat(sesiId));
  } catch {
    // tidak ada jadwal untuk dibatalkan
  }
}

// Gagal menjadwalkan tidak boleh menggagalkan timer, jadi semua galat ditelan
export async function jadwalkanPengingat(
  sesiId: string,
  sisaDetik: number,
  menit: number | null
): Promise<void> {
  try {
    await batalkanPengingat(sesiId);
    if (sisaDetik < 1) return;
    await siapkanSaluran();
    if (!(await izinDiberikan())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: idPengingat(sesiId),
      content: {
        title: "Waktu belajar selesai",
        body: menit
          ? `Sesi ${menit} menit sudah selesai. Buka Avelsia untuk melihat sesimu.`
          : "Waktu rencana sesi belajarmu sudah habis.",
        sound: SUARA,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(sisaDetik),
        channelId: SALURAN,
      },
    });
  } catch {
    // timer tetap berjalan tanpa notifikasi
  }
}