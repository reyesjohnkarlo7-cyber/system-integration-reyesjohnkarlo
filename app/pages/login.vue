<template>
  <div class="d-flex mx-auto align center justify-center" style="height: 97vh;">
    <v-card width="500" rounded="xl" class="py-7">
      <v-card-text class="text-center">
        <v-icon size="100">mdi-account-circle-outline</v-icon>
          <p class="my-7"></p>
          <v-form @submit.prevent="signIn">
            <v-text-field label="Username or Email" variant="solo-filled" flat></v-text-field>
            <v-text-field label="Password" variant="solo-filled" type="password" flat></v-text-field>
            <v-btn type="submit" color="primary" class="mt-3" rounded block>Sign in</v-btn>
          </v-form>

          <v-divider class="my-8">Or</v-divider>

          <v-btn prepend-icon="mdi-google" color="red" @click="loginwithGoogle" rounded block>
            Sign in with google</v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
const config = useRuntimeConfig()
declare global {
  interface Window {
    google: any;
  }
}

const signIn = () => {
  navigateTo('/')
}

const loginwithGoogle = () => {
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: config.public.googleClientId,
    scope: "openid email profile",
    callback: async (response: any) => {
      const userInfo = await $fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        },
      );

      localStorage.setItem("google_user", JSON.stringify(userInfo));
      localStorage.setItem("google_token", response.access_token);

      navigateTo('/');
    },
  });

  client.requestAccessToken();
}
</script>

<style></style>