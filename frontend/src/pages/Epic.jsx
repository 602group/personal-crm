import { useState, useEffect } from 'react';
import { epicApi } from '../api/epic';
import EpicTaskFormModal from '../components/epic/EpicTaskFormModal';
import EpicLinkFormModal from '../components/epic/EpicLinkFormModal';
import PageHeader        from '../components/ui/PageHeader';
import EmptyState        from '../components/ui/EmptyState';
import TaskRow           from '../components/tasks/TaskRow'; // We can reuse the UI component for rows
import '../styles/epic.css';

export default function Epic() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'links'
  const [data, setData] = useState({ tasks: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask]           = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editLink, setEditLink]           = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tRes, lRes] = await Promise.all([epicApi.listTasks(), epicApi.listLinks()]);
      setData({ tasks: tRes.tasks || [], links: lRes.links || [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Task Actions
  async function handleSaveTask(payload) {
    if (editTask) {
      const saved = await epicApi.updateTask(editTask.id, payload);
      setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === editTask.id ? saved.task : t) }));
    } else {
      const saved = await epicApi.createTask(payload);
      setData(p => ({ ...p, tasks: [saved.task, ...p.tasks] }));
    }
  }

  async function handleDeleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    await epicApi.deleteTask(id);
    setData(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id) }));
  }

  async function handleToggleStatus(task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    const saved = await epicApi.updateTask(task.id, { status: nextStatus });
    setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === task.id ? saved.task : t) }));
  }

  // Link Actions
  async function handleSaveLink(payload) {
    if (editLink) {
      const saved = await epicApi.updateLink(editLink.id, payload);
      setData(p => ({ ...p, links: p.links.map(l => l.id === editLink.id ? saved.link : l) }));
    } else {
      const saved = await epicApi.createLink(payload);
      setData(p => ({ ...p, links: [saved.link, ...p.links] }));
    }
  }

  async function handleDeleteLink(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this link?')) return;
    await epicApi.deleteLink(id);
    setData(p => ({ ...p, links: p.links.filter(l => l.id !== id) }));
  }

  function getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch { return null; }
  }

  return (
    <div>
      <PageHeader 
        title="Epic Work" 
        subtitle="Manage epic-scale tasks and quick references."
        actions={
          <button className="btn btn-primary" onClick={() => {
            if (activeTab === 'tasks') { setEditTask(null); setShowTaskModal(true); }
            else { setEditLink(null); setShowLinkModal(true); }
          }}>
            {activeTab === 'tasks' ? '+ New Task' : '+ Add Link'}
          </button>
        }
      />

      <div className="epic-tabs">
        <button className={`epic-tab-btn ${activeTab==='tasks'?'active':''}`} onClick={()=>setActiveTab('tasks')}>Tasks</button>
        <button className={`epic-tab-btn ${activeTab==='links'?'active':''}`} onClick={()=>setActiveTab('links')}>Quick Links</button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      ) : activeTab === 'tasks' ? (
        /* TASKS TAB */
        data.tasks.length === 0 ? (
          <EmptyState icon="📌" title="No Epic Tasks" description="Create tasks directly related to your epic work." actionLabel="Create Task" onAction={() => { setEditTask(null); setShowTaskModal(true); }} />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {data.tasks.map(task => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      onToggle={() => handleToggleStatus(task)}
                      onEdit={() => { setEditTask(task); setShowTaskModal(true); }}
                      onDelete={() => handleDeleteTask(task.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* LINKS TAB */
        data.links.length === 0 ? (
          <EmptyState icon="🔗" title="No Quick Links" description="Save important URLs and references here for quick access." actionLabel="Add Link" onAction={() => { setEditLink(null); setShowLinkModal(true); }} />
        ) : (
          <div className="epic-links-grid">
            {data.links.map(link => {
              const fav = getFavicon(link.url);
              return (
                <div key={link.id} className="epic-link-card" onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}>
                  <div className="epic-link-actions">
                    <button className="epic-link-action-btn" onClick={(e) => { e.stopPropagation(); setEditLink(link); setShowLinkModal(true); }}>✎</button>
                    <button className="epic-link-action-btn delete" onClick={(e) => handleDeleteLink(link.id, e)}>🗑</button>
                  </div>
                  <div className="epic-link-header">
                    <div className="epic-link-icon">{fav ? <img src={fav} alt="" style={{width:16,height:16,borderRadius:2}}/> : '🏷'}</div>
                    {link.category && <span className="epic-link-category">{link.category}</span>}
                  </div>
                  <div className="epic-link-title">{link.title}</div>
                  <div className="epic-link-url">{link.url}</div>
                </div>
              );
            })}
          </div>
        )
      )}

      <EpicTaskFormModal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)}
        initialData={editTask}
        onSave={handleSaveTask}
      />

      <EpicLinkFormModal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)}
        initialData={editLink}
        onSave={handleSaveLink}
      />
    </div>
  );
}
