# FUTURE — Bot automático WhatsApp AppPromos

## Decisión
El bot automático queda congelado como módulo futuro/experimental.

## Motivo
La prioridad actual de AppPromos es salir a mostrar el MVP: landing, demo, registro gratuito, pricing, WhatsApp de ofertas, web propia y tracking mínimo.

## Se conserva

```txt
whatsapp-bot/bot.js
whatsapp-bot/package.json
whatsapp-bot/package-lock.json
whatsapp-bot/README.md
```

## No se conserva en Git ni en zips de revisión

```txt
whatsapp-bot/node_modules/
whatsapp-bot/auth_info/
```

## Cómo reactivarlo

```bash
cd whatsapp-bot
npm install
npm start
```

## Uso previsto futuro
- responder consultas frecuentes de AppPromos;
- enviar link de demo;
- explicar prueba gratis;
- orientar al registro;
- derivar a humano cuando corresponda.

## Regla
No tocar el bot mientras se esté cerrando el MVP comercial.
