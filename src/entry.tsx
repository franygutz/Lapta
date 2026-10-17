import React, { useContext, useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Button, Label, Theme } from "./ui";

export function Entry({
  savedCode,
  status,
  error,
  onConnect,
  onDemo,
  onOffline,
}: {
  savedCode: string;
  status: string;
  error: string;
  onConnect: (code: string) => Promise<void>;
  onDemo: () => Promise<void>;
  onOffline: () => void;
}) {
  const c = useContext(Theme);
  const [code, setCode] = useState(savedCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setCode(savedCode);
  }, [savedCode]);
  useEffect(() => {
    if (
      error ||
      ["Búsqueda finalizada", "Sin conexión", "Desconectado"].includes(status)
    )
      setBusy(false);
  }, [error, status]);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 28,
          gap: 22,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFF9EF",
            width: 160,
            height: 72,
            borderRadius: 16,
            alignSelf: "center",
            marginBottom: 28,
          }}
        >
          <Image
            source={require("../assets/logotipo.png")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
            accessibilityLabel="LAPTA"
          />
        </View>
        <Label large>Tu LAPTA, contigo.</Label>
        <Label>Escribe el código que está en tu estación.</Label>
        <TextInput
          accessibilityLabel="Código del prototipo"
          placeholder="LAPTA-A1B2C3D4E5F6"
          placeholderTextColor={c.muted}
          value={code}
          onChangeText={setCode}
          editable={!busy}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={18}
          style={{
            color: c.text,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 16,
            padding: 18,
            fontFamily: "NunitoSans",
            fontSize: 22,
          }}
        />
        {!!(message || error) && <Label>{message || error}</Label>}
        {busy && (
          <Label>
            {status === "Conectado" ? "Abriendo tu estación…" : status}
          </Label>
        )}
        <Button
          selected
          disabled={busy}
          onPress={() => {
            const normalized = code.trim().toUpperCase();
            if (!/^LAPTA-[A-F0-9]{12}$/.test(normalized)) {
              setMessage("Revisa el código. Ejemplo: LAPTA-A1B2C3D4E5F6.");
              return;
            }
            setMessage("");
            setBusy(true);
            void onConnect(normalized).catch(() => setBusy(false));
          }}
        >
          {busy ? "Conectando…" : "Conectar mi LAPTA"}
        </Button>
        <Button
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void onDemo().catch(() => setBusy(false));
          }}
        >
          Probar sin estación
        </Button>
        <Label muted>Solo necesitas tener tu LAPTA encendida y cerca.</Label>
        {!!savedCode && (
          <Button disabled={busy} onPress={onOffline}>
            Ver mis datos guardados
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
