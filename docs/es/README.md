# Agente TheEye 

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

Un **Agente** es un software autónoomo que se instala en un **Host de Organización**, es también conocido como Bot. 

Su responsabilidad principal es ejecutar **Tareas** y **Workflows** complejos, y reportar sus resultados al **orquestrador**.

También reporta el estado y métricas de uso del **Host** (aka: **Health Monitor** o dstat) al **orquestrador**

El **Agente** funciona como la interfaz de comunicación entre el **Host** y el núcleo de TheEye.

Se recomienda instalar y configurar el Agente como un servicio o Daemon.

## Conseguir el instalador

Desde el panel web, diríjase a **Settings** ➔ **Installer**. Ahí puede descargar el binario del agente y su instalador para ejecutar en el **Host**. También estarán disponibles instrucciones de instalación en inglés, separadas por sistema operativo, las mismas están traducidas para su conveniencia, pero los links y comandos son especificos al usuario, por favor revise las instrucciones del panel web.

![settings](/images/Settings.jpg)

![full list for install](/images/TheEye-Agent-Full-list.jpg)


### Instalador del Agente en Linux 

El Agente está probado y funcionando en las siguientes distribuiciones de Linux:

- Redhat/Centos 6+
- Ubuntu 12+

> NOTA: 
> - El script de instalación asume que se le otorgó acceso de superusuario.
> - Es probable que se pueda instalar el Agente en otras distribuiciones no documentadas, pero no es una funcionalidad directamente soportada.
>   - Deberia funcionar diréctamente en cualquier distribuición de Linux con un kernel versión 3.x o superior.
>   - Para distribuiciones de Linux con un Kernel versión 2.x podrían requerirse algunos pasos adicionales.


#### Instalar en Linux

1. Abre una consola
2. Eleve la consola con permisos root
3. Copie y pegue el comando provisto en la guía de instalación
4. Aguarde a ser notificado que la instalación terminó
5. Revise su Dashboard, debería ver un indicador del Agente instalado

[Instalación manual desde el código fuente](/es/binary_build.md)

Si necesta depurar o contribuir con el desarrollo, revise la [guía de debug en Unix](/es/debug-unix.md)

### Instalador del Agente en Windows

> NOTA: 
>   - El script de instalación asume que se ejecutó como administrador
>   - Es necesario instalar Powershell versión 5.0 o superior.

#### Instalar en Windows

1. Abrir CMD como administrador
2. Copie y pegue el comando provisto en la guía de instalación
3. Aguarde a que el instalador complete todas las acciones
4. Revise su Dashboard, debería ver un indicador del Agente instalado

Si necesta depurar o contribuir con el desarrollo, revise la [guía de debug en Windows](/es/debug-windows.md)

### Instalador del Agente en Docker 

#### Ejecutar el Agente como imagen de Docker

1. Abre una consola
2. Eleve la consola con permisos root
3. Copie y pegue el comando provisto en la guía de instalación
4. Aguarde a que el instalador complete todas las acciones
5. Revise su Dashboard, debería ver un indicador del Agente instalado
 

### Instalador de Agente en AWS

#### Instalar en AWS

1. Abrir la consola de AWS
2. Copie y pegue el `user-data` provisto en la guía de instalación
3. Abra sus instancias
4. Espere a que el agente comience a reportar
5. Revise su Dashboard, debería ver un indicador del Agente instalado
