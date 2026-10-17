import React, { useState } from 'react';
import {
  ArrowDown,
  CheckCircle,
  Clock,
  Layers,
  Play,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { AlarmChain, ChainStep, RegisteredTag } from '../utils/antiCheatRules';

interface ChainManagerModalProps {
  chains: AlarmChain[];
  registeredTags: RegisteredTag[];
  onUpdateChains: (chains: AlarmChain[]) => void;
  onSimulateChain: (chain: AlarmChain) => void;
  onClose: () => void;
}

export const ChainManagerModal: React.FC<ChainManagerModalProps> = ({
  chains,
  registeredTags,
  onUpdateChains,
  onSimulateChain,
  onClose,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string>(chains[0]?.id || '');
  const [isCreatingChain, setIsCreatingChain] = useState<boolean>(false);
  const [newChainName, setNewChainName] = useState<string>('Triple Room Sequential Chain');

  const selectedChain = chains.find((c) => c.id === selectedChainId) || chains[0];

  const handleAddStep = () => {
    if (!selectedChain) return;
    const nextOrder = selectedChain.steps.length;
    const defaultTag = registeredTags[nextOrder % registeredTags.length] || registeredTags[0];
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
      isActive: false,
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#1C232B] border border-[#4ADEDE]/30 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#64CCC5]/10 text-[#64CCC5] rounded-xl border border-[#64CCC5]/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="chain-manager-title" className="text-lg font-bold text-white">Sequential Wake-Up Chains</h2>
              <p className="text-xs text-gray-400">
                Prevents falling back to sleep by linking multiple rooms consecutively
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chain selector pills */}
        <div className="py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-2 overflow-x-auto pr-2">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChainId(chain.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedChain?.id === chain.id
                    ? 'bg-[#4ADEDE] text-[#0B0E11] shadow-[0_0_12px_rgba(74,222,222,0.3)]'
                    : 'bg-[#0B0E11] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {chain.name} ({chain.steps.length} Steps)
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreatingChain(!isCreatingChain)}
            className="py-1.5 px-3 rounded-xl bg-[#0B0E11] hover:bg-[#26303B] text-[#7DE2D1] border border-[#7DE2D1]/40 text-xs font-bold shrink-0 flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chain</span>
          </button>
        </div>

        {/* Create Chain Form */}
        {isCreatingChain && (
          <div className="my-4 p-4 rounded-xl bg-[#0B0E11] border border-[#4ADEDE]/40 flex items-center space-x-3">
            <input
              type="text"
              placeholder="Chain Name (e.g. Master Bedroom to Kitchen)"
              value={newChainName}
              onChange={(e) => setNewChainName(e.target.value)}
              className="flex-1 bg-[#1C232B] border border-gray-700 rounded-lg py-2 px-3 text-xs text-white outline-none"
            />
            <button
              onClick={handleCreateNewChain}
              className="py-2 px-4 bg-[#64CCC5] text-[#0B0E11] font-bold text-xs rounded-lg hover:bg-[#7DE2D1]"
            >
              Create Chain
            </button>
          </div>
        )}

        {/* Steps Timeline Builder */}
        {selectedChain && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="text-[#4ADEDE]">{selectedChain.name}</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Step 1 starts at alarm time. Subsequent alarms trigger after delay once previous tag is scanned.
                </p>
              </div>

              <button
                onClick={() => onSimulateChain(selectedChain)}
                className="py-2 px-3.5 rounded-xl bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold transition flex items-center space-x-1.5 shadow-[0_0_15px_rgba(100,204,197,0.3)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Chain Start</span>
              </button>
            </div>

            {/* Steps list with visual connectors */}
            <div className="space-y-3">
              {selectedChain.steps.map((step, idx) => {
                const boundTag = registeredTags.find((t) => t.id === step.targetTagId);
                const isFirst = idx === 0;

                return (
                  <div key={step.id} className="relative">
                    {!isFirst && (
                      <div className="flex items-center justify-center my-1">
                        <div className="flex items-center space-x-2 py-1 px-3 bg-[#0B0E11] rounded-full border border-gray-800 text-[11px] text-gray-400">
                          <ArrowDown className="w-3 h-3 text-[#4ADEDE]" />
                          <span>Wait</span>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={step.delayMinutesAfterPrev}
                            onChange={(e) =>
                              handleStepDelayChange(step.id, parseInt(e.target.value) || 5)
                            }
                            className="w-10 bg-[#1C232B] text-center text-[#4ADEDE] font-bold rounded py-0.5 border border-gray-700"
                          />
                          <span>mins after Step {idx} verified</span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-[#0B0E11] border border-gray-800 hover:border-gray-700 transition flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-8 h-8 rounded-full bg-[#4ADEDE]/10 text-[#4ADEDE] border border-[#4ADEDE]/40 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">
                            {isFirst ? 'Initial Wake-Up' : `Follow-Up Step ${idx + 1}`}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <QrCode className="w-3.5 h-3.5 text-[#7DE2D1]" />
                            <select
                              value={step.targetTagId}
                              onChange={(e) => handleStepTagChange(step.id, e.target.value)}
                              className="bg-[#1C232B] border border-gray-700 rounded px-2 py-1 text-xs text-[#7DE2D1] font-medium outline-none cursor-pointer"
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
                          className="p-1.5 text-gray-500 hover:text-red-400 transition"
                          title="Remove Step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Step Button */}
            <div className="mt-4">
              <button
                onClick={handleAddStep}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-[#4ADEDE] text-gray-400 hover:text-[#4ADEDE] text-xs font-semibold transition flex items-center justify-center space-x-2"
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
