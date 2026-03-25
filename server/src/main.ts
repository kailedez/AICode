import { createApp } from './app'

const port = Number(process.env.PORT ?? 3001)
const { app, store } = createApp()

await store.ensure()

app.listen(port, '127.0.0.1', () => {
  console.log(`NoteFlow API server listening on http://127.0.0.1:${port}`)
})
