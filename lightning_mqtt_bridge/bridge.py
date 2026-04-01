import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from typing import Optional

import paho.mqtt.client as mqtt


BROKER = os.getenv("LIGHTNING_MQTT_BROKER", "866f25366b704f7082cf5f69e15eea34.s1.eu.hivemq.cloud")
PORT = int(os.getenv("LIGHTNING_MQTT_PORT", "8883"))
USERNAME = os.getenv("LIGHTNING_MQTT_USERNAME", "lightningalert")
PASSWORD = os.getenv("LIGHTNING_MQTT_PASSWORD", "IDontknow123!")
TOPIC = os.getenv("LIGHTNING_MQTT_TOPIC", "kanata/lightning-station-001")
MODEL_FILTER = os.getenv("LIGHTNING_SENSOR_MODEL", "Acurite-6045M")
RTL_433_COMMAND = os.getenv("RTL_433_COMMAND", "rtl_433")
USE_TLS = os.getenv("LIGHTNING_MQTT_TLS", "1").strip().lower() not in {"0", "false", "no"}
TEST_MODE = os.getenv("LIGHTNING_BRIDGE_TEST_MODE", "0").strip().lower() in {"1", "true", "yes"}


def on_connect(client: mqtt.Client, userdata, flags, rc, properties=None):
    print(f"Connected with result code: {rc}")


def on_publish(client: mqtt.Client, userdata, mid, reason_code=None, properties=None):
    print(f"Message published with mid: {mid}")


def require_rtl_433() -> str:
    resolved = shutil.which(RTL_433_COMMAND)
    if not resolved:
        resolved = find_windows_rtl_433()
    if not resolved:
        raise RuntimeError(
            "Could not find 'rtl_433' on PATH. Install rtl_433 first, then run this bridge again."
        )
    return resolved


def find_windows_rtl_433() -> Optional[str]:
    if os.name != "nt":
        return None

    local_app_data = os.getenv("LOCALAPPDATA")
    if not local_app_data:
        return None

    candidate_roots = [
        Path(local_app_data) / "Microsoft" / "WinGet" / "Packages",
        Path(local_app_data) / "Programs"
    ]

    for root in candidate_roots:
        if not root.exists():
            continue
        matches = list(root.rglob("rtl_433.exe"))
        if matches:
            return str(matches[0])

    return None


def start_rtl_433_stream(rtl_433_path: str):
    process = subprocess.Popen(
        [rtl_433_path, "-F", "json"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    if process.stdout is None:
        raise RuntimeError("rtl_433 did not provide a readable stdout stream.")
    return process


def build_mqtt_client() -> mqtt.Client:
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    if USE_TLS:
        client.tls_set()
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.connect(BROKER, PORT, 60)
    client.loop_start()
    return client


def publish_sensor_stream():
    rtl_433_path = require_rtl_433()
    client = build_mqtt_client()
    process = start_rtl_433_stream(rtl_433_path)
    last_strike_count: Optional[int] = None

    print(f"Listening to rtl_433 with model filter: {MODEL_FILTER}")
    print(f"Publishing to MQTT topic: {TOPIC}")

    try:
        for raw_line in process.stdout:
            line = raw_line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError as error:
                print(f"Parse error: {error}: {line}")
                continue

            print(data)
            model = data.get("model")
            strike_count = data.get("strike_count")

            if model == MODEL_FILTER and strike_count != last_strike_count:
                payload = json.dumps(data)
                print(f"Publishing new strike: {payload}")
                client.publish(TOPIC, payload, qos=1, retain=True)
                last_strike_count = strike_count
    finally:
        process.terminate()
        client.loop_stop()
        client.disconnect()


def build_test_payload() -> dict:
    return {
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model": MODEL_FILTER,
        "id": 1,
        "channel": "A",
        "temperature_C": 18.4,
        "humidity": 61,
        "strike_count": 1,
        "storm_dist": 14,
        "battery_ok": 1,
        "test_mode": True
    }


def publish_test_message():
    client = build_mqtt_client()
    payload = json.dumps(build_test_payload())
    print(f"Publishing test payload to {TOPIC}: {payload}")
    info = client.publish(TOPIC, payload, qos=1, retain=False)
    info.wait_for_publish(timeout=5)
    client.loop_stop()
    client.disconnect()


def parse_args():
    parser = argparse.ArgumentParser(description="Bridge lightning sensor data from rtl_433 to MQTT.")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Publish one simulated lightning payload to MQTT without using rtl_433."
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        if args.test or TEST_MODE:
            publish_test_message()
        else:
            publish_sensor_stream()
    except KeyboardInterrupt:
        print("Stopped by user.")
        sys.exit(0)
    except Exception as error:
        print(f"Bridge failed: {error}")
        sys.exit(1)
