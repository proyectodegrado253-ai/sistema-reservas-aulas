# Guía rápida: trabajo local y subida de cambios

## 1) Abrir el proyecto

```powershell
cd "C:\Users\ING\Desktop\sistema de reservas de aulas\sistema-reservas-aulas"
```

## 2) Entrar al proyecto de Vercel

```powershell
cd migracion-vercel
```

## 3) Iniciar la app localmente

```powershell
npm install
npm run dev
```

La app normalmente queda disponible en:

```
http://localhost:3000
```

## 4) Trabajar en la rama activa

Actualmente la rama que se usa para este flujo es:

```powershell
git checkout isyoimerr
```

Para revisar el estado:

```powershell
git status
```

## 5) Guardar cambios

```powershell
git add .
git commit -m "descripcion del cambio"
```

## 6) Subir cambios al remoto

### Si la rama activa es `isyoimerr`

```powershell
git push upstream isyoimerr
```

### Si quieres subir también a tu fork personal

```powershell
git push origin isyoimerr
```

## 7) Ver ramas relevantes

```powershell
git branch -avv
```

## 8) Revisar remotes

```powershell
git remote -v
```

## 9) Si necesitas revisar el último commit

```powershell
git log -1 --oneline
```

## 10) Si quieres volver a una rama de producción/base

```powershell
git checkout main
```

## 11) Variables de entorno importantes

En la carpeta del proyecto `migracion-vercel`, revisa:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME="Sistema de Reservas"
```

> Si la app dice que la base de datos no está configurada, suele ser por variables de entorno o porque el proyecto desplegado en Vercel no tiene esas variables en `Environment Variables`.

## 12) Para despliegue en Vercel

1. Entra al proyecto en Vercel.
2. Ve a `Settings` > `Environment Variables`.
3. Añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_DEMO_MODE`
   - `NEXT_PUBLIC_APP_NAME`
4. Haz `Redeploy`.

## 13) Flujo recomendado

```powershell
git checkout isyoimerr
npm run dev
# hacer cambios
 git add .
 git commit -m "cambio listo"
 git push upstream isyoimerr
```

## 14) Dato importante

No mezcles commits de cambios visuales con cambios de base de datos o lógica del negocio en una misma rama si no es necesario. Mantén lo visual y lo funcional más separados cuando puedas.

---

Si mañana quieres, seguimos con:
- compactar más la UI móvil,
- revisar la parte de login y dashboard,
- o preparar el siguiente despliegue en Vercel.
