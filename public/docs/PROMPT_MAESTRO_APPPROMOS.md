# 🧠 PROMPT MAESTRO — APPPROMOS

## 🎯 VISIÓN

AppPromos es una herramienta para:

👉 vender más rápido  
👉 evitar pérdida de mercadería  
👉 convertir stock en dinero en el día  

---

## 🔥 CONCEPTO CENTRAL

Si no lo vendés hoy… lo perdés.  
AppPromos lo vende por vos.

---

## 🧱 ARQUITECTURA

- Firebase Auth + Firestore  
- Multi-tenant  
- HTML + JS puro  
- BusinessStore + resolveSession  
- Cache-first  

---

## ⚙️ PRODUCTO

### CORE

Crear oferta → flujo principal

### DIFERENCIAL

Botón flotante → “Vender urgente” (Liquidador)

### SISTEMA

Login / Planes / Estados → no molesta

---

## 🧩 LÓGICA DEL LIQUIDADOR

✔ El usuario selecciona productos  
✔ El descuento aplica SOLO a esos productos  
✔ El resto mantiene precio normal  

---

## 🧱 METODOLOGÍA DE ENTREGA (CRÍTICA)

REGLA OBLIGATORIA:

👉 TODO CAMBIO SE ENTREGA EN .ZIP

Debe incluir:

✔ Archivos reales modificados  
✔ Estructura completa  
✔ Listo para reemplazar  

---

### ❌ NO PERMITIDO

- Código para copiar/pegar  
- “Pegá esto en…”  
- Instrucciones manuales  
- Cambios parciales  

---

### ✅ FLUJO

1. Descargar ZIP  
2. Reemplazar archivos  
3. Probar  
4. Validar  

---

## 🎨 UX PRINCIPIOS

✔ Simple  
✔ 1 acción principal por pantalla  
✔ Pensado para uso con una mano  
✔ Sin lenguaje técnico  

---

## 🧨 REGLA DE ORO

Si no empuja a vender hoy, no molesta.

---

## 🚀 ESTADO ACTUAL

- Liquidador separado del flujo principal  
- Botón flotante activo  
- UI en proceso de limpieza  
- Próximo paso: deploy + venta  

## 🚀Flujo de trabajo
Analizar el repo actual o el último patch aprobado.
Detectar el problema real.
Proponer solución simple.
Modificar solo los archivos necesarios.
Entregar ZIP del patch.
Documentar versión en `/public/docs`.
Test local.
Si funciona, subir a `dev`.
Luego merge a `main`.

## 🚀Restricciones del proyecto
No sobreingeniería.
No refactor innecesario.
No tocar Firebase/Auth/BusinessStore/resolveSession salvo que el parche lo requiera expresamente.
No romper demo.
No romper landing.
No romper login/registro.
No usar lenguaje técnico en UI final para carniceros.

## 🚀Criterio comercial
AppPromos no es un sistema de gestión tradicional.
Es una herramienta para vender rápido, recuperar plata y liquidar stock urgente.
Mensaje rector:
```txt
Elegís → Liquidás → Vendés por WhatsApp
```

## 🚀En el proximo mensaje se envia repo local actualizado para analizar y seguir evolucion y versionado