<template>
  <v-container>
    <v-card v-if="user" class="pa-6">

      <div class="d-flex align-center ga-4">
        <v-avatar size="64" color="grey-lighten-2">
          <img v-if="user.picture" :src="user.picture" style="width: 100%; height: 100%; object-fit: cover;"
            @error="onImageError" />
          <v-icon v-else>mdi-account</v-icon>
        </v-avatar>

        <div>
          <h2>{{ user.name }}</h2>
          <p>{{ user.email }}</p>


          <v-btn color="error" @click="logout">
            Logout
          </v-btn>
        </div>
      </div>

    </v-card>

    <v-divider class="my-8">.</v-divider>


  </v-container>
</template>

<script setup lang="ts">
//@ts-nocheck
const user = ref<any>(null)

onMounted(() => {
  const savedUser = localStorage.getItem('google_user')

  if (savedUser) {
    user.value = JSON.parse(savedUser)
  }
})

const onImageError = () => {
  user.value.picture = ''
}

const logout = () => {
  localStorage.removeItem('google_user')
  localStorage.removeItem('google_token')
  navigateTo('/login')
} 
</script>

<style></style>