'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UnitData {
  id: string; name: string; floor: number; type: string; status: string;
}

interface BookingData {
  id: string; status: string; checkOutDate: string;
  guest: { firstName: string; lastName: string };
  unit: { name: string };
}

type TaskStatus = 'pending' | 'in_progress' | 'done';

interface Task {
  unitId: string;
  unitName: string;
  floor: number;
  type: string;
  unitStatus: string;
  guestName: string;
  checkoutTime: string;
  taskStatus: TaskStatus;
  assignee: string;
  priority: 'urgent' | 'normal' | 'low';
  notes: string;
}

const statusConfig: Record<TaskStatus, { label: string; icon: string; bg: string; color: string; border: string }> = {
  pending: { label: 'Chờ dọn', icon: '🔴', bg: 'rgba(239,68,68,0.08)', color: '#F87171', border: 'rgba(239,68,68,0.2)' },
  in_progress: { label: 'Đang dọn', icon: '🟡', bg: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
  done: { label: 'Xong', icon: '🟢', bg: 'rgba(16,185,129,0.08)', color: '#34D399', border: 'rgba(16,185,129,0.2)' },
};

const priorityConfig: Record<string, { label: string; bg: string; color: string }> = {
  urgent: { label: 'Khẩn', bg: 'rgba(239,68,68,0.15)', color: '#F87171' },
  normal: { label: 'Bình thường', bg: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
  low: { label: 'Thấp', bg: 'rgba(148,163,184,0.1)', color: '#94A3B8' },
};



export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatus | ''>('');
  const [time, setTime] = useState<Date | null>(null);
  const [updating, setUpdating] = useState<string>('');
  const [staffList, setStaffList] = useState<string[]>([]);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    try {
      const [bl, bookings, buildingsData] = await Promise.all([
        apiFetch('/dashboard/buildings'),
        apiFetch('/bookings?limit=50'),
        apiFetch('/buildings'),
      ]);

      // Load real staff from DB
      const realStaff = (buildingsData?.[0]?.staff || [])
        .filter((s: any) => s.active !== false && ['HOUSEKEEPING', 'STAFF'].includes(s.role))
        .map((s: any) => s.name);
      if (realStaff.length > 0) setStaffList(realStaff);

      const bld = bl[0];
      if (!bld?.units) return;

      const rental: UnitData[] = bld.units
        .filter((u: any) => u.name && u.name !== 'Owner')
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      const taskList: Task[] = rental.map(unit => {
        const unitBookings = bookings
          .filter((b: BookingData) => b.unit?.name === unit.name)
          .sort((a: BookingData, b: BookingData) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime());

        const lastBooking = unitBookings[0];
        const hasCheckin = lastBooking?.status === 'CHECKED_IN';
        const nextCheckin = unitBookings.find((b: BookingData) => b.status === 'CONFIRMED');

        let taskStatus: TaskStatus = 'done';
        let priority: 'urgent' | 'normal' | 'low' = 'low';
        let notes = '';

        if (unit.status === 'CLEANING') {
          taskStatus = 'pending';
          priority = nextCheckin ? 'urgent' : 'normal';
          notes = nextCheckin ? `Khách mới: ${nextCheckin.guest.firstName} ${nextCheckin.guest.lastName} check-in hôm nay` : '';
        } else if (unit.status === 'OCCUPIED') {
          taskStatus = 'done';
          priority = 'low';
          notes = hasCheckin ? `Đang ở: ${lastBooking.guest.firstName} ${lastBooking.guest.lastName}` : '';
        } else if (unit.status === 'AVAILABLE') {
          taskStatus = 'done';
          priority = 'low';
          notes = nextCheckin ? `Sắp đến: ${nextCheckin.guest.firstName}` : 'Trống, sẵn sàng';
        } else if (unit.status === 'MAINTENANCE') {
          taskStatus = 'in_progress';
          priority = 'normal';
          notes = 'Đang bảo trì';
        }

        return {
          unitId: unit.id,
          unitName: unit.name,
          floor: unit.floor,
          type: unit.type,
          unitStatus: unit.status,
          guestName: lastBooking ? `${lastBooking.guest.firstName} ${lastBooking.guest.lastName}` : '—',
          checkoutTime: lastBooking?.checkOutDate ? new Date(lastBooking.checkOutDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—',
          taskStatus,
          assignee: '',  // Will be assigned below
          priority,
          notes,
        };
      });

      // Assign real staff round-robin
      const activeStaff = realStaff.length > 0 ? realStaff : ['Chưa phân công'];
      taskList.forEach((t, i) => { t.assignee = activeStaff[i % activeStaff.length]; });

      taskList.sort((a, b) => {
        const order: Record<TaskStatus, number> = { pending: 0, in_progress: 1, done: 2 };
        return order[a.taskStatus] - order[b.taskStatus];
      });

      setTasks(taskList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateTaskStatus = async (task: Task, newTaskStatus: TaskStatus) => {
    setUpdating(task.unitId);
    try {
      // Map task status to unit status in DB
      let newUnitStatus = 'CLEANING';
      if (newTaskStatus === 'done') {
        newUnitStatus = 'AVAILABLE';
      } else if (newTaskStatus === 'in_progress') {
        newUnitStatus = 'CLEANING';
      } else if (newTaskStatus === 'pending') {
        newUnitStatus = 'CLEANING';
      }

      // Call API to update unit status in database
      await apiFetch(`/buildings/units/${task.unitId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newUnitStatus }),
      });

      // Update local state immediately - don't reload from API
      setTasks(prev => prev.map(t =>
        t.unitId === task.unitId
          ? { ...t, taskStatus: newTaskStatus, unitStatus: newUnitStatus }
          : t
      ));
    } catch (e: any) {
      alert('Lỗi cập nhật: ' + e.message);
      // Reload on error to get correct state
      loadData();
    }
    setUpdating('');
  };

  const filtered = filter ? tasks.filter(t => t.taskStatus === filter) : tasks;

  const counts = {
    pending: tasks.filter(t => t.taskStatus === 'pending').length,
    in_progress: tasks.filter(t => t.taskStatus === 'in_progress').length,
    done: tasks.filter(t => t.taskStatus === 'done').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} />
    </div>
  );

  return (
    <div className="p-6 min-h-full" style={{ color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">🧹 Housekeeping Board</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>
            Phân công dọn phòng · {time ? time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} · {time ? time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); loadData(); }}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
            🔄 Làm mới
          </button>
          {(['' as const, 'pending' as const, 'in_progress' as const, 'done' as const]).map(f => {
            const labels: Record<string, string> = {
              '': `Tất cả (${tasks.length})`,
              pending: `🔴 Chờ dọn (${counts.pending})`,
              in_progress: `🟡 Đang dọn (${counts.in_progress})`,
              done: `🟢 Xong (${counts.done})`,
            };
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition"
                style={filter === f ? { background: 'linear-gradient(135deg,#3B82F6,#06B6D4)', color: 'white' } : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-4xl font-black" style={{ color: '#F87171' }}>{counts.pending}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#94A3B8' }}>🔴 Chờ dọn</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <p className="text-4xl font-black" style={{ color: '#FBBF24' }}>{counts.in_progress}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#94A3B8' }}>🟡 Đang dọn</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <p className="text-4xl font-black" style={{ color: '#34D399' }}>{counts.done}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#94A3B8' }}>🟢 Hoàn tất</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <p className="text-4xl font-black" style={{ color: '#60A5FA' }}>{staffList.length}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#94A3B8' }}>👤 Nhân viên</p>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => {
          const sc = statusConfig[task.taskStatus];
          const pc = priorityConfig[task.priority];
          const isUpdating = updating === task.unitId;
          return (
            <div key={task.unitId} className="rounded-2xl p-5 flex items-center gap-4 transition hover:bg-white/[0.02]"
              style={{ background: '#0F1629', border: `1px solid ${sc.border}`, opacity: isUpdating ? 0.6 : 1 }}>

              {/* Room */}
              <div className="w-20 text-center flex-shrink-0">
                <p className="text-3xl font-black text-white">{task.unitName}</p>
                <p className="text-xs" style={{ color: '#3D5A80' }}>T{task.floor} · {task.type}</p>
              </div>

              {/* Status badge */}
              <div className="w-28 flex-shrink-0">
                <span className="text-sm px-3 py-1.5 rounded-full font-bold" style={{ background: sc.bg, color: sc.color }}>
                  {sc.icon} {sc.label}
                </span>
              </div>

              {/* Priority */}
              <div className="w-24 flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: pc.bg, color: pc.color }}>
                  {pc.label}
                </span>
              </div>

              {/* Guest / Notes */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{task.guestName}</p>
                <p className="text-xs mt-0.5" style={{ color: '#3D5A80' }}>{task.notes || '—'}</p>
              </div>

              {/* Assignee */}
              <div className="w-24 text-center flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: '#60A5FA' }}>{task.assignee}</p>
                <p className="text-[10px]" style={{ color: '#3D5A80' }}>Phụ trách</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                {task.taskStatus === 'pending' && (
                  <button onClick={() => updateTaskStatus(task, 'in_progress')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>
                    {isUpdating ? '...' : '▶ Bắt đầu'}
                  </button>
                )}
                {task.taskStatus === 'in_progress' && (
                  <button onClick={() => updateTaskStatus(task, 'done')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
                    {isUpdating ? '...' : '✅ Xong'}
                  </button>
                )}
                {task.taskStatus === 'done' && (
                  <button onClick={() => updateTaskStatus(task, 'pending')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {isUpdating ? '...' : '↩ Reset'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">✨</p>
          <p className="text-xl font-bold text-white">Tất cả phòng sạch sẽ!</p>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>Không có phòng nào cần dọn</p>
        </div>
      )}
    </div>
  );
}