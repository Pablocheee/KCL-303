/**
 * Pattern Manager Section (src/components/PatternManagerSection.tsx)
 * 
 * Manages 16/32-Step Acid Patterns with LocalStorage Persistence,
 * Pattern Library, Quick Save, Delete, and Export/Import.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Trash2,
  Plus,
  Sparkles,
  Download,
  Upload,
  Check,
  Music,
  ListMusic,
  Sliders,
  Layers,
  FileCode,
  Gauge,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { SavedPattern, PatternManager } from '../engine/pattern_manager';
import { SCALES, ScaleName } from '../engine/neural_303_types';

export const PatternManagerSection: React.FC = React.memo(() => {
  const { t } = useLanguage();
  const {
    patternList,
    activePatternId,
    saveUserPattern,
    loadSavedPattern,
    deleteSavedPattern,
    stepLength,
    setStepLength,
    clearPattern,
    generateNewPattern,
    scale,
    setScale,
    bpm,
    setBpm,
    pattern,
  } = useEngine();

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternCategory, setNewPatternCategory] = useState('User Acid');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTapFlashing, setIsTapFlashing] = useState(false);
  const [bpmInputStr, setBpmInputStr] = useState<string>(() => String(bpm));

  useEffect(() => {
    setBpmInputStr(String(bpm));
  }, [bpm]);

  const tapTimesRef = useRef<number[]>([]);

  const handleTapBpm = () => {
    const now = performance.now();
    const times = tapTimesRef.current;

    // Reset if previous tap was more than 2.5s ago
    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      times.length = 0;
    }

    times.push(now);
    if (times.length > 5) {
      times.shift();
    }

    // Flash tap button
    setIsTapFlashing(true);
    setTimeout(() => setIsTapFlashing(false), 120);

    if (times.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < times.length; i++) {
        totalDiff += times[i] - times[i - 1];
      }
      const avgDiffMs = totalDiff / (times.length - 1);
      if (avgDiffMs > 0) {
        const calculated = Math.round(60000 / avgDiffMs);
        const clamped = Math.max(60, Math.min(220, calculated));
        setBpm(clamped);
      }
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatternName.trim()) return;
    saveUserPattern(newPatternName.trim(), newPatternCategory.trim());
    setIsSaveModalOpen(false);
    setNewPatternName('');
    showToast(`Паттерн "${newPatternName}" сохранен в память!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Удалить сохраненный паттерн "${name}"?`)) {
      deleteSavedPattern(id);
      showToast(`Паттерн "${name}" удален.`);
    }
  };

  const handleExportJson = () => {
    const data = PatternManager.exportPatternsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural_303_patterns_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Паттерны экспортированы в JSON');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const count = PatternManager.importPatternsJson(content);
      if (count > 0) {
        showToast(`Успешно импортировано ${count} паттернов!`);
      } else {
        showToast('Ошибка при импорте JSON');
      }
    };
    reader.readAsText(file);
  };

  const currentPatternObj = patternList.find((p) => p.id === activePatternId);

  return (
    <div className="bg-slate-950 rounded-xl p-3 sm:p-4 border-2 border-slate-700 text-white font-mono text-xs shadow-2xl space-y-3 max-w-full overflow-hidden box-border">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-amber-400 font-black uppercase text-xs">
            <ListMusic className="w-4 h-4 text-amber-400" />
            <span>Acid Pattern Storage & Memory:</span>
          </div>

          {/* Quick Pattern Dropdown */}
          <div className="flex items-center gap-1.5 max-w-full">
            <select
              value={activePatternId || ''}
              onChange={(e) => {
                const found = patternList.find((p) => p.id === e.target.value);
                if (found) loadSavedPattern(found);
              }}
              className="bg-slate-900 border border-slate-700 text-amber-300 font-bold px-2 py-1 rounded focus:outline-none cursor-pointer max-w-[200px] sm:max-w-xs truncate text-xs"
            >
              <optgroup label="🔊 Tekno (162-168 BPM)" className="bg-slate-950 text-purple-400">
                {patternList
                  .filter((p) => p.isFactory && (p.category.includes('Tekno') || p.category.includes('Hardtek')))
                  .map((pat) => (
                    <option key={pat.id} value={pat.id} className="bg-slate-900 text-slate-100">
                      [{pat.bpm} BPM] {pat.name}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="⚡ Acidcore (165-174 BPM)" className="bg-slate-950 text-amber-400">
                {patternList
                  .filter((p) => p.isFactory && (p.category.includes('Acidcore') || p.category.includes('Acid')))
                  .map((pat) => (
                    <option key={pat.id} value={pat.id} className="bg-slate-900 text-slate-100">
                      [{pat.bpm} BPM] {pat.name}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="🔥 Tribcore (180-190 BPM)" className="bg-slate-950 text-rose-400">
                {patternList
                  .filter((p) => p.isFactory && p.category.includes('Tribcore'))
                  .map((pat) => (
                    <option key={pat.id} value={pat.id} className="bg-slate-900 text-slate-100">
                      [{pat.bpm} BPM] {pat.name}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="💀 Gabba / Hardcore (185-190 BPM)" className="bg-slate-950 text-red-400">
                {patternList
                  .filter((p) => p.isFactory && p.category.includes('Gabba'))
                  .map((pat) => (
                    <option key={pat.id} value={pat.id} className="bg-slate-900 text-slate-100">
                      [{pat.bpm} BPM] {pat.name}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="🤖 Electro / Detroit 808 (128-132 BPM)" className="bg-slate-950 text-cyan-400">
                {patternList
                  .filter((p) => p.isFactory && p.category.includes('Electro'))
                  .map((pat) => (
                    <option key={pat.id} value={pat.id} className="bg-slate-900 text-slate-100">
                      [{pat.bpm} BPM] {pat.name}
                    </option>
                  ))}
              </optgroup>

              {patternList.some((p) => !p.isFactory) && (
                <optgroup label="💾 Мои сохраненные паттерны" className="bg-slate-950 text-emerald-400">
                  {patternList
                    .filter((p) => !p.isFactory)
                    .map((pat) => (
                      <option key={pat.id} value={pat.id} className="bg-slate-900 text-emerald-200">
                        [{pat.stepLength || 32} Step / {pat.bpm} BPM] {pat.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Pattern Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Save Pattern Button */}
          <button
            onClick={() => {
              setNewPatternName(`My Acid Pattern ${patternList.filter((p) => !p.isFactory).length + 1}`);
              setIsSaveModalOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow"
            title="Сохранить текущий 32-шаговый паттерн в память браузера (localStorage)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Сохранить паттерн</span>
          </button>

          {/* Delete Active User Pattern */}
          {currentPatternObj && !currentPatternObj.isFactory && (
            <button
              onClick={() => handleDelete(currentPatternObj.id, currentPatternObj.name)}
              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold transition cursor-pointer flex items-center gap-1"
              title="Удалить текущий пользовательский паттерн"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Экспортировать банк паттернов в .json"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Экспорт</span>
          </button>

          {/* Import JSON */}
          <label
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Импортировать паттерны из .json"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden sm:inline">Импорт</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* Pattern Settings Strip (Scale, BPM + TAP, Generate AI, Clear) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Scale & BPM Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-bold">Scale:</span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value as ScaleName)}
              className="bg-slate-900 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded focus:outline-none cursor-pointer text-xs"
            >
              {Object.entries(SCALES).map(([key, sc]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold">BPM:</span>

            {/* Quick -1 / -5 BPM Button */}
            <button
              type="button"
              onClick={(e) => {
                const delta = e.shiftKey ? 5 : 1;
                const nextBpm = Math.max(40, bpm - delta);
                setBpm(nextBpm);
              }}
              className="w-5 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-black border border-slate-700 flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
              title="-1 BPM (с зажатым Shift: -5 BPM)"
            >
              -
            </button>

            <input
              type="number"
              min="40"
              max="260"
              value={bpmInputStr}
              onChange={(e) => {
                const raw = e.target.value;
                setBpmInputStr(raw);
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed) && parsed >= 40 && parsed <= 260) {
                  setBpm(parsed);
                }
              }}
              onBlur={() => {
                const parsed = parseInt(bpmInputStr, 10);
                if (isNaN(parsed) || parsed < 40) {
                  setBpm(40);
                  setBpmInputStr('40');
                } else if (parsed > 260) {
                  setBpm(260);
                  setBpmInputStr('260');
                } else {
                  setBpm(parsed);
                  setBpmInputStr(String(parsed));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-14 bg-slate-900 border border-slate-700 text-amber-400 font-bold text-center py-1 rounded focus:outline-none focus:border-amber-500 text-xs"
            />

            {/* Quick +1 / +5 BPM Button */}
            <button
              type="button"
              onClick={(e) => {
                const delta = e.shiftKey ? 5 : 1;
                const nextBpm = Math.min(260, bpm + delta);
                setBpm(nextBpm);
              }}
              className="w-5 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-black border border-slate-700 flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
              title="+1 BPM (с зажатым Shift: +5 BPM)"
            >
              +
            </button>

            {/* TAP BPM BUTTON */}
            <button
              type="button"
              onClick={handleTapBpm}
              className={`px-2.5 py-1 rounded font-black text-[11px] transition cursor-pointer flex items-center gap-1 border shadow ${
                isTapFlashing
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)] scale-95'
                  : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/50'
              }`}
              title="Tap Tempo: нажимайте несколько раз в ритм песни для мгновенного определения и смены BPM"
            >
              <Gauge className="w-3 h-3" />
              <span>TAP</span>
            </button>
          </div>
        </div>

        {/* AI Generator & Clear Steps */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={generateNewPattern}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 shadow"
            title="Сгенерировать случайный acid-паттерн (Rndm)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rndm</span>
          </button>

          <button
            onClick={clearPattern}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
            title="Очистить все ноты паттерна"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-white font-mono"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>{t('savePatternTitle')}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">{t('patternNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={newPatternName}
                  onChange={(e) => setNewPatternName(e.target.value)}
                  placeholder="e.g. Hard Acid 32-Step Groove"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">{t('patternCategoryLabel')}</label>
                <input
                  type="text"
                  value={newPatternCategory}
                  onChange={(e) => setNewPatternCategory(e.target.value)}
                  placeholder="Acid Techno / Hardfloor / Trance"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
                {t('patternSaveInfo')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-bold text-xs"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('saveBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});
