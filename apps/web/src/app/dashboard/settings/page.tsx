// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getUser } from '@/lib/api';

export default function SettingsPage() {
  const [building, setBuilding] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('building');
  const user = getUser();

  // Password change
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  // New user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('BUILDING_MANAGER');
  const [userMsg, setUserMsg] = useState('');

  // Edit price
  const [editingUnit, setEditingUnit] = useState<string>('');
  const [editPrice, setEditPrice] = useState('');
  const [priceMsg, setPriceMsg] = useState('');

  // === Issue #2: WiFi settings ===
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiEditing, setWifiEditing] = useState(false);
  const [wifiMsg, setWifiMsg] = useState('');

  // === Issue #5: Editable building info (hotline, hours, rules) ===
  const [buildingEditing, setBuildingEditing] = useState(false);
  const [editHotline, setEditHotline] = useState('');
  const [editCheckinTime, setEditCheckinTime] = useState('');
  const [editCheckoutTime, setEditCheckoutTime] = useState('');
  const [editLateTime, setEditLateTime] = useState('');
  const [editLateFee, setEditLateFee] = useState('');
  const [editHouseRules, setEditHouseRules] = useState('');
  const [buildingMsg, setBuildingMsg] = useState('');

  // Saving states
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/buildings'),
      apiFetch('/dashboard/buildings'),
    ]).then(([b, bl]) => {
      if (b.length > 0) {
        setBuilding(b[0]);
        setStaffList(b[0].staff || []);
        // Init WiFi from building settings
        const s = b[0].settings || {};
        setWifiSSID(s.wifi_ssid || '');
        setWifiPass(s.wifi_password || '');
        setEditHotline(s.manager_phone || '');
        setEditCheckinTime(s.checkin_time || '14:00');
        setEditCheckoutTime(s.checkout_time || '12:00');
        setEditLateTime(s.late_checkout_time || '14:00');
        setEditLateFee(s.late_checkout_fee || '200.000đ/giờ');
        setEditHouseRules(s.house_rules || '');
      }
      if (bl.length > 0 && bl[0].units) {
        setUnits(bl[0].units.filter((u: any) => u.name !== 'Owner'));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const changePassword = async () => {
    if (!newPass || newPass.length < 6) { setPassMsg('Mật khẩu mới phải >= 6 ký tự'); return; }
    setSaving(true); setPassMsg('');
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      setPassMsg('Đổi mật khẩu thành công!');
      setOldPass(''); setNewPass('');
    } catch (e: any) {
      setPassMsg('Lỗi: ' + e.message);
    }
    setSaving(false);
  };

  const createUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPass) { setUserMsg('Điền đầy đủ thông tin'); return; }
    setSaving(true); setUserMsg('');
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPass,
          role: newUserRole,
          buildingId: building?.id,
        }),
      });
      setUserMsg('Tạo user thành công!');
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
      const b = await apiFetch('/buildings');
      if (b.length > 0) setStaffList(b[0].staff || []);
    } catch (e: any) {
      setUserMsg('Lỗi: ' + e.message);
    }
    setSaving(false);
  };

  const updatePrice = async (unitId: string) => {
    if (!editPrice || isNaN(Number(editPrice))) { setPriceMsg('Giá không hợp lệ'); return; }
    setSaving(true); setPriceMsg('');
    try {
      await apiFetch(`/buildings/units/${unitId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ basePrice: Number(editPrice) }),
      });
      setPriceMsg('Cập nhật giá thành công!');
      setEditingUnit('');
      const bl = await apiFetch('/dashboard/buildings');
      if (bl.length > 0 && bl[0].units) setUnits(bl[0].units.filter((u: any) => u.name !== 'Owner'));
    } catch (e: any) {
      setPriceMsg('Lỗi: ' + e.message);
    }
    setSaving(false);
  };

  const resetUserPassword = async (staffId: string, staffName: string) => {
    const newPw = prompt(`Nhập mật khẩu mới cho ${staffName}:`);
    if (!newPw) return;
    try {
      await apiFetch(`/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ staffId, newPassword: newPw }),
      });
      alert(`Đã đổi mật khẩu cho ${staffName}`);
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const deleteUser = async (staffId, staffName) => {
    if (!confirm('Xóa ' + staffName + '?')) return;
    try {
      await apiFetch('/auth/delete-user', { method: 'POST', body: JSON.stringify({ staffId }) });
      alert('Đã xóa ' + staffName);
      const b = await apiFetch('/buildings');
      if (b.length > 0) setStaffList(b[0].staff || []);
    } catch (e) { alert('Lỗi: ' + e.message); }
  };

  // === Issue #2: Save WiFi settings ===
  const saveWifi = async () => {
    if (!wifiSSID.trim()) { setWifiMsg('Tên WiFi không được để trống'); return; }
    setSaving(true); setWifiMsg('');
    try {
      const currentSettings = building?.settings || {};
      const updatedSettings = { ...currentSettings, wifi_ssid: wifiSSID.trim(), wifi_password: wifiPass.trim() };
      await apiFetch(`/buildings/${building.id}`, {
        method: 'PUT',
        body: JSON.stringify({ settings: updatedSettings }),
      });
      setBuilding({ ...building, settings: updatedSettings });
      setWifiMsg('Cập nhật WiFi thành công!');
      setWifiEditing(false);
    } catch (e: any) {
      setWifiMsg('Lỗi: ' + e.message);
    }
    setSaving(false);
  };

  // === Issue #5: Save all building settings ===
  const saveBuildingSettings = async () => {
    setSaving(true); setBuildingMsg('');
    try {
      const currentSettings = building?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        manager_phone: editHotline.trim(),
        checkin_time: editCheckinTime.trim(),
        checkout_time: editCheckoutTime.trim(),
        late_checkout_time: editLateTime.trim(),
        late_checkout_fee: editLateFee.trim(),
        house_rules: editHouseRules.trim(),
      };
      await apiFetch(`/buildings/${building.id}`, {
        method: 'PUT',
        body: JSON.stringify({ settings: updatedSettings }),
      });
      setBuilding({ ...building, settings: updatedSettings });
      setBuildingMsg('Cập nhật thành công!');
      setBuildingEditing(false);
    } catch (e: any) {
      setBuildingMsg('Lỗi: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  const s = building?.settings || {};
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#E2E8F0', fontSize: '14px', width: '100%', outline: 'none' };
  const btnPrimary = { background: 'linear-gradient(135deg,#3B82F6,#06B6D4)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' };
  const btnDanger = { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">⚙️ Cài đặt</h1>
        <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Quản lý hệ thống, người dùng, giá phòng</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          {v:'building',l:'🏢 Tòa nhà'},
          {v:'users',l:'👤 Người dùng'},
          {v:'password',l:'🔐 Mật khẩu'},
          {v:'pricing',l:'💰 Giá phòng'},
          {v:'ai',l:'🤖 AI Agent'},
        ].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} className="px-5 py-2.5 rounded-xl text-sm font-bold transition"
            style={tab===t.v?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* === TAB: BUILDING === */}
      {tab === 'building' && building && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <h3 className="text-lg font-bold text-white mb-4">🏢 Thông tin tòa nhà: {building.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📍 Địa chỉ</p>
                <p className="text-sm text-white">{building.address}, {building.city}</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>🏗️ Quy mô</p>
                <p className="text-sm text-white">{s.total_floors || '?'} tầng · {building._count?.units || units.length} phòng</p>
              </div>

              {/* === WiFi — Issue #2: Editable === */}
              <div className="rounded-xl p-4 col-span-2" style={{background:'rgba(6,182,212,0.04)',border:'1px solid rgba(6,182,212,0.15)'}}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{color:'#22D3EE'}}>📶 WiFi (có thể chỉnh sửa)</p>
                  {!wifiEditing ? (
                    <button onClick={() => setWifiEditing(true)}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',border:'1px solid rgba(59,130,246,0.25)',cursor:'pointer'}}>
                      ✏️ Sửa WiFi
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={saveWifi} disabled={saving}
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{background:'rgba(16,185,129,0.15)',color:'#34D399',border:'1px solid rgba(16,185,129,0.25)',cursor:'pointer'}}>
                        {saving ? '...' : '✓ Lưu'}
                      </button>
                      <button onClick={() => { setWifiEditing(false); setWifiSSID(s.wifi_ssid || ''); setWifiPass(s.wifi_password || ''); setWifiMsg(''); }}
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{background:'rgba(255,255,255,0.04)',color:'#94A3B8',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer'}}>
                        ✗ Hủy
                      </button>
                    </div>
                  )}
                </div>
                {wifiMsg && <p className="text-xs mb-2" style={{color: wifiMsg.includes('thành công') ? '#34D399' : '#F87171'}}>{wifiMsg}</p>}
                {wifiEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold mb-1" style={{color:'#3D5A80'}}>Tên WiFi (SSID)</p>
                      <input value={wifiSSID} onChange={e => setWifiSSID(e.target.value)} placeholder="BTM03_5G"
                        style={{...inputStyle, background:'#080C18', border:'1px solid rgba(6,182,212,0.2)'}} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold mb-1" style={{color:'#3D5A80'}}>Mật khẩu WiFi</p>
                      <input value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="btm2026!"
                        style={{...inputStyle, background:'#080C18', border:'1px solid rgba(6,182,212,0.2)'}} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs" style={{color:'#3D5A80'}}>SSID: </span>
                      <span className="text-sm font-bold font-mono text-white">{s.wifi_ssid || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{color:'#3D5A80'}}>Pass: </span>
                      <span className="text-sm font-bold font-mono" style={{color:'#22D3EE'}}>{s.wifi_password || '—'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>⏰ Giờ giấc</p>
                {buildingEditing ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] mb-1" style={{color:'#4B6A8F'}}>Check-in</p>
                      <input value={editCheckinTime} onChange={e=>setEditCheckinTime(e.target.value)} placeholder="14:00" style={{...inputStyle, background:'#080C18'}} />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{color:'#4B6A8F'}}>Check-out</p>
                      <input value={editCheckoutTime} onChange={e=>setEditCheckoutTime(e.target.value)} placeholder="12:00" style={{...inputStyle, background:'#080C18'}} />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{color:'#4B6A8F'}}>Late CO đến</p>
                      <input value={editLateTime} onChange={e=>setEditLateTime(e.target.value)} placeholder="14:00" style={{...inputStyle, background:'#080C18'}} />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{color:'#4B6A8F'}}>Phí late CO</p>
                      <input value={editLateFee} onChange={e=>setEditLateFee(e.target.value)} placeholder="200.000đ/giờ" style={{...inputStyle, background:'#080C18'}} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white">In: {s.checkin_time} · Out: {s.checkout_time} · Late: {s.late_checkout_time} ({s.late_checkout_fee})</p>
                )}
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📞 Hotline</p>
                {buildingEditing ? (
                  <input value={editHotline} onChange={e=>setEditHotline(e.target.value)} placeholder="+84 901 234 567" style={{...inputStyle, background:'#080C18', marginTop:'4px'}} />
                ) : (
                  <p className="text-sm text-white">{s.manager_phone || '—'}</p>
                )}
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>⏱️ Escalation</p>
                <p className="text-sm text-white">{s.escalation_eta_minutes || 15} phút</p>
              </div>
            </div>
            {/* Edit building button */}
            <div className="mt-4 flex items-center gap-3">
              {!buildingEditing ? (
                <button onClick={() => setBuildingEditing(true)} style={btnPrimary}>✏️ Sửa thông tin tòa nhà</button>
              ) : (
                <>
                  <button onClick={saveBuildingSettings} disabled={saving} style={btnPrimary}>{saving ? 'Đang lưu...' : '✓ Lưu tất cả'}</button>
                  <button onClick={() => { setBuildingEditing(false); setBuildingMsg(''); const ss = building?.settings||{}; setEditHotline(ss.manager_phone||''); setEditCheckinTime(ss.checkin_time||'14:00'); setEditCheckoutTime(ss.checkout_time||'12:00'); setEditLateTime(ss.late_checkout_time||'14:00'); setEditLateFee(ss.late_checkout_fee||'200.000đ/giờ'); setEditHouseRules(ss.house_rules||''); }}
                    style={{...btnDanger, background:'rgba(255,255,255,0.04)', color:'#94A3B8', border:'1px solid rgba(255,255,255,0.08)'}}>✗ Hủy</button>
                </>
              )}
              {buildingMsg && <span className="text-sm" style={{color: buildingMsg.includes('thành công') ? '#34D399' : '#F87171'}}>{buildingMsg}</span>}
            </div>
          </div>
          <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <h3 className="text-lg font-bold text-white mb-4">📝 Nội quy tòa nhà</h3>
            {buildingEditing ? (
              <textarea value={editHouseRules} onChange={e=>setEditHouseRules(e.target.value)} rows={6}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}}
                placeholder="Không hút thuốc (phạt 500k)&#10;Yên tĩnh 22:00-07:00&#10;Không tiệc&#10;Thú cưng báo trước" />
            ) : (
              <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',color:'#94A3B8'}}>{s.house_rules || 'Chưa cấu hình'}</pre>
            )}
          </div>
        </div>
      )}

      {/* === TAB: USERS === */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Staff list */}
          <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <h3 className="text-lg font-bold text-white mb-4">👥 Danh sách người dùng</h3>
            <div className="space-y-2">
              {staffList.length === 0 ? (
                <p className="text-sm" style={{color:'#3D5A80'}}>Chưa có nhân viên nào</p>
              ) : staffList.map((st: any) => (
                <div key={st.id} className="flex items-center gap-4 p-4 rounded-xl" style={{background:'rgba(255,255,255,0.02)'}}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}}>
                    {st.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{st.name}</p>
                    <p className="text-xs" style={{color:'#3D5A80'}}>{st.email} · {st.role === 'CHAIN_ADMIN' ? 'Chain Admin' : st.role === 'BUILDING_MANAGER' ? 'Building Manager' : st.role}</p>
                  </div>
                  <p className="text-xs" style={{color: st.role === 'CHAIN_ADMIN' ? '#60A5FA' : '#34D399'}}>{st.phone || ''}</p>
                  <button onClick={() => resetUserPassword(st.id, st.name)} style={btnDanger}>🔑 Đổi pass</button>
                  <button onClick={() => deleteUser(st.id, st.name)} style={{...btnDanger, marginLeft:'8px', background:'rgba(239,68,68,0.25)'}}>🗑️ Xóa</button>
                </div>
              ))}
            </div>
          </div>

          {/* Create user */}
          <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <h3 className="text-lg font-bold text-white mb-4">➕ Tạo người dùng mới</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Họ tên</p>
                <input value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="Nguyễn Văn A" style={inputStyle} />
              </div>
              <div>
                <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Email</p>
                <input value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} placeholder="user@btm-homestay.com" style={inputStyle} />
              </div>
              <div>
                <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Mật khẩu</p>
                <input type="password" value={newUserPass} onChange={e=>setNewUserPass(e.target.value)} placeholder="Tối thiểu 6 ký tự" style={inputStyle} />
              </div>
              <div>
                <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Vai trò</p>
                <select value={newUserRole} onChange={e=>setNewUserRole(e.target.value)} style={{...inputStyle, cursor:'pointer'}}>
                  <option value="BUILDING_MANAGER">Building Manager</option>
                  <option value="STAFF">Staff</option>
                  <option value="CHAIN_ADMIN">Chain Admin</option>
                </select>
              </div>
            </div>
            {userMsg && <p className="text-sm mb-3" style={{color: userMsg.includes('thành công') ? '#34D399' : '#F87171'}}>{userMsg}</p>}
            <button onClick={createUser} disabled={saving} style={btnPrimary}>{saving ? 'Đang tạo...' : '➕ Tạo user'}</button>
          </div>
        </div>
      )}

      {/* === TAB: PASSWORD === */}
      {tab === 'password' && (
        <div className="rounded-2xl p-6 max-w-lg" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">🔐 Đổi mật khẩu</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Tài khoản</p>
              <p className="text-sm font-semibold text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Mật khẩu hiện tại</p>
              <input type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} placeholder="Nhập mật khẩu hiện tại" style={inputStyle} />
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>Mật khẩu mới</p>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Tối thiểu 6 ký tự" style={inputStyle} />
            </div>
            {passMsg && <p className="text-sm" style={{color: passMsg.includes('thành công') ? '#34D399' : '#F87171'}}>{passMsg}</p>}
            <button onClick={changePassword} disabled={saving} style={btnPrimary}>{saving ? 'Đang xử lý...' : '🔐 Đổi mật khẩu'}</button>
          </div>
        </div>
      )}

      {/* === TAB: PRICING === */}
      {tab === 'pricing' && (
        <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">💰 Giá phòng — {building?.name}</h3>
          {priceMsg && <p className="text-sm mb-3" style={{color: priceMsg.includes('thành công') ? '#34D399' : '#F87171'}}>{priceMsg}</p>}
          <div className="space-y-2">
            {units.map((u: any) => (
              <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl" style={{background:'rgba(255,255,255,0.02)'}}>
                <div className="w-16 text-center">
                  <p className="text-xl font-black text-white">{u.name}</p>
                  <p className="text-[10px]" style={{color:'#3D5A80'}}>T{u.floor}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{u.type || 'Studio'}</p>
                  <p className="text-xs" style={{color:'#3D5A80'}}>Sức chứa: {u.capacity || '?'} người</p>
                </div>
                {editingUnit === u.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editPrice} onChange={e=>setEditPrice(e.target.value)} placeholder="VD: 800000"
                      style={{...inputStyle, width:'150px'}} />
                    <span className="text-xs" style={{color:'#3D5A80'}}>VND/đêm</span>
                    <button onClick={() => updatePrice(u.id)} disabled={saving}
                      className="px-3 py-2 rounded-lg text-xs font-bold"
                      style={{background:'rgba(16,185,129,0.15)',color:'#34D399',border:'1px solid rgba(16,185,129,0.25)',cursor:'pointer'}}>
                      {saving ? '...' : '✓ Lưu'}
                    </button>
                    <button onClick={() => setEditingUnit('')}
                      className="px-3 py-2 rounded-lg text-xs font-bold"
                      style={{background:'rgba(255,255,255,0.04)',color:'#94A3B8',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer'}}>
                      ✗
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold" style={{color:'#60A5FA'}}>{Number(u.basePrice || 0).toLocaleString('vi-VN')} ₫</p>
                    <span className="text-xs" style={{color:'#3D5A80'}}>/đêm</span>
                    <button onClick={() => { setEditingUnit(u.id); setEditPrice(u.basePrice?.toString() || ''); setPriceMsg(''); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',border:'1px solid rgba(59,130,246,0.25)',cursor:'pointer'}}>
                      ✏️ Sửa giá
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === TAB: AI AGENT === */}
      {tab === 'ai' && (
        <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">🤖 AI Agent</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#10B981'}}>Tên AI</p>
              <p className="text-lg font-bold" style={{color:'#34D399'}}>{s.ai_name || 'Lena'}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#3D6FA8'}}>Model</p>
              <p className="text-lg font-bold font-mono" style={{color:'#60A5FA'}}>claude-sonnet-4</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#7C3AED'}}>Tính năng</p>
              <p className="text-sm" style={{color:'#A78BFA'}}>Web Search · Đa ngôn ngữ · 24/7</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#10B981'}}>Trạng thái</p>
              <p className="text-lg font-bold" style={{color:'#34D399'}}>● Online</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="rounded-2xl p-6 mt-4" style={{background:'#0F1629',border:'1px solid rgba(239,68,68,0.15)'}}>
          <h3 className="text-lg font-bold mb-2" style={{color:'#F87171'}}>⚠️ Reset hệ thống</h3>
          <p className="text-sm mb-4" style={{color:'#4B6A8F'}}>
            Xóa toàn bộ: bookings, khách, check-in/out, incidents, reviews. Giữ lại: tòa nhà, phòng, nhân viên, kênh.
          </p>
          <p className="text-xs mb-4" style={{color:'#F87171'}}>⚠️ KHÔNG THỂ hoàn tác!</p>
          <button onClick={async () => {
            if (!confirm('XÓA TOÀN BỘ DỮ LIỆU VẬN HÀNH?')) return;
            if (!confirm('XÁC NHẬN LẦN 2?')) return;
            try {
              const res = await apiFetch('/auth/reset-system', { method: 'POST' });
              alert(res.message || 'Reset thành công!');
              window.location.reload();
            } catch (e) { alert('Lỗi: ' + e.message); }
          }}
            className="px-6 py-3 rounded-xl text-sm font-bold transition active:scale-95"
            style={{background:'rgba(239,68,68,0.15)',color:'#F87171',border:'2px solid rgba(239,68,68,0.3)'}}>
            🗑️ Reset toàn bộ dữ liệu vận hành
          </button>
        </div>
      )}
    </div>
  );
}
