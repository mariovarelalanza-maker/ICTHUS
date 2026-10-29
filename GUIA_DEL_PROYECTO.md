# ICTHUS EMANUEL — Código fuente

Aplicación de finanzas para móvil y PC. Versión con ejercicios anuales independientes, historial de modificaciones, comprobantes y exportaciones detalladas.

## Uso de las cuentas anuales

- El ejercicio seleccionado afecta el Dashboard, saldo, entradas, salidas, ofrendas, movimientos, comprobantes y exportaciones.
- Al abrir la app se selecciona el año actual de Honduras (`America/Tegucigalpa`). Si permanece abierta durante Año Nuevo, se actualiza al detectar el cambio (cada 30 segundos y al volver a la ventana).
- Cada ejercicio parte de L 0.00. **No se traslada automáticamente el saldo del año anterior.** Registrá el ingreso inicial del nuevo año como una entrada con fecha de enero y categoría `Ingreso inicial`.
- Los ejercicios anteriores permanecen disponibles en el selector. También está disponible el próximo año para preparar movimientos.
- La fecha del movimiento determina el ejercicio. Al corregir su fecha a otro año, se traslada a ese ejercicio. La fecha de modificación es independiente y la genera el servidor.
- Los registros originales sin fecha quedan asignados a 2026. Conservan su fecha vacía y contribuyen al saldo de ese año. El resumen mensual los muestra en `Sin fecha`.
- El Excel y PDF incluyen el año, período y filtros exportados. El acumulado de un reporte filtrado corresponde solo a esos movimientos, desde cero; no es necesariamente el saldo completo del ejercicio.
- Para respaldar un año completo, seleccioná ese año en Dashboard y usá Exportar → Respaldo del período ZIP. Incluye Excel, PDF, JSON e imágenes originales. Repetí por cada año que quieras conservar.

## Archivos principales

| Archivo | Función |
| --- | --- |
| `app/page.tsx` | Interfaz, filtros, formulario, carga de archivos y exportación |
| `app/Dashboard.tsx` | Gráficos, indicadores y categorías del año seleccionado |
| `app/financial-year.ts` | Zona horaria, ejercicio y validación de fechas |
| `app/finance-categories.ts` | Clasificación de ofrendas, meriendas y otras categorías |
| `app/workbook.ts` | Excel: resumen, mensual, movimientos y comprobantes |
| `app/reports.ts` | PDF con imágenes y tipos de los reportes |
| `app/api/data/route.ts` | Lectura y modificación de datos; historial y adjuntos |
| `app/api/auth/route.ts`, `app/access.ts` | Inicio de sesión, roles, sesiones y permisos |
| `db/schema.ts`, `drizzle/` | Estructura de la base de datos y migraciones |
| `app/globals.css`, `public/icthus-emanuel.png` | Diseño y logo |
| `data/original.json` | Importación inicial de la hoja original; no es la base de datos actual |

Los importes se almacenan como **centavos enteros**: L 100.00 = 10000. El formato de Excel y PDF los convierte a lempiras. No cambiar esta convención sin migrar todos los importes.

## Desarrollo y verificaciones

Requisitos: Node.js 22.13 o superior y pnpm (versión indicada en `package.json`).

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm exec tsc --noEmit
node tests/year-accounting.cjs
pnpm build
```

La aplicación usa React / Vinext y Cloudflare Workers. La ejecución fuera del entorno administrado puede necesitar configurar las herramientas de desarrollo del proveedor. Consultá también `README.md` y los scripts de instalación existentes. No funciona como un HTML estático: necesita backend, base de datos y almacenamiento de imágenes.

La prueba `tests/year-accounting.cjs` usa SQLite temporal en memoria. Verifica el corte del año en Honduras, migración de registros sin fecha, separación de saldos, cambios de fecha, historial, comprobantes y permisos. No modifica la base de datos en línea.

## Configuración del servidor

Bindings necesarios:

- `DB`: base de datos Cloudflare D1.
- `BUCKET`: almacenamiento Cloudflare R2 para comprobantes.
- `ADMIN_PASSWORD_HASH`: hash SHA-256 hexadecimal de la contraseña de Admin.
- `VIEWER_PASSWORD_HASH`: hash SHA-256 hexadecimal de la contraseña de Guía.

Los usuarios admitidos son Admin y Guía (Guia también se reconoce). Las contraseñas distinguen mayúsculas. Los valores reales de los secretos **no están incluidos en este ZIP**. Al modificar un hash se invalidan las sesiones de ese rol.

Para generar un hash sin guardar la contraseña en el código:

```bash
python -c "import getpass,hashlib; print(hashlib.sha256(getpass.getpass('Contraseña: ').encode()).hexdigest())"
```

Guardá el resultado como secreto del entorno correspondiente. Usá HTTPS; las cookies de sesión son Secure y HttpOnly. La aplicación valida el origen de las solicitudes de escritura.

## Publicar cambios o alojar una copia

Este proyecto mantiene la configuración de su sitio actual en `.openai/hosting.json`. Para actualizarlo en ChatGPT, trabajá sobre el mismo proyecto y publicá una nueva versión. No borres ni recrees el sitio para hacer cambios rutinarios.

Para alojar una copia independiente: registrá tu propio proyecto, configurá los bindings DB/BUCKET y secretos en el proveedor, reemplazá la identidad de alojamiento, compilá el Worker y aplicá las migraciones en orden. No uses la identidad del sitio actual para crear otra instalación. Los archivos `dist/`, `node_modules/`, las credenciales y `.git/` están excluidos de esta entrega; se reconstruyen o configuran por separado.

**El código fuente no contiene una copia de la base de datos de producción ni de todos sus comprobantes.** `data/original.json` contiene solo la importación original. Para conservar los movimientos agregados después, descargá además los respaldos ZIP desde la app. Restaurar una instalación distinta requiere importar esos datos y subir sus comprobantes; no hay un botón de restauración automática de JSON implementado.

El funcionamiento de la URL depende de que el sitio y el servicio de alojamiento sigan activos. Este código permite mantener o adaptar la aplicación; no constituye una garantía de alojamiento permanente.
