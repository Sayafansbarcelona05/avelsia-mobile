import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../dashboard/panel-kartu";

export function LembarBawah({
  terbuka,
  onTutup,
  onSelesaiTutup,
  children,
}: {
  terbuka: boolean;
  onTutup: () => void;
  onSelesaiTutup?: () => void; // dipanggil setelah animasi tutup selesai
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: tinggiLayar } = useWindowDimensions();

  const [tampil, setTampil] = useState(false);
  const geser = useRef(new Animated.Value(0)).current; // 0 = tertutup, 1 = terbuka
  const tinggiPanel = useRef(new Animated.Value(tinggiLayar)).current;
  const geserY = useRef(
    Animated.multiply(
      geser.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      tinggiPanel
    )
  ).current;

  const menunggu = useRef(false); // animasi masuk menunggu panel selesai ditata
  const tampilRef = useRef(false);
  const selesaiRef = useRef(onSelesaiTutup);

  useEffect(() => {
    selesaiRef.current = onSelesaiTutup;
  });

  // Saat keyboard tampil, jarak aman bawah dihilangkan karena sudah
  // tertutup keyboard (kalau tidak, ada celah kosong di atas keyboard)
  const [keyboardTampil, setKeyboardTampil] = useState(false);
  useEffect(() => {
    const evTampil =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const evSembunyi =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(evTampil, () => setKeyboardTampil(true));
    const b = Keyboard.addListener(evSembunyi, () => setKeyboardTampil(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const masuk = useCallback(() => {
    Animated.timing(geser, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [geser]);

  useEffect(() => {
    if (terbuka) {
      if (tampilRef.current) {
        // dibuka lagi saat animasi tutup masih berjalan
        masuk();
      } else {
        tampilRef.current = true;
        menunggu.current = true;
        geser.setValue(0);
        setTampil(true);
      }
    } else if (tampilRef.current) {
      menunggu.current = false;
      Animated.timing(geser, {
        toValue: 0,
        duration: 220,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          tampilRef.current = false;
          setTampil(false);
          selesaiRef.current?.();
        }
      });
    }
  }, [terbuka, geser, masuk]);

  function saatLayout(e: LayoutChangeEvent) {
    tinggiPanel.setValue(e.nativeEvent.layout.height);
    if (menunggu.current) {
      menunggu.current = false;
      masuk();
    }
  }

  return (
    <Modal
      visible={tampil}
      transparent
      animationType="none"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onTutup}
    >
      <KeyboardAvoidingView behavior="padding" style={s.wadah}>
        <Animated.View style={[s.latar, { opacity: geser }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onTutup}
            accessibilityLabel="Tutup"
          />
        </Animated.View>
        <Animated.View
          onLayout={saatLayout}
          style={[
            s.panel,
            {
              paddingBottom: keyboardTampil ? 0 : insets.bottom,
              transform: [{ translateY: geserY }],
            },
          ]}
        >
          <View style={s.pegangan} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wadah: { flex: 1, justifyContent: "flex-end" },
  latar: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,11,22,0.7)" },
  panel: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.line,
    maxHeight: "92%",
    paddingTop: 12,
  },
  pegangan: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    marginBottom: 8,
  },
});