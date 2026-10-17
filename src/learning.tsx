import React, { useContext, useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { Button, Card, Label, Theme } from "./ui";

export function Learning({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useContext(Theme);
  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 28,
          backgroundColor: "#0009",
        }}
      >
        <View
          style={{
            padding: 24,
            gap: 20,
            borderRadius: 24,
            backgroundColor: c.card,
          }}
        >
          <Label large>Lo esencial</Label>
          <Label>
            El porcentaje te dice cuánta batería queda. El tiempo indica cuánto
            podría durar con tu consumo actual.
          </Label>
          <Label muted>
            Si quieres saber más, toca el nombre de una medición.
          </Label>
          <Button selected onPress={onClose}>
            Entendido
          </Button>
        </View>
      </View>
    </Modal>
  );
}

export function DemoConnection() {
  const [state, setState] = useState<
    "idle" | "search" | "found" | "connecting" | "connected"
  >("idle");
  useEffect(() => {
    if (state !== "search" && state !== "connecting") return;
    const timer = setTimeout(
      () => setState(state === "search" ? "found" : "connected"),
      1400,
    );
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <Card>
      <Label large>Practica la conexión</Label>
      <Label muted>
        Simulación: no usa Bluetooth ni se conecta al prototipo. Las lecturas de
        demostración siguen disponibles.
      </Label>
      <Label>
        {
          {
            idle: "Estación simulada desconectada",
            search: "Buscando una estación simulada…",
            found: "Encontramos LAPTA · Prototipo simulado",
            connecting: "Conectando con LAPTA simulada…",
            connected: "LAPTA simulada conectada · Recibiendo datos ficticios",
          }[state]
        }
      </Label>
      {state === "idle" && (
        <Button selected onPress={() => setState("search")}>
          Simular búsqueda de LAPTA
        </Button>
      )}
      {state === "found" && (
        <Button selected onPress={() => setState("connecting")}>
          Conectar a LAPTA simulada
        </Button>
      )}
      {state !== "idle" && (
        <Button onPress={() => setState("idle")}>
          {state === "connected"
            ? "Simular desconexión"
            : "Cancelar simulación"}
        </Button>
      )}
    </Card>
  );
}
