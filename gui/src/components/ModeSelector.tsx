/**
 * Mode Selector Component
 * Компонент выбора режима работы: Разработка, Юрист, Продавец
 * คอมโพเนนต์เลือกโหมดการทำงาน: การพัฒนา ทนายความ พนักงานขาย
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/Language';

export type WorkMode = 'developer' | 'lawyer' | 'seller';

interface ModeSelectorProps {
  value?: WorkMode;
  onChange?: (mode: WorkMode) => void;
  className?: string;
}

interface ModeInfo {
  name: string;
  short: string;
  description: string;
  icon: string;
  tooltip: string;
}

const MODES: WorkMode[] = ['developer', 'lawyer', 'seller'];

export function ModeSelector({ value, onChange, className = '' }: ModeSelectorProps) {
  const { t, language } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<WorkMode>(value || 'developer');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved mode from localStorage
    const saved = localStorage.getItem('prodolzhi_starets_mode') as WorkMode;
    if (saved && MODES.includes(saved)) {
      setSelectedMode(saved);
      onChange?.(saved);
    }
  }, []);

  const handleModeChange = (mode: WorkMode) => {
    setSelectedMode(mode);
    localStorage.setItem('prodolzhi_starets_mode', mode);
    onChange?.(mode);
    setIsOpen(false);
  };

  const getModeInfo = (mode: WorkMode): ModeInfo => {
    return {
      name: t(`modes.${mode}.name`),
      short: t(`modes.${mode}.short`),
      description: t(`modes.${mode}.description`),
      icon: t(`modes.${mode}.icon`),
      tooltip: t(`modes.${mode}.tooltip`)
    };
  };

  const currentMode = getModeInfo(selectedMode);

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 transition-all duration-200 shadow-lg min-w-[240px]"
        title={currentMode.tooltip}
        aria-label={`${t('modes.title')}: ${currentMode.name}`}
      >
        {/* Icon */}
        <span className="text-2xl" role="img" aria-label={currentMode.name}>
          {currentMode.icon}
        </span>

        {/* Mode Name */}
        <div className="flex-1 text-left">
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {t('modes.title')}
          </div>
          <div className="text-sm font-semibold text-white">
            {currentMode.name}
          </div>
        </div>

        {/* Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-20 overflow-hidden">
            {MODES.map((mode) => {
              const modeInfo = getModeInfo(mode);
              const isSelected = mode === selectedMode;

              return (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`w-full flex items-start gap-3 px-4 py-3 transition-colors duration-150 ${
                    isSelected
                      ? 'bg-blue-600/20 border-l-4 border-blue-500'
                      : 'hover:bg-gray-800 border-l-4 border-transparent'
                  }`}
                  title={modeInfo.tooltip}
                >
                  {/* Icon */}
                  <span className="text-2xl mt-1" role="img" aria-label={modeInfo.name}>
                    {modeInfo.icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <div className={`font-semibold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                      {modeInfo.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {modeInfo.description}
                    </div>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-blue-500 mt-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function CompactModeSelector({ value, onChange }: ModeSelectorProps) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<WorkMode>(value || 'developer');

  const handleModeChange = (mode: WorkMode) => {
    setSelectedMode(mode);
    localStorage.setItem('prodolzhi_starets_mode', mode);
    onChange?.(mode);
  };

  const getModeIcon = (mode: WorkMode): string => {
    return t(`modes.${mode}.icon`);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
      {MODES.map((mode) => {
        const isSelected = mode === selectedMode;
        const icon = getModeIcon(mode);
        const name = t(`modes.${mode}.short`);

        return (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={t(`modes.${mode}.tooltip`)}
            aria-label={name}
          >
            <span className="text-lg" role="img">
              {icon}
            </span>
            <span className="text-xs font-medium hidden md:inline">
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Hook for using mode in components
export function useWorkMode() {
  const [mode, setMode] = useState<WorkMode>(() => {
    const saved = localStorage.getItem('prodolzhi_starets_mode') as WorkMode;
    return saved && MODES.includes(saved) ? saved : 'developer';
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'prodolzhi_starets_mode' && e.newValue) {
        const newMode = e.newValue as WorkMode;
        if (MODES.includes(newMode)) {
          setMode(newMode);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setWorkMode = (newMode: WorkMode) => {
    setMode(newMode);
    localStorage.setItem('prodolzhi_starets_mode', newMode);
  };

  return { mode, setMode: setWorkMode };
}

// Helper functions for mode-specific behavior
export const getModeSystemPrompt = (mode: WorkMode, language: 'ru' | 'th'): string => {
  const prompts = {
    developer: {
      ru: `Ты опытный разработчик-наставник. Твоя задача - помогать в написании качественного кода, рефакторинге, отладке и архитектурных решениях. Объясняй концепции просто и понятно, предлагай лучшие практики, помогай находить и исправлять ошибки. Будь терпеливым и внимательным учителем.`,
      th: `คุณเป็นนักพัฒนาที่มีประสบการณ์และเป็นที่ปรึกษา งานของคุณคือช่วยเหลือในการเขียนโค้ดที่มีคุณภาพ รีแฟคเตอร์ ดีบัก และตัดสินใจเชิงสถาปัตยกรรม อธิบายแนวคิดอย่างเรียบง่ายและเข้าใจง่าย เสนอแนวทางปฏิบัติที่ดีที่สุด ช่วยค้นหาและแก้ไขข้อผิดพลาด เป็นครูที่อดทนและใส่ใจ`
    },
    lawyer: {
      ru: `Ты мудрый юридический консультант и помощник в жизненных ситуациях. Твоя задача - помочь человеку понять его ситуацию, найти возможные решения, объяснить правовые аспекты простым языком. Ты можешь искать информацию в интернете для актуальных данных. Задавай уточняющие вопросы, чтобы глубже понять проблему. Будь эмпатичным и поддерживающим, но объективным. Напоминай, что не заменяешь профессионального юриста.`,
      th: `คุณเป็นที่ปรึกษาทางกฎหมายที่ฉลาดและผู้ช่วยในสถานการณ์ชีวิต งานของคุณคือช่วยให้ผู้คนเข้าใจสถานการณ์ของตน ค้นหาทางออกที่เป็นไปได้ อธิบายแง่มุมทางกฎหมายด้วยภาษาที่เรียบง่าย คุณสามารถค้นหาข้อมูลทางอินเทอร์เน็ตเพื่อข้อมูลที่เป็นปัจจุบัน ถามคำถามเพื่อความชัดเจนเพื่อเข้าใจปัญหาลึกซึ้งยิ่งขึ้น มีความเห็นอกเห็นใจและสนับสนุน แต่เป็นกลาง เตือนว่าคุณไม่ได้แทนที่ทนายความมืออาชีพ`
    },
    seller: {
      ru: `Ты опытный консультант по продажам, который работает через понимание и закрытие потребностей клиента. Твоя задача - задавать правильные вопросы, чтобы глубоко понять, что действительно нужно клиенту. Не навязывай, не "толкай" продукт. Вместо этого помогай клиенту самому прийти к правильному решению. Предлагай решения только тогда, когда точно понял потребность. Будь искренним, эмпатичным и фокусируйся на создании долгосрочных отношений, а не на быстрой сделке.`,
      th: `คุณเป็นที่ปรึกษาด้านการขายที่มีประสบการณ์ซึ่งทำงานผ่านการเข้าใจและตอบสนองความต้องการของลูกค้า งานของคุณคือถามคำถามที่ถูกต้องเพื่อเข้าใจอย่างลึกซึ้งว่าลูกค้าต้องการอะไรจริงๆ อย่าบังคับหรือ "ผลักดัน" ผลิตภัณฑ์ แต่ช่วยให้ลูกค้าตัดสินใจที่ถูกต้องด้วยตัวเอง เสนอทางแก้ไขเมื่อคุณเข้าใจความต้องการอย่างแน่ชัด ซื่อสัตย์ เห็นอกเห็นใจ และมุ่งเน้นการสร้างความสัมพันธ์ระยะยาว ไม่ใช่ข้อตกลงรวดเร็ว`
    }
  };

  return prompts[mode][language];
};

export const getModeCapabilities = (mode: WorkMode): string[] => {
  const capabilities = {
    developer: [
      'code_editing',
      'refactoring',
      'debugging',
      'testing',
      'documentation',
      'code_review'
    ],
    lawyer: [
      'web_search',
      'document_analysis',
      'legal_research',
      'situation_analysis',
      'advice_generation'
    ],
    seller: [
      'needs_analysis',
      'product_matching',
      'objection_handling',
      'relationship_building',
      'consultation'
    ]
  };

  return capabilities[mode];
};

