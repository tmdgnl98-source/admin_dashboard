// 개발 데모용 더미 데이터셋.
// - 충전소 20개를 4개의 더미 정산그룹에 5개씩 분배
// - 2025-06-01 ~ 2026-05-31 (직전 1년) 사이 충전건 약 10,000건 생성
// - Apps Script에서 받은 실데이터와 동일한 컬럼/형식을 따라가도록 맞춤

export interface DummyStation {
  id: number
  name: string
  group: string
}

export interface DummyGroupConfig {
  정산그룹: string
  정산주기: '월' | '분기' | '반기' | '년'
  매출분배율: number
  부지사용료: number
  정산단가: number
  위탁운영수수료: number
}

// 정산식 다양성을 위해 그룹별로 설정값을 달리 둠
export const DUMMY_GROUPS: DummyGroupConfig[] = [
  { 정산그룹: '더미운영A', 정산주기: '월',   매출분배율: 0.15, 부지사용료: 500000, 정산단가: 0, 위탁운영수수료: 200000 },
  { 정산그룹: '더미운영B', 정산주기: '분기', 매출분배율: 0.12, 부지사용료: 300000, 정산단가: 0, 위탁운영수수료: 150000 },
  { 정산그룹: '더미운영C', 정산주기: '월',   매출분배율: 0.18, 부지사용료: 0,      정산단가: 0, 위탁운영수수료: 250000 },
  { 정산그룹: '더미운영D', 정산주기: '반기', 매출분배율: 0.20, 부지사용료: 800000, 정산단가: 0, 위탁운영수수료: 0 },
]

export const DUMMY_STATIONS: DummyStation[] = [
  { id: 700001, name: '강남센터점', group: '더미운영A' },
  { id: 700002, name: '강남2호점', group: '더미운영A' },
  { id: 700003, name: '역삼본점', group: '더미운영A' },
  { id: 700004, name: '논현지점', group: '더미운영A' },
  { id: 700005, name: '청담지점', group: '더미운영A' },
  { id: 700006, name: '판교 디지털센터', group: '더미운영B' },
  { id: 700007, name: '판교 테크노밸리', group: '더미운영B' },
  { id: 700008, name: '분당서현점', group: '더미운영B' },
  { id: 700009, name: '분당정자점', group: '더미운영B' },
  { id: 700010, name: '광교 갤러리아', group: '더미운영B' },
  { id: 700011, name: '인천공항 T1', group: '더미운영C' },
  { id: 700012, name: '인천공항 T2', group: '더미운영C' },
  { id: 700013, name: '인천공항 화물청사', group: '더미운영C' },
  { id: 700014, name: '김포공항 국제선', group: '더미운영C' },
  { id: 700015, name: '김포공항 국내선', group: '더미운영C' },
  { id: 700016, name: '제주공항 1주차장', group: '더미운영D' },
  { id: 700017, name: '제주공항 2주차장', group: '더미운영D' },
  { id: 700018, name: '서귀포중문점', group: '더미운영D' },
  { id: 700019, name: '제주시청점', group: '더미운영D' },
  { id: 700020, name: '함덕해변점', group: '더미운영D' },
]

// 충전이력 한 건의 형태 — 실데이터 컬럼과 동일하게 맞춤
export interface DummyChargingRecord {
  주문번호: string
  주문유형: string
  충전소명: string
  충전소ID: number
  충전기번호: number
  충전기유형: string
  로밍사업자: string
  충전시작일시: string
  충전종료일시: string
  충전시간: string
  충전량: number
  매출인식금액: number
  충전금액: number
  결제수단: string
  정산그룹명: string
}

// 시드 기반 PRNG (mulberry32) — 모듈 로드 시 매번 동일한 결과 생성
function makeRng(seed: number) {
  let s = seed >>> 0
  return function next(): number {
    s |= 0
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PAYMENT_METHODS = ['신용카드', '체크카드', '간편결제', 'null']
const ORDER_TYPES = ['충전주문', '로밍인바운드']
const CHARGER_TYPES = ['완속', '급속']
const ROAMING_PROVIDERS = ['환경부', '한국전력', 'EVgo', 'null']

function pickWeighted<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// 메모이즈 — 첫 호출 시 1만 건 생성하고 이후로는 재사용
let cached: DummyChargingRecord[] | null = null

export function getDummyChargingHistory(count = 10000): DummyChargingRecord[] {
  if (cached) return cached
  const rng = makeRng(20260610)
  const records: DummyChargingRecord[] = []

  // 기간: 2025-06-01 00:00 KST ~ 2026-06-01 00:00 KST 직전 (UTC 기준 ms 범위)
  const startUtcMs = Date.UTC(2025, 5, 1) - 9 * 60 * 60 * 1000  // 2025-06-01 00:00 KST → UTC
  const endUtcMs = Date.UTC(2026, 5, 1) - 9 * 60 * 60 * 1000     // 2026-06-01 00:00 KST → UTC
  const span = endUtcMs - startUtcMs

  for (let i = 0; i < count; i++) {
    const station = DUMMY_STATIONS[Math.floor(rng() * DUMMY_STATIONS.length)]
    const orderType = pickWeighted(rng, ORDER_TYPES, [0.7, 0.3])
    const chargerType = pickWeighted(rng, CHARGER_TYPES, [0.55, 0.45])
    const roaming = orderType === '로밍인바운드'
      ? pickWeighted(rng, ROAMING_PROVIDERS.slice(0, 3), [0.7, 0.2, 0.1])
      : 'null'
    const payment = orderType === '로밍인바운드'
      ? 'null'
      : pickWeighted(rng, PAYMENT_METHODS.slice(0, 3), [0.55, 0.30, 0.15])

    const startMs = startUtcMs + Math.floor(rng() * span)
    // 충전 시간: 완속 2~10h, 급속 0.3~1.5h
    const hoursPower = chargerType === '완속' ? 2 + rng() * 8 : 0.3 + rng() * 1.2
    const endMs = startMs + Math.floor(hoursPower * 60 * 60 * 1000)

    // 충전량(kWh): 완속 15~55, 급속 10~40
    const kwh = chargerType === '완속'
      ? Math.round((15 + rng() * 40) * 100) / 100
      : Math.round((10 + rng() * 30) * 100) / 100

    // 단가(원/kWh) — 250~330 변동
    const unitPrice = 250 + Math.floor(rng() * 80)
    const revenue = Math.round(kwh * unitPrice)  // 매출인식금액
    const chargeAmount = orderType === '로밍인바운드'
      ? revenue + Math.floor(rng() * 800)        // 로밍은 부가비용 발생
      : revenue                                  // 충전주문은 동일

    const orderNo = `D${formatYYMMDD(new Date(startMs + 9 * 60 * 60 * 1000))}${String(i).padStart(8, '0')}`
    const chargerNo = station.id * 10000 + Math.floor(rng() * 9000) + 1000

    records.push({
      주문번호: orderNo,
      주문유형: orderType,
      충전소명: station.name,
      충전소ID: station.id,
      충전기번호: chargerNo,
      충전기유형: chargerType,
      로밍사업자: roaming,
      충전시작일시: new Date(startMs).toISOString(),
      충전종료일시: new Date(endMs).toISOString(),
      충전시간: formatDurationLegacy(endMs - startMs),
      충전량: kwh,
      매출인식금액: revenue,
      충전금액: chargeAmount,
      결제수단: payment,
      정산그룹명: station.group,
    })
  }

  cached = records
  return records
}

// Apps Script의 충전시간 컬럼은 1899-12-29T... 형식이라 흉내내기 (HH:MM:SS만 의미)
function formatDurationLegacy(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')
  return `1899-12-29T${h}:${m}:${s}.000Z`
}

function formatYYMMDD(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

// settlement-groups API에 머지할 더미 그룹 행 (시트 컬럼과 동일 스키마)
export interface DummyGroupRow {
  _rowIndex: number
  정산그룹: string
  충전소ID: number
  충전소명: string
  정산주기: string
  매출분배율: number
  부지사용료: number
  정산단가: number
  위탁운영수수료: number
  '기타 조건': string
}

export function getDummyGroupRows(startRowIndex = 1000): DummyGroupRow[] {
  const groupMap = new Map(DUMMY_GROUPS.map((g) => [g.정산그룹, g]))
  return DUMMY_STATIONS.map((station, i) => {
    const cfg = groupMap.get(station.group)!
    return {
      _rowIndex: startRowIndex + i,
      정산그룹: station.group,
      충전소ID: station.id,
      충전소명: station.name,
      정산주기: cfg.정산주기,
      매출분배율: cfg.매출분배율,
      부지사용료: cfg.부지사용료,
      정산단가: cfg.정산단가,
      위탁운영수수료: cfg.위탁운영수수료,
      '기타 조건': '',
    }
  })
}
