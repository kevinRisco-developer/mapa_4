// Reemplazar por el dominio real del backend una vez desplegado en Railway
// (Angular incrusta estos valores en el bundle al momento del build, no en runtime).
export const environment = {
  production: true,
  apiUrl: 'https://backend-production-e85d.up.railway.app/api',
  wsUrl: 'https://backend-production-e85d.up.railway.app/ws'
};
