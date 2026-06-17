'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ChevronRight, X, ShieldAlert, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface SheetRow {
  _rowIndex: number
  정산그룹: string
  충전소ID: string
  충전소명: string
  정산주기: string
  매출분배율: string
  부지사용료: string
  정산단가: string
  위탁운영수수료: string
  '기타 조건': string
}

interface GroupSettings {
  정산주기: string
  매출분배율: string
  부지사용료: string
  정산단가: string
  위탁운영수수료: string
  '기타 조건': string
}

interface SettlementGroup {
  name: string
  settings: GroupSettings
  stations: { rowIndex: number; id: string; name: string }[]
}

const CYCLE_OPTIONS = ['월간 정산', '분기 정산', '반기 정산', '연간 정산']
const SHEET = '정산 그룹 관리'
const USER_ROLE = 'main_admin'

// ─── 접근 제어 ────────────────────────────────────────────────────────────────

export default function SettlementGroupPage() {
  if (USER_ROLE !== 'main_admin') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="정산 그룹 관리" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">접근 권한이 없습니다.</p>
            <p className="text-xs text-muted-foreground/70">이 페이지는 차지비 어드민만 접근할 수 있습니다.</p>
          </div>
        </div>
      </div>
    )
  }
  return <SettlementGroupContent />
}

// ─── 메인 컨텐츠 ─────────────────────────────────────────────────────────────

function SettlementGroupContent() {
  const [groups, setGroups] = useState<SettlementGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // 편집 중인 폼 상태
  const [formGroupName, setFormGroupName] = useState<string>('')
  const [formSettings, setFormSettings] = useState<GroupSettings | null>(null)
  const [newStation, setNewStation] = useState({ id: '', name: '' })
  const [addingStation, setAddingStation] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settlement-groups')
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const json: { data: SheetRow[] } = await res.json()
      const grouped = groupRows(json.data)
      setGroups(grouped)
      if (grouped.length > 0 && !selectedGroup) {
        setSelectedGroup(grouped[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => { fetchData() }, [])

  const currentGroup = groups.find((g) => g.name === selectedGroup)

  const handleSelectGroup = (name: string) => {
    setSelectedGroup(name)
    setEditMode(false)
    setFormSettings(null)
    setFormGroupName('')
    setNameError(null)
    setAddingStation(false)
  }

  const handleEdit = () => {
    if (!currentGroup) return
    setFormSettings({ ...currentGroup.settings })
    setFormGroupName(currentGroup.name)
    setNameError(null)
    setEditMode(true)
  }

  const handleCancel = () => {
    setEditMode(false)
    setFormSettings(null)
    setFormGroupName('')
    setNameError(null)
    setAddingStation(false)
    setNewStation({ id: '', name: '' })
  }

  const validateName = (raw: string): string | null => {
    const trimmed = raw.trim()
    if (!trimmed) return '그룹명을 입력해 주세요.'
    if (trimmed === currentGroup?.name) return null
    const conflict = groups.some((g) => g.name === trimmed)
    if (conflict) return '이미 존재하는 그룹명입니다.'
    return null
  }

  const handleSave = async () => {
    if (!currentGroup || !formSettings) return
    const nextName = formGroupName.trim()
    const err = validateName(nextName)
    if (err) {
      setNameError(err)
      return
    }
    setSaving(true)
    try {
      // 해당 그룹의 모든 행 settings + 그룹명 업데이트
      await Promise.all(
        currentGroup.stations.map((station) =>
          fetch('/api/settlement-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheet: SHEET,
              action: 'update',
              rowIndex: station.rowIndex,
              data: {
                정산그룹: nextName,
                충전소ID: station.id,
                충전소명: station.name,
                ...formSettings,
              },
            }),
          })
        )
      )
      // 새 그룹명 선택 유지
      if (nextName !== currentGroup.name) setSelectedGroup(nextName)
      await fetchData()
      setEditMode(false)
      setFormSettings(null)
      setFormGroupName('')
      setNameError(null)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveStation = async (rowIndex: number) => {
    setSaving(true)
    try {
      await fetch('/api/settlement-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: SHEET, action: 'delete', rowIndex }),
      })
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleAddStation = async () => {
    if (!currentGroup || !newStation.id.trim() || !newStation.name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/settlement-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: SHEET,
          action: 'create',
          data: {
            정산그룹: currentGroup.name,
            충전소ID: newStation.id,
            충전소명: newStation.name,
            ...currentGroup.settings,
          },
        }),
      })
      setNewStation({ id: '', name: '' })
      setAddingStation(false)
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="정산 그룹 관리" />

      {loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          데이터를 불러오는 중...
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-1 overflow-hidden p-6 gap-4">
          {/* 좌측: 정산그룹 목록 */}
          <div className="flex w-64 shrink-0 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              {groups.map((group) => {
                const isSelected = selectedGroup === group.name
                return (
                  <button
                    key={group.name}
                    onClick={() => handleSelectGroup(group.name)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card hover:bg-muted/50'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{group.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        충전소 {group.stations.length}개소 · {group.settings.정산주기}
                      </p>
                    </div>
                    <ChevronRight className={cn('ml-2 h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 우측: 상세 편집 */}
          {currentGroup && (
            <Card className="flex-1 overflow-y-auto shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
                <div className="min-w-0 flex-1">
                  {editMode ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">정산그룹명</label>
                      <input
                        type="text"
                        value={formGroupName}
                        onChange={(e) => {
                          setFormGroupName(e.target.value)
                          if (nameError) setNameError(null)
                        }}
                        className={cn(
                          'w-full max-w-sm rounded-md border px-3 py-1.5 text-base font-semibold outline-none transition-colors',
                          nameError
                            ? 'border-destructive focus:ring-1 focus:ring-destructive'
                            : 'border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary'
                        )}
                      />
                      {nameError && (
                        <p className="text-xs text-destructive">{nameError}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-base">{currentGroup.name}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">정산 조건 설정</p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!editMode && (
                    <Button size="sm" onClick={handleEdit}>수정</Button>
                  )}
                  {editMode && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>취소</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving || !!nameError}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '저장'}
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 정산 조건 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="정산주기">
                    <select
                      value={editMode ? formSettings?.정산주기 : currentGroup.settings.정산주기}
                      disabled={!editMode}
                      onChange={(e) => setFormSettings((p) => p ? { ...p, 정산주기: e.target.value } : p)}
                      className={fieldInputClass(editMode)}
                    >
                      {CYCLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>

                  <Field label="매출분배율">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editMode ? formSettings?.매출분배율 : currentGroup.settings.매출분배율}
                        disabled={!editMode}
                        onChange={(e) => setFormSettings((p) => p ? { ...p, 매출분배율: e.target.value } : p)}
                        className={cn(fieldInputClass(editMode), 'flex-1')}
                      />
                    </div>
                  </Field>

                  <Field label="부지사용료">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editMode ? formSettings?.부지사용료 : currentGroup.settings.부지사용료}
                        disabled={!editMode}
                        onChange={(e) => setFormSettings((p) => p ? { ...p, 부지사용료: e.target.value } : p)}
                        className={cn(fieldInputClass(editMode), 'flex-1')}
                      />
                    </div>
                  </Field>

                  <Field label="정산단가">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editMode ? formSettings?.정산단가 : currentGroup.settings.정산단가}
                        disabled={!editMode}
                        onChange={(e) => setFormSettings((p) => p ? { ...p, 정산단가: e.target.value } : p)}
                        className={cn(fieldInputClass(editMode), 'flex-1')}
                      />
                    </div>
                  </Field>

                  <Field label="위탁운영수수료">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editMode ? formSettings?.위탁운영수수료 : currentGroup.settings.위탁운영수수료}
                        disabled={!editMode}
                        onChange={(e) => setFormSettings((p) => p ? { ...p, 위탁운영수수료: e.target.value } : p)}
                        className={cn(fieldInputClass(editMode), 'flex-1')}
                      />
                    </div>
                  </Field>

                  <Field label="기타 조건">
                    <input
                      type="text"
                      value={editMode ? formSettings?.['기타 조건'] : currentGroup.settings['기타 조건']}
                      disabled={!editMode}
                      onChange={(e) => setFormSettings((p) => p ? { ...p, '기타 조건': e.target.value } : p)}
                      className={fieldInputClass(editMode)}
                    />
                  </Field>
                </div>

                {/* 소속 충전소 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      소속 충전소 ({currentGroup.stations.length}개소)
                    </p>
                    {editMode && !addingStation && (
                      <button
                        onClick={() => setAddingStation(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        충전소 추가
                      </button>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>충전소 ID</span>
                      <span>충전소명</span>
                      {editMode && <span />}
                    </div>

                    {currentGroup.stations.map((station) => (
                      <div
                        key={station.rowIndex}
                        className="grid grid-cols-[1fr_1.5fr_auto] items-center gap-3 border-b px-3 py-2.5 text-sm last:border-0"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{station.id}</span>
                        <span className="font-medium">{station.name}</span>
                        {editMode && (
                          <button
                            onClick={() => handleRemoveStation(station.rowIndex)}
                            disabled={saving}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {addingStation && (
                      <div className="grid grid-cols-[1fr_1.5fr_auto] items-center gap-3 border-t bg-muted/20 px-3 py-2">
                        <input
                          type="text"
                          value={newStation.id}
                          onChange={(e) => setNewStation((p) => ({ ...p, id: e.target.value }))}
                          placeholder="충전소 ID"
                          className="rounded border border-input bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={newStation.name}
                          onChange={(e) => setNewStation((p) => ({ ...p, name: e.target.value }))}
                          placeholder="충전소명"
                          className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleAddStation}
                            disabled={saving}
                            className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => { setAddingStation(false); setNewStation({ id: '', name: '' }) }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {currentGroup.stations.length === 0 && !addingStation && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        소속 충전소가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function groupRows(rows: SheetRow[]): SettlementGroup[] {
  const map = new Map<string, SettlementGroup>()
  for (const row of rows) {
    const name = String(row.정산그룹 ?? '').trim()
    if (!name) continue
    if (!map.has(name)) {
      map.set(name, {
        name,
        settings: {
          정산주기: String(row.정산주기 ?? ''),
          매출분배율: String(row.매출분배율 ?? ''),
          부지사용료: String(row.부지사용료 ?? ''),
          정산단가: String(row.정산단가 ?? ''),
          위탁운영수수료: String(row.위탁운영수수료 ?? ''),
          '기타 조건': String(row['기타 조건'] ?? ''),
        },
        stations: [],
      })
    }
    map.get(name)!.stations.push({
      rowIndex: row._rowIndex,
      id: String(row.충전소ID ?? ''),
      name: String(row.충전소명 ?? ''),
    })
  }
  return Array.from(map.values())
}

function fieldInputClass(editMode: boolean) {
  return cn(
    'w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors',
    editMode
      ? 'border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary'
      : 'border-transparent bg-muted/40 text-foreground cursor-default'
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
