import React, { useState, useEffect } from 'react';
import { ipcClient, Task } from '../../lib/ipc-client';

const COLUMNS = ['To Do', 'In Progress', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export const TasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activePopover, setActivePopover] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: string) => {
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
      setActivePopover(null);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'font-bold border border-bone text-bone px-2 py-0.5 rounded text-xs tracking-wider';
      case 'Medium':
        return 'font-medium border border-subtle bg-surface-raised px-2 py-0.5 rounded text-xs tracking-wider text-bone';
      case 'Low':
      default:
        return 'font-normal border border-transparent px-2 py-0.5 rounded text-xs tracking-wider text-text-secondary';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-obsidian text-bone p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-medium tracking-wide">Tasks</h1>
        <form onSubmit={handleCreateTask} className="flex space-x-3 w-96">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent border border-subtle rounded px-4 py-2 text-sm focus:border-bone focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-bone text-obsidian rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add Task
          </button>
        </form>
      </div>

      <div className="flex flex-1 space-x-6 overflow-hidden">
        {COLUMNS.map((colName) => (
          <div key={colName} className="flex-1 flex flex-col bg-surface-base border border-subtle rounded-lg overflow-hidden">
            <div className="p-4 border-b border-subtle bg-obsidian font-medium tracking-wide">
              {colName}
              <span className="ml-2 text-text-tertiary text-sm font-mono">
                {tasks.filter((t) => t.status === colName).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tasks
                .filter((t) => t.status === colName)
                .map((task) => (
                  <div
                    key={task.id}
                    className="group relative bg-obsidian border border-subtle rounded-md p-4 transition-all hover:border-bone/50"
                  >
                    <h3 className={`font-medium ${task.status === 'Done' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                      {task.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className={getPriorityClasses(task.priority)}>
                        {task.priority.toUpperCase()}
                      </span>
                      
                      <div className="relative">
                        <button
                          onClick={() => setActivePopover(activePopover === task.id ? null : task.id)}
                          className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          Change Status
                        </button>
                        
                        {activePopover === task.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-40 bg-surface-base border border-subtle rounded shadow-xl overflow-hidden z-10">
                            {COLUMNS.map((status) => (
                              <button
                                key={status}
                                onClick={() => updateTaskStatus(task, status)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-raised transition-colors ${
                                  task.status === status ? 'text-bone font-medium' : 'text-text-secondary'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
