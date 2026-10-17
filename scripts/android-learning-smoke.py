"""Recorrido de ayuda y simulación; solo modifica el emulador de pruebas."""
from pathlib import Path
import sys

# Reutiliza los controles ADB del smoke general, sin ejecutar su recorrido.
helper = Path(__file__).with_name('android-smoke.py').read_text(encoding='utf-8')
exec(compile(helper.split("\nadb('shell', 'wm'")[0], str(Path(__file__).with_name('android-smoke.py')), 'exec'))

def finish():
    tap('ENTENDIDO')
    tap('Sol y carga', scroll=True)
    tap('Inicio')
    adb('shell', 'am', 'force-stop', 'ni.lapta.energia')
    adb('shell', 'am', 'start', '-n', 'ni.lapta.energia/.MainActivity')
    time.sleep(4)
    wait_contains('Tu energía, a la vista.')
    assert not any(n.get('text') == 'Tu energía, sin complicaciones' for n in nodes())
    print('APROBADO: cierre de aviso y bienvenida persistente después de reapertura.')

if '--finish' in sys.argv:
    finish()
    raise SystemExit(0)

adb('shell', 'am', 'force-stop', 'ni.lapta.energia')
adb('shell', 'am', 'start', '-n', 'ni.lapta.energia/.MainActivity')
time.sleep(5)
if any('Tu energía, sin complicaciones' in n.get('text', '') for n in nodes()):
    for step in range(2, 7):
        for attempt in range(3):
            tap('Siguiente')
            time.sleep(1)
            if any(f'{step} DE 6' in n.get('text', '') for n in nodes()):
                break
        contains(f'{step} DE 6')
    capture('10-bienvenida')
    tap('Empezar a usar LAPTA')
tap('ⓘ Entender mi energía', scroll=True)
contains('Tu energía, sin complicaciones')
tap('Siguiente')
contains('El porcentaje es tu reserva')
tap('Cerrar guía')
tap('Ajustes')
tap('Modo demostración', scroll=True)
tap('Inicio')
tap('Ajustes')
tap('Simular búsqueda de LAPTA', scroll=True)
time.sleep(2)
tap('Conectar a LAPTA simulada')
time.sleep(2)
contains('LAPTA simulada conectada')
capture('11-conexion-simulada')
tap('Simular desconexión')
contains('Estación simulada desconectada')
tap('Batería baja', scroll=True)
time.sleep(3)
contains('Batería baja · Simulación')
capture('12-aviso-bateria')
finish()
print('APROBADO: guía, ayuda reutilizable, conexión simulada, aviso de batería y bienvenida persistente.')
