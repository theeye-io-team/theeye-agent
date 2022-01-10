# Instalación en la Raspberry Pi

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

Para instalar el Agente de TheEye en una Raspberry Pi, es necesario instalar Node.js y descargar el código fuente desde la repo de GitHub.

## Instalación de Node.js

> NOTA:
> * Se asume que la distribuición instalada es [Raspberry Pi OS](https://www.raspberrypi.com/software/operating-systems/)

1. Agregue el repositorio de NodeSource a su sistema. Esto le permitirá instalar Node.js usando `apt-get`
   ```bash
    curl -sL https://deb.nodesource.com/setup_lts.x | sudo bash -
    ```
2. Actualice los ficheros de su sistema. 
    ```bash
    sudo apt-get update && sudo apt-get -y full-upgrade
    ```
3. Instale Node.js desde `apt-get`
    > NOTA: 
    > * También son necesarios los paquetes `git` y `build-essential`, puede aprovechar este paso para descargarlos si no los tiene
    ```bash
    sudo apt-get -y install nodejs git build-essential
    ```

## Instalación del Agente

Usando git, vamos a instalar el Agente clonando su repositorio en `/opt/theeye-agent/`

```bash
cd /opt
git clone https://github.com/theeye-io-team/theeye-agent
cd ./theeye-agent
```

Al finalizar, podemos instalar las librerías necesarias

```bash
npm install
```

Terminado ese comando, el Agente estará listo para configurarse

## Configurar el Agente 

Para configurar el Agente, crearemos un archivo de configuración, en el cual se declararán las credenciales para este.

Primero, inicie sesión en la [aplicación web de TheEye](https://app.theeye.io), luego diríjase a "[app.theeye.io/api/agent/credentials](https://app.theeye.io/api/agent/credentials)" para descargar el archivo `credentials.json`. Este archivo tiene las credenciales necesarias para vincular el Agente con su organización. Tenga el archivo a mano, ya que luego tendrá que copiar información de este.

> NOTA:
> * El navegador automáticamente comunicará al servidor de TheEye qué usuario tiene la sesión abierta usando un *Token de Autenticación al Portador*. [Más información](/theeye-supervisor/#/es/auth ":ignore")

Luego, copie el directorio `/theeye-agent/misc/etc` en `/etc`. Esto también creará los servicios para ejecutar el Agente al encender la Raspberry Pi

```bash
cp -R /opt/theeye-agent/misc/etc/ /etc/
```

Con su editor de texto favorito, edite el archivo `/etc/theeye/theeye.conf`. Los siguientes parámetros deben ser reemplazados por los provistos en el archivo `credentials.json`

* `THEEYE_SUPERVISOR_CLIENT_ID`  
* `THEEYE_SUPERVISOR_CLIENT_SECRET`  
* `THEEYE_SUPERVISOR_CLIENT_CUSTOMER`  
* `THEEYE_SUPERVISOR_API_URL`

Modificar los otros parámetros no es necesario. [Más información](/)

Luego reinicie la Raspberry Pi

```bash
shutdown -R now
```

Si todo se configuró correctamente, el Agente debería iniciar con la Raspberry Pi y debería poder visualizar su estado en la interfaz web de TheEye.

If the Raspberry does not report we can try the [manual start with debug](/debug/)
Si su Agente no reporta a la interfaz, intente [iniciar el agente en modo debug](/es/debug-unix)

# Problemas comunes

* Si hay problemas con npm, la mejor opcion es eliminar el directorio `node_modules` como root y volver a ejecutar `npm install`.

```bash
sudo su -
cd /opt/theeye-agent
rm -rf ./node_modules
npm install
```
