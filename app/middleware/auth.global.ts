export default defineNuxtRouteMiddleware((to) => { 
  if (import.meta.server) return 
 
  const user = localStorage.getItem('google_user') 
 
  if (to.path === '/login' && user) { 
    return navigateTo('/') 
  } 
 
  if (to.path !== '/login' && !user) { 
    return navigateTo('/login') 
  } 
})