import { createApp } from './app'

const { app, store } = createApp()
const port = store.config.port

await store.ensure()

app.listen(port, '127.0.0.1', () => {
  console.log(`NoteFlow API server listening on http://127.0.0.1:${port}`)
})
