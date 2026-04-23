<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Quagga from '@ericblade/quagga2'

const emit = defineEmits(['detected', 'close'])

const scannerRef = ref(null)
const isInitialized = ref(false)
const errorMsg = ref(null)
const lastDetected = ref(null)
const scanning = ref(true)

let detectionCount = {}
const DETECTION_THRESHOLD = 3

async function initScanner() {
  await nextTick()
  if (!scannerRef.value) return

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('navigator.mediaDevices is undefined. This usually means the context is not secure (needs HTTPS).')
    errorMsg.value = 'Camera access requires a secure connection (HTTPS). If testing locally on a phone, ensure Vite is running with HTTPS.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    stream.getTracks().forEach(track => track.stop())
  } catch (err) {
    console.error('Camera permission error:', err)
    errorMsg.value = 'Camera permission denied. Please allow camera access in your browser settings or system settings.'
    return
  }

  try {
    Quagga.init({
      inputStream: {
        type: 'LiveStream',
        target: scannerRef.value,
        constraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      },
      decoder: {
        readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader']
      },
      locate: true,
      frequency: 10
    }, (err) => {
      if (err) {
        console.error('Scanner init error:', err)
        errorMsg.value = 'Unable to access camera. Please check permissions.'
        return
      }
      isInitialized.value = true
      Quagga.start()
    })

    Quagga.onDetected(onDetected)
  } catch (err) {
    console.error('Scanner error:', err)
    errorMsg.value = 'Camera not available on this device.'
  }
}

function onDetected(result) {
  const code = result.codeResult.code
  if (!code) return
  detectionCount[code] = (detectionCount[code] || 0) + 1
  if (detectionCount[code] >= DETECTION_THRESHOLD && lastDetected.value !== code) {
    lastDetected.value = code
    scanning.value = false
    if (navigator.vibrate) navigator.vibrate(100)
    Quagga.stop()
    emit('detected', code)
  }
}

function closeScanner() {
  if (isInitialized.value) {
    try { Quagga.stop() } catch(e) {}
    try { Quagga.offDetected(onDetected) } catch(e) {}
  }
  emit('close')
}

onMounted(() => { initScanner() })

onBeforeUnmount(() => {
  if (isInitialized.value) {
    try { Quagga.stop() } catch(e) {}
    try { Quagga.offDetected(onDetected) } catch(e) {}
  }
})
</script>

<template>
  <div class="bsm-overlay">
    <!-- Close button -->
    <button class="bsm-close" @click="closeScanner">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>

    <!-- Title -->
    <div class="bsm-top-label">
      <span class="bsm-title">Scan Barcode</span>
      <span class="bsm-subtitle">Point camera at a barcode</span>
    </div>

    <!-- Camera viewport -->
    <div class="bsm-camera-wrap">
      <div ref="scannerRef" class="bsm-camera"></div>

      <!-- Scanning frame overlay -->
      <div class="bsm-frame">
        <div class="bsm-corner bsm-tl"></div>
        <div class="bsm-corner bsm-tr"></div>
        <div class="bsm-corner bsm-bl"></div>
        <div class="bsm-corner bsm-br"></div>
        <div v-if="scanning" class="bsm-scan-line"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="errorMsg" class="bsm-error">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff7043" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p>{{ errorMsg }}</p>
      <button class="bsm-retry-btn" @click="closeScanner">Close</button>
    </div>

    <!-- Bottom hint -->
    <div class="bsm-bottom-hint">
      <div class="bsm-pulse-dot"></div>
      <span>Scanning...</span>
    </div>
  </div>
</template>

<style scoped>
.bsm-overlay {
  position: fixed; inset: 0; z-index: 5000;
  background: #000;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.bsm-close {
  position: absolute; top: calc(16px + env(safe-area-inset-top)); right: calc(16px + env(safe-area-inset-right));
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff; cursor: pointer; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.bsm-close:hover { background: rgba(255,255,255,0.2); }

.bsm-top-label {
  position: absolute; top: calc(24px + env(safe-area-inset-top)); left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 10;
}
.bsm-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.3rem;
  color: #fff; letter-spacing: -0.02em;
}
.bsm-subtitle {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
}

.bsm-camera-wrap {
  position: relative; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.bsm-camera {
  width: 100%; height: 100%;
  position: absolute; inset: 0;
}
.bsm-camera :deep(video) {
  width: 100% !important; height: 100% !important;
  object-fit: cover !important;
}
.bsm-camera :deep(canvas) {
  display: none !important;
}

/* Scanning frame */
.bsm-frame {
  position: absolute;
  width: 280px; height: 180px;
  z-index: 5;
}
.bsm-corner {
  position: absolute; width: 32px; height: 32px;
  border-color: #DFFF00; border-style: solid;
}
.bsm-tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 8px 0 0 0; }
.bsm-tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 8px 0 0; }
.bsm-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 8px; }
.bsm-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 8px 0; }

.bsm-scan-line {
  position: absolute; left: 8px; right: 8px; height: 2px;
  background: linear-gradient(90deg, transparent, #DFFF00, transparent);
  box-shadow: 0 0 12px rgba(223,255,0,0.6);
  animation: bsm-scan 2s ease-in-out infinite;
}
@keyframes bsm-scan {
  0%, 100% { top: 8px; }
  50% { top: calc(100% - 10px); }
}

.bsm-error {
  position: absolute; inset: 0; z-index: 20;
  background: rgba(0,0,0,0.95);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  padding: 40px;
}
.bsm-error p {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem;
  color: rgba(255,255,255,0.6); text-align: center; margin: 0;
}
.bsm-retry-btn {
  padding: 12px 32px; border-radius: 14px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
}
.bsm-retry-btn:hover { background: rgba(255,255,255,0.15); }

.bsm-bottom-hint {
  position: absolute; bottom: calc(40px + env(safe-area-inset-bottom));
  display: flex; align-items: center; gap: 10px; z-index: 10;
  padding: 10px 24px; border-radius: 100px;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
}
.bsm-bottom-hint span {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem;
  color: rgba(255,255,255,0.6); font-weight: 600;
}
.bsm-pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #DFFF00;
  animation: bsm-pulse 1.5s ease-in-out infinite;
}
@keyframes bsm-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
</style>
