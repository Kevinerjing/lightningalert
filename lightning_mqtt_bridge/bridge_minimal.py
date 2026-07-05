import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import paho.mqtt.client as mqtt


BROKER = os.getenv("LIGHTNING_MQTT_BROKER", "866f25366b704f7082cf5f69e15eea34.s1.eu.hivemq.cloud")
PORT = int(os.getenv("LIGHTNING_MQTT_PORT", "8883"))
USERNAME = os.getenv("LIGHTNING_MQTT_USERNAME", "lightningalert")
PASSWORD = os.getenv("LIGHTNING_MQTT_PASSWORD", "IDontknow123!")
TOPIC = os.getenv("LIGHTNING_MQTT_TOPIC", "kanata/lightning-station-001")
MODEL_FILTER = os.getenv("LIGHTNING_SENSOR_MODEL", "Acurite-6045M")
RTL_433_COMMAND = os.getenv("RTL_433_COMMAND", "rtl_433")


def on_connect(client, userdata, flags, reason_code, properties=None):
    print("Connected with result code", reason_code)


def on_publish(client, userdata, mid, reason_code=None, properties=None):
    print("Message published with mid:", mid)


def find_windows_rtl_433():
    if os.name != "nt":
        return None

    local_app_data = os.getenv("LOCALAPPDATA")
    if not local_app_data:
        return None

    candidate_roots = [
        Path(local_app_data) / "Microsoft" / "WinGet" / "Packages",
        Path(local_app_data) / "Programs",
    ]

    for root in candidate_roots:
        if not root.exists():
            continue
        matches = list(root.rglob("rtl_433.exe"))
        if matches:
            return str(matches[0])

    return None


def require_rtl_433():
    resolved = shutil.which(RTL_433_COMMAND)
    if not resolved:
        resolved = find_windows_rtl_433()
    if not resolved:
        raise RuntimeError("Could not find 'rtl_433' on PATH. Install rtl_433 first, then run this bridge again.")
    return resolved


def main():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.connect(BROKER, PORT, 60)
    client.loop_start()

    rtl_433_path = require_rtl_433()
    process = subprocess.Popen(
        [rtl_433_path, "-F", "json"],
        stdout=subprocess.PIPE,
        text=True,
    )

    if process.stdout is None:
        raise RuntimeError("rtl_433 did not provide stdout.")

    last_strike_count = None

    print(f"Listening to rtl_433 with model filter: {MODEL_FILTER}")
    print(f"Publishing to MQTT topic: {TOPIC}")

    try:
        for line in process.stdout:
            try:
                data = json.loads(line.strip())
                print(data)
                model = data.get("model")
                strike_count = data.get("strike_count")

                if model == MODEL_FILTER and strike_count != last_strike_count:
                    print("Publishing new strike:", data)
                    client.publish(TOPIC, json.dumps(data), qos=1, retain=True)
                    last_strike_count = strike_count

            except Exception as error:
                print("Parse error:", error)
    finally:
        if process.poll() is None:
            process.terminate()
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped by user.")
        sys.exit(0)
    except Exception as error:
        print("Bridge failed:", error)
        sys.exit(1)
