import type {
  StationAdapter,
  ChargingStation,
  Charger,
  ChargerStatus,
  ConnectorType,
  StationQuery,
  ActiveSession,
} from './types'

const MOCK_STATIONS: ChargingStation[] = [
  { id: 'CS001', name: '강남 충전소', address: '서울 강남구 테헤란로 152', businessNo: '1234567890', ownerName: '(주)강남파트너', contactPhone: '010-1111-1111', installedAt: '2023-04-12', status: 'active', chargerCount: 4, facilityType: 'office', operatingHours: '24시간', contractEndAt: '2026-03-31', monthlyRevenue: 12_800_000, monthlyUsageCount: 1_240, uptime30d: 0.992, lastInspectionAt: '2026-04-15', nextInspectionAt: '2026-07-15' },
  { id: 'CS023', name: '신촌 충전소', address: '서울 서대문구 연세로 50', businessNo: '2234567890', ownerName: '신촌상사', contactPhone: '010-2222-2222', installedAt: '2023-08-01', status: 'maintenance', chargerCount: 3, facilityType: 'roadside', operatingHours: '06:00-24:00', contractEndAt: '2026-07-31', monthlyRevenue: 8_300_000, monthlyUsageCount: 870, uptime30d: 0.954, lastInspectionAt: '2026-05-10', nextInspectionAt: '2026-06-15' },
  { id: 'CS047', name: '홍대 충전소', address: '서울 마포구 와우산로 94', businessNo: '3234567890', ownerName: '홍대모빌리티', contactPhone: '010-3333-3333', installedAt: '2024-01-15', status: 'fault', chargerCount: 6, facilityType: 'parking', operatingHours: '24시간', contractEndAt: '2026-06-30', monthlyRevenue: 18_400_000, monthlyUsageCount: 1_850, uptime30d: 0.871, lastInspectionAt: '2026-03-20', nextInspectionAt: '2026-06-20' },
  { id: 'CS089', name: '잠실 충전소', address: '서울 송파구 올림픽로 240', businessNo: '4234567890', ownerName: '잠실에너지', contactPhone: '010-4444-4444', installedAt: '2022-11-22', status: 'maintenance', chargerCount: 4, facilityType: 'apartment', operatingHours: '24시간', contractEndAt: '2025-11-22', monthlyRevenue: 11_200_000, monthlyUsageCount: 1_010, uptime30d: 0.948, lastInspectionAt: '2026-04-30', nextInspectionAt: '2026-06-30' },
  { id: 'CS112', name: '판교 충전소', address: '경기 성남시 분당구 판교역로 235', businessNo: '5234567890', ownerName: '판교플랫폼', contactPhone: '010-5555-5555', installedAt: '2024-03-10', status: 'active', chargerCount: 8, facilityType: 'office', operatingHours: '24시간', contractEndAt: '2027-03-10', monthlyRevenue: 24_500_000, monthlyUsageCount: 2_410, uptime30d: 0.997, lastInspectionAt: '2026-05-01', nextInspectionAt: '2026-08-01' },
  { id: 'CS128', name: '서초 충전소', address: '서울 서초구 강남대로 373', businessNo: '1234567890', ownerName: '(주)강남파트너', contactPhone: '010-1111-1111', installedAt: '2024-06-01', status: 'active', chargerCount: 2, facilityType: 'mart', operatingHours: '10:00-22:00', contractEndAt: '2027-06-01', monthlyRevenue: 5_600_000, monthlyUsageCount: 520, uptime30d: 0.988, lastInspectionAt: '2026-04-20', nextInspectionAt: '2026-07-20' },
  { id: 'CS156', name: '여의도 충전소', address: '서울 영등포구 여의대로 24', businessNo: '6234567890', ownerName: '여의도파킹', contactPhone: '010-6666-6666', installedAt: '2024-08-15', status: 'active', chargerCount: 5, facilityType: 'parking', operatingHours: '24시간', contractEndAt: '2027-08-15', monthlyRevenue: 15_900_000, monthlyUsageCount: 1_580, uptime30d: 0.981, lastInspectionAt: '2026-05-05', nextInspectionAt: '2026-08-05' },
  { id: 'CS174', name: '코엑스 충전소', address: '서울 강남구 영동대로 513', businessNo: '7234567890', ownerName: '코엑스에너지', contactPhone: '010-7777-7777', installedAt: '2023-12-01', status: 'active', chargerCount: 10, facilityType: 'mart', operatingHours: '08:00-23:00', contractEndAt: '2026-12-01', monthlyRevenue: 32_100_000, monthlyUsageCount: 3_080, uptime30d: 0.978, lastInspectionAt: '2026-04-25', nextInspectionAt: '2026-07-25' },
  { id: 'CS201', name: '광화문 충전소', address: '서울 종로구 세종대로 175', businessNo: '8234567890', ownerName: '광화문공영', contactPhone: '010-8888-8888', installedAt: '2024-05-20', status: 'active', chargerCount: 3, facilityType: 'public', operatingHours: '06:00-22:00', contractEndAt: '2027-05-20', monthlyRevenue: 6_700_000, monthlyUsageCount: 640, uptime30d: 0.965, lastInspectionAt: '2026-05-08', nextInspectionAt: '2026-08-08' },
  { id: 'CS233', name: '용산역 충전소', address: '서울 용산구 한강대로 23', businessNo: '9234567890', ownerName: '용산모빌', contactPhone: '010-9999-9999', installedAt: '2024-09-10', status: 'inactive', chargerCount: 4, facilityType: 'parking', operatingHours: '24시간', contractEndAt: '2027-09-10', monthlyRevenue: 0, monthlyUsageCount: 0, uptime30d: 0.0, lastInspectionAt: '2026-05-12', nextInspectionAt: '2026-08-12' },
]

// ─── 충전기 생성 (deterministic, stationId 기반) ────────────────────

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pickStatus(seed: number, stationStatus: ChargingStation['status']): ChargerStatus {
  if (stationStatus === 'fault') {
    return ['fault', 'fault', 'normal', 'offline'][seed % 4] as ChargerStatus
  }
  if (stationStatus === 'maintenance') {
    return ['maintenance', 'normal', 'charging'][seed % 3] as ChargerStatus
  }
  if (stationStatus === 'inactive') return 'offline'
  // active: 60% normal, 30% charging, 7% maintenance, 3% fault
  const r = seed % 100
  if (r < 60) return 'normal'
  if (r < 90) return 'charging'
  if (r < 97) return 'maintenance'
  return 'fault'
}

function makeCharger(station: ChargingStation, index: number): Charger {
  const seed = hashSeed(`${station.id}-${index}`)
  const isFast = (seed % 2) === 0
  const status = pickStatus(seed, station.status)
  const connectorType: ConnectorType = isFast
    ? (seed % 3 === 0 ? 'CHADEMO' : 'DC_COMBO')
    : (seed % 2 === 0 ? 'AC_3P' : 'AC_SINGLE')

  const charger: Charger = {
    id: `${station.id}-${index + 1}`,
    stationId: station.id,
    serial: `SN-${station.id}-${(index + 1).toString().padStart(3, '0')}`,
    type: isFast ? 'fast' : 'slow',
    capacity: isFast ? (seed % 2 === 0 ? 100 : 50) : 7,
    connectorType,
    status,
    firmwareVersion: `${1 + (seed % 3)}.${(seed >> 2) % 10}.${(seed >> 4) % 20}`,
    lastSeenAt: status === 'offline'
      ? new Date(Date.now() - (1 + (seed % 12)) * 60 * 60 * 1000)
      : new Date(Date.now() - ((seed % 60) * 1000)),
    todayUsageCount: status === 'offline' ? 0 : 3 + (seed % 18),
  }

  if (status === 'charging') {
    const minutesAgo = 5 + (seed % 50)
    charger.currentSession = {
      startedAt: new Date(Date.now() - minutesAgo * 60 * 1000),
      soc: Math.min(99, 10 + Math.floor((seed % 90))),
      energyKwh: Math.round((minutesAgo / 60 * charger.capacity * 0.6) * 10) / 10,
      userAlias: `user_${1000 + (seed % 9000)}`,
    } as ActiveSession
  }

  return charger
}

function chargersFor(station: ChargingStation): Charger[] {
  return Array.from({ length: station.chargerCount }, (_, i) => makeCharger(station, i))
}

export const mockStationAdapter: StationAdapter = {
  async listStations(q: StationQuery) {
    let items = MOCK_STATIONS.slice()
    if (q.ownerBusinessNo) {
      items = items.filter(s => s.businessNo === q.ownerBusinessNo)
    }
    if (q.ids?.length) {
      const ids = new Set(q.ids)
      items = items.filter(s => ids.has(s.id))
    }
    if (q.status) {
      items = items.filter(s => s.status === q.status)
    }
    if (q.search) {
      const k = q.search.toLowerCase()
      items = items.filter(s =>
        s.name.toLowerCase().includes(k) ||
        s.id.toLowerCase().includes(k) ||
        s.address.toLowerCase().includes(k),
      )
    }
    const total = items.length
    const offset = q.offset ?? 0
    const limit = q.limit ?? 50
    return { items: items.slice(offset, offset + limit), total }
  },

  async getStation(id) {
    return MOCK_STATIONS.find(s => s.id === id) ?? null
  },

  async findStationsByBusinessNo(businessNo) {
    return MOCK_STATIONS.filter(s => s.businessNo === businessNo)
  },

  async listChargers(stationId) {
    const station = MOCK_STATIONS.find(s => s.id === stationId)
    return station ? chargersFor(station) : []
  },

  async listChargersByStations(stationIds) {
    const set = new Set(stationIds)
    const stations = MOCK_STATIONS.filter(s => set.has(s.id))
    return stations.flatMap(s => chargersFor(s))
  },
}
