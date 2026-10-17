import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Reading } from "./domain";
export const palettes = {
  light: {
    bg: "#FFF9EF",
    card: "#FFFFFF",
    text: "#0A3447",
    muted: "#526771",
    line: "#DEE5E3",
    green: "#22714B",
    soft: "#EDF4EE",
  },
  dark: {
    bg: "#071C25",
    card: "#102E3B",
    text: "#F4F7F5",
    muted: "#B4C8CE",
    line: "#31505C",
    green: "#83D5A5",
    soft: "#173E39",
  },
};
export type Colors = typeof palettes.light;
export const Theme = React.createContext<Colors>(palettes.light);
export function Label({
  children,
  muted = false,
  large = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <Text
      style={{
        fontFamily: large ? "BreeSerif" : "NunitoSans",
        fontSize: large ? 28 : 15,
        color: muted ? c.muted : c.text,
        lineHeight: large ? 36 : 23,
      }}
    >
      {children}
    </Text>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const c = React.useContext(Theme);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  selected = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: selected ? "#F7B92D" : c.soft,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontFamily: "NunitoSans",
          fontSize: 14,
          fontWeight: "700",
          color: selected ? "#0A3447" : c.text,
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Metric({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value?: number;
  unit: string;
  accent?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <View style={{ flex: 1, minWidth: 120, paddingVertical: 8 }}>
      <Label muted>{label}</Label>
      <Text
        style={{
          fontFamily: "NunitoSans",
          fontSize: 27,
          fontWeight: "700",
          color: accent ? c.green : c.text,
          marginTop: 3,
        }}
      >
        {value === undefined
          ? "—"
          : value.toLocaleString("es-NI", { maximumFractionDigits: 1 })}
        <Text style={{ fontSize: 14, fontWeight: "400" }}> {unit}</Text>
      </Text>
      {value === undefined && <Label muted>Sin medición</Label>}
    </View>
  );
}
export function BatteryRing({ soc }: { soc?: number }) {
  const c = React.useContext(Theme);
  return (
    <View
      accessible
      accessibilityLabel={
        soc === undefined
          ? "Batería sin medición"
          : `Batería ${Math.round(soc)} por ciento`
      }
      style={{
        width: 230,
        height: 230,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={230} height={230} style={StyleSheet.absoluteFill}>
        <Circle
          cx={115}
          cy={115}
          r={99}
          fill="none"
          stroke={c.line}
          strokeWidth={12}
        />
        <Circle
          cx={115}
          cy={115}
          r={99}
          fill="none"
          stroke={soc !== undefined && soc < 20 ? "#D78322" : "#F7B92D"}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${((soc ?? 0) / 100) * 622} 622`}
          rotation={-90}
          origin="115,115"
        />
      </Svg>
      <Text style={{ fontFamily: "BreeSerif", fontSize: 62, color: c.text }}>
        {soc === undefined ? "—" : Math.round(soc)}
        <Text style={{ fontSize: 25 }}>{soc === undefined ? "" : "%"}</Text>
      </Text>
      <Label muted>Batería disponible</Label>
    </View>
  );
}
export const icons = {
  home: "home",
  energy: "sun",
  battery: "battery",
  history: "chart",
  settings: "settings",
} as const;
export function Icon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    home: "M3 10L12 3 21 10V21H15V14H9V21H3Z",
    sun: "M12 1V3M12 21V23M1 12H3M21 12H23M4 4L6 6M18 18L20 20M4 20L6 18M18 6L20 4",
    battery: "M3 6H20V18H3ZM22 10V14M7 10V14M11 10V14M15 10V14",
    chart: "M3 3V21H22M6 16L11 10 15 13 21 5",
    settings: "M5 6H21M3 12H18M7 18H21M9 3V9M15 9V15M11 15V21",
    plug: "M8 2V7M16 2V7M5 7H19V11L15 16H9L5 11ZM12 16V22",
    arrow: "M3 12H21M16 7L21 12 16 17",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name] ?? paths.plug} />
      {name === "sun" && <Circle cx={12} cy={12} r={5} />}
    </Svg>
  );
}
export function Flow({
  solarW,
  batteryW,
  loadW,
  fresh,
}: {
  solarW?: number;
  batteryW?: number;
  loadW?: number;
  fresh: boolean;
}) {
  const c = React.useContext(Theme);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive || reduce || !fresh) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.35,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    });
    return () => {
      alive = false;
      loop?.stop();
      pulse.setValue(1);
    };
  }, [fresh, pulse]);
  const val = (v?: number) =>
    v === undefined ? "—" : `${Math.abs(v).toFixed(0)} W`;
  const node = (icon: string, title: string, value: string) => (
    <View
      style={{
        alignItems: "center",
        gap: 6,
        padding: 12,
        borderRadius: 18,
        backgroundColor: c.soft,
        alignSelf: "stretch",
      }}
    >
      <Icon name={icon} color={icon === "sun" ? "#B77A00" : c.green} />
      <Label>{title}</Label>
      <Label muted>{value}</Label>
    </View>
  );
  return (
    <Card>
      <Label large>El recorrido de tu energía</Label>
      <View style={{ gap: 8, marginTop: 12 }}>
        {node("sun", "Panel solar", val(solarW))}
        <Animated.View
          style={{
            opacity: fresh && !!solarW ? pulse : 0.35,
            alignItems: "center",
          }}
        >
          <Label>↓ Generación</Label>
        </Animated.View>
        {node("settings", "Controlador", "Regula la energía")}
        <View
          style={{
            height: 16,
            marginHorizontal: 60,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: c.line,
          }}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Animated.View
              style={{
                opacity: fresh && !!batteryW ? pulse : 0.35,
                alignItems: "center",
              }}
            >
              <Label>
                {batteryW === undefined
                  ? "↕ Sin dato"
                  : batteryW > 0
                    ? "↓ Almacena"
                    : batteryW < 0
                      ? "↑ Aporta"
                      : "· En reposo"}
              </Label>
            </Animated.View>
            {node("battery", "Batería", val(batteryW))}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Animated.View
              style={{
                opacity: fresh && !!loadW ? pulse : 0.35,
                alignItems: "center",
              }}
            >
              <Label>↓ Utiliza</Label>
            </Animated.View>
            {node("plug", "Consumo", val(loadW))}
          </View>
        </View>
      </View>
      <Label muted>
        {fresh
          ? "La batería muestra su flujo neto. El consumo puede recibir energía solar y de batería a la vez."
          : "El flujo se pausa hasta recibir una lectura reciente."}
      </Label>
    </Card>
  );
}
export function Chart({
  rows,
  value,
  unit,
  title,
}: {
  rows: Reading[];
  value: (r: Reading) => number | undefined;
  unit: string;
  title: string;
}) {
  const c = React.useContext(Theme);
  const [selected, setSelected] = useState<number>();
  const [width, setWidth] = useState(320);
  const stride = Math.max(1, Math.ceil(rows.length / 180));
  const data = rows
    .filter((_, i) => i % stride === 0 || i === rows.length - 1)
    .map((r) => ({ r, y: value(r) }))
    .filter((p): p is { r: Reading; y: number } => p.y !== undefined);
  const min = Math.min(0, ...data.map((p) => p.y)),
    max = Math.max(1, ...data.map((p) => p.y));
  const start = data[0]?.r.time ?? 0,
    end = data[data.length - 1]?.r.time ?? 1;
  const x = (t: number) => 12 + ((t - start) / Math.max(1, end - start)) * 296;
  const y = (v: number) => 146 - ((v - min) / (max - min)) * 128;
  let path = "";
  data.forEach((p, i) => {
    const prev = data[i - 1];
    path += `${i === 0 || !prev || p.r.time - prev.r.time > stride * 15000 || prev.r.device !== p.r.device || prev.r.session !== p.r.session ? "M" : "L"}${x(p.r.time)},${y(p.y)} `;
  });
  const point =
    selected === undefined
      ? data[data.length - 1]
      : data[Math.min(selected, data.length - 1)];
  return (
    <Card>
      <Label>{title}</Label>
      {!data.length ? (
        <View style={{ paddingVertical: 24 }}>
          <Label muted>Todavía no hay registros para este período.</Label>
        </View>
      ) : (
        <>
          <Text
            style={{
              fontSize: 26,
              color: c.text,
              fontFamily: "NunitoSans",
              marginTop: 8,
            }}
          >
            {point?.y.toFixed(1)} {unit}
          </Text>
          <Label muted>
            {point ? new Date(point.r.time).toLocaleString("es-NI") : ""}
          </Label>
          <View
            accessibilityLabel={`${title}. Desliza para consultar registros.`}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              setSelected(
                Math.round(
                  Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) *
                    (data.length - 1),
                ),
              )
            }
            onResponderMove={(e) =>
              setSelected(
                Math.round(
                  Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) *
                    (data.length - 1),
                ),
              )
            }
          >
            <Svg width="100%" height={170} viewBox="0 0 320 170">
              <Line x1={12} x2={308} y1={y(0)} y2={y(0)} stroke={c.line} />
              <Path
                d={path}
                fill="none"
                stroke={c.text === "#0A3447" ? "#B77A00" : "#F7B92D"}
                strokeWidth={3}
                strokeLinejoin="round"
              />
              {point && (
                <Circle
                  cx={x(point.r.time)}
                  cy={y(point.y)}
                  r={5}
                  fill={c.green}
                />
              )}
            </Svg>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Button
              onPress={() =>
                setSelected(Math.max(0, (selected ?? data.length - 1) - 1))
              }
            >
              Anterior
            </Button>
            <Button
              onPress={() =>
                setSelected(
                  Math.min(data.length - 1, (selected ?? data.length - 1) + 1),
                )
              }
            >
              Siguiente
            </Button>
          </View>
        </>
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 8 },
});
