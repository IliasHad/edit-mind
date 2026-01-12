import z from 'zod'
import { ImmichConfigFormSchema } from '../schemas/immich'

export interface ImmichImporterJobData {
  integrationId: string
}

export type ImmichConfig = z.infer<typeof ImmichConfigFormSchema>

export interface Person {
  id: string
  name: string
}

export interface PeopleResponse {
  people: Person[]
  hasNextPage: boolean
}

export interface TimeBucket {
  timeBucket: string
  count: number
}

export interface AssetsBucketResponse {
  id: string[]
}

export interface Face {
  id: string
  person: {
    id: string
  }
  boundingBoxX1: number
  boundingBoxY1: number
  boundingBoxX2: number
  boundingBoxY2: number
}
