import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

describe('NoteFlow API', () => {
  it('supports core note and folder persistence flows', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'noteflow-api-'))
    const { app, store } = createApp(tempDir)
    await store.ensure()

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@example.com', password: 'noteflow123' })
    expect(loginRes.status).toBe(200)
    const accessToken = loginRes.body.data.accessToken as string

    const authHeader = { Authorization: `Bearer ${accessToken}` }

    const foldersRes = await request(app).get('/api/v1/folders/tree').set(authHeader)
    expect(foldersRes.status).toBe(200)
    expect(Array.isArray(foldersRes.body.data)).toBe(true)

    const createFolderRes = await request(app)
      .post('/api/v1/folders')
      .set(authHeader)
      .send({ name: '后端联调', parentUid: null })
    expect(createFolderRes.status).toBe(200)
    const folderUid = createFolderRes.body.data.uid as string

    const createNoteRes = await request(app)
      .post('/api/v1/notes')
      .set(authHeader)
      .send({ title: '接口联调测试', folderUid })
    expect(createNoteRes.status).toBe(200)
    const noteUid = createNoteRes.body.data.uid as string

    const saveContentRes = await request(app)
      .put(`/api/v1/notes/${noteUid}/content`)
      .set(authHeader)
      .send({
        title: '接口联调测试',
        contentJson: { type: 'doc' },
        contentHtml: '<p>Hello NoteFlow</p>',
        contentText: 'Hello NoteFlow',
        wordCount: 2,
        clientUpdatedAt: new Date().toISOString(),
      })
    expect(saveContentRes.status).toBe(200)
    expect(saveContentRes.body.data.summary).toContain('Hello')

    const listNotesRes = await request(app)
      .get('/api/v1/notes')
      .set(authHeader)
      .query({ folderUid, includeDescendants: 'true', keyword: 'Hello' })
    expect(listNotesRes.status).toBe(200)
    expect(listNotesRes.body.data).toHaveLength(1)
    expect(listNotesRes.body.data[0].uid).toBe(noteUid)

    const noteDetailRes = await request(app).get(`/api/v1/notes/${noteUid}`).set(authHeader)
    expect(noteDetailRes.status).toBe(200)
    expect(noteDetailRes.body.data.contentHtml).toBe('<p>Hello NoteFlow</p>')

    const updateSettingsRes = await request(app)
      .put('/api/v1/me/settings')
      .set(authHeader)
      .send({ theme: 'dark', defaultFolderUid: folderUid })
    expect(updateSettingsRes.status).toBe(200)
    expect(updateSettingsRes.body.data.theme).toBe('dark')

    const rawDatabase = await readFile(path.join(tempDir, 'database.json'), 'utf8')
    expect(rawDatabase).toContain('接口联调测试')
    expect(rawDatabase).toContain('后端联调')
  })

  it('supports register then authenticated access', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'noteflow-api-register-'))
    const { app, store } = createApp(tempDir)
    await store.ensure()

    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        nickname: 'New User',
        email: 'new@example.com',
        password: 'abcdef123',
      })

    expect(registerRes.status).toBe(200)
    expect(registerRes.body.data.user.nickname).toBe('New User')

    const accessToken = registerRes.body.data.accessToken as string
    const meRes = await request(app)
      .get('/api/v1/me')
      .set({ Authorization: `Bearer ${accessToken}` })

    expect(meRes.status).toBe(200)
    expect(meRes.body.data.nickname).toBe('New User')
  })
})
