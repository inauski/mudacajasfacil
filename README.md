# Muda Fácil

Construye una webapp (PWA) mobile-first en español para organizar una mudanza temporal, con espacio totalmente privado para cada usuario:

## Modelo de acceso y privacidad
- Autenticación con email y contraseña.
- Cada persona tiene su propio espacio completamente privado. Lo que una persona crea (cajas, objetos, fotos) solo lo ve esa persona. Nadie más puede verlo ni modificarlo.
- En la base de datos (Supabase / Lovable Cloud), todas las tablas (cajas y objetos) deben incluir `user_id` vinculado a `auth.uid()`, con políticas RLS estrictas (SELECT, INSERT, UPDATE, DELETE solo si `user_id = auth.uid()`).
- Fotos en bucket de almacenamiento privado, organizadas por carpeta de usuario (`{user_id}/...`) con políticas RLS y acceso mediante URLs firmadas.
- Numeración de cajas correlativa e independiente por usuario (`C-001`, `C-002`...), que siempre siga hacia adelante aunque se borren cajas intermedias.

## Modelo de datos
- **Cajas**:
  - Código único por usuario (`C-001`, `C-002`...).
  - Habitación de origen (con selector de lista fija de habitaciones comunes: Salón, Cocina, Dormitorio principal, Dormitorio 2, Baño, Trastero/Garaje, Pasillo, etc., y opción de añadir texto libre).
  - Estado: Vacía, Llena, Cerrada, Transportada, Desembalada.
  - Ubicación actual (texto libre).
  - Notas.
  - Marca "Esencial / abrir primero".
  - Marca "Frágil".
  - Fotos (múltiples).
  - Fecha de creación.
- **Objetos**:
  - Nombre, cantidad, caja asignada, categoría/etiquetas opcionales, foto opcional. Relación: una caja tiene muchos objetos.

## Funcionalidades principales (PWA mobile-first con botones grandes y táctiles)
1. **Autenticación**: Registro e inicio de sesión con email y contraseña.
2. **Listado de cajas**: Filtros por habitación y estado, contador de objetos por caja, acceso rápido para añadir nueva caja.
3. **Ficha de caja**: Detalle, fotos, cambio rápido de estado y ubicación, lista de objetos contenidos.
4. **Entrada rápida de objetos** (prioridad máxima):
   - Por dictado de voz (Web Speech API con botón de micrófono que separe múltiples elementos dichos de corrido con confirmación previa, y textarea alternativo compatible con dictado de teclado móvil).
   - Por texto por líneas o separados por comas.
5. **Fotos de cajas**: Subida directa o captura con cámara, con compresión automática en cliente (máx 1600px).
6. **Buscador global**: Búsqueda instantánea tolerante a tildes y mayúsculas que localice objetos y muestre caja, habitación, estado y ubicación.
7. **Marcar como desembalada**: Check rápido para tachar cajas y objetos al llegar al nuevo destino.
8. **Exportar**: Descarga en CSV y vista de impresión limpia caja por caja.
9. **Configuración PWA**: Manifest y service worker instalables en la pantalla de inicio del móvil.

Empieza implementando la **Fase 1**: estructura del proyecto, esquema de base de datos con RLS, autenticación (email y contraseña), navegación mobile-first y creación/listado de cajas con código correlativo `C-001` por usuario.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mudacajasfacil.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6b1bb9d-2996-412e-afe6-9207575ce2f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
