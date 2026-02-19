# MedClass Pro: Reporte de Descubrimiento "Cero"

Este reporte documenta un análisis desde cero del proyecto, explorando su arquitectura, propósito y funcionalidades clave.

## 1. Misión y Propósito
**MedClass Pro** es una herramienta de gamificación médica diseñada para la gestión dinámica de aulas. El objetivo es transformar la dinámica de clase en una experiencia similar a un juego de rol (RPG), donde el progreso de los alumnos se mide en XP, rangos jerárquicos y logros.

## 2. Arquitectura Técnica
- **Framework**: React 19 + Vite (moderno, rápido y reactivo).
- **Experiencia Visual (Aesthetics)**:
  - **Glassmorphism**: Estética de cristal difuminado con bordes suaves.
  - **Ballpit (3D)**: Fondo interactivo creado con **Three.js** que reacciona al cursor/toque.
  - **GSAP & Framer Motion**: Animaciones fluidas para transiciones de pestañas, listas ordenadas y efectos de logro.
- **Gestión de Estado**:
  - **Persistencia**: Custom Hook `usePersistence` que sincroniza todo con `localStorage`. Los datos sobreviven a refrescos de página.
  - **Contexto Global**: Provee un sistema de notificaciones y diálogos premium que reemplazan a los nativos del navegador.

## 3. Módulos de Funcionalidad
| Módulo | Descripción | Tecnología Clave |
| :--- | :--- | :--- |
| **Progreso RPG** | Sistema de Experiencia (XP), Barra de Salud del grupo y Medallas (logros). | GSAP, confetti |
| **Control de Flujo** | Semáforo de atención y Temporizador de "Código Rojo" para el aula. | React Hooks |
| **Dados Pro** | Mesa de dados poliédricos (d4-d20) con soporte para fórmulas complejas. | `rpg-dice-roller` |
| **Multi-Touch** | Seleccionador de dedos para asignar turnos de forma física en la pantalla. | Native Touch Events |
| **Sorteo & Equipos** | Selección equilibrada de nombres y generación automática de grupos. | `crypto.RNG` |
| **Examen Grupal** | Sistema de trivias basado en archivos JSON cargables con marcador en tiempo real. | File API / FileReader |

## 4. Calidad del Motor de Azar (RNG)
La aplicación utiliza una clase `RNG` personalizada que emplea `crypto.getRandomValues()`.
- **Efecto de Saco (Balanced)**: Evita la repetición inmediata mediante una técnica de "bolsa" (shuffle-pop), lo que garantiza que todos los alumnos participen antes de repetir.

## 5. Preparación para PWA
- Totalmente instalable en dispositivos móviles/escritorios (Service Workers integrados).
- Iconos y metadatos listos para una experiencia de "App Nativa".

---
**Conclusión**: Es una aplicación madura y lista para producción que combina interactividad visceral con herramientas pedagógicas sólidas.
