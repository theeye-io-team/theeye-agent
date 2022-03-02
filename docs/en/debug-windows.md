
# Agente

## DEBUG Windows
Para iniciar el agente de theeye en modo debug y ver los logs completos hay que iniciar el agente manualmente.

El agente es un proceso automático que corre desatendido como servicio. Para iniciar el modo debug es necesario hacer desde CLI manualmente.

NOTA. Si el agente estuviera configurado como servicio del sistema operativo, no es necesario apagarlo ni deternerlo.


## Pasos a seguir.

1. Abrir un `cmd` como administrador

2. Asumiendo que theeye estuviera instalado con la configuración por defecto, lo encontramos en la carpeta `c:/theeye-agent` . Nos movemos a la carpeta del agente

```sh

cd c:/theeye-agent

```

3. El agente necesita leer la configuración. Para eso utilizamos la variable de entorno `NODE_ENV`.
El valor de esta variable tiene que ser igual al basename (nombre del archivo sin la extensión) del archivo de configuración que vamos a utilizar.
El archivo continiene principalmente las credenciales de acceso.

Por defecto la instalación genera el archivo `config/credentials.json` dentro del directorio del agente

```sh

set NODE_ENV='credentials'

```

4. Para activar el modo DEBUG , hay que setear la variable de entorno y elegir que información necesitamos ver. Para ver

```sh

set DEBUG=*eye*

```

5. En el directorio de instalación se encuentra el binario para iniciar el agente `theeyeagent.exe`


```sh

theeyeagent.exe

```
