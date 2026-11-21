import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

// Membuat timer di aplikasi Jam bawaan HP. Berdering terus sampai dimatikan.
export async function setelAlarmJam(
  detik: number,
  pesan: string
): Promise<void> {
  if (Platform.OS !== "android" || detik < 1) return;
  try {
    await IntentLauncher.startActivityAsync("android.intent.action.SET_TIMER", {
      extra: {
        "android.intent.extra.alarm.LENGTH": Math.ceil(detik),
        "android.intent.extra.alarm.MESSAGE": pesan,
        "android.intent.extra.alarm.SKIP_UI": true,
      },
    });
  } catch (e) {
    console.log("ALARM JAM GAGAL:", e);
  }
}

// Mencoba menghapus timer yang dibuat tadi (bisa tidak didukung di semua HP)
export async function batalkanAlarmJam(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      "android.intent.action.DISMISS_TIMER"
    );
  } catch (e) {
    console.log("BATAL ALARM JAM GAGAL:", e);
  }
}