import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    Vibration,
    View,
} from "react-native";
import { C } from "../dashboard/panel-kartu";

const SUARA_ALARM = require("../../../assets/sounds/alarm.wav");

export type InfoAlarm = { ringkas: string; menit: number | null };

// Tampil di atas semua layar, berbunyi dan bergetar berulang sampai dimatikan.
// Tombol kembali di HP juga mematikannya.
export default function AlarmSesi({
  alarm,
  onMatikan,
}: {
  alarm: InfoAlarm | null;
  onMatikan: () => void;
}) {
  const pemutar = useAudioPlayer(SUARA_ALARM);

  // Bunyi dan getar berulang selama alarm aktif; berhenti saat dimatikan atau layar ditutup
  useEffect(() => {
    if (!alarm) return;
    let aktif = true;
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
      } catch {
        // tetap coba memutar dengan pengaturan bawaan
      }
      if (!aktif) return;
      try {
        pemutar.loop = true;
        await pemutar.seekTo(0);
        pemutar.play();
      } catch {
        // getar tetap jalan walau suara gagal
      }
    })();
    Vibration.vibrate([0, 700, 500], true);
    return () => {
      aktif = false;
      Vibration.cancel();
      try {
        pemutar.pause();
      } catch {
        // pemutar sudah dilepas
      }
    };
  }, [alarm, pemutar]);

  return (
    <Modal
      visible={alarm !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onMatikan}
    >
      <View style={s.latar}>
        <View accessibilityRole="alert" style={s.kartu}>
          <Text style={s.judul}>Waktu belajar selesai</Text>
          <Text style={s.isi}>
            {alarm
              ? `${alarm.ringkas} sudah mencapai ${alarm.menit ?? ""} menit. Timer berhenti otomatis dan sesi ditandai selesai.`
              : ""}
          </Text>
          <Pressable
            onPress={onMatikan}
            accessibilityRole="button"
            style={({ pressed }) => [s.tombol, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.teksTombol}>Matikan alarm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  latar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(8,11,22,0.85)",
  },
  kartu: {
    width: "100%",
    maxWidth: 360,
    gap: 10,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.aqua,
    backgroundColor: C.surface,
  },
  judul: { fontSize: 18, fontWeight: "700", color: C.snow },
  isi: { fontSize: 14, lineHeight: 20, color: C.mist },
  tombol: {
    marginTop: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: C.aqua,
  },
  teksTombol: { fontSize: 15, fontWeight: "700", color: C.ink },
});