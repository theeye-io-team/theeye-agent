# Debug en Unix

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

## Prerrequisitos

- Acceso al server
- Acceso root
- La última versión del Agente, instalada con el script provisto

## Pasos a seguir

1. Inicie sesión en su server
2. Si el servicio `theeye-agent` está en ejecución, deténgalo. En la mayoría de distribuiciones puede ejecutar `service stop theeye-agent`
4. Diríjase al directorio del Agente, generalmente `/opt/theeye-agent`
5. Ejecute el agente manualmente
    * Binario precompilado
    ```bash
    cd /opt/theeye-agent
    source /etc/theeye/theeye.conf && DEBUG=*eye* ./bin/theeye-agent
    ```
    * Desde el código fuente
    ```bash
    cd /opt/theeye-agent
    source /etc/theeye/theeye.conf && DEBUG=*eye* npm run core
    ```

De esta manera, el Agente mostrará su output en la shell
