import React, { useState, useEffect } from 'react';
import { UserState, BoardType, User } from './types';
import { Step1Board, Step2Subjects, Step3Topics, Step4Details } from './components/StepWizard';
import { generateStudyCalendar } from './services/geminiService';
import { loginWithGoogle, logout, subscribeToAuthChanges } from './services/firebase';
import { 
  BookOpen, Calendar as CalendarIcon, Clock, ChevronRight, CheckCircle2, 
  Download, RefreshCw, Share2, LogIn, LogOut, User as UserIcon 
} from 'lucide-react';

// Declare html2pdf for TypeScript since it's loaded via CDN
declare const html2pdf: any;

const INITIAL_STATE: UserState = {
  step: 1,
  board: null,
  stateName: '',
  grade: '',
  selectedSubjects: [],
  syllabusTopics: {},
  examDate: '',
  dailyHours: 4,
  weakSubjects: [],
  strongSubjects: [],
  generatedCalendar: null,
};

function App() {
  const [state, setState] = useState<UserState>(INITIAL_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Login failed. Please check your configuration.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const handleNext = async () => {
    setError(null);
    if (state.step === 4) {
      setIsGenerating(true);
      try {
        const calendar = await generateStudyCalendar(state);
        setState(prev => ({ ...prev, generatedCalendar: calendar, step: 5 }));
      } catch (err: any) {
        setError(err.message || "Something went wrong generating the calendar.");
      } finally {
        setIsGenerating(false);
      }
    } else {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  };

  const handleReset = () => {
    if (window.confirm("Start over? All your progress will be lost.")) {
      setState(INITIAL_STATE);
    }
  };

  // Share Feature
  const handleShare = async () => {
    const title = "My Personalized Study Plan";
    const text = `I created my personalized ${state.grade} study plan for ${state.board}. Check it out!`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!");
      } catch (err) {
        showToast("Failed to copy link.");
      }
    }
  };

  // PDF Export Feature
  const handleDownloadPDF = () => {
    const element = document.getElementById('study-plan-container');
    if (!element) return;

    const opt = {
      margin: [10, 10],
      filename: `Study_Plan_${state.generatedCalendar?.length || 20}_Days.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ----------------------------------------------------------------------
  // Step 5: Calendar Result View
  // ----------------------------------------------------------------------
  const renderCalendar = () => {
    if (!state.generatedCalendar) return null;

    return (
      <div className="animate-fade-in-up space-y-6">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Your Study Plan</h2>
            <p className="text-gray-500 text-sm md:text-base">
              {state.board} • {state.grade} • {state.generatedCalendar.length} Days Planned
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
             <button 
              onClick={handleShare}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button 
              onClick={handleReset}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div id="study-plan-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Stats Card */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Subjects</p>
                    <p className="font-bold text-gray-800">{state.selectedSubjects.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Daily Goal</p>
                    <p className="font-bold text-gray-800">{state.dailyHours} Hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Exam Starts</p>
                    <p className="font-bold text-gray-800">{new Date(state.examDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 data-html2canvas-ignore">
                <h4 className="font-medium text-gray-700 mb-2">Legend</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Study</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Revision</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Test</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Buffer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar List */}
          <div className="lg:col-span-2 space-y-4">
            {state.generatedCalendar.map((day) => (
              <div 
                key={day.day} 
                className={`bg-white rounded-xl border p-4 break-inside-avoid ${
                  day.isTest ? 'border-red-200 bg-red-50/20' : 
                  day.isRevision ? 'border-amber-200 bg-amber-50/20' : 
                  day.isBuffer ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                      ${day.isTest ? 'bg-red-100 text-red-700' : 
                        day.isRevision ? 'bg-amber-100 text-amber-700' : 
                        day.isBuffer ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {day.day}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{day.date || `Day ${day.day}`}</p>
                      {day.notes && <p className="text-xs text-gray-500">{day.notes}</p>}
                    </div>
                  </div>
                  <div className="text-xs font-semibold px-2 py-1 rounded bg-white border">
                    {day.isTest ? 'MOCK TEST' : day.isRevision ? 'REVISION DAY' : day.isBuffer ? 'BUFFER DAY' : 'STUDY DAY'}
                  </div>
                </div>

                <div className="space-y-2">
                  {day.slots && day.slots.map((slot, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-gray-50">
                       <div className="flex-1">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 ${
                            slot.activityType === 'Study' ? 'bg-indigo-100 text-indigo-700' :
                            slot.activityType === 'Revision' ? 'bg-amber-100 text-amber-700' :
                            slot.activityType === 'Test' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {slot.activityType}
                          </span>
                          <span className="font-semibold text-gray-800 text-sm">{slot.subject}</span>
                       </div>
                       <div className="flex-1 text-sm text-gray-600">
                         {slot.topic}
                       </div>
                       <div className="text-xs font-medium text-gray-400 whitespace-nowrap">
                         {slot.durationMinutes} mins
                       </div>
                    </div>
                  ))}
                  {day.slots?.length === 0 && day.isBuffer && (
                     <p className="text-sm text-gray-500 italic text-center py-2">Use this day to catch up on any missed topics or rest.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in text-sm font-medium">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 truncate">
              Academic Planner
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {state.step < 5 && state.step > 1 && (
              <div className="hidden md:block text-sm font-medium text-gray-500">
                Step <span className="text-indigo-600">{state.step}</span> of 4
              </div>
            )}
            
            {/* Auth Buttons */}
            {user ? (
               <div className="flex items-center gap-2">
                 {user.photoURL ? (
                   <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-gray-200" />
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                     <UserIcon className="w-4 h-4" />
                   </div>
                 )}
                 <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 p-1 rounded-md transition-colors" title="Logout">
                   <LogOut className="w-5 h-5" />
                 </button>
               </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3 text-sm md:text-base">
            <div className="bg-red-100 p-2 rounded-full flex-shrink-0"><span className="text-lg font-bold">!</span></div>
            <p>{error}</p>
          </div>
        )}

        {state.step < 5 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full mb-8 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(state.step / 4) * 100}%` }}
              ></div>
            </div>

            {state.step === 1 && <Step1Board state={state} setState={setState} onNext={handleNext} onBack={handleBack} isGenerating={isGenerating} />}
            {state.step === 2 && <Step2Subjects state={state} setState={setState} onNext={handleNext} onBack={handleBack} isGenerating={isGenerating} />}
            {state.step === 3 && <Step3Topics state={state} setState={setState} onNext={handleNext} onBack={handleBack} isGenerating={isGenerating} />}
            {state.step === 4 && <Step4Details state={state} setState={setState} onNext={handleNext} onBack={handleBack} isGenerating={isGenerating} />}
          </div>
        ) : (
          renderCalendar()
        )}
      </main>
    </div>
  );
}

export default App;