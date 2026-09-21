<template>
  <div class="mx-auto d-flex align-center justify-center" style="height: 90vh;">
    <v-card>
      <v-card-text>
        <video class="qr-video"></video>
        <v-btn text="Start Scanner" class="mt-2" color="green" block></v-btn>
        <v-btn text="Stop Scanner" color="error" class="mt-3" block></v-btn>
          
        
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>

</script>

<style scoped>
.qr-video {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  background: #000;
}

</style>