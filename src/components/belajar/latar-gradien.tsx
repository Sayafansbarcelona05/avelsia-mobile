import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

// Latar gradien diagonal; taruh sebagai anak pertama di View induknya.
// Ukurannya diambil dari induk (piksel pasti), bukan persen, supaya tidak
// lebih sempit dari kartu di Android.
export default function LatarGradien({
  dari,
  ke,
  opasDari = 1,
  opasKe = 1,
  radius = 0,
  vertikal = false,
}: {
  dari: string;
  ke: string;
  opasDari?: number;
  opasKe?: number;
  radius?: number;
  vertikal?: boolean;
}) {
  const [ukuran, setUkuran] = useState({ w: 0, h: 0 });
  const id = `g${dari.replace("#", "")}${ke.replace("#", "")}`;

  function saatUkur(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setUkuran((lama) =>
      lama.w === width && lama.h === height ? lama : { w: width, h: height }
    );
  }

  return (
    <View
      pointerEvents="none"
      onLayout={saatUkur}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
    >
      {ukuran.w > 0 ? (
        <Svg width={ukuran.w} height={ukuran.h}>
          <Defs>
            <LinearGradient
              id={id}
              x1="0"
              y1="0"
              x2={vertikal ? "0" : "1"}
              y2="1"
            >
              <Stop offset="0" stopColor={dari} stopOpacity={opasDari} />
              <Stop offset="1" stopColor={ke} stopOpacity={opasKe} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={ukuran.w}
            height={ukuran.h}
            fill={`url(#${id})`}
          />
        </Svg>
      ) : null}
    </View>
  );
}