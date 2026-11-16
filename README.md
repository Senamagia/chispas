# Chispas

App para gestionar chapuzas de obra: trabajos, cobros, material, herramientas, catálogo de precios, rentabilidad por trabajo, trabajos con socio y apuntes por voz.

- Se instala en Android desde Chrome (es una app web instalable, sin tienda).
- Funciona sin cobertura: todo se guarda en el móvil.
- Versión 0.1. Lo siguiente: nube (Firebase), avisos programados y presupuestos en PDF.

## Instalar en el móvil
1. Abrir el enlace de la app con **Chrome**.
2. Menú ⋮ › **Instalar aplicación**.
3. Abrirla desde el icono y, en Menú › Avisos en el móvil, pulsar **Activar avisos**.
4. Samsung: Ajustes › Aplicaciones › Chrome › Batería › **Sin restricciones**.

## Estructura
- `index.html`: estructura y pantalla de bienvenida
- `styles.css`: colores (claro y oscuro) y estilos
- `app.js`: toda la lógica y las pantallas
- `logo.js`: el monigote bombilla
- `sw.js`: funcionamiento sin conexión y avisos
- `manifest.webmanifest` + `icons/`: icono e instalación
