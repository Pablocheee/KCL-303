import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ru' | 'en';

export const TRANSLATIONS = {
  ru: {
    // Navigation Bar
    tb303Tab: 'TB-303',
    analogTab: 'Analog Crossbar',
    startAcidBtn: 'СТАРТ ЭСИД',
    stopAcidBtn: 'СТОП',
    undoTitle: 'Откат назад (Ctrl+Z)',
    redoTitle: 'Откат вперед (Ctrl+Y)',
    undoAvailable: 'Доступно',
    keyboardPianoTitle: 'Компьютерная клавиатура: играйте на буквах A-K, октавы Z и X. Нажмите для настроек.',
    midiSettingsTitle: 'Настройки MIDI и MIDI Learn (подключение MIDI-клавиатуры и привязка фейдеров)',
    langToggleTitle: 'Сменить язык интерфейса (RU / EN)',
    
    // Header & Synthesizer
    synthTitle: 'Browser TB-303 Acid Synthesizer',
    dspBadge: '32-BIT DSP',
    staticKnobs: 'Статичные ручки',
    staticKnobsActive: 'Статичные ручки активны',
    staticKnobsDesc: 'Фиксация значений ручек без телеметрического дрожания',
    presetsBtn: 'Пресеты',
    patternsBtn: 'Паттерны',
    exportWavBtn: 'Экспорт WAV',
    exportAbletonBtn: 'Экспорт VST/M4L',
    acidEngineActive: 'ДВИЖОК АКТИВЕН',
    engineReady: 'ДВИЖОК ГОТОВ',
    synthSubtitle: 'МИКРОСКОПИЧЕСКИЙ ТРАНСПОРТ ЭЛЕКТРОНОВ И ШУМ ДЖОНСОНА-НАЙКВИСТА',

    // Knob Labels
    knobCutoff: 'СРЕЗ (CUTOFF)',
    knobResonance: 'РЕЗОНАНС (RES)',
    knobEnvMod: 'ОГИБАЮЩАЯ (ENV)',
    knobDecay: 'ЗАТУХАНИЕ (DECAY)',
    knobAccent: 'АКЦЕНТ (ACCENT)',
    knobOverdrive: 'ПЕРЕГРУЗ (DRIVE)',
    knobMorph: 'TR-8S МОРФИРОВАНИЕ',
    knobFlux: 'ЭЛЕКТРОННЫЙ ФЛЮКС',

    // Electron Physics Section
    electronPhysicsTitle: 'Аудиальная физика электронов и режимы транспорта',
    electronPhysicsSubtitle: 'Переключайте режимы для мгновенного изменения звуковой текстуры',
    soloElectrons: 'СОЛО ЭЛЕКТРОНОВ',
    auditionSolo: 'РЕЖИМ СОЛО',
    soloAuditionTitle: 'Отключает осцилляторы и оставляет только звук частиц электронов',
    quantumShotName: 'QUANTUM SHOT',
    quantumShotDesc: '2·q·I — Дискретный треск квантовых пакетов на фильтре.',
    thermalBoltzmannName: 'THERMAL BOLTZMANN',
    thermalBoltzmannDesc: '4·k_B·T — Тёплый аналоговый дрейф строя, тепловое шипение.',
    flickerFilamentName: '1/f MEMRISTOR',
    flickerFilamentDesc: 'Низкочастотный рокот вакансий кислорода и скачки RTS.',
    avalancheName: 'AVALANCHE',
    avalancheDesc: 'Лавинный пробой диодов, туннельный фузз и агрессия VCF.',
    bypassCleanName: '⚪ PURE SILICON BYPASS',
    bypassCleanDesc: 'Чистый кремний без шума и дрейфа',
    fluxIntensity: 'ИНТЕНСИВНОСТЬ ПОТОКА (FLUX):',
    liveMacroTitle: 'Живой шейпер физики макросов',
    tempMacroLabel: 'ТЕМПЕРАТУРА',
    tiaGainMacroLabel: 'УСИЛЕНИЕ TIA',
    driftMacroLabel: 'ДРЕЙФ МЕМРИСТОРА',

    // Morph Filter Section
    morphActive: 'МОРФ: ВКЛ (ACTIVE)',
    morphBypass: 'МОРФ: ВЫКЛ (BYPASS)',
    bipolarMacro: 'Биполярный макро-морф фильтр',
    morphDisabled: 'ВЫКЛЮЧЕНО (BYPASS) • 100% DRY',
    centerFlat: 'CENTER FLAT (0%)',
    morphPosition: 'ПОЗИЦИЯ МОРФИНГА (BIPOLAR):',
    morphResonance: 'РЕЗОНАНС МОРФИНГА:',
    warmQ: 'Мягкий 1.0 Q',
    screamingQ: 'Кричащий 24.0 Q',
    vcfVcaControls: 'TB-303 АНАЛОГОВЫЙ VCF & VCA ФИЛЬТР',
    waveform: 'ФОРМА ВОЛНЫ',
    sawtooth: 'ПИЛА',
    square: 'КВАДРАТ',
    rawVcoDiode: 'Диодный VCO',
    morphTooltipActive: 'Влияние морф-фильтра ВКЛЮЧЕНО. Нажмите, чтобы отключить (Bypass)',
    morphTooltipBypass: 'Влияние морф-фильтра ВЫКЛЮЧЕНО (Bypass). Нажмите, чтобы включить',
    morphBipolarTooltip: 'Биполярный фильтр: влево LPF, вправо HPF, в центре 0% (Flat)',
    jitterTooltipActive: 'Режим без дёрганий АКТИВЕН (Ручки зафиксированы)',
    jitterTooltipJitter: 'Режим дёрганий АКТИВЕН',

    // Sequencer Toolbar
    play: 'Играть',
    stop: 'Стоп',
    startAcid: 'СТАРТ ACID',
    stopAcid: 'СТОП',
    dspLive: 'DSP LIVE',
    enableDsp: 'ВКЛЮЧИТЬ DSP',
    testSound: 'ТЕСТ ЗВУКА',
    testSoundShort: 'Тест',
    tempo: 'Темп',
    scale: 'Гамма',
    stepsLength: 'Шаги',
    clear: 'Очистить',
    clearConfirmTitle: 'Очистить все ноты паттерна',
    waveformSaw: 'Пила',
    waveformSquare: 'Квадрат',
    presetLabel: 'Пресет:',
    saveBtn: 'Сохранить',
    deleteBtn: 'Удалить',
    exportBtn: 'Экспорт',
    importBtn: 'Импорт',
    wavExportBtn: 'WAV ЭКСПОРТ / ЗАПИСЬ',
    rndmBtn: 'Rndm',
    clearBtn: 'Очистить',
    octaveKeys: 'Октава клавиш:',
    stepLength16: '16 ШАГОВ',
    stepLength32: '32 ШАГА',

    // Sequencer Views
    viewT8: 'T-8 (TR-REC)',
    viewClassic: 'Классический TB-303',
    classic303Header: 'ОРИГИНАЛЬНЫЙ СТЕП-ПРОГРАММАТОР (PITCH & TIME)',
    classic303Desc: 'Классический пошаговый ввод нот и ритма как в оригинале 1982 года',
    pitchModeTitle: '1. PITCH MODE (ВВОД ВЫСОТЫ НОТ)',
    timeModeTitle: '2. TIME MODE (РИТМИЧЕСКИЙ ВВОД: NOTE/TIE/REST)',
    rhythmNoteBtn: '🎵 NOTE (16TH TRIG)',
    rhythmNoteDesc: 'Звучание ноты на этом шаге',
    rhythmTieBtn: '🔗 TIE (СВЯЗКА / SLIDE)',
    rhythmTieDesc: 'Продлить предыдущую ноту со слайдом',
    rhythmRestBtn: '⭕ REST (ПАУЗА)',
    rhythmRestDesc: 'Беззвучный шаг (пауза)',
    backBtn: '◄ Назад',
    forwardBtn: 'Вперед ►',
    transposeDown: 'ВНИЗ',
    transposeNorm: 'НОРМ',
    transposeUp: 'ВВЕРХ',
    stepRecordPrompt: 'Шаг #{step} — Нажмите клавишу ноты для записи и перехода к следующему шагу:',
    rhythmRecordPrompt: 'Ритмический ввод шага #{step} (нажатие кнопки автоматически продвигает шаг вперед):',
    fullScale32: 'Общая шкала 32 шагов (Кликните для выбора):',
    savePatternTitle: 'Сохранить паттерн в память',
    patternNameLabel: 'Название паттерна:',
    patternCategoryLabel: 'Категория / Стиль:',
    patternSaveInfo: 'Сохранится вся последовательность нот, акцентов, слайдов, темп и гамма. Паттерн не сотрется при перезагрузке страницы!',
    cancelBtn: 'Отмена',
    closeBtn: 'Закрыть',
    doneBtn: 'Готово',
    
    // Step Grid & Modifier Strip
    stepLabel: 'Шаг:',
    stepNoteLabel: 'Нота шага',
    stepTrigOn: 'TRIG ON',
    stepTrig: '● TRIG',
    stepRest: '○ REST',
    stepAcc: 'ACC',
    stepSlide: 'SLIDE',
    stepOctUp: '+8 OCT',
    allOctDown: 'ВСЕ -1 ОКТ',
    allOctUp: 'ВСЕ +1 ОКТ',
    bar1Label: 'ТАКТ 1 (ШАГИ 1–16)',
    bar2Label: 'ТАКТ 2 (ШАГИ 17–32)',
    bar1Playing: '● ТАКТ 1 ЗВУЧИТ',
    bar2Playing: '● ТАКТ 2 ЗВУЧИТ',
    hotkeysGuide: 'Клавиши:',
    hotkeysStep: 'Шаг',
    hotkeysRow: 'Дорожка',
    hotkeysToggle: 'Вкл/Удалить',
    hotkeysNote: 'Нота',
    hotkeysPlay: 'Play',

    // LFO Strip
    lfoOn: 'LFO ВКЛ',
    lfoOff: 'LFO ВЫКЛ',
    lfoSync: 'Синхро',
    lfoDepth: 'Глубина',
    lfoTurnOn: 'Включить LFO питча и фильтра',
    lfoTurnOff: 'Выключить LFO питча и фильтра',
    syncGridTitle: 'Синхро к сетке шагов',
    lfoDepthTitle: 'Глубина переливания',
    lfoSliderLabel: 'Слайдер:',

    // Spatial Pan Filter Strip
    panTitle: 'Зеркальная Панорама (Spatial Pan)',
    panOff: 'ПАН ВЫКЛ',
    panPingPong: 'P-PONG',
    panDrops: 'КАПЛИ',
    panSpiral: 'ВИХРЬ',
    panModeOffLabel: '0. Выкл (Моно / Центр)',
    panModePingPongLabel: '1. Ping-Pong Mirror (Зеркальный отскок L/R)',
    panModeDropsLabel: '2. Rain Drops Scatter (Разброс капель панорамы)',
    panModeSpiralLabel: '3. 3D Vortex Spiral (360° круговой вихрь)',
    panTooltip: 'Пространственная панорама: выбор зеркальных вариаций (Ping-Pong, Капли, 3D Вихрь)',
    panVariations: '3 Вариации',

    // Live Recording Floating Badge
    recSession: '● REC ЗАПИСЬ СЕССИИ',
    recSessionDesc: 'Записываются звук и все движения ручек TB-303',
    recWindowBtn: 'Окно записи / Стоп',

    // History & Logs
    undoLog: 'Откат назад',
    redoLog: 'Откат вперед',
    patternCleared: 'Паттерн очищен',
    
    // Status Bar & Footers
    midiConnected: 'Web MIDI подключен',
    directDspLive: 'DSP синтезатор активен',

    // MIDI Settings Modal
    midiSettingsHeader: 'Настройки MIDI & MIDI Learn',
    midiLearnActiveBadge: '● LEARN АКТИВЕН',
    midiSettingsSub: 'Подключение MIDI-клавиатуры, назначение фейдеров и игра на клавишах',
    tabFaderMapping: 'Назначение фейдеров (MIDI Learn)',
    tabPcKeyboard: 'Клавиатура ПК (Пианино)',
    tabDevicesMonitor: 'Устройства & Монитор',
    quickAssignTitle: 'Быстрое назначение физических ручек и фейдеров:',
    quickAssignDesc: 'Нажмите кнопку LEARN напротив нужного параметра, затем поверните любую ручку на вашей MIDI-клавиатуре. Назначение произойдёт мгновенно!',
    resetCcBtn: 'Сброс CC',
    resetCcTooltip: 'Вернуть стандартные CC TB-303 (Cutoff: CC74, Res: CC71...)',
    turnKnobPrompt: 'КРУТИТЕ РУЧКУ...',
    keyboardPlayTitle: 'Игра на компьютерной клавиатуре:',
    keyboardPlayDesc: 'Вы можете играть кислотные бас-партии прямо на буквах клавиатуры! Клавиши Z и X переключают базовую октаву вверх и вниз во время игры.',
    currentKeyOctave: 'Текущая октава клавиш:',
    octDownBtn: '[Z] -1 Окт',
    octUpBtn: '+1 Окт [X]',
    keyboardLayoutTitle: 'Раскладка клавиш (нажимайте кнопки на клавиатуре для звука):',
    midiInputLabel: 'MIDI Input (Клавиатуры / Контроллеры)',
    noMidiInput: 'Нет подключённых MIDI-устройств',
    midiOutputLabel: 'MIDI Output (В DAW / Железо)',
    noMidiOutput: 'Нет выходных портов',
    midiStatusLabel: 'Статус Web MIDI API:',
    liveMidiStream: 'Живой поток сообщений (Live MIDI Stream):',
    waitingMidi: 'Ожидание MIDI сообщений...',
    learningKnobStatus: '● Вращайте ручку на MIDI-контроллере для привязки...',
    ccSavedNotice: 'Назначения CC сохраняются автоматически в браузере.',

    // WAV Export Modal
    wavModalHeader: 'Студийный WAV Экспорт и Запись Мастер-Шины',
    wavModalSub: 'Запись сессии до 10 минут с отсчетом или мгновенный OfflineAudioContext рендер',
    tabLiveRecord: 'ЖИВАЯ ЗАПИСЬ (ДО 10 МИНУТ С ОТСЧЕТОМ)',
    tabFastOffline: 'БЫСТРЫЙ OFFLINE РЕНДЕР ПАТТЕРНА',
    metronomeCountTitle: 'ТИХИЙ ПРЕДВАРИТЕЛЬНЫЙ ОТСЧЕТ ТЕМПА',
    metronomeCountDesc: 'Негромкие щелчки метронома ({bpm} BPM) ... Запись начнется автоматически на шаге 1!',
    recordingMasterTitle: 'ИДЕТ ЗАПИСЬ МАСТЕР-ЗВУКА TB-303',
    recordLimit: 'Лимит: 10:00 (600 сек)',
    peakLevelLabel: 'ПИКОВЫЙ УРОВЕНЬ:',
    memorySizeLabel: 'РАЗМЕР В ПАМЯТИ:',
    tweakKnobsHint: '💡 Крутите любые ручки: Cutoff, Resonance, Decay, Drive, Temp, Morph. Все ваши манипуляции в реальном времени записываются в файл!',
    stopSaveWavBtn: 'ОСТАНОВИТЬ И СОХРАНИТЬ WAV',
    howLiveRecordWorks: 'КАК РАБОТАЕТ ЖИВАЯ ЗАПИСЬ ДО 10 МИНУТ:',
    liveRecordP1: 'Перед записью прозвучит негромкий счет 4..3..2..1 на текущем темпе ({bpm} BPM).',
    liveRecordP2: 'Сразу после счета автоматически включится воспроизведение и пойдет непрерывная запись мастер-шины.',
    liveRecordP3: 'Записываются все живые манипуляции со звуком: фильтры, резонанс, перегруз, температура, морфинг и переключение паттернов.',
    liveRecordP4: 'Длительность записи — до 10 минут (600 секунд) с выводом студийного PCM WAV файла.',
    startLiveRecBtn: 'НАЧАТЬ ЖИВУЮ ЗАПИСЬ С ОТСЧЕТОМ (4..3..2..1)',
    recordCompleted: 'ЗАПИСЬ СЕССИИ УСПЕШНО ЗАВЕРШЕНА',
    listenPreview: 'Прослушать запись',
    pausePreview: 'Пауза',
    wavQualityDesc: 'Стерео 16-bit 44.1 kHz WAV PCM',
    downloadWavBtn: 'СКАЧАТЬ WAV ФАЙЛ ({size} MB)',
    recordAgainBtn: 'Записать заново',
    offlineRenderTitle: 'МГНОВЕННЫЙ OFFLINEAUDIOCONTEXT РЕНДЕР:',
    offlineRenderDesc: 'Рендерит текущий 16/32-шаговый паттерн на максимальной скорости процессора без задержек. Включает эмуляцию диодного фильтра, перегруза и текущие настройки ручек.',
    renderBarsLabel: 'ДЛИТЕЛЬНОСТЬ РЕНДЕРА (ТАКТЫ):',
    renderingProgress: 'РЕНДЕРИНГ В ПАМЯТИ ЧЕРЕЗ OFFLINEAUDIOCONTEXT...',
    renderAndDownloadBtn: 'ОТРЕНДЕРИТЬ И СКАЧАТЬ WAV (.WAV 16-BIT 44.1kHz)',
    wavSuccessDownloaded: 'WAV файл паттерна успешно сгенерирован и скачан!',
    uncompressedPcmWav: 'Несжатый студийный PCM WAV (совместим с Ableton, FL Studio, Logic, Reaper)',

    // Touchpad
    touchpadTitle: 'Сенсорный Мульти-Тачпад (Ультра-скорость 120 FPS)',
    touchpadMouseLocked: '● МЫШЬ ЗАХВАЧЕНА',
    touchpadSensorActive: '● СЕНСОР АКТИВЕН',
    touchpadTouchpad: 'КАСАНИЕ / ТРЕКПАД',
    touchpadSub: 'Любое движение пальцем сразу меняет ВСЕ 6 фильтров TB-303 с нулевой задержкой',
    touchpadLockBtn: 'ЗАХВАТ ТРЕКПАДА (LOCK)',
    touchpadUnlockBtn: 'ОТПУСТИТЬ ТРЕКПАД (КЛИК / ESC)',
    touchpadHoldOn: 'HOLD: значения фиксируются при отрыве пальца',
    touchpadHoldOff: 'HOLD: возврат в центр при отрыве',
    multiTouchBoost: 'МУЛЬТИ-ТАЧ: OVERDRIVE BOOST!',
    trackpadCapturedHint: 'ТРЕКПАД ЗАХВАЧЕН: ВОДИТЕ ПАЛЬЦЕМ ПО НОУТБУКУ',
    trackpadExitHint: '[КЛИК МЫШИ / ESC] ВЫХОД',
    touchpadInstructions: 'Касайтесь пальцем в любое место экрана смартфона или свайпайте по трекпаду',

    // Text Generator
    promptLabel: 'Текстовый генератор риффов',
    promptPlaceholder: 'Опишите настроение, стиль или фразу (например: Underground warehouse acid, Dark Berlin warehouse...)',
    generateRiffBtn: 'Генерировать кислотный рифф',
    synthesizedRiffTitle: 'СИНТЕЗИРОВАННЫЙ 32-ШАГОВЫЙ ACID РИФФ ИЗ ТЕКСТА:',
    soundOn: 'ЗВУК: ВКЛ',
    soundOff: 'ЗВУК: ВЫКЛ',
    play303: 'ИГРАТЬ 303',
    stop303: 'СТОП 303',
    stepPlaying: 'Шаг {step} звучит',

    // Pattern Manager
    patternManagerHeader: 'Менеджер паттернов и банк ритмов',
    patternManagerSub: 'Сохраняйте и переключайте созданные паттерны с мгновенной загрузкой',
    createNewPattern: 'Новый паттерн',
    deletePatternConfirm: 'Удалить выбранный паттерн?',

    // Analog Crossbar
    analogTitle: 'Аналоговая матрица кроссбаров (Физический чип)',
    analogSubtitle: "Закон Ома (I = V × G) и Правило Кирхгофа (∑ I)",
    analogMidiOut: 'MIDI Выход',
    analogNoMidi: 'Нет MIDI устройств',
    analogReprogram: 'Перепрошить',
    analogTemp: 'Рабочая температура (T)',
    analogDrift: 'Дрейф мемристоров (σ)',
    analogTia: 'Усиление TIA (R_f)',
    analogMatrixCircuit: 'Схема кроссбар-матрицы 8×8',
    analogMatrixSub: 'По горизонтали: напряжение Wordline | По вертикали: ток Bitline',
    analogSwipeHint: '👈 Смахните для просмотра всей матрицы 8×8 👉',
    analogTapHint: 'Нажмите на ячейку или двигайте ползунки напряжения для расчёта Закона Ома в реальном времени',
    analogJoulePower: 'Мощность тепла Джоуля',
    analogEnergyVec: 'Энергия на вектор',
    analogNoiseFloor: 'Уровень теплового шума',
    analogTiaScale: 'Масштаб TIA ОС',
    analogLiquidNitrogen: '200 K (Жидкий азот)',
    analogThermalThrottling: '450 K (Троттлинг)',
    analogIdealMatrix: '0% (Идеальная матрица)',
    analogChaoticOxide: '15% (Хаотичные оксиды)',
    analogLowSens: '5 кОм (Низкая чувств.)',
    analogHighGain: '50 кОм (Высокое усиление)',
  },
  en: {
    // Navigation Bar
    tb303Tab: 'TB-303',
    analogTab: 'Analog Crossbar',
    startAcidBtn: 'START ACID',
    stopAcidBtn: 'STOP',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Y)',
    undoAvailable: 'Available',
    keyboardPianoTitle: 'Computer Keyboard: play notes A-K, shift octaves Z and X. Click for settings.',
    midiSettingsTitle: 'MIDI Settings & MIDI Learn (connect hardware controllers & map CC faders)',
    langToggleTitle: 'Switch Interface Language (RU / EN)',
    
    // Header & Synthesizer
    synthTitle: 'Browser TB-303 Acid Synthesizer',
    dspBadge: '32-BIT DSP',
    staticKnobs: 'Static Knobs',
    staticKnobsActive: 'Static Knobs Locked',
    staticKnobsDesc: 'Lock knobs to steady values without telemetry jitter',
    presetsBtn: 'Presets',
    patternsBtn: 'Patterns',
    exportWavBtn: 'Export WAV',
    exportAbletonBtn: 'Export VST/M4L',
    acidEngineActive: 'ENGINE ACTIVE',
    engineReady: 'ENGINE READY',
    synthSubtitle: 'MICROSCOPIC ELECTRON TRANSPORT & JOHNSON-NYQUIST SYNTHESIS',

    // Knob Labels
    knobCutoff: 'CUTOFF FREQ',
    knobResonance: 'RESONANCE (Q)',
    knobEnvMod: 'ENV MOD',
    knobDecay: 'DECAY TIME',
    knobAccent: 'ACCENT LEVEL',
    knobOverdrive: 'OVERDRIVE',
    knobMorph: 'TR-8S MORPH FILTER',
    knobFlux: 'ELECTRON FLUX',

    // Electron Physics Section
    electronPhysicsTitle: 'Audible Electron Physics & Transport Modes',
    electronPhysicsSubtitle: 'Switch modes for instant sonic texture variation',
    soloElectrons: 'SOLO ELECTRONS',
    auditionSolo: 'AUDITION SOLO',
    soloAuditionTitle: 'Mutes oscillators and isolates only the electron particle stream',
    quantumShotName: 'QUANTUM SHOT',
    quantumShotDesc: '2·q·I — Discrete quantum shot packet crackle on filter.',
    thermalBoltzmannName: 'THERMAL BOLTZMANN',
    thermalBoltzmannDesc: '4·k_B·T — Warm analog pitch drift & thermal hiss.',
    flickerFilamentName: '1/f MEMRISTOR',
    flickerFilamentDesc: 'Low-frequency oxygen vacancy rumble & RTS jumps.',
    avalancheName: 'AVALANCHE',
    avalancheDesc: 'Diode avalanche breakdown, tunnel fuzz & aggressive VCF.',
    bypassCleanName: '⚪ PURE SILICON BYPASS',
    bypassCleanDesc: 'Pure silicon without noise or drift',
    fluxIntensity: 'FLUX INTENSITY:',
    liveMacroTitle: 'Live Macro Physics Shaper',
    tempMacroLabel: 'TEMPERATURE',
    tiaGainMacroLabel: 'TIA GAIN',
    driftMacroLabel: 'MEMRISTOR DRIFT',

    // Morph Filter Section
    morphActive: 'MORPH: ON (ACTIVE)',
    morphBypass: 'MORPH: OFF (BYPASS)',
    bipolarMacro: 'Bipolar Macro Morph Filter',
    morphDisabled: 'BYPASS (OFF) • 100% DRY',
    centerFlat: 'CENTER FLAT (0%)',
    morphPosition: 'MORPH POSITION (BIPOLAR):',
    morphResonance: 'MORPH RESONANCE:',
    warmQ: 'Warm 1.0 Q',
    screamingQ: 'Screaming 24.0 Q',
    vcfVcaControls: 'TB-303 ANALOG VCF & VCA CONTROLS',
    waveform: 'WAVEFORM',
    sawtooth: 'SAWTOOTH',
    square: 'SQUARE',
    rawVcoDiode: 'Raw VCO Diode',
    morphTooltipActive: 'Morph filter active. Click to bypass',
    morphTooltipBypass: 'Morph filter bypassed. Click to activate',
    morphBipolarTooltip: 'Bipolar filter: left LPF, right HPF, center 0% (Flat)',
    jitterTooltipActive: 'Static knobs LOCKED (steady values)',
    jitterTooltipJitter: 'Knob jitter ACTIVE',

    // Sequencer Toolbar
    play: 'Play',
    stop: 'Stop',
    startAcid: 'START ACID',
    stopAcid: 'STOP',
    dspLive: 'DSP LIVE',
    enableDsp: 'ENABLE DSP',
    testSound: 'TEST SOUND',
    testSoundShort: 'Test',
    tempo: 'Tempo',
    scale: 'Scale',
    stepsLength: 'Steps',
    clear: 'Clear',
    clearConfirmTitle: 'Clear all pattern steps',
    waveformSaw: 'Sawtooth',
    waveformSquare: 'Square',
    presetLabel: 'Preset:',
    saveBtn: 'Save',
    deleteBtn: 'Delete',
    exportBtn: 'Export',
    importBtn: 'Import',
    wavExportBtn: 'WAV EXPORT / RECORD',
    rndmBtn: 'Rndm',
    clearBtn: 'Clear',
    octaveKeys: 'Key Octave:',
    stepLength16: '16 STEPS',
    stepLength32: '32 STEPS',

    // Sequencer Views
    viewT8: 'T-8 (TR-REC)',
    viewClassic: 'Classic TB-303',
    classic303Header: 'ORIGINAL STEP PROGRAMMER (PITCH & TIME)',
    classic303Desc: 'Classic step-by-step pitch & timing entry as in original 1982 unit',
    pitchModeTitle: '1. PITCH MODE (NOTE ENTRY)',
    timeModeTitle: '2. TIME MODE (RHYTHMIC ENTRY: NOTE/TIE/REST)',
    rhythmNoteBtn: '🎵 NOTE (16TH TRIG)',
    rhythmNoteDesc: 'Sound note on this step',
    rhythmTieBtn: '🔗 TIE (LEGATO SLIDE)',
    rhythmTieDesc: 'Extend previous note with slide',
    rhythmRestBtn: '⭕ REST (PAUSE)',
    rhythmRestDesc: 'Silent step (pause)',
    backBtn: '◄ Back',
    forwardBtn: 'Forward ►',
    transposeDown: 'DOWN',
    transposeNorm: 'NORM',
    transposeUp: 'UP',
    stepRecordPrompt: 'Step #{step} — Press key to record note and advance:',
    rhythmRecordPrompt: 'Rhythm input for Step #{step} (press button to advance step):',
    fullScale32: 'Full 32-step overview (Click to select):',
    savePatternTitle: 'Save Pattern to Memory',
    patternNameLabel: 'Pattern Name:',
    patternCategoryLabel: 'Category / Style:',
    patternSaveInfo: 'Saves full sequence of notes, accents, slides, tempo and scale. Preserved across reloads and tab changes!',
    cancelBtn: 'Cancel',
    closeBtn: 'Close',
    doneBtn: 'Done',
    
    // Step Grid & Modifier Strip
    stepLabel: 'Step:',
    stepNoteLabel: 'Step note',
    stepTrigOn: 'TRIG ON',
    stepTrig: '● TRIG',
    stepRest: '○ REST',
    stepAcc: 'ACC',
    stepSlide: 'SLIDE',
    stepOctUp: '+8 OCT',
    allOctDown: 'ALL -1 OCT',
    allOctUp: 'ALL +1 OCT',
    bar1Label: 'BAR 1 (STEPS 1–16)',
    bar2Label: 'BAR 2 (STEPS 17–32)',
    bar1Playing: '● BAR 1 PLAYING',
    bar2Playing: '● BAR 2 PLAYING',
    hotkeysGuide: 'Keys:',
    hotkeysStep: 'Step',
    hotkeysRow: 'Track',
    hotkeysToggle: 'Toggle/Delete',
    hotkeysNote: 'Note',
    hotkeysPlay: 'Play',

    // LFO Strip
    lfoOn: 'LFO ON',
    lfoOff: 'LFO OFF',
    lfoSync: 'Sync',
    lfoDepth: 'Depth',
    lfoTurnOn: 'Enable Pitch & Filter LFO',
    lfoTurnOff: 'Disable Pitch & Filter LFO',
    syncGridTitle: 'Sync to step grid',
    lfoDepthTitle: 'Vibrato Depth',
    lfoSliderLabel: 'Slider:',

    // Spatial Pan Filter Strip
    panTitle: 'Stereo Spatial Pan',
    panOff: 'PAN OFF',
    panPingPong: 'P-PONG',
    panDrops: 'DROPS',
    panSpiral: 'SPIRAL',
    panModeOffLabel: '0. Off (Mono / Center)',
    panModePingPongLabel: '1. Ping-Pong Mirror (L/R Bounce)',
    panModeDropsLabel: '2. Rain Drops Scatter (Spatial Points)',
    panModeSpiralLabel: '3. 3D Vortex Spiral (360° Orbit)',
    panTooltip: 'Stereo Spatial Pan: select mirror panning variations (Ping-Pong, Rain Drops, 3D Vortex)',
    panVariations: '3 Variations',

    // Live Recording Floating Badge
    recSession: '● REC LIVE SESSION',
    recSessionDesc: 'Recording audio and all live TB-303 knob tweaks',
    recWindowBtn: 'Recording Window / Stop',

    // History & Logs
    undoLog: 'Undo',
    redoLog: 'Redo',
    patternCleared: 'Pattern cleared',
    
    // Status Bar & Footers
    midiConnected: 'Web MIDI Connected',
    directDspLive: 'DSP Engine Live',

    // MIDI Settings Modal
    midiSettingsHeader: 'MIDI & MIDI Learn Settings',
    midiLearnActiveBadge: '● LEARN ACTIVE',
    midiSettingsSub: 'Connect MIDI keyboards, map faders and play notes',
    tabFaderMapping: 'Fader Mapping (MIDI Learn)',
    tabPcKeyboard: 'PC Keyboard (Piano)',
    tabDevicesMonitor: 'Devices & Monitor',
    quickAssignTitle: 'Quick Physical Knob & Fader Mapping:',
    quickAssignDesc: 'Click LEARN next to any parameter, then turn any knob on your MIDI keyboard. Mapping happens instantly!',
    resetCcBtn: 'Reset CC',
    resetCcTooltip: 'Restore default TB-303 CCs (Cutoff: CC74, Res: CC71...)',
    turnKnobPrompt: 'TURN KNOB...',
    keyboardPlayTitle: 'Play on Computer Keyboard:',
    keyboardPlayDesc: 'Play acid basslines right on your computer keyboard keys! Keys Z and X shift base octave up and down live.',
    currentKeyOctave: 'Current Key Octave:',
    octDownBtn: '[Z] -1 Oct',
    octUpBtn: '+1 Oct [X]',
    keyboardLayoutTitle: 'Key Layout (press keyboard keys to sound notes):',
    midiInputLabel: 'MIDI Input (Keyboards / Controllers)',
    noMidiInput: 'No connected MIDI devices',
    midiOutputLabel: 'MIDI Output (To DAW / Hardware)',
    noMidiOutput: 'No output ports',
    midiStatusLabel: 'Web MIDI API Status:',
    liveMidiStream: 'Live MIDI Stream:',
    waitingMidi: 'Waiting for MIDI messages...',
    learningKnobStatus: '● Turn knob on MIDI controller to map...',
    ccSavedNotice: 'CC mappings are saved automatically in browser storage.',

    // WAV Export Modal
    wavModalHeader: 'Studio WAV Export & Master Bus Recording',
    wavModalSub: 'Record up to 10-minute live session with count-in or instant OfflineAudioContext render',
    tabLiveRecord: 'LIVE RECORDING (UP TO 10 MIN WITH COUNT-IN)',
    tabFastOffline: 'FAST OFFLINE PATTERN RENDER',
    metronomeCountTitle: 'METRONOME PRE-COUNT',
    metronomeCountDesc: 'Quiet metronome clicks ({bpm} BPM) ... Recording will start automatically on step 1!',
    recordingMasterTitle: 'RECORDING MASTER TB-303 AUDIO',
    recordLimit: 'Limit: 10:00 (600s)',
    peakLevelLabel: 'PEAK LEVEL:',
    memorySizeLabel: 'MEMORY SIZE:',
    tweakKnobsHint: '💡 Tweak any knobs: Cutoff, Resonance, Decay, Drive, Temp, Morph. All your live manipulations are recorded directly to file!',
    stopSaveWavBtn: 'STOP & SAVE WAV',
    howLiveRecordWorks: 'HOW LIVE RECORDING UP TO 10 MINUTES WORKS:',
    liveRecordP1: 'A quiet 4..3..2..1 count-in sounds at current tempo ({bpm} BPM).',
    liveRecordP2: 'Immediately after the count, playback and continuous master-bus recording start automatically.',
    liveRecordP3: 'All live sound manipulations are captured: filters, resonance, drive, temp, morph and pattern switching.',
    liveRecordP4: 'Recording duration is up to 10 minutes (600 seconds) with studio-grade PCM WAV output.',
    startLiveRecBtn: 'START LIVE RECORDING WITH COUNT-IN (4..3..2..1)',
    recordCompleted: 'SESSION RECORDING COMPLETED',
    listenPreview: 'Listen to Preview',
    pausePreview: 'Pause',
    wavQualityDesc: 'Stereo 16-bit 44.1 kHz WAV PCM',
    downloadWavBtn: 'DOWNLOAD WAV FILE ({size} MB)',
    recordAgainBtn: 'Record Again',
    offlineRenderTitle: 'INSTANT OFFLINEAUDIOCONTEXT RENDER:',
    offlineRenderDesc: 'Renders the current 16/32-step pattern at maximum CPU speed with zero latency. Includes diode filter emulation, overdrive and current knob settings.',
    renderBarsLabel: 'RENDER DURATION (BARS):',
    renderingProgress: 'RENDERING IN MEMORY VIA OFFLINEAUDIOCONTEXT...',
    renderAndDownloadBtn: 'RENDER & DOWNLOAD WAV (.WAV 16-BIT 44.1kHz)',
    wavSuccessDownloaded: 'Pattern WAV file rendered and downloaded successfully!',
    uncompressedPcmWav: 'Uncompressed studio PCM WAV (compatible with Ableton, FL Studio, Logic, Reaper)',

    // Touchpad
    touchpadTitle: 'Multi-Touchpad Controller (120 FPS Ultra-Speed)',
    touchpadMouseLocked: '● MOUSE LOCKED',
    touchpadSensorActive: '● SENSOR ACTIVE',
    touchpadTouchpad: 'TOUCH / TRACKPAD',
    touchpadSub: 'Any finger movement smoothly alters ALL 6 TB-303 filters with zero latency',
    touchpadLockBtn: 'LOCK TRACKPAD',
    touchpadUnlockBtn: 'RELEASE TRACKPAD (CLICK / ESC)',
    touchpadHoldOn: 'HOLD: values hold steady on release',
    touchpadHoldOff: 'HOLD: returns to center on release',
    multiTouchBoost: 'MULTI-TOUCH: OVERDRIVE BOOST!',
    trackpadCapturedHint: 'TRACKPAD CAPTURED: GLIDE FINGER ACROSS LAPTOP TRACKPAD',
    trackpadExitHint: '[MOUSE CLICK / ESC] EXIT',
    touchpadInstructions: 'Touch anywhere on smartphone screen or glide across laptop trackpad',

    // Text Generator
    promptLabel: 'AI Riff & Groove Generator',
    promptPlaceholder: 'Describe vibe, style or words (e.g. Underground warehouse acid, Dark Berlin warehouse...)',
    generateRiffBtn: 'Generate Acid Riff',
    synthesizedRiffTitle: 'SYNTHESIZED 32-STEP ACID RIFF FROM PROMPT:',
    soundOn: 'AUDIO: ON',
    soundOff: 'AUDIO: OFF',
    play303: 'PLAY 303',
    stop303: 'STOP 303',
    stepPlaying: 'Step {step} playing',

    // Pattern Manager
    patternManagerHeader: 'Pattern Manager & Groove Bank',
    patternManagerSub: 'Save and switch created patterns with instant recall',
    createNewPattern: 'New Pattern',
    deletePatternConfirm: 'Delete selected pattern?',

    // Analog Crossbar
    analogTitle: 'Live Analog Crossbar Array (Physical Hardware Engine)',
    analogSubtitle: "Ohm's Law (I = V × G) & Kirchhoff's Current Law (∑ I)",
    analogMidiOut: 'MIDI Out',
    analogNoMidi: 'No Web MIDI Devices',
    analogReprogram: 'Reprogram',
    analogTemp: 'Operating Temperature (T)',
    analogDrift: 'Memristor Drift Variance (σ)',
    analogTia: 'TIA Feedback Gain (R_f)',
    analogMatrixCircuit: 'Physical 8×8 Crossbar Array Circuit',
    analogMatrixSub: 'Horizontal: Wordline Voltages | Vertical: Bitline Currents',
    analogSwipeHint: '👈 Swipe horizontally to view all 8 bitlines 👉',
    analogTapHint: 'Tap any node or slide voltages on the left to inspect Ohm\'s Law in real-time',
    analogJoulePower: 'Joule Heat Power',
    analogEnergyVec: 'Energy per Vector',
    analogNoiseFloor: 'Thermal Noise Floor',
    analogTiaScale: 'TIA Feedback Scale',
    analogLiquidNitrogen: '200 K (Liquid Nitrogen)',
    analogThermalThrottling: '450 K (Thermal Throttling)',
    analogIdealMatrix: '0% (Ideal Matrix)',
    analogChaoticOxide: '15% (Chaotic Oxide Filament)',
    analogLowSens: '5 kΩ (Low Sens)',
    analogHighGain: '50 kΩ (High Gain Amplification)',
  },
};

export type TranslationKey = keyof typeof TRANSLATIONS['ru'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_LANG_KEY = 'nmx_synth_lang_v1';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LANG_KEY);
      if (stored === 'en' || stored === 'ru') return stored;
    } catch {}
    return 'ru';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  const t = (key: TranslationKey | string): string => {
    const dict = TRANSLATIONS[language] as Record<string, string>;
    const fallbackDict = TRANSLATIONS['ru'] as Record<string, string>;
    return dict?.[key] || fallbackDict?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback safe dummy if used outside provider
    return {
      language: 'ru' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: TranslationKey | string) => (TRANSLATIONS['ru'] as Record<string, string>)[key] || key,
    };
  }
  return ctx;
};
