// Alamat avelsiamobile://auth-callback?code=... sudah ditangani oleh masukGoogle
// (lewat WebBrowser.openAuthSessionAsync). File ini mencegah Expo Router ikut
// membacanya sebagai halaman dan menampilkan "Unmatched Route".
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  if (path.includes("auth-callback")) return "/";
  return path;
}