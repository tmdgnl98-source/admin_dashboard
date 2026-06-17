'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Search, X } from 'lucide-react'

interface ChargingRecord {
  주문번호: string
  주문유형: string
  충전소명: string
  충전소ID: string | number
  충전기번호: string | number
  충전기유형: string
  로밍사업자: string
  충전시작일시: string
  충전종료일시: string
  충전시간: string
  충전량: string | number
  매출인식금액: string | number
  충전금액: string | number
  결제수단: string
  정산그룹명?: string
}

const COLUMNS: { key: keyof ChargingRecord; label: string; className?: string }[] = [
  { key: '주문번호', label: '주문번호', className: 'min-w-[140px] font-mono' },
  { key: '주문유형', label: '주문유형', className: 'min-w-[80px]' },
  { key: '충전소명', label: '충전소명', className: 'min-w-[150px]' },
  { key: '충전소ID', label: '충전소ID', className: 'min-w-[100px] font-mono' },
  { key: '충전기번호', label: '충전기번호', className: 'min-w-[80px] text-right' },
  { key: '충전기유형', label: '충전기유형', className: 'min-w-[80px]' },
  { key: '로밍사업자', label: '로밍사업자', className: 'min-w-[100px]' },
  { key: '충전시작일시', label: '충전시작일시', className: 'min-w-[150px]' },
  { key: '충전종료일시', label: '충전종료일시', className: 'min-w-[150px]' },
  { key: '충전시간', label: '충전시간', className: 'min-w-[80px] text-right' },
  { key: '충전량', label: '충전량', className: 'min-w-[80px] text-right' },
  { key: '매출인식금액', label: '매출인식금액', className: 'min-w-[110px] text-right' },
  { key: '충전금액', label: '충전금액', className: 'min-w-[100px] text-right' },
  { key: '결제수단', label: '결제수단', className: 'min-w-[100px]' },
]

const PAGE_SIZE = 20

export default function ChargingHistoryPage() {
  const [records, setRecords] = useState<ChargingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // 충전소 필터
  const [selectedStationId, setSelectedStationId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    fetch('/api/charging-history')
      .then((res) => {
        if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
        return res.json()
      })
      .then((json) => {
        setRecords(json.data ?? [])
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.')
      })
      .finally(() => setLoading(false))
  }, [])

  // 충전소 목록 (드롭다운 옵션) — 충전소ID 기준 distinct, 충전소명 함께
  const stationOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      const id = String(r.충전소ID ?? '').trim()
      const name = String(r.충전소명 ?? '').trim()
      if (id && !map.has(id)) map.set(id, name || id)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [records])

  // 필터 적용
  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return records.filter((r) => {
      if (selectedStationId && String(r.충전소ID) !== selectedStationId) return false
      if (query) {
        const name = String(r.충전소명 ?? '').toLowerCase()
        const id = String(r.충전소ID ?? '').toLowerCase()
        if (!name.includes(query) && !id.includes(query)) return false
      }
      return true
    })
  }, [records, selectedStationId, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRecords = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setPage(1)
  }, [selectedStationId, searchQuery])

  const hasFilter = selectedStationId !== '' || searchQuery !== ''

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전 이력" />

      <div className="flex flex-1 flex-col overflow-hidden p-6 gap-3">
        {/* 충전소 필터 블록 */}
        <Card className="shadow-sm">
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">충전소 선택</label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                disabled={loading || !!error}
                className="min-w-[220px] rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <option value="">전체 충전소 ({stationOptions.length}개소)</option>
                {stationOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">직접 검색</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="충전소명 또는 ID"
                  className="w-64 rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {hasFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStationId('')
                  setSearchQuery('')
                }}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" />
                필터 초기화
              </Button>
            )}

            <p className="ml-auto self-center text-xs text-muted-foreground">
              {hasFilter ? (
                <>
                  필터 결과 <span className="font-medium text-foreground">{filteredRecords.length.toLocaleString()}</span>건
                  <span className="text-muted-foreground/60"> / 전체 {records.length.toLocaleString()}건</span>
                </>
              ) : (
                <>
                  전체 <span className="font-medium text-foreground">{records.length.toLocaleString()}</span>건
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 테이블 카드 */}
        <Card className="flex flex-1 flex-col overflow-hidden shadow-sm">
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            {loading && (
              <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                데이터를 불러오는 중...
              </div>
            )}

            {error && (
              <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {COLUMNS.map((col) => (
                          <TableHead key={col.key} className={col.className}>
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRecords.map((row, i) => (
                        <TableRow key={String(row.주문번호) || i}>
                          {COLUMNS.map((col) => (
                            <TableCell key={col.key} className={col.className}>
                              {String(row[col.key] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {pageRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={COLUMNS.length} className="py-16 text-center text-sm text-muted-foreground">
                            조건에 맞는 충전 이력이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {filteredRecords.length === 0
                      ? '0건'
                      : `${((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–${Math.min(safePage * PAGE_SIZE, filteredRecords.length).toLocaleString()} / ${filteredRecords.length.toLocaleString()}건`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[80px] text-center text-xs text-muted-foreground">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={safePage === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
