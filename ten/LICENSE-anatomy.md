# 3D-анатомия — лицензия файлов модели

Файлы в `m/` (сетки слоёв, суставы, веса привязки) и `ex/` (анимации) — производные модели
**Z-Anatomy** (Gauthier Kervyn, Marcin Zielinski и др., https://github.com/Z-Anatomy) на основе
**BodyParts3D © The Database Center for Life Science (DBCLS), Kousaku Okubo** — CC BY-SA 2.1 Japan.

Лицензия этих файлов: **Creative Commons Attribution-ShareAlike 4.0** — https://creativecommons.org/licenses/by-sa/4.0/deed.ru

Изменения: упрощение сеток (meshoptimizer), развёрнутые наружу нормали, риг из 19 костей, веса привязки,
данные «живой мышцы» (ось, положение вдоль мышцы), квантование и сжатие, запечённые упражнения.
Исходники пайплайна: `tools/anatomy/` в репозитории приложения.

Не включены части с некоммерческой или неясной лицензией: внутреннее ухо (University of Dundee, CC BY-NC-SA),
почка (Lissie Cowley, CC BY-NC), головной мозг Brainder / White matter и вся нервная система.
Определения Википедии не используются — описания мышц написаны заново.

Код просмотрщика (`ten.js`) — не часть модели; включает three.js (MIT) и meshoptimizer (MIT).
