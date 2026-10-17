import React, { useState } from 'react';
import {
  ArrowDown,
  Check,
  Plus,
  QrCode,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AlarmChain, ChainStep, RegisteredTag } from '../utils/antiCheatRules';

interface ChainManagerModalProps {
  chains: AlarmChain[];
  registeredTags: RegisteredTag[];
  onUpdateChains: (chains: AlarmChain[]) => void;
  onClose: () => void;
}

export const ChainManagerModal: React.FC<ChainManagerModalProps> = ({
  chains,
  registeredTags,
  onUpdateChains,
  onClose,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string>(chains[0]?.id || '');
  const [isCreatingChain, setIsCreatingChain] = useState<boolean>(false);
  const [newChainName, setNewChainName] = useState<string>('Triple Room Sequential Chain');

  const selectedChain = chains.find((c) => c.id === selectedChainId) || chains[0];

  const handleToggleChainActive = (chainId: string) => {
    const updated = chains.map((c) =>
      c.id === chainId ? { ...c, isActive: !c.isActive } : c
    );
    onUpdateChains(updated);
  };

  const handleAddStep = () => {
    if (!selectedChain) return;
    const nextOrder = selectedChain.steps.length;
    const defaultTag =
      registeredTags[nextOrder % registeredTags.length] || registeredTags[0];
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      stepIndex: nextOrder,
      label: `Step ${nextOrder + 1} (${defaultTag?.name || 'Tag'})`,
      targetTagId: defaultTag?.id || '',
      delayMinutesAfterPrev: nextOrder === 0 ? 0 : 10,
    };

    const updated = chains.map((c) => {
      if (c.id === selectedChain.id) {
        return {
          ...c,
          steps: [...c.steps, newStep],
        };
      }
      return c;
    });

    onUpdateChains(updated);
  };

  const handleRemoveStep = (stepId: string) => {
    if (!selectedChain || selectedChain.steps.length <= 1) return;
    const updatedSteps = selectedChain.steps
      .filter((s) => s.id !== stepId)
      .map((s, idx) => ({ ...s, stepIndex: idx }));

    const updated = chains.map((c) => {
      if (c.id === selectedChain.id) {
        return { ...c, steps: updatedSteps };
      }
      return c;
    });
    onUpdateChains(updated);
  };

  const handleStepDelayChange = (stepId: string, delay: number) => {
    if (!selectedChain) return;
    const updated = chains.map((c) => {
      if (c.id === selectedChain.id) {
        return {
          ...c,
          steps: c.steps.map((s) =>
            s.id === stepId ? { ...s, delayMinutesAfterPrev: Math.max(1, delay) } : s
          ),
        };
      }
      return c;
    });
    onUpdateChains(updated);
  };

  const handleStepTagChange = (stepId: string, tagId: string) => {
    if (!selectedChain) return;
    const tag = registeredTags.find((t) => t.id === tagId);
    const updated = chains.map((c) => {
      if (c.id === selectedChain.id) {
        return {
          ...c,
          steps: c.steps.map((s) =>
            s.id === stepId
              ? {
                  ...s,
                  targetTagId: tagId,
                  label: `Step ${s.stepIndex + 1} (${tag?.name || 'Tag'})`,
                }
              : s
          ),
        };
      }
      return c;
    });
    onUpdateChains(updated);
  };

  const handleCreateNewChain = () => {
    if (!newChainName.trim()) return;
    const tag1 = registeredTags[0];
    const tag2 = registeredTags[1] || registeredTags[0];

    const newChain: AlarmChain = {
      id: `chain_${Date.now()}`,
      name: newChainName.trim(),
      initialAlarmHour: 6,
      initialAlarmMinute: 30,
      isActive: true,
      currentStepIndex: 0,
      steps: [
        {
          id: `step_1_${Date.now()}`,
          stepIndex: 0,
          label: `Step 1 (${tag1?.name || 'Tag 1'})`,
          targetTagId: tag1?.id || '',
          delayMinutesAfterPrev: 0,
        },
        {
          id: `step_2_${Date.now()}`,
          stepIndex: 1,
          label: `Step 2 (${tag2?.name || 'Tag 2'})`,
          targetTagId: tag2?.id || '',
          delayMinutesAfterPrev: 8,
        },
      ],
    };

    onUpdateChains([...chains, newChain]);
    setSelectedChainId(newChain.id);
    setIsCreatingChain(false);
    setNewChainName('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chain-manager-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
    >
      <div
        style={{ backgroundColor: 'var(--sw-surface)', borderColor: 'var(--sw-primary)' }}
        className="border rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-white shadow-2xl relative my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sw-secondary) 15%, transparent)',
                color: 'var(--sw-secondary)',
                borderColor: 'color-mix(in srgb, var(--sw-secondary) 35%, transparent)',
              }}
              className="p-2 rounded-xl border"
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="chain-manager-title" className="text-base sm:text-lg font-bold text-white">
                Sequential Wake-Up Chains
              </h2>
              <p className="text-xs text-gray-400">
                Link multiple rooms consecutively to prevent falling back to sleep
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Chain Manager"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chain selector pills */}
        <div className="py-3.5 flex items-center justify-between border-b border-gray-800 gap-2">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pr-2">
            {chains.map((chain) => {
              const isSelected = selectedChain?.id === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                      : { backgroundColor: 'var(--sw-bg)' }
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isSelected
                      ? 'shadow-sm'
                      : 'text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {chain.name} ({chain.steps.length})
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsCreatingChain(!isCreatingChain)}
            style={{ backgroundColor: 'var(--sw-bg)', color: 'var(--sw-accent)' }}
            className="py-1.5 px-3 rounded-xl border border-gray-700 text-xs font-bold shrink-0 flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chain</span>
          </button>
        </div>

        {/* Create Chain Form */}
        {isCreatingChain && (
          <div
            style={{ backgroundColor: 'var(--sw-bg)', borderColor: 'var(--sw-primary)' }}
            className="my-4 p-3.5 rounded-xl border flex items-center space-x-2.5"
          >
            <input
              type="text"
              placeholder="Chain Name (e.g. Bedroom to Kitchen)"
              value={newChainName}
              onChange={(e) => setNewChainName(e.target.value)}
              style={{ backgroundColor: 'var(--sw-surface)' }}
              className="flex-1 border border-gray-700 rounded-lg py-2 px-3 text-xs text-white outline-none"
            />
            <button
              onClick={handleCreateNewChain}
              style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
              className="py-2 px-4 font-bold text-xs rounded-lg"
            >
              Create
            </button>
          </div>
        )}

        {/* Steps Timeline Builder */}
        {selectedChain && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4
                  style={{ color: 'var(--sw-primary)' }}
                  className="text-sm font-bold flex items-center gap-1.5"
                >
                  <span>{selectedChain.name}</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Subsequent alarms trigger automatically after delay once previous tag is scanned.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleChainActive(selectedChain.id)}
                style={
                  selectedChain.isActive
                    ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                    : { backgroundColor: 'var(--sw-bg)' }
                }
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
                  selectedChain.isActive ? 'border-transparent' : 'border-gray-700 text-gray-300'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{selectedChain.isActive ? 'Chain Enabled' : 'Enable Chain'}</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {selectedChain.steps.map((step, idx) => {
                const isFirst = idx === 0;
                return (
                  <div key={step.id} className="relative">
                    {!isFirst && (
                      <div className="flex items-center justify-center my-1">
                        <div
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="flex items-center space-x-2 py-1 px-3 rounded-full border border-gray-800 text-[11px] text-gray-400"
                        >
                          <ArrowDown
                            className="w-3 h-3"
                            style={{ color: 'var(--sw-primary)' }}
                          />
                          <span>Wait</span>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={step.delayMinutesAfterPrev}
                            onChange={(e) =>
                              handleStepDelayChange(step.id, parseInt(e.target.value) || 5)
                            }
                            style={{
                              backgroundColor: 'var(--sw-surface)',
                              color: 'var(--sw-primary)',
                            }}
                            className="w-10 text-center font-bold rounded py-0.5 border border-gray-700"
                          />
                          <span>mins after Step {idx} verified</span>
                        </div>
                      </div>
                    )}

                    <div
                      style={{ backgroundColor: 'var(--sw-bg)' }}
                      className="p-3.5 rounded-xl border border-gray-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--sw-primary) 15%, transparent)',
                            color: 'var(--sw-primary)',
                            borderColor:
                              'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
                          }}
                          className="w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0"
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-white truncate">
                            {isFirst ? 'Initial Wake-Up' : `Follow-Up Step ${idx + 1}`}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <QrCode
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--sw-accent)' }}
                            />
                            <select
                              value={step.targetTagId}
                              onChange={(e) => handleStepTagChange(step.id, e.target.value)}
                              style={{
                                backgroundColor: 'var(--sw-surface)',
                                color: 'var(--sw-accent)',
                              }}
                              className="border border-gray-700 rounded px-2 py-1 text-xs font-medium outline-none cursor-pointer max-w-[200px] truncate"
                            >
                              {registeredTags.map((tag) => (
                                <option key={tag.id} value={tag.id}>
                                  {tag.name} ({tag.location})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {selectedChain.steps.length > 1 && (
                        <button
                          onClick={() => handleRemoveStep(step.id)}
                          aria-label={`Remove step ${idx + 1}`}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                onClick={handleAddStep}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-[var(--sw-primary)] text-gray-400 hover:text-white text-xs font-semibold transition flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Next Location Step to Chain</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
