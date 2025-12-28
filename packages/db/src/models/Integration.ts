import type { Integration } from "@prisma/client";
import prisma from "../db";
import { nanoid } from 'nanoid';


type IntegrationUpdateData = Partial<Omit<Integration, 'id' | 'userId'>>

type IntegrationCreateData = Pick<Integration, 'immichApiKey' | 'immichBaseUrl' | 'userId'>

export class IntegrationModel {
    static async create(data: IntegrationCreateData) {
        const integration = await prisma.integration.create({
            data: {
                id: nanoid(),
              ...data
            }
        });
        return integration;
    }

    static async findById(id: string) {
        return prisma.integration.findUnique({ where: { id } });
    }

    static async findByUserId(userId: string) {
        return prisma.integration.findUnique({ where: { userId } });
    }

    static async update(id: string, data: IntegrationUpdateData) {
        const integration: Integration = await prisma.integration.update({
            where: { id },
            data,
        });
        return integration;
    }

    static async delete(id: string) {
        return prisma.integration.delete({ where: { id } });
    }
}