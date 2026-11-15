import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

const NAVY = "#1B2036"; // sama persis dengan warna latar logo

// Ukuran logo penuh (piksel pada file asli) dan letak tiap potongan di dalamnya
const LOGO = { lebar: 1450, tinggi: 194 };

const AV = {
  sumber: require("../../assets/logo/av.png"),
  x: 0,
  w: 418,
};

const HURUF = [
  { sumber: require("../../assets/logo/e.png"), x: 457, w: 193 },
  { sumber: require("../../assets/logo/l.png"), x: 695, w: 145 },
  { sumber: require("../../assets/logo/s.png"), x: 885, w: 193 },
  { sumber: require("../../assets/logo/i.png"), x: 1122, w: 48 },
  { sumber: require("../../assets/logo/a.png"), x: 1195, w: 255 },
];

const SEGITIGA = {
  sumber: require("../../assets/logo/segitiga.png"),
  x: 1288,
  y: 132,
  w: 69,
  h: 61,
};

const IKON = require("../../assets/logo/ikon.png");

/**
 * Semua gerakan dijalankan oleh SATU animasi native (nilai p dari 0 ke 1),
 * lalu tiap bagian hanya membaca p lewat interpolate. Dengan begitu animasi
 * tetap mulus walaupun JavaScript sedang sibuk (memuat layar login, WebView, dll).
 */
type Easingan = (t: number) => number;

function buatLintasan(p: Animated.Value, total: number) {
  const ms = (x: number) => x / total;
  return (
    mulai: number,
    selesai: number,
    dari: number,
    ke: number,
    easing: Easingan = Easing.out(Easing.cubic)
  ) =>
    p.interpolate({
      inputRange: [0, ms(mulai), ms(selesai), 1],
      outputRange: [dari, dari, ke, ke],
      easing,
      extrapolate: "clamp",
    });
}

const TOTAL_INTRO = 3000;
const AKHIR_TAMPIL_INTRO = 2600; // setelah ini logo memudar

function buatGayaIntro(p: Animated.Value, lebarLogo: number) {
  const s = lebarLogo / LOGO.lebar;
  const dx = lebarLogo / 2 - (AV.x + AV.w / 2) * s; // supaya AV mulai di tengah
  const lintasan = buatLintasan(p, TOTAL_INTRO);

  return {
    s,
    induk: p.interpolate({
      inputRange: [0, AKHIR_TAMPIL_INTRO / TOTAL_INTRO, 1],
      outputRange: [1, 1, 0],
      extrapolate: "clamp",
    }),
    avGeser: lintasan(600, 1300, dx, 0),
    avSkala: lintasan(600, 1300, 1.3, 1),
    huruf: HURUF.map((_, i) => {
      const mulai = 850 + i * 100;
      const selesai = mulai + 380;
      return {
        opacity: lintasan(mulai, selesai, 0, 1, Easing.out(Easing.quad)),
        geser: lintasan(mulai, selesai, -12, 0),
      };
    }),
    segitiga: {
      opacity: lintasan(1700, 1800, 0, 1, Easing.linear),
      skala: lintasan(1700, 2080, 0, 1, Easing.out(Easing.back(2))),
      geserY: lintasan(
        1700,
        2080,
        (SEGITIGA.h * s) / 2,
        0,
        Easing.out(Easing.back(2))
      ),
    },
  };
}

/**
 * Animasi pembuka (kira-kira 3 detik):
 * monogram AV di tengah -> bergeser ke kiri sambil E-L-S-I-A muncul satu per satu
 * -> segitiga emas muncul paling akhir -> memudar ke layar berikutnya.
 */
export function IntroAvelsia({ onSelesai }: { onSelesai: () => void }) {
  const { width } = useWindowDimensions();
  const lebarLogo = Math.min(width * 0.6, 240);

  const callbackSelesai = useRef(onSelesai);
  useEffect(() => {
    callbackSelesai.current = onSelesai;
  });

  const [p] = useState(() => new Animated.Value(0));
  const [gaya] = useState(() => buatGayaIntro(p, lebarLogo));
  const { s } = gaya;
  const splashDisembunyikan = useRef(false);

  useEffect(() => {
    let batal = false;
    let anim: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((kurangiGerak) => {
      if (batal) return;

      if (kurangiGerak) {
        // Tanpa gerakan: logo penuh langsung tampil, lalu memudar
        p.setValue(2300 / TOTAL_INTRO);
        anim = Animated.timing(p, {
          toValue: 1,
          duration: TOTAL_INTRO - 2300,
          easing: Easing.linear,
          useNativeDriver: true,
        });
      } else {
        anim = Animated.timing(p, {
          toValue: 1,
          duration: TOTAL_INTRO,
          easing: Easing.linear,
          useNativeDriver: true,
        });
      }

      anim.start(({ finished }) => {
        if (finished) callbackSelesai.current();
      });
    });

    return () => {
      batal = true;
      anim?.stop();
    };
  }, [p]);

  // Splash bawaan baru dilepas setelah layar animasi siap, supaya tidak ada kedipan
  function sembunyikanSplash() {
    if (splashDisembunyikan.current) return;
    splashDisembunyikan.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }

  return (
    <Animated.View
      style={[styles.lapisan, { opacity: gaya.induk }]}
      onLayout={sembunyikanSplash}
    >
      <View style={{ width: lebarLogo, height: LOGO.tinggi * s }}>
        <Animated.Image
          source={AV.sumber}
          style={{
            position: "absolute",
            left: AV.x * s,
            top: 0,
            width: AV.w * s,
            height: LOGO.tinggi * s,
            transform: [{ translateX: gaya.avGeser }, { scale: gaya.avSkala }],
          }}
        />

        {HURUF.map((h, i) => (
          <Animated.Image
            key={i}
            source={h.sumber}
            style={{
              position: "absolute",
              left: h.x * s,
              top: 0,
              width: h.w * s,
              height: LOGO.tinggi * s,
              opacity: gaya.huruf[i].opacity,
              transform: [{ translateX: gaya.huruf[i].geser }],
            }}
          />
        ))}

        <Animated.Image
          source={SEGITIGA.sumber}
          style={{
            position: "absolute",
            left: SEGITIGA.x * s,
            top: SEGITIGA.y * s,
            width: SEGITIGA.w * s,
            height: SEGITIGA.h * s,
            opacity: gaya.segitiga.opacity,
            // Segitiga membesar dari alasnya, bukan dari tengahnya
            transform: [
              { translateY: gaya.segitiga.geserY },
              { scale: gaya.segitiga.skala },
            ],
          }}
        />
      </View>
    </Animated.View>
  );
}

const TOTAL_MASUK = 1200;

function buatGayaMasuk(p: Animated.Value) {
  const ms = (x: number) => x / TOTAL_MASUK;
  return {
    induk: p.interpolate({
      inputRange: [0, ms(800), 1],
      outputRange: [1, 1, 0],
      extrapolate: "clamp",
    }),
    skala: p.interpolate({
      inputRange: [0, ms(480), ms(800), 1],
      outputRange: [0.85, 1, 1, 1.06],
      easing: Easing.out(Easing.cubic),
      extrapolate: "clamp",
    }),
  };
}

/**
 * Animasi singkat (kira-kira 1,2 detik) setelah berhasil masuk, sebelum dashboard:
 * ikon AV membesar halus, bertahan sebentar, lalu memudar.
 */
export function TransisiMasuk({ onSelesai }: { onSelesai: () => void }) {
  const callbackSelesai = useRef(onSelesai);
  useEffect(() => {
    callbackSelesai.current = onSelesai;
  });

  const [p] = useState(() => new Animated.Value(0));
  const [gaya] = useState(() => buatGayaMasuk(p));

  useEffect(() => {
    let batal = false;
    let anim: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((kurangiGerak) => {
      if (batal) return;

      if (kurangiGerak) p.setValue(480 / TOTAL_MASUK);

      anim = Animated.timing(p, {
        toValue: 1,
        duration: kurangiGerak ? TOTAL_MASUK - 480 : TOTAL_MASUK,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (finished) callbackSelesai.current();
      });
    });

    return () => {
      batal = true;
      anim?.stop();
    };
  }, [p]);

  return (
    <Animated.View style={[styles.lapisan, { opacity: gaya.induk }]}>
      <Animated.Image
        source={IKON}
        style={{ width: 120, height: 120, transform: [{ scale: gaya.skala }] }}
      />
    </Animated.View>
  );
}

/**
 * Animasi keluar (kira-kira 1,4 detik): layar memudar ke navy dengan ikon AV,
 * onPenuh dipanggil saat layar tertutup penuh (saat itu proses keluar dijalankan),
 * lalu bertahan sebentar dan memudar ke layar login.
 */
export function TransisiKeluar({
  onPenuh,
  onSelesai,
}: {
  onPenuh: () => void;
  onSelesai: () => void;
}) {
  const callbackPenuh = useRef(onPenuh);
  const callbackSelesai = useRef(onSelesai);
  useEffect(() => {
    callbackPenuh.current = onPenuh;
    callbackSelesai.current = onSelesai;
  });

  const [opa] = useState(() => new Animated.Value(0));
  const [skala] = useState(() =>
    opa.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
      extrapolate: "clamp",
    })
  );

  useEffect(() => {
    let batal = false;
    let naik: Animated.CompositeAnimation | null = null;
    let turun: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((kurangiGerak) => {
      if (batal) return;

      naik = Animated.timing(opa, {
        toValue: 1,
        duration: kurangiGerak ? 150 : 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      naik.start(({ finished }) => {
        if (!finished || batal) return;
        callbackPenuh.current();

        turun = Animated.sequence([
          Animated.delay(kurangiGerak ? 200 : 600),
          Animated.timing(opa, {
            toValue: 0,
            duration: kurangiGerak ? 150 : 450,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        turun.start(({ finished: selesai }) => {
          if (selesai) callbackSelesai.current();
        });
      });
    });

    return () => {
      batal = true;
      naik?.stop();
      turun?.stop();
    };
  }, [opa]);

  return (
    <Animated.View style={[styles.lapisan, { opacity: opa }]}>
      <Animated.Image
        source={IKON}
        style={{ width: 120, height: 120, transform: [{ scale: skala }] }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lapisan: {
    ...StyleSheet.absoluteFill,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
});