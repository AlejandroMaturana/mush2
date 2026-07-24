#!/bin/bash
# verify-memory-footprint.sh
# Verifies firmware memory footprint is within acceptable limits
# DoD requirement: memory footprint << 80KB (RAM)
#
# Usage: ./scripts/verify-memory-footprint.sh
# Requires: PlatformIO CLI (pio)

set -e

FIRMWARE_DIR="$(cd "$(dirname "$0")/../firmware" && pwd)"
BUILD_DIR="$FIRMWARE_DIR/.pio/build/esp32-s3-devkitc-1"
THRESHOLD_KB=80

echo "=== Mush2 Firmware Memory Footprint Verification ==="
echo ""

# Check if PlatformIO is available
if ! command -v pio &> /dev/null; then
    echo "ERROR: PlatformIO CLI (pio) not found"
    echo "Install with: pip install platformio"
    exit 1
fi

# Build firmware
echo "Building firmware..."
cd "$FIRMWARE_DIR"
pio run -e esp32-s3-devkitc-1 2>&1 | tail -5

# Check if build succeeded
if [ ! -f "$BUILD_DIR/firmware.elf" ]; then
    echo "ERROR: Build failed - firmware.elf not found"
    exit 1
fi

echo ""
echo "=== Binary Size Analysis ==="

# Get size info using xtensa toolchain
SIZE_OUTPUT=$(xtensa-esp32s3-elf-size "$BUILD_DIR/firmware.elf" 2>/dev/null || echo "")

if [ -z "$SIZE_OUTPUT" ]; then
    echo "WARNING: xtensa-esp32s3-elf-size not available"
    echo "Using file size as fallback..."
    
    # Fallback: check binary file size
    BINARY_SIZE=$(stat -f%z "$BUILD_DIR/firmware.bin" 2>/dev/null || stat -c%s "$BUILD_DIR/firmware.bin" 2>/dev/null || echo "0")
    echo "Binary size: $BINARY_SIZE bytes ($(( BINARY_SIZE / 1024 )) KB)"
else
    echo "$SIZE_OUTPUT"
    
    # Parse RAM usage from size output
    # Format: text data bss dec hex filename
    TEXT_SIZE=$(echo "$SIZE_OUTPUT" | tail -1 | awk '{print $1}')
    DATA_SIZE=$(echo "$SIZE_OUTPUT" | tail -1 | awk '{print $2}')
    BSS_SIZE=$(echo "$SIZE_OUTPUT" | tail -1 | awk '{print $3}')
    
    # RAM estimate = data + bss (loaded into RAM at startup)
    RAM_USAGE=$((DATA_SIZE + BSS_SIZE))
    RAM_KB=$((RAM_USAGE / 1024))
    
    echo ""
    echo "=== RAM Usage Estimate ==="
    echo "  .data (initialized globals): $DATA_SIZE bytes"
    echo "  .bss  (uninitialized globals): $BSS_SIZE bytes"
    echo "  ─────────────────────────────────"
    echo "  Total RAM: $RAM_USAGE bytes ($RAM_KB KB)"
    
    if [ $RAM_KB -ge $THRESHOLD_KB ]; then
        echo ""
        echo "FAIL: RAM usage ($RAM_KB KB) >= threshold ($THRESHOLD_KB KB)"
        exit 1
    else
        echo ""
        echo "PASS: RAM usage ($RAM_KB KB) < threshold ($THRESHOLD_KB KB)"
    fi
fi

echo ""
echo "=== Runtime Heap Verification ==="
echo "Note: Runtime heap can be verified via MQTT health messages."
echo "Check DeviceHealth table for minFreeHeap values."
echo "Expected: freeHeap > 30000 bytes (health_monitor.cpp threshold)"
echo ""
echo "To verify runtime:"
echo "  1. Flash firmware to ESP32-S3"
echo "  2. Wait for health message on mush2/+/health topic"
echo "  3. Check minFreeHeap value in health payload"
echo "  4. Verify: totalDRAM - minFreeHeap < ${THRESHOLD_KB}KB"
