import React from 'react';
import { Loader2 } from 'lucide-react';
import type { KnownFace } from '@shared/types/face';

interface LabelingFormProps {
  selectedFacesCount: number;
  handleSelectAll: () => void;
  labelMode: 'existing' | 'new';
  setLabelMode: (mode: 'existing' | 'new') => void;
  selectedKnownFace: string;
  setSelectedKnownFace: (name: string) => void;
  knownFaces: KnownFace[];
  newFaceName: string;
  setNewFaceName: (name: string) => void;
  handleLabelFaces: () => void;
  isLabeling: boolean;
  unknownFacesCount: number;
}

export const LabelingForm: React.FC<LabelingFormProps> = ({
  selectedFacesCount,
  handleSelectAll,
  labelMode,
  setLabelMode,
  selectedKnownFace,
  setSelectedKnownFace,
  knownFaces,
  newFaceName,
  setNewFaceName,
  handleLabelFaces,
  isLabeling,
  unknownFacesCount,
}) => {
  return (
    <div className="bg-zinc-900/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold">Label Faces</h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedFacesCount} of {unknownFacesCount} selected
          </p>
        </div>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          {selectedFacesCount === unknownFacesCount ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Method</label>
          <div className="inline-flex gap-1 p-1 bg-black/40 rounded-full w-full">
            <button
              onClick={() => setLabelMode('existing')}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-full transition-all duration-300 ${
                labelMode === 'existing'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Existing Name
            </button>
            <button
              onClick={() => setLabelMode('new')}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-full transition-all duration-300 ${
                labelMode === 'new'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              New Name
            </button>
          </div>
        </div>

        {labelMode === 'existing' ? (
          <div>
            <label htmlFor="known-face-select" className="block text-sm font-medium text-gray-400 mb-3">
              Select Person
            </label>
            <select
              id="known-face-select"
              value={selectedKnownFace}
              onChange={(e) => setSelectedKnownFace(e.target.value)}
              className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '3rem'
              }}
            >
              <option value="" className="bg-zinc-900">Choose a person...</option>
              {knownFaces.map((face) => (
                <option key={face.name} value={face.name} className="bg-zinc-900">
                  {face.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="new-face-name" className="block text-sm font-medium text-gray-400 mb-3">
              Person's Name
            </label>
            <input
              id="new-face-name"
              type="text"
              placeholder="Enter name"
              value={newFaceName}
              onChange={(e) => setNewFaceName(e.target.value)}
              className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
        )}

        <button
          onClick={handleLabelFaces}
          disabled={
            selectedFacesCount === 0 ||
            isLabeling ||
            (labelMode === 'existing' && !selectedKnownFace) ||
            (labelMode === 'new' && !newFaceName.trim())
          }
          className="w-full px-6 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg disabled:shadow-none"
        >
          {isLabeling ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Labeling...
            </>
          ) : (
            `Label ${selectedFacesCount} Face${selectedFacesCount !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
};