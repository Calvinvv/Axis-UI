export class HarnessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'HarnessError'
  }
}
