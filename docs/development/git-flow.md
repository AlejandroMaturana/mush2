# Git Flow para el repositorio

## Propósito

Este repositorio utiliza un flujo de trabajo basado en ramas para separar la línea estable de la línea de desarrollo y mantener un control claro sobre los cambios.

## Ramas principales

### main
Representa la rama estable y lista para producción.
- Debe contener cambios ya validados.
- Se usa como referencia de releases estables.

### develop
Representa la rama principal de desarrollo.
- Recibe los cambios de nuevas funcionalidades una vez están listos para integrarse.
- Sirve como punto de integración para el trabajo en curso.

### gitpages
Rama dedicada a levantar Vitepress con la documentación de mush2/docs/.
- No debe invocarse ni usarse como rama de trabajo habitual.
- Sirve como punto para despliegue de la documentación a [gitpages](https://alejandromaturana.github.io/mush2/).

## Flujo de trabajo

### Feature → develop
Cuando se trabaja en una nueva funcionalidad:
1. Se crea una rama de tipo feature/* desde develop.
2. Se desarrollan los cambios en esa rama.
3. La integración en develop ocurre después de la validación y la revisión.

### Release → main
Cuando una versión está lista para salir a producción:
1. Se prepara una rama de tipo release/* desde develop.
2. Se realizan ajustes finales de preparación.
3. La release se integra en main.
4. Los cambios finales de release se sincronizan nuevamente hacia develop.

### Hotfix → main
Cuando se requiere corregir un problema en producción:
1. Se crea una rama de tipo hotfix/* desde main.
2. Se aplica la corrección.
3. Se integra en main.

## Reglas básicas

- No trabajar directamente sobre main.
- Todos los cambios deben hacerse mediante ramas.
- Los commits deben ser claros y describir el cambio realizado.
- Las nuevas funcionalidades deben desarrollarse partiendo de develop.
- Las versiones estables deben salir desde main.
