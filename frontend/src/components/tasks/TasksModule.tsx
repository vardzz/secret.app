import React, { useState, useEffect } from 'react';
import { ipcClient, Task } from '../../lib/ipc-client';
import { Plus, Check } from 'lucide-react';

export const TasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'completed'>('open');

  const fetchTasks = async () => {
    try {
      const data = await ipcClient.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const newTask = await ipcClient.createTask(newTaskTitle, "", "To Do", "Medium");
      setTasks([newTask, ...tasks]);
      setNewTaskTitle('');
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
    try {
      await ipcClient.updateTask(
        task.id,
        task.title,
        task.description,
        newStatus,
        task.priority,
        task.tags,
        task.due_date
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const openTasks = tasks.filter(t => t.status !== 'Done');
  const completedTasks = tasks.filter(t => t.status === 'Done');
  const displayedTasks = activeTab === 'open' ? openTasks : completedTasks;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-12 px-12 relative">
        {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Personal Work</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Tasks</h1>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>New task</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTask} className="mb-8 flex flex-row gap-4">
          <input
            type="text"
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task description..."
            className="flex-1 bg-transparent border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-border-default focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-surface-raised border border-border-subtle rounded-xl text-sm font-medium hover:text-bone hover:border-border-default transition-colors"
          >
            Add Task
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-8 border-b border-border-subtle mb-4">
        <button 
          onClick={() => setActiveTab('open')}
          className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'open' ? 'text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Open <span className={`font-normal ml-1.5 ${activeTab === 'open' ? 'text-text-secondary' : 'text-text-tertiary'}`}>· {openTasks.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'completed' ? 'text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Completed
        </button>
      </div>

      {/* List View */}
      <div className="flex flex-col pb-10">
        {displayedTasks.length === 0 ? (
          <div className="text-center text-text-secondary mt-12">
            <p>No {activeTab} tasks found.</p>
          </div>
        ) : (
          displayedTasks.map(task => (
            <div 
              key={task.id} 
              className="flex items-center justify-between py-5 border-b border-border-subtle group transition-colors"
            >
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => toggleTaskCompletion(task)}
                  className={`mt-0.5 w-5 h-5 rounded-full border transition-colors flex items-center justify-center shrink-0 ${
                    task.status === 'Done' 
                      ? 'border-text-secondary bg-surface-raised text-text-secondary' 
                      : 'border-text-secondary hover:border-bone hover:bg-surface-raised/50 text-transparent'
                  }`}
                >
                  {task.status === 'Done' && <Check size={12} />}
                </button>
                <div>
                  <div className={`font-semibold text-sm mb-1.5 ${task.status === 'Done' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                    {task.title}
                  </div>
                  <div className="text-[11px] text-text-tertiary uppercase tracking-widest">
                    {task.tags || 'PERSONAL'} · {task.priority.toUpperCase()} PRIORITY
                  </div>
                </div>
              </div>
              <div className="text-xs text-text-secondary font-mono tracking-tight">
                {task.due_date || 'AUG 12'}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
};
