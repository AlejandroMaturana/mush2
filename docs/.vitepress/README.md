### Traer el contenido de @docs/ a la rama actual
Cuando llegue el momento de actualizar los datos, ejecuta estos comandos:

## 1. Ve a la rama de documentación y asegúrate de que esté limpia

```
git checkout gitpages
git pull origin gitpages
```

## 2. Trae la carpeta /docs/ directamente desde master
Estando parado en gitpages, ejecuta:

```git checkout master -- docs/```

¿Qué hace esto? Reemplaza instantáneamente el contenido de tu carpeta local docs/ con la versión exacta que tiene la rama master. Todos los archivos nuevos, modificados o eliminados se prepararán automáticamente.
## 3. Confirma y sube los cambios
Ahora simplemente creas el commit y lo subes de forma normal (sin necesidad de usar --force):
```
git commit -m "docs: actualizar contenido desde rama master"
git push origin gitpages
```
------------------------------
Con este método, tratas a la carpeta /docs/ como si fuera un archivo de texto gigante que copias y pegas de un mundo a otro, evitando cualquier pelea entre los historiales de las ramas.
Si quieres dejar todo listo para el futuro, cuéntame:

* ¿La carpeta /docs/ en master tiene exactamente la misma estructura que necesitas en gitpages?
* ¿Te gustaría crear un script corto o alias de Git para automatizar estos tres comandos en un solo paso?
* ¿Quieres que verifiquemos si tu rama actual quedó en orden antes de que continúes con la carga de data?

---
