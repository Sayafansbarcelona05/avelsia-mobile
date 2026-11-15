import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const INK = "#080B16";
const SURFACE = "#0F1527";
const LINE = "#1B2440";
const SNOW = "#F5F7FF";
const MIST = "#AAB4D0";
const BRAND = "#5B6CFF";
const AQUA = "#32D9FF";

type Profil = { username: string | null; avatarUrl: string | null };

export function Avatar({
  url,
  inisial,
  ukuran = 36,
}: {
  url: string | null;
  inisial: string;
  ukuran?: number;
}) {
  const [gagal, setGagal] = useState(false);
  const bentuk = { width: ukuran, height: ukuran, borderRadius: ukuran / 2 };

  if (url && !gagal) {
    return (
      <Image
        source={{ uri: url }}
        onError={() => setGagal(true)}
        style={[bentuk, { backgroundColor: SURFACE }]}
      />
    );
  }
  return (
    <View style={[bentuk, s.inisial]}>
      <Text style={[s.teksInisial, { fontSize: ukuran * 0.42 }]}>{inisial}</Text>
    </View>
  );
}

export default function BarAtas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, keluar } = useAuth();
  const [profil, setProfil] = useState<Profil>({ username: null, avatarUrl: null });
  const [buka, setBuka] = useState(false);

  const idUser = session?.user.id;

  useEffect(() => {
    if (!idUser) return;
    let aktif = true;
    async function muat() {
      const { data } = await supabase
        .from("user_preferences")
        .select("username, avatar_path")
        .maybeSingle();
      if (!aktif) return;

      const username = data?.username ?? null;
      setProfil({ username, avatarUrl: null });

      // Bucket "avatars" privat: minta link sementara (berlaku 1 jam)
      if (!data?.avatar_path) return;
      const { data: tanda, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 3600);
      if (!aktif) return;
      if (__DEV__ && error) console.log("Avatar:", error.message);
      if (tanda?.signedUrl) setProfil({ username, avatarUrl: tanda.signedUrl });
    }
    muat();
    return () => {
      aktif = false;
    };
  }, [idUser]);

  const nama = profil.username || session?.user.email || "Akun";
  const inisial = nama.charAt(0).toUpperCase();
  const url = profil.avatarUrl?.startsWith("http") ? profil.avatarUrl : null;

  async function tekanKeluar() {
    setBuka(false);
    await keluar();
  }

  function bukaPengaturan() {
    setBuka(false);
    router.push("/pengaturan" as never);
  }

  return (
    <>
      <View style={[s.bar, { paddingTop: insets.top }]}>
        <View style={s.isiBar}>
          <View style={s.logoWrap}>
            <Image
              source={require("../../assets/logo/logo-header.png")}
              style={s.logo}
              resizeMode="contain"
              accessibilityLabel="Avelsia"
            />
            <Text style={s.beta}>beta</Text>
          </View>

          <Pressable
            onPress={() => setBuka(true)}
            accessibilityRole="button"
            accessibilityLabel="Akun"
            hitSlop={8}
          >
            <Avatar url={url} inisial={inisial} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={buka}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBuka(false)}
      >
        <Pressable style={s.latar} onPress={() => setBuka(false)}>
          <Pressable
            style={[s.panel, { marginTop: insets.top + 60 }]}
            onPress={() => {}}
          >
            <View style={s.barisAkun}>
              <Avatar url={url} inisial={inisial} ukuran={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.namaAkun} numberOfLines={1}>
                  {nama}
                </Text>
                {profil.username && session?.user.email ? (
                  <Text style={s.emailAkun} numberOfLines={1}>
                    {session.user.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable onPress={bukaPengaturan} style={s.tombolPengaturan}>
              <Text style={s.teksKeluar}>Pengaturan</Text>
            </Pressable>

            <Pressable onPress={tekanKeluar} style={s.tombolKeluar}>
              <Text style={s.teksKeluar}>Keluar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: INK,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  isiBar: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWrap: { flexDirection: "row", alignItems: "flex-start" },
  logo: { width: 100, height: 14 },
  beta: {
    marginLeft: 4,
    marginTop: -6,
    fontSize: 9,
    fontWeight: "600",
    color: AQUA,
  },
  inisial: {
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  teksInisial: { color: SNOW, fontWeight: "700" },
  latar: {
    flex: 1,
    backgroundColor: "rgba(8,11,22,0.8)",
    paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  barisAkun: { flexDirection: "row", alignItems: "center", gap: 12 },
  namaAkun: { fontSize: 15, fontWeight: "600", color: SNOW },
  emailAkun: { fontSize: 12, color: MIST, marginTop: 2 },
  tombolPengaturan: {
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolKeluar: {
    height: 46,
    borderRadius: 23,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
  teksKeluar: { color: SNOW, fontSize: 15, fontWeight: "600" },
});