export class SequenceAllocator {
  private current = 0

  next(): number {
    this.current += 1
    return this.current
  }

  peek(): number {
    return this.current
  }
}
