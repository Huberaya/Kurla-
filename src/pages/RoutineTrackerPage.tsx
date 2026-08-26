import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, Bell, Plus, Check, ArrowLeft, Sparkles, X } from 'lucide-react';
import { AiRoutineAnalysis } from '../components/AiRoutineAnalysis';

export const RoutineTrackerPage: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Vaporiser Brume Aloe Vera & Hydrater', completed: true, category: 'hydratation', day: 'Aujourd’hui' },
    { id: 2, title: 'Appliquer Fluide Solaire SPF 50 Visage', completed: true, category: 'spf', day: 'Aujourd’hui' },
    { id: 3, title: 'Massage Cuir Chevelu à l’Huile de Baobab (3 min)', completed: false, category: 'soin', day: 'Ce soir' },
    { id: 4, title: 'Grand Wash Day 4C (Shampooing + Masque Protéiné)', completed: false, category: 'washday', day: 'Dimanche 10h' },
    { id: 5, title: 'Rappel : Dépose des Knotless Braids (Limite 6 semaines)', completed: false, category: 'protective', day: 'Dans 8 jours' }
  ]);

  const [notes, setNotes] = useState('Mes cheveux ont particulièrement bien gardé l’hydratation cette semaine grâce au scellage avec le beurre de karité.');
  const [newNote, setNewNote] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState('Aujourd’hui');

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (title: string, category: string = 'soin', day: string = 'Cette semaine') => {
    if (!title.trim()) return;
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      completed: false,
      category,
      day
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID
        </a>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-2">
              <CalendarIcon className="w-3.5 h-3.5" /> Routine Tracker & Calendrier Wash Day
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif-title font-bold text-[#111111]">
              Mon Suivi Capillaire & Skincare
            </h1>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un rappel
          </button>
        </div>

        {/* AI Routine Analysis Section */}
        <AiRoutineAnalysis 
          tasks={tasks}
          notes={newNote || notes}
          onAddTask={handleAddTask}
        />

        {/* 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left 2 Cols: Checklist & Schedule */}
          <div className="lg:col-span-2 space-y-6">

            {/* Checklist */}
            <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-xs">
              <h2 className="text-base font-serif-title font-bold text-[#111111] mb-4 flex items-center justify-between">
                <span>Checklist du Jour & Rappels ({tasks.length})</span>
                <span className="text-xs font-normal text-[#111111]/60">
                  {tasks.filter(t => t.completed).length} / {tasks.length} réalisés
                </span>
              </h2>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      task.completed
                        ? 'bg-[#FFFDF9]/60 border-emerald-200 text-[#111111]/50'
                        : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D] text-[#111111]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-[#E8E1DA] text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </p>
                        <span className="text-[10px] text-[#C8753D] font-medium block">
                          {task.day}
                        </span>
                      </div>
                    </div>

                    <Bell className="w-4 h-4 text-[#111111]/30 hover:text-[#C8753D]" />
                  </div>
                ))}
              </div>
            </div>

            {/* User Wash Day Notes */}
            <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
              <h3 className="text-sm font-bold text-[#111111] mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8753D]" /> Notes "Ça a marché / Ça n'a pas marché"
              </h3>
              <p className="text-xs text-[#111111]/70 font-light mb-4">
                Note ce que tes cheveux ont aimé lors du dernier soin pour affiner ton profil et tes recommandations explicables.
              </p>

              <textarea
                value={newNote || notes}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ex: Le beurre de karité sur cheveux humides a évité la casse cette semaine..."
                className="w-full p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs text-[#111111] focus:outline-none focus:border-[#C8753D] min-h-[90px]"
              />
            </div>

          </div>

          {/* Right Col: Wash Day Calendar Widget */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
              <h3 className="text-sm font-bold text-[#111111] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C8753D]" /> Prochains Wash Days
              </h3>

              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#C8753D] block">Dimanche 10h</span>
                  <span className="font-bold text-[#111111]">Soin Profond Protéiné + Clarification</span>
                  <p className="text-[11px] text-[#111111]/60 mt-1">Dépelliculage doux + Masque Soin Soie & Riz.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#111111]/60 block">Mercredi soir</span>
                  <span className="font-bold text-[#111111]">Ré-hydratation & Coiffage Vanilles</span>
                  <p className="text-[11px] text-[#111111]/60 mt-1">Vaporisateur Aloe Vera + Leave-In.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#C8753D]/10 border border-[#C8753D]/20 text-xs text-[#C8753D] font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Rappel automatique activé : Notification 24h avant ton Wash Day.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#E8E1DA] rounded-3xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E1DA]">
              <h3 className="font-serif-title font-bold text-base text-[#111111]">
                Ajouter une tâche à ma routine
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#111111]/50 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#111111]">Titre du geste / soin</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Masque hydratant cacao, Application SPF 50..."
                  className="w-full p-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] focus:outline-none focus:border-[#C8753D]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#111111]">Fréquence / Moment</label>
                <input
                  type="text"
                  value={newTaskDay}
                  onChange={(e) => setNewTaskDay(e.target.value)}
                  placeholder="Ex: Dimanche, Chaque matin, 2x/semaine..."
                  className="w-full p-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] focus:outline-none focus:border-[#C8753D]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8F2EC] text-[#111111] font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAddTask(newTaskTitle, 'soin', newTaskDay)}
                  className="px-4 py-2 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

