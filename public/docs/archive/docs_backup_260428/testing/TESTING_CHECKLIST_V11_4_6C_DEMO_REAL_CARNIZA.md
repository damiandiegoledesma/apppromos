# TESTING CHECKLIST — V11.4.6C Demo real Carnicería de Carniza

## Landing

- [ ] `index.html` carga normal.
- [ ] `Probar gratis` lleva al formulario de registro.
- [ ] El formulario de registro NO muestra botón `Probar demo`.
- [ ] El hero muestra `Probar demo sin registro`.
- [ ] Al tocar `Probar demo sin registro` entra a:

```txt
/app.html?demo=1
```

## Demo

- [ ] Entra sin pedir login.
- [ ] Muestra banner superior de demo.
- [ ] El negocio visible es `Carnicería de Carniza`.
- [ ] Permite entrar a Inicio.
- [ ] Permite entrar a Cambiar precios.
- [ ] Permite entrar a Crear oferta.
- [ ] Permite entrar a WhatsApp.
- [ ] Oculta Admin, Competencia y Web Premium en modo demo.
- [ ] Muestra productos demo mínimos.

## Guardado bloqueado

- [ ] Intentar guardar precio.
- [ ] Intentar guardar oferta/combo.
- [ ] Debe bloquear con mensaje amable.
- [ ] No debe escribir en Firestore.
- [ ] No debe romper pantalla.

Mensaje esperado:

```txt
Estás probando la Carnicería de Carniza. Para guardar tus precios y ofertas, registrate gratis.
```

## Usuario real

- [ ] Entrar normal sin `?demo=1`.
- [ ] Login real funciona.
- [ ] Usuario real conserva su carnicería.
- [ ] Usuario real puede guardar si está habilitado.
- [ ] Usuario vencido/suspendido sigue bloqueado como antes.

## Web Premium

- [ ] `web.html` carga igual que antes.
- [ ] No hubo cambios en `web.html`.

## Resultado

- [ ] Si todo está OK: subir a `dev`.
- [ ] Luego PR `dev → main`.
- [ ] Luego deploy Firebase Hosting.
