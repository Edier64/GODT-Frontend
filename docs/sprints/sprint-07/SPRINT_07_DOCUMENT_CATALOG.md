# Sprint 07 — Catálogo documental

El catálogo consulta plantillas y versiones mediante los endpoints reales del
motor. Los usuarios no administradores reciben únicamente versiones
publicadas según el alcance institucional del backend. La interfaz no ofrece
acciones ficticias para publicar, aprobar o modificar versiones.

Las instancias se crean solo con una versión publicada, guardan revisiones
append-only y permiten validar mediante el endpoint backend correspondiente.
