import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useAuth } from "../lib/auth";
import { SITUS } from "../lib/situs";

// Warna sama dengan tema web (globals.css)
const WARNA = {
  ink: "#080B16",
  surface: "#151C30",
  line: "#323B54",
  snow: "#F5F7FF",
  mist: "#AAB4D0",
  brand: "#5B6CFF",
  aqua: "#32D9FF",
  galat: "#F87171",
  sukses: "#34D399",
};

// Plus Jakarta Sans, sama dengan web (dimuat di _layout.tsx)
const FONT = {
  reg: "PlusJakartaSans_400Regular",
  med: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
};

const LOGO = require("../../assets/logo/logo-header.png");
const LEBAR_LOGO = 96; // w-24 di web
const TINGGI_LOGO = (LEBAR_LOGO * 82) / 640;

const HOST_BOLEH = ["avelsia.vercel.app", "challenges.cloudflare.com"];

// WebView hanya boleh memuat halaman Avelsia dan Cloudflare Turnstile
function bolehMuat(url: string): boolean {
  if (url === "about:blank") return true;
  const host = /^https:\/\/([^/?#:]+)/i.exec(url)?.[1]?.toLowerCase();
  return !!host && HOST_BOLEH.includes(host);
}

/* ---------- Ikon (sama dengan ikon di web) ---------- */

function IkonSurat() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={3} stroke={WARNA.mist} strokeWidth={1.6} />
      <Path d="m4 8 8 6 8-6" stroke={WARNA.mist} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IkonGembok() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={10} width={16} height={10} rx={3} stroke={WARNA.mist} strokeWidth={1.6} />
      <Path d="M8 10V8a4 4 0 0 1 8 0v2" stroke={WARNA.mist} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IkonMata({ dicoret }: { dicoret: boolean }) {
  const garis = {
    stroke: WARNA.mist,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {dicoret ? (
        <>
          <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" {...garis} />
          <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" {...garis} />
          <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" {...garis} />
          <Path d="m2 2 20 20" {...garis} />
        </>
      ) : (
        <>
          <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" {...garis} />
          <Circle cx={12} cy={12} r={3} {...garis} />
        </>
      )}
    </Svg>
  );
}

function IkonPanah() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10h12M11 5l5 5-5 5" stroke={WARNA.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IkonGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

// Cahaya biru di pojok kiri atas (bg-brand/15 blur di web)
function CahayaLatar() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient
            id="cahaya"
            cx={64}
            cy={64}
            r={250}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={WARNA.brand} stopOpacity={0.22} />
            <Stop offset="1" stopColor={WARNA.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#cahaya)" />
      </Svg>
    </View>
  );
}

// Cincin fokus: focus:ring-2 ring-aqua/30 di web, tanpa mengubah ukuran tata letak
function Kolom({ aktif, children }: { aktif: boolean; children: ReactNode }) {
  return (
    <View style={[s.cincin, aktif && s.cincinAktif]}>
      <View>{children}</View>
    </View>
  );
}

export default function Masuk() {
  const { masuk, masukGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tampilSandi, setTampilSandi] = useState(false);
  const [fokus, setFokus] = useState<"email" | "password" | null>(null);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [galatCaptcha, setGalatCaptcha] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const [keyboardTampil, setKeyboardTampil] = useState(false);

  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardTampil(true)
    );
    const b = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardTampil(false)
    );
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  function onPesanCaptcha(e: WebViewMessageEvent) {
    try {
      const d = JSON.parse(e.nativeEvent.data) as {
        type?: string;
        token?: string;
        code?: string;
      };
      if (d.type === "token" && typeof d.token === "string") {
        setToken(d.token);
        setGalatCaptcha(null);
      } else if (d.type === "expired") {
        setToken("");
      } else if (d.type === "error") {
        setToken("");
        setGalatCaptcha(d.code ?? "unknown");
      }
    } catch {
      // pesan yang bukan dari halaman CAPTCHA diabaikan
    }
  }

  // Token Turnstile hanya berlaku sekali, jadi widget dimuat ulang setiap percobaan
  function muatUlangCaptcha() {
    setToken("");
    setGalatCaptcha(null);
    setCaptchaKey((k) => k + 1);
  }

  async function kirim() {
    if (proses) return;
    setPesan(null);

    const emailBersih = email.trim().toLowerCase();
    if (!emailBersih || !password) {
      setPesan("Isi email dan kata sandi.");
      return;
    }
    if (!token) {
      setPesan("Selesaikan verifikasi anti-bot dulu.");
      return;
    }

    setProses(true);
    const hasil = await masuk(emailBersih, password, token);
    if (!hasil.ok) {
      setPesan(hasil.pesan);
      setProses(false);
      muatUlangCaptcha();
    }
    // Kalau berhasil, penjaga halaman otomatis memindahkan ke beranda
  }

  async function kirimGoogle() {
    if (proses) return;
    setPesan(null);
    setProses(true);
    const hasil = await masukGoogle();
    if (!hasil.ok) {
      if (hasil.pesan) setPesan(hasil.pesan);
      setProses(false);
    }
    // Kalau berhasil, penjaga halaman otomatis memindahkan ke beranda
  }

  const bisaKirim = !!email && !!password && !!token && !proses;

  return (
    <View style={s.layar}>
      <CahayaLatar />

      <KeyboardAvoidingView
        style={s.isiLayar}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header: logo + lencana beta, dan tautan Daftar */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.logoKotak}>
            <Image
              source={LOGO}
              style={{ width: LEBAR_LOGO, height: TINGGI_LOGO }}
              accessibilityLabel="Avelsia beta"
            />
            <Text style={s.beta}>beta</Text>
          </View>

          <Text style={s.headerTeks}>
            Belum punya akun?{" "}
            <Text
              style={s.headerTautan}
              onPress={() => Linking.openURL(`${SITUS}/daftar`)}
            >
              Daftar
            </Text>
          </Text>
        </View>

        {/* Isi: berada di tengah, bisa digulir kalau layar sangat pendek */}
        <ScrollView
          contentContainerStyle={s.isiGulir}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.isi}>
            <Text style={s.judul}>Masuk</Text>
            <Text style={s.deskripsi}>Masuk untuk melanjutkan ke Avelsia.</Text>

            <View style={s.form}>
              <Kolom aktif={fokus === "email"}>
                <View>
                  <View style={s.ikonKiri}>
                    <IkonSurat />
                  </View>
                  <TextInput
                    style={[s.input, fokus === "email" && s.inputAktif]}
                    placeholder="Email"
                    placeholderTextColor={WARNA.mist}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFokus("email")}
                    onBlur={() => setFokus(null)}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    maxLength={254}
                    accessibilityLabel="Email"
                  />
                </View>
              </Kolom>

              <View>
                <Kolom aktif={fokus === "password"}>
                  <View>
                    <View style={s.ikonKiri}>
                      <IkonGembok />
                    </View>
                    <TextInput
                      style={[s.input, fokus === "password" && s.inputAktif]}
                      placeholder="Kata sandi"
                      placeholderTextColor={WARNA.mist}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFokus("password")}
                      onBlur={() => setFokus(null)}
                      secureTextEntry={!tampilSandi}
                      autoCapitalize="none"
                      autoComplete="current-password"
                      autoCorrect={false}
                      maxLength={72}
                      accessibilityLabel="Kata sandi"
                    />
                    <Pressable
                      onPress={() => setTampilSandi((v) => !v)}
                      style={s.ikonKanan}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={
                        tampilSandi
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                    >
                      <IkonMata dicoret={tampilSandi} />
                    </Pressable>
                  </View>
                </Kolom>

                <View style={s.lupaBaris}>
                  <Text
                    style={s.lupa}
                    onPress={() => Linking.openURL(`${SITUS}/lupa-sandi`)}
                  >
                    Lupa kata sandi?
                  </Text>
                </View>
              </View>

              <View style={s.captchaKotak}>
                <WebView
                  key={captchaKey}
                  source={{ uri: `${SITUS}/mobile-captcha` }}
                  originWhitelist={["https://*"]}
                  onMessage={onPesanCaptcha}
                  onShouldStartLoadWithRequest={(req) => bolehMuat(req.url)}
                  javaScriptEnabled
                  domStorageEnabled
                  scrollEnabled={false}
                  setSupportMultipleWindows={false}
                  style={s.captcha}
                />
              </View>

              {galatCaptcha ? (
                <Text style={s.galat}>
                  Verifikasi gagal dimuat (kode: {galatCaptcha}).
                </Text>
              ) : null}
              {pesan ? <Text style={s.galat}>{pesan}</Text> : null}
              {token ? (
                <Text style={[s.catatan, { color: WARNA.sukses }]}>
                  Verifikasi selesai.
                </Text>
              ) : null}
            </View>

            {/* Tombol Masuk, "atau", dan tombol Google */}
            <View style={s.barisTombol}>
              <Pressable
                onPress={kirim}
                disabled={!bisaKirim}
                accessibilityRole="button"
                style={({ pressed }) => [
                  s.tombol,
                  !bisaKirim && s.mati,
                  pressed && bisaKirim && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={s.teksTombol}>
                  {proses ? "Memproses..." : "Masuk"}
                </Text>
                <View style={s.lingkaranPanah}>
                  {proses ? (
                    <ActivityIndicator size="small" color={WARNA.ink} />
                  ) : (
                    <IkonPanah />
                  )}
                </View>
              </Pressable>

              <Text style={s.atau}>atau</Text>

              <Pressable
                onPress={kirimGoogle}
                disabled={proses}
                accessibilityRole="button"
                accessibilityLabel="Lanjutkan dengan Google"
                style={({ pressed }) => [
                  s.tombolGoogle,
                  proses && s.mati,
                  pressed && !proses && { transform: [{ scale: 0.9 }] },
                ]}
              >
                <IkonGoogle />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Teks syarat dan privasi (disembunyikan saat keyboard terbuka) */}
        {keyboardTampil ? null : (
          <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.legal}>
              Dengan melanjutkan, kamu menyetujui{" "}
              <Text
                style={s.legalTautan}
                onPress={() => Linking.openURL(`${SITUS}/syarat-ketentuan`)}
              >
                Syarat &amp; Ketentuan
              </Text>{" "}
              dan{" "}
              <Text
                style={s.legalTautan}
                onPress={() => Linking.openURL(`${SITUS}/kebijakan-privasi`)}
              >
                Kebijakan Privasi
              </Text>
              .
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.ink },
  isiLayar: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logoKotak: { marginRight: 28 },
  beta: {
    position: "absolute",
    left: LEBAR_LOGO + 4,
    top: -6,
    fontFamily: FONT.semi,
    fontSize: 9,
    lineHeight: 9,
    letterSpacing: 0.45,
    color: WARNA.aqua,
  },
  headerTeks: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: FONT.reg,
    fontSize: 14,
    color: WARNA.mist,
  },
  headerTautan: { fontFamily: FONT.med, color: WARNA.aqua },

  isiGulir: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  isi: { width: "100%", maxWidth: 448, alignSelf: "center" },

  judul: {
    fontFamily: FONT.bold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: WARNA.snow,
  },
  deskripsi: {
    marginTop: 8,
    fontFamily: FONT.reg,
    fontSize: 14,
    lineHeight: 22,
    color: WARNA.mist,
  },

  form: { marginTop: 24, gap: 12 },

  cincin: { padding: 2, margin: -2, borderRadius: 18 },
  cincinAktif: { backgroundColor: "rgba(50, 217, 255, 0.3)" },

  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARNA.line,
    backgroundColor: WARNA.surface,
    paddingLeft: 44,
    paddingRight: 44,
    paddingVertical: 0,
    fontFamily: FONT.reg,
    fontSize: 15,
    color: WARNA.snow,
    includeFontPadding: false,
  },
  inputAktif: { borderColor: WARNA.aqua },
  ikonKiri: {
    position: "absolute",
    left: 16,
    top: 14,
    zIndex: 10,
    pointerEvents: "none",
  },
  ikonKanan: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  lupaBaris: { marginTop: 8, alignItems: "flex-end" },
  lupa: { fontFamily: FONT.med, fontSize: 14, color: WARNA.aqua },

  captchaKotak: {
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: WARNA.ink,
  },
  captcha: { backgroundColor: WARNA.ink },
  catatan: { fontFamily: FONT.reg, fontSize: 12 },
  galat: { fontFamily: FONT.reg, fontSize: 13, color: WARNA.galat },

  barisTombol: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  tombol: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 24,
    backgroundColor: WARNA.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 28,
    paddingRight: 6,
  },
  teksTombol: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONT.semi,
    fontSize: 14,
    color: WARNA.ink,
  },
  lingkaranPanah: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(8, 11, 22, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  atau: { fontFamily: FONT.reg, fontSize: 14, color: WARNA.mist },
  tombolGoogle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: WARNA.line,
    backgroundColor: WARNA.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mati: { opacity: 0.5 },

  footer: { paddingHorizontal: 24, paddingTop: 8 },
  legal: {
    textAlign: "center",
    fontFamily: FONT.reg,
    fontSize: 12,
    lineHeight: 18,
    color: WARNA.mist,
  },
  legalTautan: { textDecorationLine: "underline" },
});