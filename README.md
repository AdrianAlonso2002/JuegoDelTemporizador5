# Para ti, en diciembre

Calendario personal de adviento, sin dependencias de ejecución.

## Abrir y comprobar

Ejecuta `npm run dev` y visita http://127.0.0.1:5173. También funciona abriendo `index.html`. `npm run check` comprueba la sintaxis y `npm test` verifica orden, fechas, retos, migración y cumpleaños.

## Reglas

- Los días 1–29 corresponden a diciembre de 2026. Cada regalo requiere su fecha y completar todos los anteriores.
- Quitar una cinta abre el regalo. Los días normales quedan completados; un reto queda pendiente hasta acertar.
- Las fotos de los retos solo se cargan y muestran cuando la respuesta es correcta. Cerrar y volver no elimina el bloqueo. Se ignoran mayúsculas, tildes y espacios exteriores.
- Cumpleaños empieza gris y con candado. Después de completar el 29 se convierte en un paquete como los demás, con el nombre «Cumpleaños». Su apertura es el 17 de enero de 2027.
- Cada paquete de diciembre abierto añade una estrella de color diferente a la nevada, hasta 29. La caída dura 54–84 segundos y vuelve a empezar después de unos segundos fuera de pantalla. No se generan partículas continuamente: se reutiliza un elemento por regalo. Se pausa al ocultar la pestaña y respeta la preferencia de movimiento reducido.
- La demo adelanta las fechas, pero mantiene el orden y los retos. Su progreso y estrellas están separados del calendario real. Puede reiniciarse desde su aviso.

El progreso real (abierto y completado por separado) se guarda en localStorage. Los datos antiguos se migran conservando únicamente el tramo en orden; los retos anteriores sin respuesta guardada se deben resolver otra vez. Los cambios se sincronizan entre pestañas del mismo navegador.

## Personalizar

Edita `config.js`: `days` admite `day`, `type`, `title`, `text`, `image` e `imageAlt` para todos los tipos (`letter`, `photo`, `plan`, `puzzle`). Los retos usan además `clue`, `answer` y `successText`. `imageRotation: -90` presenta de pie las fotos que llegan giradas, conservando el archivo original. Las fotos se muestran completas, sin recortar, y se cargan al descubrir cada recuerdo.

Contenido preparado:

- 1: calendario real de Kinder y su imagen.
- 2: primera foto juntos.
- 3: primer viaje a Barcelona.
- 4: DORCUEERS → recuerdos, con foto al resolver.
- 5: «más _____.» → juntos, con foto al resolver.
- 6: foto añadida; `text` está vacío para escribir la anécdota después.
- 17: cita para Avengers: Doomsday y el cartel adjunto. El texto anuncia el plan el día 17; el cartel indica el 18 de diciembre.
- 29: gran regalo, pendiente de personalizar.
- Cumpleaños: 17 de enero, pendiente de personalizar.

Los demás días tienen textos de ejemplo y un espacio para su imagen; basta añadir su entrada a `days`. No se han inventado anécdotas ni reutilizado fotos de otros proyectos.

Las fuentes de Google son opcionales, con alternativas locales. Esta web estática controla la experiencia, pero no protege secretos frente a la inspección de archivos o cambios del reloj. Si hace falta ese nivel de protección, los contenidos deben servirse desde un backend después de validar fecha y progreso.
