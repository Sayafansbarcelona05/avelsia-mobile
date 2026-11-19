import Svg, { Circle, Path, Rect } from "react-native-svg";

type P = { warna?: string; ukuran?: number };

const dasar = (ukuran: number, warna: string) => ({
  width: ukuran,
  height: ukuran,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: warna,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IkonBuku({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z" />
      <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" />
    </Svg>
  );
}

export function IkonJam({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IkonCentang({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="m8.5 12.3 2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function IkonApi({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.2 1 2 2 2.2C11 8.5 11 5.5 12 3Z" />
    </Svg>
  );
}

export function IkonPanah({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Path d="M7 17 17 7M9 7h8v8" />
    </Svg>
  );
}

export function IkonKalender({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)}>
      <Rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </Svg>
  );
}

export function IkonTanda({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function IkonBulat({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Circle cx="12" cy="12" r="9" />
    </Svg>
  );
}

export function IkonPlay({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Path d="M8 5l11 7-11 7z" />
    </Svg>
  );
}

export function IkonSilang({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IkonBawah({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IkonKembali({ warna = "#F5F7FF", ukuran = 20 }: P) {
  return (
    <Svg {...dasar(ukuran, warna)} strokeWidth={2.2}>
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}