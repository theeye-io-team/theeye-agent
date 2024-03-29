# Actualización

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)


Según el tipo de instalación que se haya realizado la actualización del agente varia levemente.
Por lo general consiste en reemplazar los archivo por los de la nueva versión.

La actualización del agente incluye además una actualización de interprete de Node.js que ya viene empaquetado dentro del agente.
En caso de que se indique los contrario este interprete es el utilizado para la ejecución de los jobs y monitores.


Actualmente existen tres tipos de instalación


* Script de Instalación

* Imagen Docker

* Codigo Fuente



## Script de Instalación


El script de instalación realiza la descarga del agente en formato binario.
Luego de realizar la descarga se configura el servicio en el sistema operativo.


El directorio de instalación es

* Unix /opt/theeye-agente

* Windows es c:/theeye-agent


Para actualizar el agente hay que realizar la descarga del archivo comprimido correspondiente a la versión requerida, localizar y reemplazar los archivos en el directorio correspondiente.

En ambos casos es necesario detener el proceso antes de reemplazar los archivos y luego volver a lanzar el servicio.


## Docker

Este proceso consisten en descargar la nueva imagen y relanzar el contenedor.

Aviso: Este proceso de actualización destruye el contenedor docker y toda la información que haya sido generada dentro del contendor y que no haya sido resguardada correctamente.
También son eliminados los archivos de configuracion y el código que no haya sido generado automáticamente.


El proceso de actualización es el siguiente.


1. Los contenedores docker mantinen la información dentro del contenedor.
Es importante asegurarse que todo lo necesario fue generado autómaticamente y no hay información dentro del contenedor que se pueda perder.


2. Descargar la nueva imagen. Con el siguiente comando se obtiene la última versión estable


```bash
docker pull theeye/theeye-agent
```


3. Una vez descargada la imagen se puede detener el agente y volver a lanzar.
Hay que identificar de que manera fue iniciado el agente antes de proceder.


Si fue iniciado con el comando docker run como figura en el panel de TheEye la siguiente secuencia de comandos debería hacer el trabajo.

* Detener el container

```bash

docker stop ${customer_name}

```

* Borrar el container. Se encuentra apagado y podrá ser lanzado el nuevo con el mismo nombre sin antes borrar el anterior. Este proceso elimina todos los archivos asociados al container

```bash

docker rm ${customer_name}

```


4. Lanzar de nuevo el agente utilizando la linea de instalación que figura en el panel de TheEye

El comando para iniciar el agente suele ser similar al siguiente

```bash


docker run --name "mailbot" -e NODE_ENV="production" \
  -e DEBUG="*eye*err*" \
  -e THEEYE_SUPERVISOR_CLIENT_ID="6c65585e2bed2c932b3b0413a10e466cbcff0715" \
  -e THEEYE_SUPERVISOR_CLIENT_SECRET="f487b7bd5ebff8eea4dc18c2444f38cbc804875b" \
  -e THEEYE_SUPERVISOR_CLIENT_CUSTOMER="mailbot" \
  -e THEEYE_SUPERVISOR_API_URL="http://localhost:60080" \
  -e THEEYE_CLIENT_HOSTNAME="mailbot" \
  -d theeye/theeye-agent

```




## Código Fuente

La actualización del código fuente se realiza utilizando el comando git.


1. git checkout master

2. git fetch

3. git reset --hard origin/master

4. git pull origin master
