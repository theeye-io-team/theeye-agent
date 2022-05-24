

El Agente de TheEye ya viene empaquetado con una versión de node.js incluida.
Cuando en el "run as" se le indica "node" el agente de TheEye utiliza la versión de node.js que viene empaquetada.

El error al ejecutar el script usando "node" como "run as" es porque la versión de node.js que esta incluida en el agente es demasiado antigua y en este caso no soporta el uso de promises y async/await.
​
La versión incluida debe ser anterior a la versión 8 de node.js que ya no esta soportada.
La versión mas reciente del agente viene con node.js 14

Consideren la opción de actualizar el agente a una versión mas resiente para aprovechar las últimas mejoras.
Las últimas version del agente las pueden encontrar en nuestro repositorio de Docker Hub
https://hub.docker.com/r/theeye/theeye-agent/tags


https://nodejs.org/en/about/releases/
