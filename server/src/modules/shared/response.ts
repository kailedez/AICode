import type { Response } from 'express'

export function sendOk<T>(res: Response, data: T, message = 'ok') {
  res.json({
    code: 0,
    message,
    data,
    requestId: res.locals.requestId as string,
  })
}
