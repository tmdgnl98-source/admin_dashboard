/**
 * 충전소 데이터 어댑터.
 * 17,000 충전소 데이터는 결국 회사 DB API에서 가져온다. 지금은 mock seed.
 */

export type StationStatus = 'active' | 'inactive' | 'maintenance' | 'fault'

export type FacilityType =
  | 'apartment'      // 아파트
  | 'office'         // 사무실/오피스
  | 'mart'           // 마트/대형마트
  | 'public'         // 공공시설
  | 'roadside'       // 도로변
  | 'parking'        // 일반 주차장
  | 'gas_station'    // 주유소
  | 'other'

export interface ChargingStation {
  id: string                  // 충전소 ID
  name: string                // 충전소명
  address: string
  businessNo?: string         // 소유주 사업자번호
  ownerName?: string          // 소유주명/상호
  contactPhone?: string
  installedAt?: string        // 'YYYY-MM-DD'
  status: StationStatus
  chargerCount: number
  facilityType?: FacilityType
  operatingHours?: string     // '24시간', '06:00-24:00'
  contractEndAt?: string      // 'YYYY-MM-DD' (계약 만료일)
  monthlyRevenue?: number     // 이번달 매출 (원)
  monthlyUsageCount?: number  // 이번달 충전 건수
  uptime30d?: number          // 최근 30일 가동률 0~1
  lastInspectionAt?: string   // 마지막 점검일
  nextInspectionAt?: string   // 다음 점검 예정일
}

export type ChargerStatus = 'normal' | 'charging' | 'fault' | 'maintenance' | 'offline'
export type ChargerType = 'fast' | 'slow'
export type ConnectorType = 'DC_COMBO' | 'CHADEMO' | 'AC_3P' | 'AC_SINGLE'

export interface ActiveSession {
  startedAt: Date
  soc: number              // 0~100 (%) 현재 충전율
  energyKwh: number        // 누적 충전량
  userAlias: string        // 익명화된 사용자 표시 (e.g. user_2847)
}

export interface Charger {
  id: string
  stationId: string
  serial: string
  type: ChargerType                  // 급속/완속
  capacity: number                   // kW
  connectorType: ConnectorType
  status: ChargerStatus
  firmwareVersion?: string
  lastSeenAt?: Date
  todayUsageCount?: number           // 오늘 충전 건수
  currentSession?: ActiveSession     // 현재 충전 중인 세션 (status==='charging' 일 때)
}

export interface StationQuery {
  ownerBusinessNo?: string
  ids?: string[]
  status?: StationStatus
  search?: string
  limit?: number
  offset?: number
}

export interface StationAdapter {
  listStations(q: StationQuery): Promise<{ items: ChargingStation[]; total: number }>
  getStation(id: string): Promise<ChargingStation | null>
  /** 사업자번호로 해당 파트너 소유의 충전소 후보 조회 — 가입 시 자동매칭에 사용 */
  findStationsByBusinessNo(businessNo: string): Promise<ChargingStation[]>
  listChargers(stationId: string): Promise<Charger[]>
  /** 여러 충전소의 모든 충전기를 한번에 조회 */
  listChargersByStations(stationIds: string[]): Promise<Charger[]>
}

// ─── UI 라벨 매핑 ───────────────────────────────────────────────────

export const STATION_STATUS_LABEL: Record<StationStatus, string> = {
  active: '정상',
  inactive: '비활성',
  maintenance: '점검중',
  fault: '고장',
}

export const CHARGER_STATUS_LABEL: Record<ChargerStatus, string> = {
  normal: '대기',
  charging: '충전중',
  fault: '고장',
  maintenance: '점검중',
  offline: '미연결',
}

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  apartment: '아파트',
  office: '사무실',
  mart: '대형마트',
  public: '공공시설',
  roadside: '도로변',
  parking: '주차장',
  gas_station: '주유소',
  other: '기타',
}

export const CONNECTOR_TYPE_LABEL: Record<ConnectorType, string> = {
  DC_COMBO: 'DC 콤보',
  CHADEMO: 'CHAdeMO',
  AC_3P: 'AC 3상',
  AC_SINGLE: 'AC 단상',
}
