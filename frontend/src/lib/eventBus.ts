type Listener<T> = (payload: T) => void

export class EventBus<T> {
  private listeners = new Set<Listener<T>>()

  emit(payload: T) {
    this.listeners.forEach((listener) => listener(payload))
  }

  subscribe(listener: Listener<T>) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
