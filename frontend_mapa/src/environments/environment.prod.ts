// Reemplazar por la URL real del backend una vez asignado el servidor de red
// (Angular incrusta estos valores en el bundle al momento del build, no en runtime).
export const environment = {
  production: true,
  apiUrl: 'http://REEMPLAZAR_HOST_BACKEND:REEMPLAZAR_PUERTO/api',
  wsUrl: 'http://REEMPLAZAR_HOST_BACKEND:REEMPLAZAR_PUERTO/ws'
};
