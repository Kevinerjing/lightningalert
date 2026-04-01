# Lightning MQTT Bridge

This small Python bridge listens to `rtl_433` JSON output from the lightning sensor and republishes new strike updates to MQTT.

## Files

- `bridge.py`: main runtime script
- `requirements.txt`: Python dependency list

## Default behavior

- Sensor model filter: `Acurite-6045M`
- MQTT topic: `kanata/lightning-station-001`
- MQTT broker: HiveMQ Cloud over TLS

## Setup

1. Install Python dependency:

```powershell
python -m pip install -r lightning_mqtt_bridge/requirements.txt
```

2. Install `rtl_433` and make sure `rtl_433` is on your `PATH`.

3. Run the bridge:

```powershell
python lightning_mqtt_bridge/bridge.py
```

## Test mode

If you want to test MQTT publishing without the real lightning sensor, run:

```powershell
python lightning_mqtt_bridge/bridge.py --test
```

This sends one simulated lightning payload to the MQTT topic and exits.

## Optional environment variables

```powershell
$env:LIGHTNING_MQTT_BROKER="866f25366b704f7082cf5f69e15eea34.s1.eu.hivemq.cloud"
$env:LIGHTNING_MQTT_PORT="8883"
$env:LIGHTNING_MQTT_USERNAME="lightningalert"
$env:LIGHTNING_MQTT_PASSWORD="IDontknow123!"
$env:LIGHTNING_MQTT_TOPIC="kanata/lightning-station-001"
$env:LIGHTNING_SENSOR_MODEL="Acurite-6045M"
$env:RTL_433_COMMAND="rtl_433"
$env:LIGHTNING_MQTT_TLS="1"
$env:LIGHTNING_BRIDGE_TEST_MODE="0"
```

If you want to point to a local broker instead, override the broker, port, username, password, and TLS flag before running the script.
