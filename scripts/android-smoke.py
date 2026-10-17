"""Prueba únicamente el emulador creado para LAPTA, nunca un teléfono físico."""
from pathlib import Path
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ADB = Path(os.environ.get('ANDROID_HOME', Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk')) / 'platform-tools/adb.exe'
SERIAL = 'emulator-5554'
OUT = ROOT / 'docs/capturas'
OUT.mkdir(parents=True, exist_ok=True)


def adb(*args):
    return subprocess.run([str(ADB), '-s', SERIAL, *args], check=True, capture_output=True).stdout


def nodes():
    for _ in range(5):
        adb('shell', 'uiautomator', 'dump', '/sdcard/lapta-ui.xml')
        found = list(ET.fromstring(adb('shell', 'cat', '/sdcard/lapta-ui.xml')).iter('node'))
        anr = next((n.get('text', '') for n in found if "isn't responding" in n.get('text', '') or 'no responde' in n.get('text', '')), None)
        if not anr:
            return found
        if 'lapta' in anr.lower():
            raise RuntimeError(f'ANR de la aplicación: {anr}')
        close = next((n for n in found if n.get('text') in ['Close app', 'Cerrar app', 'Cerrar aplicación']), None)
        if close is None:
            raise RuntimeError(f'Emulador bloqueado: {anr}')
        print(f'Incidencia del sistema del emulador: {anr}. Cerrando ese proceso; LAPTA continúa abierta.', flush=True)
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', close.get('bounds', '')))
        adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
        time.sleep(2)
    raise RuntimeError('El sistema Android del emulador no se estabilizó.')


def tap(text, scroll=False):
    for _ in range(7 if scroll else 1):
        matches = [n for n in nodes() if n.get('text') == text or n.get('content-desc') == text]
        if matches:
            import re
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', matches[-1].get('bounds', '')))
            adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
            time.sleep(0.5)
            return
        adb('shell', 'input', 'swipe', '500', '1700', '500', '650', '300')
    raise AssertionError(f'No se encontró control: {text}')


def contains(text):
    assert any(text in (n.get('text', '') + n.get('content-desc', '')) for n in nodes()), text


def wait_contains(text):
    for _ in range(15):
        try:
            contains(text)
            return
        except (AssertionError, subprocess.CalledProcessError, ET.ParseError):
            time.sleep(1)
    raise AssertionError(f'La pantalla no mostró: {text}')


def capture(name):
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))


adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'settings', 'put', 'global', 'animator_duration_scale', '0')
adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '0')
adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '0')
adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable')
adb('shell', 'svc', 'wifi', 'disable')
adb('shell', 'svc', 'data', 'disable')
adb('shell', 'am', 'force-stop', 'ni.lapta.energia')
adb('shell', 'am', 'start', '-n', 'ni.lapta.energia/.MainActivity')
print('Comprobando Inicio offline…', flush=True)
time.sleep(5)
wait_contains('Tu energía, a la vista.')
wait_contains('Todos los datos son simulados')
tap('Ajustes')
tap('Claro', scroll=True)
tap('Inicio')
tap('Ajustes')
tap('Sin sol y descarga', scroll=True)
tap('Inicio')
tap('Ajustes')
tap('Sol y carga', scroll=True)
tap('Inicio')
wait_contains('Cargando')
capture('01-inicio-claro')
print('Inicio aprobado; comprobando Energía, Batería y Salidas…', flush=True)
tap('Energía')
contains('La energía empieza aquí')
tap('Batería')
contains('por ciento')
capture('02-bateria')
adb('shell', 'input', 'keyevent', '4')
tap('6 salidas')
contains('Seis formas de aprovecharla')
capture('03-salidas')
tap('Historial')
print('Comprobando Historial…', flush=True)
tap('7 días')
capture('04-historial')
tap('Anterior', scroll=True)
capture('04b-grafica-interactiva')
tap('Inicio')
tap('Historial')
tap('30 días')
tap('Ajustes')
print('Comprobando escenarios y tema…', flush=True)
tap('Sin sol y descarga', scroll=True)
tap('Inicio')
contains('Descargando')
tap('Ajustes')
tap('Condición de alerta', scroll=True)
tap('Inicio')
contains('Temperatura excesiva')
capture('05-alertas')
tap('Ajustes')
tap('Sol y carga', scroll=True)
tap('Oscuro', scroll=True)
tap('Inicio')
wait_contains('Cargando')
capture('06-inicio-oscuro')
assert any(re.search(r'Batería (?:[6-9]\d|100) por ciento', n.get('content-desc', '')) for n in nodes()), 'El escenario solar debe recuperar su batería inicial'
adb('shell', 'am', 'force-stop', 'ni.lapta.energia')
adb('shell', 'am', 'start', '-n', 'ni.lapta.energia/.MainActivity')
time.sleep(3)
wait_contains('Todos los datos son simulados')
capture('07-reapertura-offline')
tap('Ajustes')
tap('Dispositivo real')
tap('Inicio')
contains('Bluetooth desconectado')
capture('08-real-sin-datos')
tap('Ajustes')
adb('shell', 'pm', 'grant', 'ni.lapta.energia', 'android.permission.BLUETOOTH_SCAN')
adb('shell', 'pm', 'grant', 'ni.lapta.energia', 'android.permission.BLUETOOTH_CONNECT')
adb('shell', 'svc', 'bluetooth', 'disable')
tap('Buscar LAPTA por Bluetooth', scroll=True)
wait_contains('Activa Bluetooth')
capture('08b-bluetooth-apagado')
adb('shell', 'am', 'force-stop', 'ni.lapta.energia')
adb('shell', 'am', 'start', '-n', 'ni.lapta.energia/.MainActivity')
wait_contains('Bluetooth desconectado')
capture('09-modo-real-persistente')
tap('Ajustes')
tap('Modo demostración')
tap('Inicio')
print('SMOKE ANDROID APROBADO: navegación, demo, alertas, tema, reapertura y modo real sin datos. Capturas en docs/capturas.')
