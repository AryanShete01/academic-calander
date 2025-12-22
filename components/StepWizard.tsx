import React, { useState, useEffect } from 'react';
import { BoardType, GRADES, UserState } from '../types';
import { fetchSubjects, fetchTopics } from '../services/geminiService';
import { Loader2, CheckCircle2, Circle, AlertCircle, BookOpen, Calendar, Clock, BarChart } from 'lucide-react';

interface WizardProps {
  state: UserState;
  setState: React.Dispatch<React.SetStateAction<UserState>>;
  onNext: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

// ----------------------------------------------------------------------
// Step 1: Board & Grade Selection
// ----------------------------------------------------------------------
export const Step1Board: React.FC<WizardProps> = ({ state, setState, onNext }) => {
  const handleBoardSelect = (board: BoardType) => {
    setState(prev => ({ ...prev, board }));
  };

  const isValid = state.board && state.grade && (state.board !== BoardType.STATE || state.stateName.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Select Your Board & Class</h2>
        <p className="text-gray-500">Let's start by defining your curriculum.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(BoardType).map((b) => (
          <button
            key={b}
            onClick={() => handleBoardSelect(b)}
            className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
              state.board === b
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <span className="font-medium">{b}</span>
            {state.board === b && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
          </button>
        ))}
      </div>

      {state.board === BoardType.STATE && (
        <div className="mt-4 animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 mb-1">Enter State Name</label>
          <input
            type="text"
            value={state.stateName}
            onChange={(e) => setState(prev => ({ ...prev, stateName: e.target.value }))}
            placeholder="e.g. Karnataka, Tamil Nadu"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Class / Grade</label>
        <select
          value={state.grade}
          onChange={(e) => setState(prev => ({ ...prev, grade: e.target.value }))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">-- Select Grade --</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-2">Required to fetch the correct subjects.</p>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all mt-6 ${
          isValid ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        Continue to Subjects
      </button>
    </div>
  );
};

// ----------------------------------------------------------------------
// Step 2: Subject Selection
// ----------------------------------------------------------------------
export const Step2Subjects: React.FC<WizardProps> = ({ state, setState, onNext, onBack }) => {
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!state.board || !state.grade) return;
      setLoading(true);
      const subjects = await fetchSubjects(state.board, state.grade, state.stateName);
      setAvailableSubjects(subjects);
      setLoading(false);
    };
    loadSubjects();
  }, [state.board, state.grade, state.stateName]);

  const toggleSubject = (subject: string) => {
    setState(prev => {
      const selected = prev.selectedSubjects.includes(subject)
        ? prev.selectedSubjects.filter(s => s !== subject)
        : [...prev.selectedSubjects, subject];
      return { ...prev, selectedSubjects: selected };
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Select Subjects</h2>
        <p className="text-gray-500">Which subjects do you want to include in your plan?</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500">Fetching board-specific subjects...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2">
          {availableSubjects.map((subject) => (
            <button
              key={subject}
              onClick={() => toggleSubject(subject)}
              className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                state.selectedSubjects.includes(subject)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium text-sm">{subject}</span>
              {state.selectedSubjects.includes(subject) ? (
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Back</button>
        <button
          onClick={onNext}
          disabled={state.selectedSubjects.length === 0 || loading}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
            state.selectedSubjects.length > 0 && !loading ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          View Topics
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Step 3: Syllabus / Topics Display
// ----------------------------------------------------------------------
export const Step3Topics: React.FC<WizardProps> = ({ state, setState, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTopics = async () => {
      // Only fetch if we haven't already or if subjects changed (simplified check: if syllabus empty)
      if (Object.keys(state.syllabusTopics).length > 0) return;
      
      setLoading(true);
      const topics = await fetchTopics(state.board!, state.grade, state.selectedSubjects, state.stateName);
      setState(prev => ({ ...prev, syllabusTopics: topics }));
      setLoading(false);
    };
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
       <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Syllabus</h2>
        <p className="text-gray-500">We've retrieved the official topics. Review them below.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500">Mapping official syllabus topics...</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
          {Object.entries(state.syllabusTopics).map(([subject, topics]) => (
            <div key={subject} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-3 font-semibold text-gray-800 border-b border-gray-200">
                {subject} <span className="text-gray-400 font-normal text-sm">({(topics as string[]).length} chapters)</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {(topics as string[]).map((topic, i) => (
                  <li key={i} className="p-3 text-sm text-gray-600 hover:bg-indigo-50/30 transition-colors">
                    • {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {Object.keys(state.syllabusTopics).length === 0 && (
             <div className="text-center p-8 bg-amber-50 rounded-lg text-amber-700">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                Could not load specific topics. We will generate a plan based on general curriculum.
             </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Back</button>
        <button
          onClick={onNext}
          disabled={loading}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
            !loading ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Customize Plan
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Step 4: Exam Details & Preferences
// ----------------------------------------------------------------------
export const Step4Details: React.FC<WizardProps> = ({ state, setState, onNext, onBack, isGenerating }) => {
  const toggleWeak = (subject: string) => {
    setState(prev => {
      // Can't be both weak and strong
      const newStrong = prev.strongSubjects.filter(s => s !== subject);
      const isWeak = prev.weakSubjects.includes(subject);
      const newWeak = isWeak ? prev.weakSubjects.filter(s => s !== subject) : [...prev.weakSubjects, subject];
      return { ...prev, weakSubjects: newWeak, strongSubjects: newStrong };
    });
  };

  const toggleStrong = (subject: string) => {
    setState(prev => {
      // Can't be both weak and strong
      const newWeak = prev.weakSubjects.filter(s => s !== subject);
      const isStrong = prev.strongSubjects.includes(subject);
      const newStrong = isStrong ? prev.strongSubjects.filter(s => s !== subject) : [...prev.strongSubjects, subject];
      return { ...prev, strongSubjects: newStrong, weakSubjects: newWeak };
    });
  };

  const isValid = state.examDate && state.dailyHours > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Final Details</h2>
        <p className="text-gray-500">Customize your study schedule.</p>
      </div>

      {/* Exam Date */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Calendar className="w-4 h-4" /> Exam Start Date
        </label>
        <input
          type="date"
          value={state.examDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setState(prev => ({ ...prev, examDate: e.target.value }))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Daily Hours */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Clock className="w-4 h-4" /> Daily Study Hours
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="12"
            step="0.5"
            value={state.dailyHours}
            onChange={(e) => setState(prev => ({ ...prev, dailyHours: parseFloat(e.target.value) }))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="font-bold text-indigo-700 min-w-[3rem] text-center">{state.dailyHours} hrs</span>
        </div>
      </div>

      {/* Weak & Strong Analysis */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <BarChart className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-700">SWOT Analysis</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Select subjects to prioritize (Weak) or review quickly (Strong).</p>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {state.selectedSubjects.map(sub => (
            <div key={sub} className="flex items-center justify-between text-sm p-2 bg-white rounded-md border border-gray-100">
              <span className="font-medium text-gray-700 truncate w-1/3">{sub}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleWeak(sub)}
                  className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                    state.weakSubjects.includes(sub)
                      ? 'bg-red-100 border-red-200 text-red-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:bg-red-50'
                  }`}
                >
                  Weak
                </button>
                <button
                  onClick={() => toggleStrong(sub)}
                  className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                    state.strongSubjects.includes(sub)
                      ? 'bg-green-100 border-green-200 text-green-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:bg-green-50'
                  }`}
                >
                  Strong
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onBack} 
          disabled={isGenerating}
          className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid || isGenerating}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            isValid && !isGenerating ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>Generate Calendar</>
          )}
        </button>
      </div>
    </div>
  );
};
