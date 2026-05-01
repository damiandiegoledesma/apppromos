# FUTURE — Bot automático WhatsApp AppPromos

## Estado
Congelado / experimental. No forma parte del MVP urgente ni del deploy principal de AppPromos.

## Objetivo futuro
Responder automáticamente consultas de carniceros interesados en AppPromos, por ejemplo:

- enviar link de demo;
- explicar prueba gratis;
- orientar hacia registro;
- responder preguntas frecuentes;
- derivar a una persona cuando haga falta.

## Archivos que se conservan

```txt
whatsapp-bot/bot.js
whatsapp-bot/package.json
whatsapp-bot/package-lock.json
whatsapp-bot/README.md
```

## Archivos/carpetas que NO se suben

```txt
whatsapp-bot/node_modules/
whatsapp-bot/auth_info/
archivos de sesión local
```

`node_modules` se reconstruye con `npm install`.
`auth_info` guarda sesión local de WhatsApp; si se borra, se vuelve a generar escaneando QR.

## Reactivar más adelante

```bash
cd whatsapp-bot
npm install
npm start
```

## Criterio
Este bot no debe bloquear el MVP, la demo, el registro, el pricing, Firebase ni el deploy. Cuando AppPromos esté saliendo comercialmente, conviene evaluar si se mantiene este bot experimental o si se migra a una integración oficial de WhatsApp Business Platform.
