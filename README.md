# Quizmate

Proyecto mínimo con Vite + React para visualizar el progreso actual del quiz usando datos estáticos en `public/data/demo`.

## Requisitos

- Node.js 18+ (recomendado 20 LTS)
- pnpm (recomendado) o npm/yarn

Si usas pnpm y no lo tienes instalado:

```
corepack enable
corepack prepare pnpm@latest --activate
```

## Instalación

Con pnpm:

```
pnpm install
```

Con npm:

```
npm install
```

## Desarrollo

Inicia el servidor de desarrollo (cualquiera de los siguientes):

```
pnpm dev
pnpm start
npm run dev
```

Luego abre:

```
http://localhost:5173
```

## Estructura relevante

- `public/data/demo/` – JSON de ejemplo: `metadata.json`, `freeform.json`, `mcq.json`, `image-map.json`.
- `src/utils/` – Carga de datos, validaciones y persistencia simple en `localStorage`.
- `src/App.jsx` – Vista mínima que valida y muestra datos cargados.

## Notas

- Vite sirve el contenido de `public` en la raíz, por lo que los JSON están disponibles en `/data/...`.
- El estado se guarda automáticamente en `localStorage` (prefijo `quizmate:`).
