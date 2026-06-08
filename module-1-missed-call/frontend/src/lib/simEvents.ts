import type { CallRecord } from '../types'
type Handler = (r: CallRecord) => void
const handlers: Handler[] = []
export const onSimComplete = (h: Handler) => {
  handlers.push(h)
  return () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1) }
}
export const emitSimComplete = (r: CallRecord) => handlers.forEach(h => h(r))
