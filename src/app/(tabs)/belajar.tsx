import { StyleSheet, Text, View } from "react-native";

export default function Belajar() {
  return (
    <View style={s.layar}>
      <Text style={s.judul}>Belajar</Text>
      <Text style={s.deskripsi}>Daftar tujuan belajar akan tampil di sini.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  layar: {
    flex: 1,
    backgroundColor: "#080B16",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  judul: { fontSize: 24, fontWeight: "700", color: "#F5F7FF" },
  deskripsi: { fontSize: 15, color: "#AAB4D0", textAlign: "center" },
});