export class HttpError extends Error {
  readonly statusCode: number
  readonly code: number

  constructor(statusCode: number, code: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}
