import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Banner, BarTanggal } from "../../components/dashboard/banner";
import KartuBelajar from "../../components/dashboard/kartu-belajar";
import {
  KartuAnggaran,
  KartuJadwal,
  KartuTugas,
} from "../../components/dashboard/kartu-ringkas";
import { useAuth } from "../../lib/auth";
import { useDashboard } from "../../lib/dashboard";

const INK = "#080B16";
const MIST = "#AAB4D0";
const AQUA = "#32D9FF";

export default function Beranda() {
  const { session } = useAuth();
  const { data, memuat, menyegarkan, galat, muat, segarkan } = useDashboard();

  // Muat ulang setiap kali tab Beranda dibuka
  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const namaLengkap =
    typeof session?.user.user_metadata?.full_name === "string"
      ? (session.user.user_metadata.full_name as string)
      : "";
  const namaSapaan = data?.username || (namaLengkap.trim().split(/\s+/)[0] ?? "");

  return (
    <ScrollView
      style={s.layar}
      contentContainerStyle={s.isi}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={segarkan}
          tintColor={AQUA}
          colors={[AQUA]}
          progressBackgroundColor="#0F1527"
        />
      }
    >
      {data ? (
        <>
          <BarTanggal data={data} />
          <Banner data={data} namaSapaan={namaSapaan} />
          <KartuTugas data={data} />
          <KartuJadwal data={data} />
          <KartuBelajar data={data} />
          <KartuAnggaran data={data} />
        </>
      ) : memuat ? (
        <View style={s.tengah}>
          <ActivityIndicator color={AQUA} />
        </View>
      ) : (
        <Text style={s.galat}>
          {galat
            ? "Dashboard gagal dimuat. Tarik ke bawah untuk mencoba lagi."
            : "Belum ada data."}
        </Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: INK },
  isi: { padding: 20, paddingBottom: 32, gap: 20 },
  tengah: { paddingVertical: 80, alignItems: "center" },
  galat: { fontSize: 14, color: MIST, textAlign: "center", paddingVertical: 60 },
});