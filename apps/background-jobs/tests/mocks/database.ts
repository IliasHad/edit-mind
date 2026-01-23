/**
 * Mock database models for testing
 * Provides in-memory storage without requiring a real database
 */
import { faker } from '@faker-js/faker'
import {
  Chat,
  ChatMessage,
  Collection,
  Export,
  Folder,
  Job,
  User,
  UserRole,
  FolderStatus,
  JobStatus,
  JobStage,
  Sender,
  CollectionType,
  CollectionStatus,
  ExportStatus,
  Prisma,
} from '@prisma/client'
import { nanoid } from 'nanoid'

/**
 * Mock User model
 */
export const MockUserModel = {
  data: new Map<string, User>(),

  async findUnique({ where }: { where: { id: string } }): Promise<User | null> {
    return this.data.get(where.id) || null
  },

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.data.values()) {
      if (user.email === email) return user
    }
    return null
  },

  async create(data: Partial<User>): Promise<User> {
    const user: User = {
      id: data.id || nanoid(4),
      email: data.email || faker.internet.email(),
      name: data.name || 'Test User',
      password: data.password || 'hashed-password',
      role: data.role || UserRole.user,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.data.set(user.id, user)
    return user
  },

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.data.get(id)
    if (!user) return null
    const updated = { ...user, ...data, updatedAt: new Date() }
    this.data.set(id, updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock Chat model
 */
export const MockChatModel = {
  data: new Map<string, Chat>(),

  async findById(id: string): Promise<Chat | null> {
    return this.data.get(id) || null
  },

  async findByUserId(userId: string): Promise<Chat[]> {
    const chats: Chat[] = []
    for (const chat of this.data.values()) {
      if (chat.userId === userId) chats.push(chat)
    }
    return chats
  },

  async create(data: Partial<Chat>): Promise<Chat> {
    const chat: Chat = {
      id: data.id || nanoid(4),
      userId: data.userId || nanoid(4),
      title: data.title || 'Test Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      isLocked: data.isLocked || false,
      lockReason: data.lockReason || null,
      projectId: data.projectId || null,
    }
    this.data.set(chat.id, chat)
    return chat
  },

  async update(id: string, data: Partial<Chat>): Promise<Chat | null> {
    const chat = this.data.get(id)
    if (!chat) return null
    const updated = { ...chat, ...data, updatedAt: new Date() }
    this.data.set(id, updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock Export model
 */
export const MockExportModel = {
  data: new Map<string, Export>(),

  async findById(id: string): Promise<Export | null> {
    return this.data.get(id) || null
  },

  async findByUserId(userId: string): Promise<Export[]> {
    const exports: Export[] = []
    for (const exp of this.data.values()) {
      if (exp.userId === userId) exports.push(exp)
    }
    return exports
  },

  async create(data: Partial<Export>): Promise<Export> {
    const exp: Export = {
      id: data.id || nanoid(4),
      userId: data.userId || nanoid(4),
      sceneIds: data.sceneIds || [],
      name: data.name || 'Test Export',
      status: data.status || ExportStatus.created,
      createdAt: new Date(),
      updatedAt: new Date(),
      collectionId: data.collectionId || null,
      filePath: data.filePath || null,
      progress: data.progress || 0,
      downloadCount: data.downloadCount || 0,
      thumbnailUrl: data.thumbnailUrl || null,
    }
    this.data.set(exp.id, exp)
    return exp
  },

  async update(id: string, data: Partial<Export>): Promise<Export | null> {
    const exp = this.data.get(id)
    if (!exp) return null
    const updated = { ...exp, ...data, updatedAt: new Date() }
    this.data.set(id, updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock ChatMessage model
 */
export const MockChatMessageModel = {
  data: new Map<string, ChatMessage>(),

  async findById(id: string): Promise<ChatMessage | null> {
    return this.data.get(id) || null
  },

  async findByIdWithChat(id: string): Promise<(ChatMessage & { chat: Chat }) | null> {
    const msg = this.data.get(id)
    if (!msg) return null
    const chat = MockChatModel.data.get(msg.chatId)
    if (!chat) return null
    return { ...msg, chat }
  },

  async findByChatId(chatId: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = []
    for (const msg of this.data.values()) {
      if (msg.chatId === chatId) messages.push(msg)
    }
    return messages
  },

  async create(data: Partial<ChatMessage>): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: data.id || nanoid(4),
      chatId: data.chatId || nanoid(4),
      text: data.text || 'Test message',
      sender: data.sender || Sender.user,
      createdAt: new Date(),
      updatedAt: new Date(),
      outputSceneIds: data.outputSceneIds || [],
      stitchedVideoPath: data.stitchedVideoPath || null,
      tokensUsed: data.tokensUsed || BigInt(0),
      isError: data.isError || false,
      isThinking: data.isThinking || false,
      stage: data.stage || null,
      intent: data.intent || null,
      exportId: data.exportId || null,
    }
    this.data.set(msg.id, msg)
    return msg
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock Collection model
 */
export const MockCollectionModel = {
  data: new Map<string, Collection>(),

  async findById(id: string): Promise<Collection | null> {
    return this.data.get(id) || null
  },

  async findByUserId(userId: string): Promise<Collection[]> {
    const collections: Collection[] = []
    for (const col of this.data.values()) {
      if (col.userId === userId) collections.push(col)
    }
    return collections
  },

  async create(data: Partial<Collection>): Promise<Collection> {
    const col: Collection = {
      id: data.id || nanoid(4),
      userId: data.userId || nanoid(4),
      name: data.name || 'Test Collection',
      description: data.description || null,
      type: data.type || CollectionType.custom,
      isAutoPopulated: data.isAutoPopulated || true,
      autoUpdateEnabled: data.autoUpdateEnabled || true,
      status: data.status || CollectionStatus.active,
      itemCount: data.itemCount || 0,
      totalDuration: data.totalDuration || BigInt(0),
      lastUpdated: new Date(),
      thumbnailUrl: data.thumbnailUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.data.set(col.id, col)
    return col
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock Folder model
 */
export const MockFolderModel = {
  data: new Map<string, Folder>(),

  async findById(id: string): Promise<Folder | null> {
    return this.data.get(id) || null
  },

  async findByPath(path: string): Promise<Folder | null> {
    for (const folder of this.data.values()) {
      if (folder.path === path) return folder
    }
    return null
  },

  async findByUserId(userId: string): Promise<Folder[]> {
    const folders: Folder[] = []
    for (const folder of this.data.values()) {
      if (folder.userId === userId) folders.push(folder)
    }
    return folders
  },

  async create(data: Partial<Folder>): Promise<Folder> {
    const folder: Folder = {
      id: data.id || nanoid(4),
      userId: data.userId || nanoid(4),
      path: data.path || '/test/folder',
      status: data.status || FolderStatus.idle,
      videoCount: data.videoCount || null,
      lastScanned: data.lastScanned || null,
      createdAt: new Date(),
      watcherEnabled: data.watcherEnabled || true,
      lastWatcherScan: data.lastWatcherScan || null,
      excludePatterns: data.excludePatterns || ['*.part', '*.temp'],
      includePatterns: data.includePatterns || ['*.mp4', '*.mov', '*.avi', '*.mkv'],
    }
    this.data.set(folder.id, folder)
    return folder
  },

  async update(id: string, data: Partial<Folder>): Promise<Folder | null> {
    const folder = this.data.get(id)
    if (!folder) return null
    const updated = { ...folder, ...data }
    this.data.set(id, updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Mock Job model
 */
export const MockJobModel = {
  data: new Map<string, Job>(),

  async findById(id: string): Promise<Job | null> {
    return this.data.get(id) || null
  },

  async findMany(filter: Prisma.JobFindManyArgs): Promise<Job[]> {
    const results: Job[] = []
    const where = filter.where || {}

    for (const job of this.data.values()) {
      let matches = true

      // Handle folderId filter
      if (where.folderId && job.folderId !== where.folderId) {
        matches = false
      }

      // Handle userId filter
      if (where.userId && job.userId !== where.userId) {
        matches = false
      }

      if (matches) results.push(job)
    }
    return results
  },

  async create(data: Partial<Job>): Promise<Job> {
    const job: Job = {
      id: data.id || nanoid(4),
      userId: data.userId || nanoid(4),
      videoPath: data.videoPath || '/test/video.mp4',
      fileSize: data.fileSize || BigInt(0),
      overallProgress: data.overallProgress || 0,
      progress: data.progress || 0,
      stage: data.stage || JobStage.starting,
      status: data.status || JobStatus.pending,
      createdAt: new Date(),
      updatedAt: new Date(),
      folderId: data.folderId || null,
      thumbnailPath: data.thumbnailPath || null,
      frameAnalysisTime: data.frameAnalysisTime || null,
      sceneCreationTime: data.sceneCreationTime || null,
      transcriptionTime: data.transcriptionTime || null,
      textEmbeddingTime: data.textEmbeddingTime || null,
      audioEmbeddingTime: data.audioEmbeddingTime || null,
      visualEmbeddingTime: data.visualEmbeddingTime || null,
      frameAnalysisPlugins: data.frameAnalysisPlugins || null,
    }
    this.data.set(job.id, job)
    return job
  },

  async update(id: string, data: Partial<Job>): Promise<Job | null> {
    const job = this.data.get(id)
    if (!job) return null
    const updated = { ...job, ...data, updatedAt: new Date() }
    this.data.set(id, updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id)
  },

  clear(): void {
    this.data.clear()
  },
}

/**
 * Clear all mock database models
 */
export function clearAllMockModels(): void {
  MockUserModel.clear()
  MockChatModel.clear()
  MockExportModel.clear()
  MockChatMessageModel.clear()
  MockCollectionModel.clear()
  MockFolderModel.clear()
  MockJobModel.clear()
}

/**
 * Mock database object
 */
export const mockDatabase = {
  User: MockUserModel,
  Chat: MockChatModel,
  Export: MockExportModel,
  ChatMessage: MockChatMessageModel,
  Collection: MockCollectionModel,
  Folder: MockFolderModel,
  Job: MockJobModel,
}
