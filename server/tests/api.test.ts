import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

const describeIfDatabase = process.env.NOTEFLOW_RUN_DATABASE_TESTS === '1' ? describe : describe.skip

describeIfDatabase('NoteFlow API', () => {
  it('supports auth session lifecycle and protected access', async () => {
    const { app, store } = createApp()
    await store.ensure()

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@example.com', password: 'noteflow123' })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.data.accessToken).toBeTypeOf('string')
    expect(loginRes.body.data.refreshToken).toBeTypeOf('string')

    const meRes = await request(app)
      .get('/api/v1/me')
      .set({ Authorization: `Bearer ${loginRes.body.data.accessToken as string}` })

    expect(meRes.status).toBe(200)
    expect(meRes.body.data.nickname).toBeTruthy()

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: loginRes.body.data.refreshToken })

    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.data.refreshToken).not.toBe(loginRes.body.data.refreshToken)

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshRes.body.data.refreshToken })

    expect(logoutRes.status).toBe(200)

    const refreshAfterLogoutRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshRes.body.data.refreshToken })

    expect(refreshAfterLogoutRes.status).toBe(401)

    const authLogs = await store.prisma.operationLog.findMany({
      where: {
        action: { in: ['login', 'refresh', 'logout'] },
      },
    })
    expect(authLogs.length).toBeGreaterThanOrEqual(3)
  })

  it('supports note revisions and recycle bin flows', async () => {
    const { app, store } = createApp()
    await store.ensure()

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@example.com', password: 'noteflow123' })
    const accessToken = loginRes.body.data.accessToken as string
    const authHeader = { Authorization: `Bearer ${accessToken}` }

    const createFolderRes = await request(app)
      .post('/api/v1/folders')
      .set(authHeader)
      .send({ name: '鍚庣鑱旇皟', parentUid: null })
    expect(createFolderRes.status).toBe(200)
    const folderUid = createFolderRes.body.data.uid as string

    const createNoteRes = await request(app)
      .post('/api/v1/notes')
      .set(authHeader)
      .send({ title: '鎺ュ彛鑱旇皟娴嬭瘯', folderUid })
    expect(createNoteRes.status).toBe(200)
    const noteUid = createNoteRes.body.data.uid as string

    const firstSaveRes = await request(app)
      .put(`/api/v1/notes/${noteUid}/content`)
      .set(authHeader)
      .send({
        title: 'V1',
        contentJson: { type: 'doc' },
        contentHtml: '<p>Hello NoteFlow</p>',
        contentText: 'Hello NoteFlow',
        wordCount: 2,
        clientUpdatedAt: new Date().toISOString(),
      })
    expect(firstSaveRes.status).toBe(200)

    const secondSaveRes = await request(app)
      .put(`/api/v1/notes/${noteUid}/content`)
      .set(authHeader)
      .send({
        title: 'V2',
        contentJson: { type: 'doc', version: 2 },
        contentHtml: '<p>Hello Again</p>',
        contentText: 'Hello Again',
        wordCount: 2,
        clientUpdatedAt: new Date().toISOString(),
      })
    expect(secondSaveRes.status).toBe(200)
    expect(secondSaveRes.body.data.summary).toContain('Hello')

    const revisionsRes = await request(app)
      .get(`/api/v1/notes/${noteUid}/revisions`)
      .set(authHeader)
    expect(revisionsRes.status).toBe(200)
    expect(revisionsRes.body.data.length).toBeGreaterThanOrEqual(2)

    const restoreRes = await request(app)
      .post(`/api/v1/notes/${noteUid}/restore`)
      .set(authHeader)
      .send({ versionNo: 1 })
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.title).toBe('鎺ュ彛鑱旇皟娴嬭瘯')

    const deleteNoteRes = await request(app)
      .delete(`/api/v1/notes/${noteUid}`)
      .set(authHeader)
    expect(deleteNoteRes.status).toBe(200)

    const recycleListRes = await request(app)
      .get('/api/v1/recycle-bin/notes')
      .set(authHeader)
    expect(recycleListRes.status).toBe(200)
    expect(recycleListRes.body.data).toHaveLength(1)

    const recoverRes = await request(app)
      .post(`/api/v1/recycle-bin/notes/${noteUid}/recover`)
      .set(authHeader)
    expect(recoverRes.status).toBe(200)
    expect(recoverRes.body.data.uid).toBe(noteUid)

    const deleteAgainRes = await request(app)
      .delete(`/api/v1/notes/${noteUid}`)
      .set(authHeader)
    expect(deleteAgainRes.status).toBe(200)

    const permanentDeleteRes = await request(app)
      .delete(`/api/v1/recycle-bin/notes/${noteUid}`)
      .set(authHeader)
    expect(permanentDeleteRes.status).toBe(200)

    const noteLogs = await store.prisma.operationLog.findMany({
      where: {
        action: {
          in: ['create', 'save_content', 'restore_revision', 'delete', 'recover', 'permanent_delete'],
        },
      },
    })
    expect(noteLogs.length).toBeGreaterThanOrEqual(6)
  })

  it('supports register then authenticated access', async () => {
    const { app, store } = createApp()
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

    const meRes = await request(app)
      .get('/api/v1/me')
      .set({ Authorization: `Bearer ${registerRes.body.data.accessToken as string}` })

    expect(meRes.status).toBe(200)
    expect(meRes.body.data.nickname).toBe('New User')

    const registerLogs = await store.prisma.operationLog.findMany({
      where: {
        action: 'register',
      },
    })
    expect(registerLogs.length).toBeGreaterThanOrEqual(1)
  })
})
