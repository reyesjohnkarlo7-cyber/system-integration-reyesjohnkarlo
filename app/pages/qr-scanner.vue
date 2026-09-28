<template>
  <div class="mx-auto d-flex align-center justify-center" style="height: 90vh;">
    <v-card>
      <v-card-text>
        <video ref="videoRef" class="qr-video"></video>
        <v-btn text="Start Scanner" class="mt-2" color="green" @click="startScanner" block></v-btn>
        <v-btn text="Stop Scanner" color="error" class="mt-3" block></v-btn>


      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
//@ts-nocheck
import QrScanner from 'qr-scanner';

const videoRef = ref<HTMLVideoElement | null>(null)
//const result = ref('')
let scanner: QrScanner | null = null

const startScanner = async () => {
  if (!videoRef.value) return

  scanner = new QrScanner(
    videoRef.value,
    (scanResult) => {
      //result.value = scanResult.data 
      defineEmits('scanned', scanResult.data)

      //optional: stop after successful scan
      scanner?.stop()

    },
    {
      preferredCamera: 'environment',
      highlightScanRegion: true,
      highlightCodeOutline: true,
    }
  )
  await scanner.start()
}
</script>

<style scoped>
.qr-video {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  background: #000;
}
</style>