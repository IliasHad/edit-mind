export function averageEmbeddings(embeddings: number[][]): number[] | null {
    if (embeddings.length === 0) return null

    const embeddingLength = embeddings[0].length
    const averaged = new Array(embeddingLength).fill(0)

    for (const embedding of embeddings) {
        for (let i = 0; i < embeddingLength; i++) {
            averaged[i] += embedding[i]
        }
    }

    return averaged.map((v) => v / embeddings.length)
}
