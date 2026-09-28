<template>
  <v-app>
    <v-main>
      <v-container>
        <v-navigation-drawer expand-on-hover permanent rail>
          <v-list>
            <v-list-item prepend-avatar="https://randomuser.me/api/portraits/women/85.jpg"
              subtitle="sandra_a88@gmailcom" title="Sandra Adams"></v-list-item>
          </v-list>

          <v-divider></v-divider>

          <v-list density="compact" nav>
            <v-list-item prepend-icon="mdi-folder" title="Dashboard" to="/" value="index"></v-list-item>
            <v-list-item prepend-icon="mdi-qrcode" title="QR Code" to="qr-scanner" value="shared"></v-list-item>
            <v-list-item prepend-icon="mdi-weather-lightning-rainy" to="weather" title="Weather" value="starred"></v-list-item>
          </v-list>
        </v-navigation-drawer>

        <v-app-bar>
          <template v-slot:prepend>
            <v-app-bar-nav-icon></v-app-bar-nav-icon>
          </template>

          <v-app-bar-title>Application Bar</v-app-bar-title>
        </v-app-bar>
        <v-main>
          <v-container fluid>
            <slot/>
          </v-container>
        </v-main>

        <v-main style="height: 250px"></v-main>
      </v-container>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>

</script>